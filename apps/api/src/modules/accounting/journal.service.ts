import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma, JournalSource } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

export interface JournalLineInput {
  accountId?: string;
  accountCode?: string; // resolve by code within shop if id not given
  debit?: number;
  credit?: number;
}

export interface PostJournalInput {
  shopId: string;
  description: string;
  reference?: string;
  source?: JournalSource;
  date?: Date;
  lines: JournalLineInput[];
}

const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

@Injectable()
export class JournalService {
  constructor(private prisma: PrismaService) {}

  /**
   * Posts a balanced double-entry journal. Validates Σdebit === Σcredit,
   * persists the entry + lines, and atomically moves account balances.
   * Accepts an optional Prisma transaction client so callers (e.g. SalesService)
   * can include the posting in their own transaction.
   */
  async postJournalEntry(input: PostJournalInput, tx?: Prisma.TransactionClient) {
    const client = tx ?? this.prisma;

    if (!input.lines || input.lines.length < 2) {
      throw new BadRequestException('A journal entry needs at least two lines');
    }

    // Resolve account ids (by id or code) and validate they belong to the shop.
    const resolved = await Promise.all(
      input.lines.map(async (line) => {
        const debit = round2(line.debit ?? 0);
        const credit = round2(line.credit ?? 0);
        if (debit < 0 || credit < 0) {
          throw new BadRequestException('Debit/credit cannot be negative');
        }
        if (debit > 0 && credit > 0) {
          throw new BadRequestException('A line cannot have both debit and credit');
        }
        if (debit === 0 && credit === 0) {
          throw new BadRequestException('A line must have a debit or a credit');
        }

        let accountId = line.accountId;
        if (!accountId && line.accountCode) {
          const acc = await client.account.findUnique({
            where: { shopId_code: { shopId: input.shopId, code: line.accountCode } },
            select: { id: true },
          });
          if (!acc) {
            throw new BadRequestException(
              `Account code ${line.accountCode} not found for shop`,
            );
          }
          accountId = acc.id;
        }
        if (!accountId) throw new BadRequestException('Line missing account');

        const owns = await client.account.findFirst({
          where: { id: accountId, shopId: input.shopId },
          select: { id: true, type: true },
        });
        if (!owns) throw new BadRequestException('Account does not belong to shop');

        return { accountId, type: owns.type, debit, credit };
      }),
    );

    const totalDebit = round2(resolved.reduce((s, l) => s + l.debit, 0));
    const totalCredit = round2(resolved.reduce((s, l) => s + l.credit, 0));
    if (totalDebit !== totalCredit) {
      throw new BadRequestException(
        `Unbalanced journal: debit ${totalDebit} !== credit ${totalCredit}`,
      );
    }
    if (totalDebit === 0) {
      throw new BadRequestException('Journal total cannot be zero');
    }

    const run = async (t: Prisma.TransactionClient) => {
      const entry = await t.journalEntry.create({
        data: {
          shopId: input.shopId,
          description: input.description,
          reference: input.reference,
          source: input.source ?? 'MANUAL',
          date: input.date ?? new Date(),
          lines: {
            create: resolved.map((l) => ({
              accountId: l.accountId,
              debit: l.debit,
              credit: l.credit,
            })),
          },
        },
      });

      // Balance convention: ASSET/EXPENSE increase on debit; the rest on credit.
      for (const l of resolved) {
        const debitPositive = l.type === 'ASSET' || l.type === 'EXPENSE';
        const delta = debitPositive ? l.debit - l.credit : l.credit - l.debit;
        await t.account.update({
          where: { id: l.accountId },
          data: { balance: { increment: delta } },
        });
      }

      return entry;
    };

    return tx ? run(tx) : this.prisma.$transaction(run);
  }

  async listEntries(shopId: string, take = 50) {
    return this.prisma.journalEntry.findMany({
      where: { shopId },
      orderBy: { date: 'desc' },
      take,
      include: { lines: { include: { account: true } } },
    });
  }
}
