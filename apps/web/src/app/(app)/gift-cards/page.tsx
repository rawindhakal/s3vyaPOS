'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import type { PaymentMethod } from '@s3vya/types';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth-store';
import { money } from '@/lib/format';
import { Modal } from '@/components/Modal';

interface GiftCard { id: string; code: string; balance: string; initialBalance: string; status: string }

const STATUS_STYLE: Record<string, string> = {
  ACTIVE: 'text-green-600', USED: 'text-slate-400', EXPIRED: 'text-amber-600', CANCELLED: 'text-red-500',
};

export default function GiftCardsPage() {
  const currency = useAuth((s) => s.user?.currency ?? 'NPR');
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ code: '', amount: 1000, paymentMethod: 'CASH' as PaymentMethod, customerId: '' });

  const { data: cards = [], isLoading } = useQuery<GiftCard[]>({
    queryKey: ['gift-cards'], queryFn: async () => (await api.get('/gift-cards')).data,
  });
  const { data: customers = [] } = useQuery<any[]>({
    queryKey: ['customers'], queryFn: async () => (await api.get('/customers')).data,
  });

  const issue = useMutation({
    mutationFn: () => api.post('/gift-cards', { ...form, customerId: form.customerId || undefined }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['gift-cards'] }); setOpen(false); setForm({ code: '', amount: 1000, paymentMethod: 'CASH', customerId: '' }); toast.success('Gift card issued'); },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Failed'),
  });

  const genCode = () => setForm((f) => ({ ...f, code: 'GC-' + Math.random().toString(36).slice(2, 8).toUpperCase() }));

  return (
    <div className="p-6">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Gift Cards</h1>
        <button className="btn-primary" onClick={() => { genCode(); setOpen(true); }}>+ Issue gift card</button>
      </div>
      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b bg-slate-50 text-left text-slate-500">
            <tr><th className="p-3">Code</th><th className="p-3 text-right">Balance</th><th className="p-3 text-right">Initial</th><th className="p-3">Status</th></tr>
          </thead>
          <tbody>
            {isLoading && <tr><td className="p-3" colSpan={4}>Loading…</td></tr>}
            {cards.map((c) => (
              <tr key={c.id} className="border-b last:border-0">
                <td className="p-3 font-mono font-medium">{c.code}</td>
                <td className="p-3 text-right">{money(Number(c.balance), currency)}</td>
                <td className="p-3 text-right text-slate-500">{money(Number(c.initialBalance), currency)}</td>
                <td className={`p-3 font-medium ${STATUS_STYLE[c.status] ?? ''}`}>{c.status}</td>
              </tr>
            ))}
            {!isLoading && cards.length === 0 && <tr><td className="p-6 text-center text-slate-400" colSpan={4}>No gift cards yet.</td></tr>}
          </tbody>
        </table>
      </div>

      <Modal open={open} title="Issue gift card" onClose={() => setOpen(false)}>
        <div className="space-y-3">
          <div className="flex gap-2">
            <input className="input font-mono" placeholder="Code" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} />
            <button className="btn-ghost" onClick={genCode}>↻</button>
          </div>
          <label className="block text-sm">Amount
            <input className="input" type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: Number(e.target.value) })} />
          </label>
          <label className="block text-sm">Paid by
            <select className="input" value={form.paymentMethod} onChange={(e) => setForm({ ...form, paymentMethod: e.target.value as PaymentMethod })}>
              {['CASH', 'BANK', 'QR'].map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
          </label>
          <label className="block text-sm">Customer (optional)
            <select className="input" value={form.customerId} onChange={(e) => setForm({ ...form, customerId: e.target.value })}>
              <option value="">—</option>
              {customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </label>
          <button className="btn-primary w-full" disabled={issue.isPending || !form.code} onClick={() => issue.mutate()}>
            {issue.isPending ? 'Issuing…' : 'Issue'}
          </button>
        </div>
      </Modal>
    </div>
  );
}
