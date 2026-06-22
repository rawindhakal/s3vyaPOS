import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PaymentMethod } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { JournalService, JournalLineInput } from '../accounting/journal.service';
import { ACCOUNT_CODES } from '../accounting/chart-of-accounts';

const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

export interface ReturnItemInput {
  saleItemId: string;
  quantity: number;
}
export interface CreateReturnInput {
  items: ReturnItemInput[];
  refundMethod: PaymentMethod;
  note?: string;
}

@Injectable()
export class ReturnsService {
  constructor(
    private prisma: PrismaService,
    private journal: JournalService,
  ) {}

  async createReturn(shopId: string, saleId: string, dto: CreateReturnInput) {
    if (!dto.items?.length) throw new BadRequestException('Nothing to return');

    return this.prisma.$transaction(async (tx) => {
      const sale = await tx.sale.findFirst({
        where: { id: saleId, shopId },
        include: { items: true },
      });
      if (!sale) throw new NotFoundException('Sale not found');

      const saleSubtotal = Number(sale.subtotal) || 0;
      const lines = dto.items.map((ri) => {
        const item = sale.items.find((i) => i.id === ri.saleItemId);
        if (!item) throw new BadRequestException('Sale item not found');
        if (ri.quantity <= 0 || ri.quantity > Number(item.quantity)) {
          throw new BadRequestException(`Invalid return quantity for ${item.name}`);
        }
        const perUnitNet = Number(item.lineTotal) / Number(item.quantity);
        const lineTotal = round2(perUnitNet * ri.quantity);
        const unitCost = Number(item.unitCost);
        return { item, quantity: ri.quantity, unitPrice: Number(item.unitPrice), unitCost, lineTotal };
      });

      const returnSubtotal = round2(lines.reduce((s, l) => s + l.lineTotal, 0));
      const returnTax = saleSubtotal > 0 ? round2((returnSubtotal / saleSubtotal) * Number(sale.tax)) : 0;
      const returnCost = round2(lines.reduce((s, l) => s + l.unitCost * l.quantity, 0));
      const refund = round2(returnSubtotal + returnTax);

      if (dto.refundMethod === 'STORE_CREDIT' && !sale.customerId) {
        throw new BadRequestException('Store-credit refund requires the sale to have a customer');
      }
      if (dto.refundMethod === 'CREDIT' || dto.refundMethod === 'GIFT_CARD') {
        throw new BadRequestException('Refund must be CASH, BANK, QR or STORE_CREDIT');
      }

      // Restock
      for (const l of lines) {
        await tx.product.update({ where: { id: l.item.productId }, data: { stock: { increment: l.quantity } } });
        await tx.stockMovement.create({
          data: { shopId, productId: l.item.productId, type: 'RETURN', quantity: l.quantity, reference: sale.invoiceNo },
        });
      }

      const ret = await tx.saleReturn.create({
        data: {
          shopId,
          saleId,
          subtotal: returnSubtotal,
          tax: returnTax,
          total: refund,
          cogs: returnCost,
          refundMethod: dto.refundMethod,
          note: dto.note,
          items: {
            create: lines.map((l) => ({
              productId: l.item.productId,
              name: l.item.name,
              quantity: l.quantity,
              unitPrice: l.unitPrice,
              unitCost: l.unitCost,
              lineTotal: l.lineTotal,
            })),
          },
        },
      });

      await tx.sale.update({ where: { id: saleId }, data: { refundedTotal: { increment: refund } } });

      if (dto.refundMethod === 'STORE_CREDIT' && sale.customerId) {
        await tx.customer.update({ where: { id: sale.customerId }, data: { storeCredit: { increment: refund } } });
      }

      // Reversing journal: revenue & tax down, refund out (asset/liability), inventory back.
      const refundAccount =
        dto.refundMethod === 'STORE_CREDIT'
          ? ACCOUNT_CODES.STORE_CREDIT_LIABILITY
          : dto.refundMethod === 'BANK'
            ? ACCOUNT_CODES.BANK
            : dto.refundMethod === 'QR'
              ? ACCOUNT_CODES.QR_CLEARING
              : ACCOUNT_CODES.CASH;

      const jl: JournalLineInput[] = [
        { accountCode: ACCOUNT_CODES.SALES_REVENUE, debit: returnSubtotal },
      ];
      if (returnTax > 0) jl.push({ accountCode: ACCOUNT_CODES.SALES_TAX_PAYABLE, debit: returnTax });
      jl.push({ accountCode: refundAccount, credit: refund });
      if (returnCost > 0) {
        jl.push({ accountCode: ACCOUNT_CODES.INVENTORY, debit: returnCost });
        jl.push({ accountCode: ACCOUNT_CODES.COGS, credit: returnCost });
      }

      const entry = await this.journal.postJournalEntry(
        { shopId, description: `Return for ${sale.invoiceNo}`, reference: sale.invoiceNo, source: 'ADJUSTMENT', lines: jl },
        tx,
      );
      await tx.saleReturn.update({ where: { id: ret.id }, data: { journalId: entry.id } });

      return tx.saleReturn.findFirst({ where: { id: ret.id }, include: { items: true } });
    });
  }

  list(shopId: string) {
    return this.prisma.saleReturn.findMany({
      where: { shopId },
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: { items: true, sale: { select: { invoiceNo: true } } },
    });
  }
}
