'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth-store';
import { money } from '@/lib/format';
import { Modal } from '@/components/Modal';

interface Customer { id: string; name: string; phone: string | null; balance: string; loyaltyPoints: string; storeCredit: string }

export default function CustomersPage() {
  const currency = useAuth((s) => s.user?.currency ?? 'NPR');
  const qc = useQueryClient();
  const [selected, setSelected] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState({ name: '', phone: '' });

  const { data: customers = [] } = useQuery<Customer[]>({
    queryKey: ['customers'], queryFn: async () => (await api.get('/customers')).data,
  });
  const { data: statement } = useQuery<any>({
    queryKey: ['customer-statement', selected],
    queryFn: async () => (await api.get(`/customers/${selected}/statement`)).data,
    enabled: !!selected,
  });

  const add = useMutation({
    mutationFn: () => api.post('/customers', form),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['customers'] }); setAddOpen(false); setForm({ name: '', phone: '' }); toast.success('Customer added'); },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Failed'),
  });

  return (
    <div className="p-6">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Customers</h1>
        <button className="btn-primary" onClick={() => setAddOpen(true)}>+ Add customer</button>
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="card overflow-y-auto lg:max-h-[75vh]">
          <table className="w-full text-sm">
            <thead className="border-b bg-slate-50 text-left text-slate-500">
              <tr><th className="p-3">Name</th><th className="p-3 text-right">Due</th></tr>
            </thead>
            <tbody>
              {customers.map((c) => (
                <tr key={c.id} className={`cursor-pointer border-b last:border-0 hover:bg-slate-50 ${selected === c.id ? 'bg-brand/5' : ''}`} onClick={() => setSelected(c.id)}>
                  <td className="p-3 font-medium">{c.name}<div className="text-xs text-slate-400">{c.phone}</div></td>
                  <td className="p-3 text-right">{money(Number(c.balance), currency)}</td>
                </tr>
              ))}
              {customers.length === 0 && <tr><td className="p-6 text-center text-slate-400" colSpan={2}>No customers.</td></tr>}
            </tbody>
          </table>
        </div>

        <div className="lg:col-span-2">
          {!selected && <div className="card p-6 text-slate-400">Select a customer to view their ledger.</div>}
          {selected && statement && (
            <div className="space-y-4">
              <div className="card p-4">
                <h2 className="text-lg font-bold">{statement.customer.name}</h2>
                <div className="mt-2 grid grid-cols-3 gap-3 text-sm">
                  <div><div className="text-slate-400">Due (receivable)</div><div className="font-semibold">{money(Number(statement.customer.balance), currency)}</div></div>
                  <div><div className="text-slate-400">Loyalty points</div><div className="font-semibold">{Number(statement.customer.loyaltyPoints)}</div></div>
                  <div><div className="text-slate-400">Store credit</div><div className="font-semibold">{money(Number(statement.customer.storeCredit), currency)}</div></div>
                </div>
              </div>

              <div className="card overflow-x-auto">
                <h3 className="p-3 font-semibold">Sales</h3>
                <table className="w-full text-sm">
                  <thead className="border-y bg-slate-50 text-left text-slate-500"><tr><th className="p-3">Invoice</th><th className="p-3">Date</th><th className="p-3 text-right">Total</th></tr></thead>
                  <tbody>
                    {statement.sales.map((s: any) => (
                      <tr key={s.id} className="border-b last:border-0"><td className="p-3">{s.invoiceNo}</td><td className="p-3">{new Date(s.createdAt).toLocaleDateString()}</td><td className="p-3 text-right">{money(Number(s.total), currency)}</td></tr>
                    ))}
                    {statement.sales.length === 0 && <tr><td className="p-3 text-slate-400" colSpan={3}>No sales.</td></tr>}
                  </tbody>
                </table>
              </div>

              <div className="card overflow-x-auto">
                <h3 className="p-3 font-semibold">Receipts</h3>
                <table className="w-full text-sm">
                  <thead className="border-y bg-slate-50 text-left text-slate-500"><tr><th className="p-3">Date</th><th className="p-3">Method</th><th className="p-3 text-right">Amount</th></tr></thead>
                  <tbody>
                    {statement.receipts.map((r: any) => (
                      <tr key={r.id} className="border-b last:border-0"><td className="p-3">{new Date(r.createdAt).toLocaleDateString()}</td><td className="p-3">{r.method}</td><td className="p-3 text-right">{money(Number(r.amount), currency)}</td></tr>
                    ))}
                    {statement.receipts.length === 0 && <tr><td className="p-3 text-slate-400" colSpan={3}>No receipts.</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>

      <Modal open={addOpen} title="Add customer" onClose={() => setAddOpen(false)}>
        <div className="space-y-3">
          <input className="input" placeholder="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <input className="input" placeholder="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          <button className="btn-primary w-full" disabled={add.isPending} onClick={() => add.mutate()}>{add.isPending ? 'Saving…' : 'Save'}</button>
        </div>
      </Modal>
    </div>
  );
}
