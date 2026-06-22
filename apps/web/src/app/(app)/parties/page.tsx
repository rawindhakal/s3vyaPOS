'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import type { PaymentMethod } from '@s3vya/types';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth-store';
import { money } from '@/lib/format';
import { Modal } from '@/components/Modal';

interface Party {
  id: string;
  name: string;
  phone: string | null;
  balance: string;
}
type Tab = 'vendors' | 'customers';

export default function PartiesPage() {
  const currency = useAuth((s) => s.user?.currency ?? 'NPR');
  const qc = useQueryClient();
  const [tab, setTab] = useState<Tab>('vendors');
  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState({ name: '', phone: '', openingBalance: 0 });
  const [settle, setSettle] = useState<Party | null>(null);
  const [settleForm, setSettleForm] = useState({ amount: 0, method: 'CASH' as PaymentMethod });

  const { data: parties = [], isLoading } = useQuery<Party[]>({
    queryKey: [tab],
    queryFn: async () => (await api.get(`/${tab}`)).data,
  });

  const add = useMutation({
    mutationFn: () => api.post(`/${tab}`, form),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [tab] });
      setAddOpen(false);
      setForm({ name: '', phone: '', openingBalance: 0 });
      toast.success('Saved');
    },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Failed'),
  });

  const doSettle = useMutation({
    mutationFn: () => {
      const path = tab === 'vendors' ? `/vendors/${settle!.id}/pay` : `/customers/${settle!.id}/receive`;
      return api.post(path, settleForm);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [tab] });
      setSettle(null);
      setSettleForm({ amount: 0, method: 'CASH' });
      toast.success(tab === 'vendors' ? 'Payment recorded' : 'Receipt recorded');
    },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Failed'),
  });

  const isVendor = tab === 'vendors';
  const balanceLabel = isVendor ? 'Payable' : 'Receivable';

  return (
    <div className="p-6">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Vendors & Customers</h1>
        <button className="btn-primary" onClick={() => setAddOpen(true)}>
          + Add {isVendor ? 'vendor' : 'customer'}
        </button>
      </div>

      <div className="mb-4 flex gap-2">
        {(['vendors', 'customers'] as Tab[]).map((t) => (
          <button key={t} className={tab === t ? 'btn-primary' : 'btn-ghost'} onClick={() => setTab(t)}>
            {t === 'vendors' ? 'Vendors' : 'Customers'}
          </button>
        ))}
      </div>

      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b bg-slate-50 text-left text-slate-500">
            <tr>
              <th className="p-3">Name</th>
              <th className="p-3">Phone</th>
              <th className="p-3 text-right">{balanceLabel}</th>
              <th className="p-3"></th>
            </tr>
          </thead>
          <tbody>
            {isLoading && <tr><td className="p-3" colSpan={4}>Loading…</td></tr>}
            {parties.map((p) => (
              <tr key={p.id} className="border-b last:border-0">
                <td className="p-3 font-medium">{p.name}</td>
                <td className="p-3">{p.phone || <span className="text-slate-400">—</span>}</td>
                <td className="p-3 text-right">{money(Number(p.balance), currency)}</td>
                <td className="p-3 text-right">
                  <button
                    className="text-brand hover:underline"
                    onClick={() => {
                      setSettle(p);
                      setSettleForm({ amount: Number(p.balance) || 0, method: 'CASH' });
                    }}
                  >
                    {isVendor ? 'Pay' : 'Receive'}
                  </button>
                </td>
              </tr>
            ))}
            {!isLoading && parties.length === 0 && (
              <tr><td className="p-6 text-center text-slate-400" colSpan={4}>None yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <Modal open={addOpen} title={`Add ${isVendor ? 'vendor' : 'customer'}`} onClose={() => setAddOpen(false)}>
        <div className="space-y-3">
          <input className="input" placeholder="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <input className="input" placeholder="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          <label className="text-sm">Opening balance ({balanceLabel.toLowerCase()})
            <input className="input" type="number" value={form.openingBalance} onChange={(e) => setForm({ ...form, openingBalance: Number(e.target.value) })} />
          </label>
          <button className="btn-primary w-full" disabled={add.isPending} onClick={() => add.mutate()}>
            {add.isPending ? 'Saving…' : 'Save'}
          </button>
        </div>
      </Modal>

      <Modal
        open={!!settle}
        title={`${isVendor ? 'Pay' : 'Receive from'} ${settle?.name ?? ''}`}
        onClose={() => setSettle(null)}
      >
        <div className="space-y-3">
          <p className="text-sm text-slate-500">
            Outstanding {balanceLabel.toLowerCase()}: {settle && money(Number(settle.balance), currency)}
          </p>
          <label className="text-sm">Amount
            <input className="input" type="number" value={settleForm.amount} onChange={(e) => setSettleForm({ ...settleForm, amount: Number(e.target.value) })} />
          </label>
          <div className="grid grid-cols-3 gap-2">
            {(['CASH', 'BANK', 'QR'] as PaymentMethod[]).map((m) => (
              <button key={m} className={settleForm.method === m ? 'btn-primary' : 'btn-ghost'} onClick={() => setSettleForm({ ...settleForm, method: m })}>
                {m}
              </button>
            ))}
          </div>
          <button className="btn-primary w-full" disabled={doSettle.isPending} onClick={() => doSettle.mutate()}>
            {doSettle.isPending ? 'Processing…' : isVendor ? 'Record payment' : 'Record receipt'}
          </button>
        </div>
      </Modal>
    </div>
  );
}
