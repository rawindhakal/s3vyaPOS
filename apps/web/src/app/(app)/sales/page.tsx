'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import type { PaymentMethod } from '@s3vya/types';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth-store';
import { money } from '@/lib/format';
import { Modal } from '@/components/Modal';

export default function SalesPage() {
  const currency = useAuth((s) => s.user?.currency ?? 'NPR');
  const qc = useQueryClient();
  const [ret, setRet] = useState<any>(null);
  const [qtys, setQtys] = useState<Record<string, number>>({});
  const [refundMethod, setRefundMethod] = useState<PaymentMethod>('CASH');

  const { data: sales = [], isLoading } = useQuery<any[]>({
    queryKey: ['sales'], queryFn: async () => (await api.get('/sales')).data,
  });

  const doReturn = useMutation({
    mutationFn: () => api.post(`/sales/${ret.id}/returns`, {
      items: Object.entries(qtys).filter(([, q]) => q > 0).map(([saleItemId, quantity]) => ({ saleItemId, quantity })),
      refundMethod,
    }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['sales'] }); setRet(null); setQtys({}); toast.success('Return processed'); },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Return failed'),
  });

  const openReturn = (s: any) => { setRet(s); setQtys({}); setRefundMethod('CASH'); };

  return (
    <div className="p-6">
      <h1 className="mb-4 text-2xl font-bold">Sales history</h1>
      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b bg-slate-50 text-left text-slate-500">
            <tr>
              <th className="p-3">Invoice</th><th className="p-3">Date</th><th className="p-3">Customer</th>
              <th className="p-3 text-right">Total</th><th className="p-3 text-right">Refunded</th><th className="p-3">Paid via</th><th className="p-3"></th>
            </tr>
          </thead>
          <tbody>
            {isLoading && <tr><td className="p-3" colSpan={7}>Loading…</td></tr>}
            {sales.map((s) => (
              <tr key={s.id} className="border-b last:border-0">
                <td className="p-3 font-medium">{s.invoiceNo}</td>
                <td className="p-3">{new Date(s.createdAt).toLocaleString()}</td>
                <td className="p-3">{s.customer?.name ?? 'Walk-in'}</td>
                <td className="p-3 text-right">{money(Number(s.total), currency)}</td>
                <td className="p-3 text-right">{Number(s.refundedTotal) ? money(Number(s.refundedTotal), currency) : '—'}</td>
                <td className="p-3 text-xs text-slate-500">{s.payments?.map((p: any) => p.method).join(', ')}</td>
                <td className="p-3 text-right"><button className="text-brand hover:underline" onClick={() => openReturn(s)}>Return</button></td>
              </tr>
            ))}
            {!isLoading && sales.length === 0 && <tr><td className="p-6 text-center text-slate-400" colSpan={7}>No sales yet.</td></tr>}
          </tbody>
        </table>
      </div>

      <Modal open={!!ret} title={`Return · ${ret?.invoiceNo ?? ''}`} onClose={() => setRet(null)}>
        {ret && (
          <div className="space-y-3 text-sm">
            {ret.items?.map((it: any) => (
              <div key={it.id} className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="truncate font-medium">{it.name}</div>
                  <div className="text-xs text-slate-500">sold {Number(it.quantity)} · {money(Number(it.unitPrice), currency)}</div>
                </div>
                <input className="input h-8 w-20 text-right" type="number" min={0} max={Number(it.quantity)}
                  value={qtys[it.id] ?? 0}
                  onChange={(e) => setQtys({ ...qtys, [it.id]: Math.min(Number(e.target.value), Number(it.quantity)) })} />
              </div>
            ))}
            <label className="block">Refund via
              <select className="input" value={refundMethod} onChange={(e) => setRefundMethod(e.target.value as PaymentMethod)}>
                {['CASH', 'BANK', 'QR', 'STORE_CREDIT'].map((m) => <option key={m} value={m}>{m.replace('_', ' ')}</option>)}
              </select>
            </label>
            <button className="btn-primary w-full" disabled={doReturn.isPending || !Object.values(qtys).some((q) => q > 0)} onClick={() => doReturn.mutate()}>
              {doReturn.isPending ? 'Processing…' : 'Process return'}
            </button>
          </div>
        )}
      </Modal>
    </div>
  );
}
