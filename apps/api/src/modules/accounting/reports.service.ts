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

  private range(fromISO?: string, toISO?: string) {
    const now = new Date();
    const from = fromISO ? new Date(fromISO) : new Date(now.getFullYear(), now.getMonth(), 1);
    const to = toISO ? new Date(toISO) : now;
    return { from, to };
  }

  /** Top-selling items by quantity and revenue. */
  async getTopItems(shopId: string, fromISO?: string, toISO?: string, limit = 15) {
    const { from, to } = this.range(fromISO, toISO);
    const items = await this.prisma.saleItem.findMany({
      where: { sale: { shopId, status: 'COMPLETED', createdAt: { gte: from, lte: to } } },
      select: { name: true, quantity: true, lineTotal: true },
    });
    const map = new Map<string, { name: string; qty: number; revenue: number }>();
    for (const it of items) {
      const row = map.get(it.name) ?? { name: it.name, qty: 0, revenue: 0 };
      row.qty += num(it.quantity);
      row.revenue += num(it.lineTotal);
      map.set(it.name, row);
    }
    return [...map.values()]
      .map((r) => ({ ...r, qty: Math.round(r.qty * 1000) / 1000, revenue: Math.round(r.revenue * 100) / 100 }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, limit);
  }

  /** Sales grouped by the staff member who billed (staff performance). */
  async getSalesByStaff(shopId: string, fromISO?: string, toISO?: string) {
    const { from, to } = this.range(fromISO, toISO);
    const sales = await this.prisma.sale.findMany({
      where: { shopId, status: 'COMPLETED', createdAt: { gte: from, lte: to } },
      select: { total: true, user: { select: { id: true, fullName: true } } },
    });
    const map = new Map<string, { name: string; count: number; total: number }>();
    for (const s of sales) {
      const key = s.user?.id ?? 'unassigned';
      const row = map.get(key) ?? { name: s.user?.fullName ?? 'Unassigned', count: 0, total: 0 };
      row.count += 1;
      row.total += num(s.total);
      map.set(key, row);
    }
    return [...map.values()]
      .map((r) => ({ ...r, total: Math.round(r.total * 100) / 100 }))
      .sort((a, b) => b.total - a.total);
  }

  /** Sales grouped by product category. */
  async getSalesByCategory(shopId: string, fromISO?: string, toISO?: string) {
    const { from, to } = this.range(fromISO, toISO);
    const items = await this.prisma.saleItem.findMany({
      where: { sale: { shopId, status: 'COMPLETED', createdAt: { gte: from, lte: to } } },
      select: { lineTotal: true, quantity: true, product: { select: { category: { select: { name: true } } } } },
    });
    const map = new Map<string, { category: string; qty: number; revenue: number }>();
    for (const it of items) {
      const cat = it.product?.category?.name ?? 'Uncategorized';
      const row = map.get(cat) ?? { category: cat, qty: 0, revenue: 0 };
      row.qty += num(it.quantity);
      row.revenue += num(it.lineTotal);
      map.set(cat, row);
    }
    return [...map.values()]
      .map((r) => ({ ...r, qty: Math.round(r.qty * 1000) / 1000, revenue: Math.round(r.revenue * 100) / 100 }))
      .sort((a, b) => b.revenue - a.revenue);
  }

  /** Sales totals bucketed by hour or day for a trend chart. */
  async getSalesTrend(shopId: string, fromISO?: string, toISO?: string, bucket: 'hour' | 'day' = 'hour') {
    const { from, to } = this.range(fromISO, toISO);
    const sales = await this.prisma.sale.findMany({
      where: { shopId, status: 'COMPLETED', createdAt: { gte: from, lte: to } },
      select: { total: true, createdAt: true },
    });
    const map = new Map<string, number>();
    for (const s of sales) {
      const d = new Date(s.createdAt);
      const key = bucket === 'day'
        ? d.toISOString().slice(0, 10)
        : `${String(d.getHours()).padStart(2, '0')}:00`;
      map.set(key, (map.get(key) ?? 0) + num(s.total));
    }
    if (bucket === 'hour') {
      // Fill all 24 hours for a smooth axis.
      const rows = Array.from({ length: 24 }, (_, h) => {
        const label = `${String(h).padStart(2, '0')}:00`;
        return { label, total: Math.round((map.get(label) ?? 0) * 100) / 100 };
      });
      return rows;
    }
    return [...map.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([label, total]) => ({ label, total: Math.round(total * 100) / 100 }));
  }

  /** Sales split by service type (dine-in / takeaway / counter). */
  async getServiceSplit(shopId: string, fromISO?: string, toISO?: string) {
    const { from, to } = this.range(fromISO, toISO);
    const sales = await this.prisma.sale.findMany({
      where: { shopId, status: 'COMPLETED', createdAt: { gte: from, lte: to } },
      select: { id: true, total: true },
    });
    const saleIds = sales.map((s) => s.id);
    const orders = saleIds.length
      ? await this.prisma.order.findMany({ where: { shopId, saleId: { in: saleIds } }, select: { saleId: true, orderType: true } })
      : [];
    const typeOf = new Map(orders.map((o) => [o.saleId!, o.orderType]));
    const totals: Record<string, number> = { DINE_IN: 0, TAKEAWAY: 0, COUNTER: 0 };
    for (const s of sales) {
      const t = typeOf.get(s.id) ?? 'COUNTER';
      totals[t] = (totals[t] ?? 0) + num(s.total);
    }
    return [
      { type: 'Dine-in', total: Math.round(totals.DINE_IN * 100) / 100 },
      { type: 'Takeaway', total: Math.round(totals.TAKEAWAY * 100) / 100 },
      { type: 'Counter', total: Math.round(totals.COUNTER * 100) / 100 },
    ];
  }

  /** Waiter performance — orders taken, settled, and sales value per waiter. */
  async getWaiterPerformance(shopId: string, fromISO?: string, toISO?: string) {
    const { from, to } = this.range(fromISO, toISO);
    const orders = await this.prisma.order.findMany({
      where: { shopId, waiterId: { not: null }, createdAt: { gte: from, lte: to } },
      select: { waiterId: true, status: true, saleId: true, waiter: { select: { fullName: true } } },
    });
    const saleIds = orders.map((o) => o.saleId).filter(Boolean) as string[];
    const sales = saleIds.length
      ? await this.prisma.sale.findMany({ where: { id: { in: saleIds } }, select: { id: true, total: true } })
      : [];
    const saleTotal = new Map(sales.map((s) => [s.id, num(s.total)]));

    const map = new Map<string, { name: string; orders: number; settled: number; salesTotal: number }>();
    for (const o of orders) {
      const row = map.get(o.waiterId!) ?? { name: o.waiter?.fullName ?? 'Unknown', orders: 0, settled: 0, salesTotal: 0 };
      row.orders += 1;
      if (o.status === 'SETTLED') {
        row.settled += 1;
        row.salesTotal += saleTotal.get(o.saleId!) ?? 0;
      }
      map.set(o.waiterId!, row);
    }
    return [...map.values()]
      .map((r) => ({ ...r, salesTotal: Math.round(r.salesTotal * 100) / 100, avgTicket: r.settled ? Math.round((r.salesTotal / r.settled) * 100) / 100 : 0 }))
      .sort((a, b) => b.salesTotal - a.salesTotal);
  }

  /** Day-end (Z) report — sales summary + payment-mode breakdown for a date range. */
  async getDayEnd(shopId: string, fromISO?: string, toISO?: string) {
    const now = new Date();
    const from = fromISO ? new Date(fromISO) : new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const to = toISO ? new Date(toISO) : new Date(from.getFullYear(), from.getMonth(), from.getDate(), 23, 59, 59, 999);

    const sales = await this.prisma.sale.findMany({
      where: { shopId, status: 'COMPLETED', createdAt: { gte: from, lte: to } },
    });
    const sum = (f: (s: (typeof sales)[number]) => unknown) =>
      Math.round(sales.reduce((acc, s) => acc + num(f(s)), 0) * 100) / 100;

    const grouped = await this.prisma.payment.groupBy({
      by: ['method'],
      where: { shopId, status: 'PAID', createdAt: { gte: from, lte: to } },
      _sum: { amount: true },
    });

    const subtotal = sum((s) => s.subtotal);
    const cogs = sum((s) => s.cogs);
    return {
      from,
      to,
      count: sales.length,
      subtotal,
      discount: sum((s) => s.discount),
      serviceCharge: sum((s) => s.serviceCharge),
      tax: sum((s) => s.tax),
      roundOff: sum((s) => s.roundOff),
      total: sum((s) => s.total),
      cogs,
      grossProfit: Math.round((subtotal - cogs) * 100) / 100,
      payments: grouped.map((g) => ({ method: g.method, amount: num(g._sum.amount) })),
    };
  }

  /** Tax summary — taxable base and tax collected over a range. */
  async getTaxSummary(shopId: string, fromISO?: string, toISO?: string) {
    const now = new Date();
    const from = fromISO ? new Date(fromISO) : new Date(now.getFullYear(), now.getMonth(), 1);
    const to = toISO ? new Date(toISO) : now;
    const sales = await this.prisma.sale.findMany({
      where: { shopId, status: 'COMPLETED', createdAt: { gte: from, lte: to } },
    });
    const taxable = Math.round(sales.reduce((a, s) => a + num(s.subtotal) - num(s.discount), 0) * 100) / 100;
    const tax = Math.round(sales.reduce((a, s) => a + num(s.tax), 0) * 100) / 100;
    return { from, to, count: sales.length, taxable, tax };
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
