'use client';

import { useAuth } from '@/lib/auth-store';
import { money } from '@/lib/format';

export interface LedgerEntry {
  date: string;
  description: string;
  reference: string | null;
  debit: number;
  credit: number;
  balance: number;
}
export interface LedgerData {
  account: { code: string; name: string; type: string } | null;
  entries: LedgerEntry[];
}

export function LedgerView({ data, loading }: { data?: LedgerData; loading?: boolean }) {
  const currency = useAuth((s) => s.user?.currency ?? 'NPR');
  if (loading) return <p className="text-slate-500">Loading…</p>;
  if (!data?.account) return <p className="text-slate-400">Select an account to view its ledger.</p>;

  const totalDebit = data.entries.reduce((s, e) => s + e.debit, 0);
  const totalCredit = data.entries.reduce((s, e) => s + e.credit, 0);

  return (
    <div className="card overflow-x-auto">
      <div className="border-b p-3 font-semibold">
        {data.account.code} · {data.account.name}
      </div>
      <table className="w-full text-sm">
        <thead className="border-b bg-slate-50 text-left text-slate-500">
          <tr>
            <th className="p-3">Date</th>
            <th className="p-3">Description</th>
            <th className="p-3 text-right">Debit</th>
            <th className="p-3 text-right">Credit</th>
            <th className="p-3 text-right">Balance</th>
          </tr>
        </thead>
        <tbody>
          {data.entries.map((e, i) => (
            <tr key={i} className="border-b last:border-0">
              <td className="p-3">{new Date(e.date).toLocaleDateString()}</td>
              <td className="p-3">{e.description}{e.reference ? ` (${e.reference})` : ''}</td>
              <td className="p-3 text-right">{e.debit ? money(e.debit, currency) : ''}</td>
              <td className="p-3 text-right">{e.credit ? money(e.credit, currency) : ''}</td>
              <td className="p-3 text-right font-medium">{money(e.balance, currency)}</td>
            </tr>
          ))}
          {data.entries.length === 0 && (
            <tr><td className="p-6 text-center text-slate-400" colSpan={5}>No transactions.</td></tr>
          )}
        </tbody>
        {data.entries.length > 0 && (
          <tfoot>
            <tr className="border-t-2 font-semibold">
              <td className="p-3" colSpan={2}>Total</td>
              <td className="p-3 text-right">{money(totalDebit, currency)}</td>
              <td className="p-3 text-right">{money(totalCredit, currency)}</td>
              <td className="p-3"></td>
            </tr>
          </tfoot>
        )}
      </table>
    </div>
  );
}
