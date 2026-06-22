import { BadRequestException, Injectable } from '@nestjs/common';
import { PaymentMethod, PaymentProvider, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { JournalService, JournalLineInput } from '../accounting/journal.service';
import { ACCOUNT_CODES, DEFAULT_CHART_OF_ACCOUNTS } from '../accounting/chart-of-accounts';
import { PaymentsService } from '../payments/payments.service';
import { CreateSaleDto, PaymentSplitDto } from './dto';

const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

function cashAccountCode(method: PaymentMethod): string {
  switch (method) {
    case 'CASH':
      return ACCOUNT_CODES.CASH;
    case 'BANK':
      return ACCOUNT_CODES.BANK;
    case 'QR':
      return ACCOUNT_CODES.QR_CLEARING;
    case 'CREDIT':
      return ACCOUNT_CODES.ACCOUNTS_RECEIVABLE;
    case 'GIFT_CARD':
      return ACCOUNT_CODES.GIFT_CARD_LIABILITY;
    case 'STORE_CREDIT':
      return ACCOUNT_CODES.STORE_CREDIT_LIABILITY;
    default:
      return ACCOUNT_CODES.CASH;
  }
}

@Injectable()
export class SalesService {
  constructor(
    private prisma: PrismaService,
    private journal: JournalService,
    private payments: PaymentsService,
  ) {}

  async createSale(shopId: string, dto: CreateSaleDto, userId?: string) {
    return this.prisma.$transaction(async (tx) => {
      // Ensure the shop has all default accounts (covers shops seeded before M5).
      await tx.account.createMany({
        data: DEFAULT_CHART_OF_ACCOUNTS.map((a) => ({
          shopId,
          code: a.code,
          name: a.name,
          type: a.type,
          isSystem: a.isSystem,
        })),
        skipDuplicates: true,
      });

      const shop = await tx.shop.findUniqueOrThrow({ where: { id: shopId } });

      // 1. Resolve products, compute per-line figures.
      const lines = await Promise.all(
        dto.items.map(async (item) => {
          const product = item.productId
            ? await tx.product.findFirst({ where: { id: item.productId, shopId } })
            : item.sku
              ? await tx.product.findFirst({ where: { shopId, sku: item.sku } })
              : null;
          if (!product) {
            throw new BadRequestException(`Product not found: ${item.productId ?? item.sku}`);
          }
          if (Number(product.stock) < item.quantity) {
            throw new BadRequestException(`Insufficient stock for ${product.name}`);
          }
          const unitPrice = round2(item.unitPrice ?? Number(product.salePrice));
          const gross = round2(unitPrice * item.quantity);
          const lineDiscount = Math.min(round2(item.discount ?? 0), gross);
          const lineNet = round2(gross - lineDiscount);
          const lineTax = round2((lineNet * Number(product.taxRate)) / 100);
          const unitCost = Number(product.purchasePrice);
          return { product, quantity: item.quantity, unitPrice, lineDiscount, lineNet, lineTax, unitCost };
        }),
      );

      // 2. Totals.
      const subtotal = round2(lines.reduce((s, l) => s + l.lineNet, 0));
      const tax = round2(lines.reduce((s, l) => s + l.lineTax, 0));

      let billDiscount = round2(dto.discount ?? 0);
      if (dto.discountPct) billDiscount = round2((subtotal * dto.discountPct) / 100);

      // Loyalty redemption (1 point = 1 currency) becomes extra discount.
      let redeemed = 0;
      if (dto.redeemPoints && dto.customerId) {
        const customer = await tx.customer.findFirst({ where: { id: dto.customerId, shopId } });
        redeemed = Math.min(round2(dto.redeemPoints), Number(customer?.loyaltyPoints ?? 0));
      }
      const totalDiscount = Math.min(round2(billDiscount + redeemed), subtotal);

      const scRate = dto.serviceChargeRate ?? Number(shop.serviceChargeRate);
      const serviceCharge = round2(((subtotal - totalDiscount) * scRate) / 100);

      const preRound = round2(subtotal - totalDiscount + tax + serviceCharge);
      const doRound = dto.roundOff ?? shop.roundOff;
      const total = doRound ? Math.round(preRound) : preRound;
      const roundOff = round2(total - preRound);
      const cogs = round2(lines.reduce((s, l) => s + l.unitCost * l.quantity, 0));
      const tip = round2(dto.tip ?? 0);
      const payable = round2(total + tip); // tip is collected on top of the bill

      // 3. Payments (single or split). Sum must equal payable (total + tip).
      const splits: PaymentSplitDto[] =
        dto.payments && dto.payments.length > 0
          ? dto.payments
          : [{ method: dto.paymentMethod ?? 'CASH', provider: dto.provider, amount: payable }];
      const paid = round2(splits.reduce((s, p) => s + round2(p.amount), 0));
      if (Math.abs(paid - payable) > 0.01) {
        throw new BadRequestException(`Payments ${paid} do not match total ${payable}`);
      }
      const creditPortion = round2(
        splits.filter((p) => p.method === 'CREDIT').reduce((s, p) => s + round2(p.amount), 0),
      );
      if (creditPortion > 0 && !dto.customerId) {
        throw new BadRequestException('Credit sales require a customer');
      }

      // Validate & apply gift-card / store-credit tenders.
      for (const p of splits) {
        const amt = round2(p.amount);
        if (p.method === 'GIFT_CARD') {
          if (!p.cardCode) throw new BadRequestException('Gift card code required');
          const card = await tx.giftCard.findUnique({
            where: { shopId_code: { shopId, code: p.cardCode } },
          });
          if (!card || card.status !== 'ACTIVE') throw new BadRequestException('Invalid gift card');
          if (Number(card.balance) < amt) throw new BadRequestException('Insufficient gift card balance');
          const newBal = round2(Number(card.balance) - amt);
          await tx.giftCard.update({
            where: { id: card.id },
            data: { balance: newBal, status: newBal <= 0 ? 'USED' : 'ACTIVE' },
          });
        }
        if (p.method === 'STORE_CREDIT') {
          if (!dto.customerId) throw new BadRequestException('Store credit needs a customer');
          const c = await tx.customer.findFirst({ where: { id: dto.customerId, shopId } });
          if (!c || Number(c.storeCredit) < amt) throw new BadRequestException('Insufficient store credit');
          await tx.customer.update({ where: { id: dto.customerId }, data: { storeCredit: { decrement: amt } } });
        }
      }

      // 4. Invoice + persist sale.
      const count = await tx.sale.count({ where: { shopId } });
      const invoiceNo = `INV-${String(count + 1).padStart(6, '0')}`;
      const loyaltyEarned =
        dto.customerId && Number(shop.loyaltyEarnRate) > 0
          ? Math.floor(((subtotal - totalDiscount) / 100) * Number(shop.loyaltyEarnRate))
          : 0;

      const sale = await tx.sale.create({
        data: {
          shopId,
          invoiceNo,
          customerId: dto.customerId,
          userId,
          subtotal,
          discount: totalDiscount,
          serviceCharge,
          tax,
          roundOff,
          tip,
          total,
          cogs,
          loyaltyEarned,
          loyaltyRedeemed: redeemed,
          note: dto.note,
          items: {
            create: lines.map((l) => ({
              productId: l.product.id,
              name: l.product.name,
              quantity: l.quantity,
              unitPrice: l.unitPrice,
              discount: l.lineDiscount,
              unitCost: l.unitCost,
              lineTotal: l.lineNet,
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

      // 5. Payment records (+ QR charge payloads).
      for (const p of splits) {
        const provider: PaymentProvider = p.provider ?? 'NONE';
        let qrPayload: string | undefined;
        let status: 'PENDING' | 'PAID' = p.method === 'CREDIT' ? 'PENDING' : 'PAID';
        if (p.method === 'QR') {
          const charge = await this.payments.createCharge(provider, {
            amount: round2(p.amount),
            invoiceNo,
            shopId,
          });
          qrPayload = charge.qrPayload;
          status = charge.status;
        }
        await tx.payment.create({
          data: {
            shopId,
            saleId: sale.id,
            method: p.method,
            provider,
            amount: round2(p.amount),
            status,
            qrPayload,
            externalRef: p.method === 'GIFT_CARD' ? p.cardCode : undefined,
          },
        });
      }

      // 6. Customer: AR for credit portion, loyalty adjustments.
      if (dto.customerId) {
        const data: Prisma.CustomerUpdateInput = {};
        if (creditPortion > 0) data.balance = { increment: creditPortion };
        const pointDelta = round2(loyaltyEarned - redeemed);
        if (pointDelta !== 0) data.loyaltyPoints = { increment: pointDelta };
        if (Object.keys(data).length > 0) {
          await tx.customer.update({ where: { id: dto.customerId }, data });
        }
      }

      // 7. Balanced journal.
      const jl: JournalLineInput[] = [];
      for (const p of splits) {
        jl.push({ accountCode: cashAccountCode(p.method), debit: round2(p.amount) });
      }
      jl.push({ accountCode: ACCOUNT_CODES.SALES_REVENUE, credit: subtotal });
      if (tip > 0) jl.push({ accountCode: ACCOUNT_CODES.TIPS_PAYABLE, credit: tip });
      if (totalDiscount > 0) jl.push({ accountCode: ACCOUNT_CODES.DISCOUNT_ALLOWED, debit: totalDiscount });
      if (tax > 0) jl.push({ accountCode: ACCOUNT_CODES.SALES_TAX_PAYABLE, credit: tax });
      if (serviceCharge > 0) jl.push({ accountCode: ACCOUNT_CODES.SERVICE_CHARGE, credit: serviceCharge });
      if (roundOff > 0) jl.push({ accountCode: ACCOUNT_CODES.ROUNDING, credit: roundOff });
      if (roundOff < 0) jl.push({ accountCode: ACCOUNT_CODES.ROUNDING, debit: -roundOff });
      if (cogs > 0) {
        jl.push({ accountCode: ACCOUNT_CODES.COGS, debit: cogs });
        jl.push({ accountCode: ACCOUNT_CODES.INVENTORY, credit: cogs });
      }

      const entry = await this.journal.postJournalEntry(
        { shopId, description: `Sale ${invoiceNo}`, reference: invoiceNo, source: 'SALE', lines: jl },
        tx,
      );
      await tx.sale.update({ where: { id: sale.id }, data: { journalId: entry.id } });

      return this.findOne(shopId, sale.id, tx);
    });
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
