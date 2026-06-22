import { BadRequestException, Injectable } from '@nestjs/common';
import { PaymentMethod, PaymentProvider, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { JournalService, JournalLineInput } from '../accounting/journal.service';
import { ACCOUNT_CODES } from '../accounting/chart-of-accounts';
import { PaymentsService } from '../payments/payments.service';
import { CreateSaleDto } from './dto';

const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

@Injectable()
export class SalesService {
  constructor(
    private prisma: PrismaService,
    private journal: JournalService,
    private payments: PaymentsService,
  ) {}

  async createSale(shopId: string, dto: CreateSaleDto) {
    if (dto.paymentMethod === 'CREDIT' && !dto.customerId) {
      throw new BadRequestException('Credit sales require a customer');
    }

    return this.prisma.$transaction(async (tx) => {
      // 1. Resolve products and validate stock.
      const lines = await Promise.all(
        dto.items.map(async (item) => {
          const product = item.productId
            ? await tx.product.findFirst({ where: { id: item.productId, shopId } })
            : item.sku
              ? await tx.product.findFirst({ where: { shopId, sku: item.sku } })
              : null;
          if (!product) {
            throw new BadRequestException(
              `Product not found: ${item.productId ?? item.sku}`,
            );
          }
          if (Number(product.stock) < item.quantity) {
            throw new BadRequestException(`Insufficient stock for ${product.name}`);
          }
          const unitPrice = round2(item.unitPrice ?? Number(product.salePrice));
          const unitCost = Number(product.purchasePrice);
          const lineTotal = round2(unitPrice * item.quantity);
          const lineTax = round2((lineTotal * Number(product.taxRate)) / 100);
          return { product, quantity: item.quantity, unitPrice, unitCost, lineTotal, lineTax };
        }),
      );

      // 2. Totals.
      const subtotal = round2(lines.reduce((s, l) => s + l.lineTotal, 0));
      const discount = round2(dto.discount ?? 0);
      const tax = round2(lines.reduce((s, l) => s + l.lineTax, 0));
      const total = round2(subtotal - discount + tax);
      const cogs = round2(lines.reduce((s, l) => s + l.unitCost * l.quantity, 0));
      const netRevenue = round2(subtotal - discount);

      // 3. Invoice number (per shop, sequential).
      const count = await tx.sale.count({ where: { shopId } });
      const invoiceNo = `INV-${String(count + 1).padStart(6, '0')}`;

      // 4. Persist sale + items, decrement stock.
      const sale = await tx.sale.create({
        data: {
          shopId,
          invoiceNo,
          customerId: dto.customerId,
          subtotal,
          discount,
          tax,
          total,
          cogs,
          note: dto.note,
          items: {
            create: lines.map((l) => ({
              productId: l.product.id,
              name: l.product.name,
              quantity: l.quantity,
              unitPrice: l.unitPrice,
              unitCost: l.unitCost,
              lineTotal: l.lineTotal,
            })),
          },
        },
      });

      for (const l of lines) {
        await tx.product.update({
          where: { id: l.product.id },
          data: { stock: { decrement: l.quantity } },
        });
      }

      // 5. Payment record (+ provider charge for QR).
      const provider: PaymentProvider = dto.provider ?? 'NONE';
      let qrPayload: string | undefined;
      let status: 'PENDING' | 'PAID' = 'PAID';
      if (dto.paymentMethod === 'QR') {
        const charge = await this.payments.createCharge(provider, {
          amount: total,
          invoiceNo,
          shopId,
        });
        qrPayload = charge.qrPayload;
        status = charge.status;
      } else if (dto.paymentMethod === 'CREDIT') {
        status = 'PENDING';
      }

      await tx.payment.create({
        data: {
          shopId,
          saleId: sale.id,
          method: dto.paymentMethod,
          provider,
          amount: total,
          status,
          qrPayload,
        },
      });

      if (dto.paymentMethod === 'CREDIT' && dto.customerId) {
        await tx.customer.update({
          where: { id: dto.customerId },
          data: { balance: { increment: total } },
        });
      }

      // 6. Double-entry postings.
      const debitAccount = this.debitAccountCode(dto.paymentMethod);
      const journalLines: JournalLineInput[] = [
        { accountCode: debitAccount, debit: total },
        { accountCode: ACCOUNT_CODES.SALES_REVENUE, credit: netRevenue },
      ];
      if (tax > 0) {
        journalLines.push({ accountCode: ACCOUNT_CODES.SALES_TAX_PAYABLE, credit: tax });
      }
      if (cogs > 0) {
        journalLines.push({ accountCode: ACCOUNT_CODES.COGS, debit: cogs });
        journalLines.push({ accountCode: ACCOUNT_CODES.INVENTORY, credit: cogs });
      }

      const entry = await this.journal.postJournalEntry(
        {
          shopId,
          description: `Sale ${invoiceNo}`,
          reference: invoiceNo,
          source: 'SALE',
          lines: journalLines,
        },
        tx,
      );

      await tx.sale.update({
        where: { id: sale.id },
        data: { journalId: entry.id },
      });

      return this.findOne(shopId, sale.id, tx);
    });
  }

  private debitAccountCode(method: PaymentMethod): string {
    switch (method) {
      case 'CASH':
        return ACCOUNT_CODES.CASH;
      case 'BANK':
        return ACCOUNT_CODES.BANK;
      case 'QR':
        return ACCOUNT_CODES.QR_CLEARING;
      case 'CREDIT':
        return ACCOUNT_CODES.ACCOUNTS_RECEIVABLE;
      default:
        return ACCOUNT_CODES.CASH;
    }
  }

  list(shopId: string, take = 50) {
    return this.prisma.sale.findMany({
      where: { shopId },
      orderBy: { createdAt: 'desc' },
      take,
      include: { items: true, payments: true, customer: true },
    });
  }

  findOne(shopId: string, id: string, tx?: Prisma.TransactionClient) {
    const client = tx ?? this.prisma;
    return client.sale.findFirst({
      where: { id, shopId },
      include: { items: true, payments: true, customer: true },
    });
  }
}
