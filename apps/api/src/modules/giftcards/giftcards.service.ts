import { BadRequestException, Injectable } from '@nestjs/common';
import { PaymentMethod } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { JournalService } from '../accounting/journal.service';
import { ACCOUNT_CODES, DEFAULT_CHART_OF_ACCOUNTS } from '../accounting/chart-of-accounts';

const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

@Injectable()
export class GiftCardsService {
  constructor(
    private prisma: PrismaService,
    private journal: JournalService,
  ) {}

  list(shopId: string) {
    return this.prisma.giftCard.findMany({ where: { shopId }, orderBy: { createdAt: 'desc' } });
  }

  async getByCode(shopId: string, code: string) {
    const card = await this.prisma.giftCard.findUnique({ where: { shopId_code: { shopId, code } } });
    return card ?? null;
  }

  /** Selling a gift card is deferred revenue: Debit Cash/Bank, Credit Gift Card Liability. */
  async issue(
    shopId: string,
    dto: { code: string; amount: number; paymentMethod: PaymentMethod; customerId?: string; expiresAt?: string },
  ) {
    const amount = round2(dto.amount);
    if (amount <= 0) throw new BadRequestException('Amount must be positive');
    if (!['CASH', 'BANK', 'QR'].includes(dto.paymentMethod)) {
      throw new BadRequestException('Gift cards are bought with CASH, BANK or QR');
    }

    return this.prisma.$transaction(async (tx) => {
      await tx.account.createMany({
        data: DEFAULT_CHART_OF_ACCOUNTS.map((a) => ({ shopId, code: a.code, name: a.name, type: a.type, isSystem: a.isSystem })),
        skipDuplicates: true,
      });

      const exists = await tx.giftCard.findUnique({ where: { shopId_code: { shopId, code: dto.code } } });
      if (exists) throw new BadRequestException('Gift card code already exists');

      const card = await tx.giftCard.create({
        data: {
          shopId,
          code: dto.code,
          initialBalance: amount,
          balance: amount,
          customerId: dto.customerId,
          expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
        },
      });

      const cashCode =
        dto.paymentMethod === 'BANK' ? ACCOUNT_CODES.BANK : dto.paymentMethod === 'QR' ? ACCOUNT_CODES.QR_CLEARING : ACCOUNT_CODES.CASH;

      await this.journal.postJournalEntry(
        {
          shopId,
          description: `Gift card ${dto.code} issued`,
          source: 'PAYMENT',
          lines: [
            { accountCode: cashCode, debit: amount },
            { accountCode: ACCOUNT_CODES.GIFT_CARD_LIABILITY, credit: amount },
          ],
        },
        tx,
      );

      return card;
    });
  }
}
