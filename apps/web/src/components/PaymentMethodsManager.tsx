'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { api } from '@/lib/api';

const METHODS = ['CASH', 'BANK', 'QR', 'CREDIT', 'GIFT_CARD', 'STORE_CREDIT'];
const blank = { name: '', method: 'QR', provider: 'FONEPAY', qrImageUrl: '', instructions: '' };

export function PaymentMethodsManager() {
  const qc = useQueryClient();
  const [form, setForm] = useState<any>(blank);
  const [editing, setEditing] = useState<string | null>(null);

  const { data: channels = [] } = useQuery<any[]>({
    queryKey: ['payment-channels'], queryFn: async () => (await api.get('/payment-channels')).data,
  });

  const reset = () => { setForm(blank); setEditing(null); };
  const refresh = () => qc.invalidateQueries({ queryKey: ['payment-channels'] });

  const save = useMutation({
    mutationFn: () => {
      const payload = {
        name: form.name, method: form.method,
        provider: form.method === 'QR' ? form.provider : undefined,
        qrImageUrl: form.qrImageUrl || undefined,
        instructions: form.instructions || undefined,
      };
      return editing ? api.patch(`/payment-channels/${editing}`, payload) : api.post('/payment-channels', payload);
    },
    onSuccess: () => { refresh(); reset(); toast.success('Payment method saved'); },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Failed'),
  });

  const toggle = useMutation({
    mutationFn: (c: any) => api.patch(`/payment-channels/${c.id}`, { name: c.name, method: c.method, isActive: !c.isActive }),
    onSuccess: refresh,
  });
  const remove = useMutation({
    mutationFn: (id: string) => api.delete(`/payment-channels/${id}`),
    onSuccess: () => { refresh(); toast.success('Removed'); },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Failed'),
  });

  const edit = (c: any) => { setEditing(c.id); setForm({ name: c.name, method: c.method, provider: c.provider ?? 'FONEPAY', qrImageUrl: c.qrImageUrl ?? '', instructions: c.instructions ?? '' }); };
  const set = (k: string) => (e: any) => setForm({ ...form, [k]: e.target.value });

  return (
    <div className="card space-y-4 p-5">
      <h2 className="font-semibold">Payment methods</h2>
      <p className="text-xs text-slate-500">Methods shown at settlement. Add a QR image for wallet/bank QRs; it appears for the cashier to show the customer.</p>

      <div className="space-y-2">
        {channels.length === 0 && <p className="text-sm text-slate-400">No payment methods yet — add one below.</p>}
        {channels.map((c) => (
          <div key={c.id} className="flex items-center justify-between gap-2 rounded-lg ring-1 ring-slate-200 p-2 text-sm dark:ring-slate-700">
            <div className="flex items-center gap-2">
              {c.qrImageUrl
                // eslint-disable-next-line @next/next/no-img-element
                ? <img src={c.qrImageUrl} alt="" className="h-8 w-8 rounded object-cover" />
                : <span className="flex h-8 w-8 items-center justify-center rounded bg-slate-100 text-xs dark:bg-slate-800">{c.method === 'QR' ? 'QR' : c.method[0]}</span>}
              <div>
                <div className="font-medium">{c.name} {!c.isActive && <span className="text-xs text-slate-400">(off)</span>}</div>
                <div className="text-xs text-slate-500">{c.method}{c.provider ? ` · ${c.provider}` : ''}</div>
              </div>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <button className="text-slate-500 hover:underline" onClick={() => toggle.mutate(c)}>{c.isActive ? 'Disable' : 'Enable'}</button>
              <button className="text-brand hover:underline" onClick={() => edit(c)}>Edit</button>
              <button className="text-red-500 hover:underline" onClick={() => remove.mutate(c.id)}>Delete</button>
            </div>
          </div>
        ))}
      </div>

      <div className="space-y-2 border-t pt-3">
        <div className="text-sm font-medium">{editing ? 'Edit method' : 'Add method'}</div>
        <div className="flex gap-2">
          <input className="input h-9 flex-1" placeholder="Name (e.g. Fonepay, Cash)" value={form.name} onChange={set('name')} />
          <select className="input h-9 w-32" value={form.method} onChange={set('method')}>
            {METHODS.map((m) => <option key={m} value={m}>{m.replace('_', ' ')}</option>)}
          </select>
        </div>
        {form.method === 'QR' && (
          <div className="flex gap-2">
            <select className="input h-9 w-32" value={form.provider} onChange={set('provider')}>
              <option value="FONEPAY">Fonepay</option>
              <option value="ESEWA">eSewa</option>
            </select>
            <input className="input h-9 flex-1" placeholder="QR image URL (optional)" value={form.qrImageUrl} onChange={set('qrImageUrl')} />
          </div>
        )}
        <input className="input h-9" placeholder="Instructions shown at settlement (optional)" value={form.instructions} onChange={set('instructions')} />
        <div className="flex gap-2">
          <button className="btn-primary" disabled={!form.name || save.isPending} onClick={() => save.mutate()}>{editing ? 'Update' : 'Add'}</button>
          {editing && <button className="btn-ghost" onClick={reset}>Cancel</button>}
        </div>
      </div>
    </div>
  );
}
