'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth-store';
import { money } from '@/lib/format';
import { PrintButton } from '@/components/PrintButton';

interface Line { code: string; name: string; amount: number }
interface PL {
  revenue: Line[];
  expense: Line[];
  totalRevenue: number;
  totalExpense: number;
  netIncome: number;
}

export default function ProfitLossPage() {
  const currency = useAuth((s) => s.user?.currency ?? 'NPR');
  const { data, isLoading } = useQuery<PL>({
    queryKey: ['profit-loss'],
    queryFn: async () => (await api.get('/accounting/reports/income-statement')).data,
  });

  if (isLoading || !data) return <p className="text-slate-500">Loading…</p>;

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-semibold">Profit &amp; Loss</h2>
        <PrintButton />
      </div>
      <div className="card max-w-xl p-5">
        <table className="w-full text-sm">
          <tbody>
            <tr><td className="pb-1 font-semibold text-slate-500" colSpan={2}>Revenue</td></tr>
            {data.revenue.map((r) => (
              <tr key={r.code} className="border-b last:border-0">
                <td className="py-1.5 pl-3 text-slate-600">{r.name}</td>
                <td className="py-1.5 text-right">{money(r.amount, currency)}</td>
              </tr>
            ))}
            <tr className="border-b font-medium">
              <td className="py-2">Total Revenue</td>
              <td className="py-2 text-right">{money(data.totalRevenue, currency)}</td>
            </tr>

            <tr><td className="pb-1 pt-3 font-semibold text-slate-500" colSpan={2}>Expenses</td></tr>
            {data.expense.map((r) => (
              <tr key={r.code} className="border-b last:border-0">
                <td className="py-1.5 pl-3 text-slate-600">{r.name}</td>
                <td className="py-1.5 text-right">{money(r.amount, currency)}</td>
              </tr>
            ))}
            <tr className="border-b font-medium">
              <td className="py-2">Total Expenses</td>
              <td className="py-2 text-right">{money(data.totalExpense, currency)}</td>
            </tr>
          </tbody>
          <tfoot>
            <tr className="border-t-2 text-lg font-bold">
              <td className="py-3">Net {data.netIncome >= 0 ? 'Profit' : 'Loss'}</td>
              <td className={`py-3 text-right ${data.netIncome >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {money(data.netIncome, currency)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
