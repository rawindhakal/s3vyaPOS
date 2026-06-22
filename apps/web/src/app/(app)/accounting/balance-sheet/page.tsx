'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth-store';
import { money } from '@/lib/format';
import { PrintButton } from '@/components/PrintButton';

interface Line { code: string; name: string; amount: number }
interface BS {
  assets: Line[];
  liabilities: Line[];
  equity: Line[];
  netIncome: number;
  totalAssets: number;
  totalLiabilities: number;
  totalEquity: number;
  balanced: boolean;
}

function Section({ title, rows, currency, extra }: { title: string; rows: Line[]; currency: string; extra?: { label: string; amount: number } }) {
  return (
    <div className="card p-4">
      <h3 className="mb-2 font-semibold">{title}</h3>
      <table className="w-full text-sm">
        <tbody>
          {rows.map((r) => (
            <tr key={r.code} className="border-b last:border-0">
              <td className="py-1.5 text-slate-600">{r.name}</td>
              <td className="py-1.5 text-right">{money(r.amount, currency)}</td>
            </tr>
          ))}
          {extra && (
            <tr className="border-b last:border-0">
              <td className="py-1.5 text-slate-600">{extra.label}</td>
              <td className="py-1.5 text-right">{money(extra.amount, currency)}</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

export default function BalanceSheetPage() {
  const currency = useAuth((s) => s.user?.currency ?? 'NPR');
  const { data, isLoading } = useQuery<BS>({
    queryKey: ['balance-sheet'],
    queryFn: async () => (await api.get('/accounting/reports/balance-sheet')).data,
  });

  if (isLoading || !data) return <p className="text-slate-500">Loading…</p>;

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-semibold">Balance Sheet</h2>
        <PrintButton />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="space-y-4">
          <Section title="Assets" rows={data.assets} currency={currency} />
          <div className="card flex justify-between p-4 font-semibold">
            <span>Total Assets</span><span>{money(data.totalAssets, currency)}</span>
          </div>
        </div>
        <div className="space-y-4">
          <Section title="Liabilities" rows={data.liabilities} currency={currency} />
          <Section title="Equity" rows={data.equity} currency={currency} extra={{ label: 'Current period net income', amount: data.netIncome }} />
          <div className="card flex justify-between p-4 font-semibold">
            <span>Total Liabilities + Equity</span>
            <span>{money(data.totalLiabilities + data.totalEquity, currency)}</span>
          </div>
        </div>
      </div>
      <p className={`mt-4 text-sm ${data.balanced ? 'text-green-600' : 'text-red-600'}`}>
        {data.balanced ? '✓ Assets = Liabilities + Equity' : '✗ Balance sheet does not balance'}
      </p>
    </div>
  );
}
