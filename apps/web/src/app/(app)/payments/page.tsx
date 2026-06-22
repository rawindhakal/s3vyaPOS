'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth-store';
import { money } from '@/lib/format';

const STATUS_STYLE: Record<string, string> = {
  PAID: 'text-green-600', PENDING: 'text-amber-600', FAILED: 'text-red-600', REFUNDED: 'text-slate-500',
};

export default function PaymentsPage() {
  const currency = useAuth((s) => s.user?.currency ?? 'NPR');
  const [status, setStatus] = useState('');
  const { data: payments = [], isLoading } = useQuery<any[]>({
    queryKey: ['payments', status],
    queryFn: async () => (await api.get('/payments', { params: status ? { status } : {} })).data,
  });

  return (
    <div className="p-6">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Payments</h1>
        <select className="input h-9 w-40" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">All statuses</option>
          {['PAID', 'PENDING', 'FAILED', 'REFUNDED'].map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>
      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b bg-slate-50 text-left text-slate-500">
            <tr>
              <th className="p-3">Date</th><th className="p-3">Invoice</th><th className="p-3">Customer</th>
              <th className="p-3">Method</th><th className="p-3 text-right">Amount</th><th className="p-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && <tr><td className="p-3" colSpan={6}>Loading…</td></tr>}
            {payments.map((p) => (
              <tr key={p.id} className="border-b last:border-0">
                <td className="p-3">{new Date(p.createdAt).toLocaleString()}</td>
                <td className="p-3">{p.sale?.invoiceNo ?? '—'}</td>
                <td className="p-3">{p.sale?.customer?.name ?? 'Walk-in'}</td>
                <td className="p-3">{p.method}{p.provider !== 'NONE' ? ` (${p.provider})` : ''}</td>
                <td className="p-3 text-right">{money(Number(p.amount), currency)}</td>
                <td className={`p-3 font-medium ${STATUS_STYLE[p.status] ?? ''}`}>{p.status}</td>
              </tr>
            ))}
            {!isLoading && payments.length === 0 && <tr><td className="p-6 text-center text-slate-400" colSpan={6}>No payments.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
