'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth-store';
import { money } from '@/lib/format';
import { PrintButton } from '@/components/PrintButton';

interface Row { code: string; name: string; type: string; debit: number; credit: number }
interface TB { rows: Row[]; totalDebit: number; totalCredit: number; balanced: boolean }

export default function TrialBalancePage() {
  const currency = useAuth((s) => s.user?.currency ?? 'NPR');
  const { data, isLoading } = useQuery<TB>({
    queryKey: ['trial-balance'],
    queryFn: async () => (await api.get('/accounting/reports/trial-balance')).data,
  });

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-semibold">Trial Balance</h2>
        <PrintButton />
      </div>
      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b bg-slate-50 text-left text-slate-500">
            <tr>
              <th className="p-3">Code</th>
              <th className="p-3">Account</th>
              <th className="p-3 text-right">Debit</th>
              <th className="p-3 text-right">Credit</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && <tr><td className="p-3" colSpan={4}>Loading…</td></tr>}
            {data?.rows.map((r) => (
              <tr key={r.code} className="border-b last:border-0">
                <td className="p-3 text-slate-500">{r.code}</td>
                <td className="p-3 font-medium">{r.name}</td>
                <td className="p-3 text-right">{r.debit ? money(r.debit, currency) : ''}</td>
                <td className="p-3 text-right">{r.credit ? money(r.credit, currency) : ''}</td>
              </tr>
            ))}
          </tbody>
          {data && (
            <tfoot>
              <tr className="border-t-2 font-semibold">
                <td className="p-3" colSpan={2}>
                  Total {data.balanced ? <span className="text-green-600">✓ balanced</span> : <span className="text-red-600">✗ unbalanced</span>}
                </td>
                <td className="p-3 text-right">{money(data.totalDebit, currency)}</td>
                <td className="p-3 text-right">{money(data.totalCredit, currency)}</td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
}
