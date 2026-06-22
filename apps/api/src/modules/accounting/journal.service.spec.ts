import { BadRequestException } from '@nestjs/common';
import { JournalService } from './journal.service';

/**
 * Unit tests for the double-entry guarantees. We stub PrismaService so the test
 * runs without a database — the goal is to lock in the balance validation logic.
 */
describe('JournalService.postJournalEntry', () => {
  const shopId = 'shop-1';

  const makePrisma = () => {
    const accounts: Record<string, { id: string; type: string }> = {
      'acc-cash': { id: 'acc-cash', type: 'ASSET' },
      'acc-sales': { id: 'acc-sales', type: 'REVENUE' },
    };
    return {
      account: {
        findUnique: jest.fn(),
        findFirst: jest.fn(({ where }: any) =>
          Promise.resolve(accounts[where.id] ?? null),
        ),
        update: jest.fn(() => Promise.resolve()),
      },
      journalEntry: {
        create: jest.fn(() => Promise.resolve({ id: 'je-1' })),
      },
      $transaction: jest.fn((fn: any) => fn(prismaMock)),
    } as any;
  };

  let prismaMock: any;
  let service: JournalService;

  beforeEach(() => {
    prismaMock = makePrisma();
    service = new JournalService(prismaMock);
  });

  it('rejects an unbalanced entry', async () => {
    await expect(
      service.postJournalEntry({
        shopId,
        description: 'bad',
        lines: [
          { accountId: 'acc-cash', debit: 100 },
          { accountId: 'acc-sales', credit: 90 },
        ],
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects a line with both debit and credit', async () => {
    await expect(
      service.postJournalEntry({
        shopId,
        description: 'bad',
        lines: [
          { accountId: 'acc-cash', debit: 100, credit: 100 },
          { accountId: 'acc-sales', credit: 100 },
        ],
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('posts a balanced cash sale and moves balances', async () => {
    const entry = await service.postJournalEntry({
      shopId,
      description: 'Cash sale',
      lines: [
        { accountId: 'acc-cash', debit: 100 },
        { accountId: 'acc-sales', credit: 100 },
      ],
    });
    expect(entry).toEqual({ id: 'je-1' });
    expect(prismaMock.journalEntry.create).toHaveBeenCalledTimes(1);
    // Cash (ASSET) +100 via debit, Sales (REVENUE) +100 via credit.
    expect(prismaMock.account.update).toHaveBeenCalledWith({
      where: { id: 'acc-cash' },
      data: { balance: { increment: 100 } },
    });
    expect(prismaMock.account.update).toHaveBeenCalledWith({
      where: { id: 'acc-sales' },
      data: { balance: { increment: 100 } },
    });
  });
});
