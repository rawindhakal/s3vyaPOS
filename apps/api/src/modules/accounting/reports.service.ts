import { Injectable } from '@nestjs/common';
import { AccountType } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { ACCOUNT_CODES } from './chart-of-accounts';

const num = (d: unknown) => Number(d ?? 0);

@Injectable()
export class ReportsService {
  constructor(private prisma: PrismaService) {}

  /**
   * Trial Balance — derived from account balances. Each account is shown in its
   * natural column; totals of debit and credit columns must match.
   */
  async getTrialBalance(shopId: string) {
    const accounts = await this.prisma.account.findMany({
      where: { shopId },
      orderBy: { code: 'asc' },
    });

    const rows = accounts.map((a) => {
      const bal = num(a.balance);
      const debitNatural = a.type === 'ASSET' || a.type === 'EXPENSE';
      // A debit-natural account with positive balance sits in the debit column.
      const debit = debitNatural ? Math.max(bal, 0) : Math.max(-bal, 0);
      const credit = debitNatural ? Math.max(-bal, 0) : Math.max(bal, 0);
      return { code: a.code, name: a.name, type: a.type, debit, credit };
    });

    const totalDebit = rows.reduce((s, r) => s + r.debit, 0);
    const totalCredit = rows.reduce((s, r) => s + r.credit, 0);
    return {
      rows,
      totalDebit: Math.round(totalDebit * 100) / 100,
      totalCredit: Math.round(totalCredit * 100) / 100,
      balanced: Math.round((totalDebit - totalCredit) * 100) / 100 === 0,
    };
  }

  /** Balance Sheet — Assets = Liabilities + Equity (+ current P&L). */
  async getBalanceSheet(shopId: string) {
    const accounts = await this.prisma.account.findMany({ where: { shopId } });
    const group = (type: AccountType) =>
      accounts
        .filter((a) => a.type === type)
        .map((a) => ({ code: a.code, name: a.name, amount: num(a.balance) }));

    const assets = group('ASSET');
    const liabilities = group('LIABILITY');
    const equity = group('EQUITY');
    const revenue = group('REVENUE');
    const expense = group('EXPENSE');

    const sum = (rows: { amount: number }[]) =>
      Math.round(rows.reduce((s, r) => s + r.amount, 0) * 100) / 100;

    const netIncome = sum(revenue) - sum(expense);
    const totalAssets = sum(assets);
    const totalLiabilities = sum(liabilities);
    const totalEquity = sum(equity) + netIncome;

    return {
      assets,
      liabilities,
      equity,
      netIncome,
      totalAssets,
      totalLiabilities,
      totalEquity,
      balanced:
        Math.round((totalAssets - (totalLiabilities + totalEquity)) * 100) / 100 === 0,
    };
  }

  /** Profit & Loss (Income Statement) — revenue less expenses for the period. */
  async getIncomeStatement(shopId: string) {
    const accounts = await this.prisma.account.findMany({ where: { shopId } });
    const rows = (type: AccountType) =>
      accounts
        .filter((a) => a.type === type)
        .map((a) => ({ code: a.code, name: a.name, amount: num(a.balance) }));

    const revenue = rows('REVENUE');
    const expense = rows('EXPENSE');
    const round = (n: number) => Math.round(n * 100) / 100;
    const totalRevenue = round(revenue.reduce((s, r) => s + r.amount, 0));
    const totalExpense = round(expense.reduce((s, r) => s + r.amount, 0));
    return {
      revenue,
      expense,
      totalRevenue,
      totalExpense,
      netIncome: round(totalRevenue - totalExpense),
    };
  }

  /** Cash Book — ledger of the Cash account. */
  async getCashBook(shopId: string) {
    return this.getLedgerByCode(shopId, ACCOUNT_CODES.CASH);
  }

  /** Bank Book — ledger of the Bank account. */
  async getBankBook(shopId: string) {
    return this.getLedgerByCode(shopId, ACCOUNT_CODES.BANK);
  }

  async getLedgerByCode(shopId: string, code: string) {
    const account = await this.prisma.account.findUnique({
      where: { shopId_code: { shopId, code } },
    });
    if (!account) return { account: null, entries: [] };
    return this.getLedger(shopId, account.id);
  }

  /** General ledger for one account (used for Ledger / Cash Book / Bank Book). */
  async getLedger(shopId: string, accountId: string) {
    const account = await this.prisma.account.findFirst({
      where: { id: accountId, shopId },
    });
    if (!account) return { account: null, entries: [] };

    const lines = await this.prisma.journalLine.findMany({
      where: { accountId, journal: { shopId } },
      include: { journal: true },
      orderBy: { journal: { date: 'asc' } },
    });

    let running = 0;
    const debitNatural = account.type === 'ASSET' || account.type === 'EXPENSE';
    const entries = lines.map((l) => {
      const debit = num(l.debit);
      const credit = num(l.credit);
      running += debitNatural ? debit - credit : credit - debit;
      return {
        date: l.journal.date,
        description: l.journal.description,
        reference: l.journal.reference,
        debit,
        credit,
        balance: Math.round(running * 100) / 100,
      };
    });

    return { account, entries };
  }
}
