import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { JournalService, JournalLineInput } from '../accounting/journal.service';
import { ACCOUNT_CODES } from '../accounting/chart-of-accounts';
import { CreatePurchaseDto, PurchaseItemDto } from './dto';

const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

@Injectable()
export class PurchasingService {
  constructor(
    private prisma: PrismaService,
    private journal: JournalService,
  ) {}

  async createPurchase(shopId: string, dto: CreatePurchaseDto) {
    if (dto.paymentMethod === 'CREDIT' && !dto.vendorId) {
      throw new BadRequestException('Credit purchases require a vendor');
    }

    return this.prisma.$transaction(async (tx) => {
      // Resolve / create each product, build lines.
      const lines = await Promise.all(
        dto.items.map(async (item) => {
          const product = await this.resolveProduct(tx, shopId, item);
          const unitCost = round2(item.unitCost);
          const lineTotal = round2(unitCost * item.quantity);
          return { product, quantity: item.quantity, unitCost, lineTotal };
        }),
      );

      const subtotal = round2(lines.reduce((s, l) => s + l.lineTotal, 0));
      const discount = round2(dto.discount ?? 0);
      const tax = round2(dto.tax ?? 0);
      const total = round2(subtotal - discount + tax);

      const count = await tx.purchase.count({ where: { shopId } });
      const billNo = `PUR-${String(count + 1).padStart(6, '0')}`;

      const purchase = await tx.purchase.create({
        data: {
          shopId,
          billNo,
          vendorId: dto.vendorId,
          subtotal,
          discount,
          tax,
          total,
          paymentMethod: dto.paymentMethod,
          note: dto.note,
          items: {
            create: lines.map((l) => ({
              productId: l.product.id,
              name: l.product.name,
              quantity: l.quantity,
              unitCost: l.unitCost,
              lineTotal: l.lineTotal,
            })),
          },
        },
      });

      // Increase stock and refresh latest cost.
      for (const l of lines) {
        await tx.product.update({
          where: { id: l.product.id },
          data: {
            stock: { increment: l.quantity },
            purchasePrice: l.unitCost,
          },
        });
      }

      // Credit side depends on payment method.
      const journalLines: JournalLineInput[] = [
        { accountCode: ACCOUNT_CODES.INVENTORY, debit: total },
      ];
      if (dto.paymentMethod === 'CREDIT') {
        journalLines.push({ accountCode: ACCOUNT_CODES.ACCOUNTS_PAYABLE, credit: total });
        if (dto.vendorId) {
          await tx.vendor.update({
            where: { id: dto.vendorId },
            data: { balance: { increment: total } },
          });
        }
      } else {
        const cash =
          dto.paymentMethod === 'BANK'
            ? ACCOUNT_CODES.BANK
            : dto.paymentMethod === 'QR'
              ? ACCOUNT_CODES.QR_CLEARING
              : ACCOUNT_CODES.CASH;
        journalLines.push({ accountCode: cash, credit: total });
      }

      const entry = await this.journal.postJournalEntry(
        {
          shopId,
          description: `Purchase ${billNo}`,
          reference: billNo,
          source: 'PURCHASE',
          lines: journalLines,
        },
        tx,
      );

      await tx.purchase.update({
        where: { id: purchase.id },
        data: { journalId: entry.id },
      });

      return tx.purchase.findFirst({
        where: { id: purchase.id },
        include: { items: true, vendor: true },
      });
    });
  }

  list(shopId: string, take = 50) {
    return this.prisma.purchase.findMany({
      where: { shopId },
      orderBy: { createdAt: 'desc' },
      take,
      include: { items: true, vendor: true },
    });
  }

  private async resolveProduct(
    tx: Prisma.TransactionClient,
    shopId: string,
    item: PurchaseItemDto,
  ) {
    if (item.productId) {
      const p = await tx.product.findFirst({ where: { id: item.productId, shopId } });
      if (!p) throw new BadRequestException(`Product not found: ${item.productId}`);
      return p;
    }
    if (item.sku) {
      const existing = await tx.product.findUnique({
        where: { shopId_sku: { shopId, sku: item.sku } },
      });
      if (existing) return existing;
      // create new product with the given sku
      return tx.product.create({
        data: {
          shopId,
          sku: item.sku,
          name: item.name?.trim() || item.sku,
          purchasePrice: round2(item.unitCost),
          salePrice: 0,
        },
      });
    }
    if (item.name) {
      const count = await tx.product.count({ where: { shopId } });
      const sku = `SKU-${String(count + 1).padStart(4, '0')}`;
      return tx.product.create({
        data: {
          shopId,
          sku,
          name: item.name.trim(),
          purchasePrice: round2(item.unitCost),
          salePrice: 0,
        },
      });
    }
    throw new BadRequestException('Each item needs a productId, sku, or name');
  }
}
