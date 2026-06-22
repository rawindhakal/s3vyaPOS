'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth-store';
import { money } from '@/lib/format';

export default function SalesPage() {
  const currency = useAuth((s) => s.user?.currency ?? 'NPR');
  const { data: sales = [], isLoading } = useQuery<any[]>({
    queryKey: ['sales'], queryFn: async () => (await api.get('/sales')).data,
  });

  return (
    <div className="p-6">
      <h1 className="mb-4 text-2xl font-bold">Sales history</h1>
      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b bg-slate-50 text-left text-slate-500">
            <tr>
              <th className="p-3">Invoice</th><th className="p-3">Date</th><th className="p-3">Customer</th>
              <th className="p-3 text-right">Items</th><th className="p-3 text-right">Total</th><th className="p-3">Paid via</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && <tr><td className="p-3" colSpan={6}>Loading…</td></tr>}
            {sales.map((s) => (
              <tr key={s.id} className="border-b last:border-0">
                <td className="p-3 font-medium">{s.invoiceNo}</td>
                <td className="p-3">{new Date(s.createdAt).toLocaleString()}</td>
                <td className="p-3">{s.customer?.name ?? 'Walk-in'}</td>
                <td className="p-3 text-right">{s.items?.length ?? 0}</td>
                <td className="p-3 text-right">{money(Number(s.total), currency)}</td>
                <td className="p-3 text-xs text-slate-500">{s.payments?.map((p: any) => p.method).join(', ')}</td>
              </tr>
            ))}
            {!isLoading && sales.length === 0 && <tr><td className="p-6 text-center text-slate-400" colSpan={6}>No sales yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
