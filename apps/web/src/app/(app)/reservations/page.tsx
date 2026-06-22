'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { api } from '@/lib/api';
import { Modal } from '@/components/Modal';

interface Reservation {
  id: string; customerName: string; phone: string | null; partySize: number;
  reservedAt: string; status: string; table: { name: string } | null;
}
const STATUSES = ['BOOKED', 'SEATED', 'COMPLETED', 'CANCELLED', 'NO_SHOW'];

export default function ReservationsPage() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ customerName: '', phone: '', partySize: 2, reservedAt: '', tableId: '', note: '' });

  const { data: list = [], isLoading } = useQuery<Reservation[]>({
    queryKey: ['reservations'], queryFn: async () => (await api.get('/reservations')).data,
  });
  const { data: tables = [] } = useQuery<any[]>({
    queryKey: ['tables'], queryFn: async () => (await api.get('/tables')).data,
  });

  const create = useMutation({
    mutationFn: () => api.post('/reservations', { ...form, tableId: form.tableId || undefined, reservedAt: new Date(form.reservedAt).toISOString() }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['reservations'] }); setOpen(false); toast.success('Reserved'); },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Failed'),
  });
  const setStatus = useMutation({
    mutationFn: (v: { id: string; status: string }) => api.patch(`/reservations/${v.id}`, { status: v.status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['reservations'] }),
  });

  return (
    <div className="p-6">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Reservations</h1>
        <button className="btn-primary" onClick={() => setOpen(true)}>+ New reservation</button>
      </div>
      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b bg-slate-50 text-left text-slate-500">
            <tr><th className="p-3">When</th><th className="p-3">Customer</th><th className="p-3">Party</th><th className="p-3">Table</th><th className="p-3">Status</th></tr>
          </thead>
          <tbody>
            {isLoading && <tr><td className="p-3" colSpan={5}>Loading…</td></tr>}
            {list.map((r) => (
              <tr key={r.id} className="border-b last:border-0">
                <td className="p-3">{new Date(r.reservedAt).toLocaleString()}</td>
                <td className="p-3 font-medium">{r.customerName}{r.phone ? ` · ${r.phone}` : ''}</td>
                <td className="p-3">{r.partySize}</td>
                <td className="p-3">{r.table?.name ?? '—'}</td>
                <td className="p-3">
                  <select className="input h-8" value={r.status} onChange={(e) => setStatus.mutate({ id: r.id, status: e.target.value })}>
                    {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </td>
              </tr>
            ))}
            {!isLoading && list.length === 0 && <tr><td className="p-6 text-center text-slate-400" colSpan={5}>No reservations.</td></tr>}
          </tbody>
        </table>
      </div>

      <Modal open={open} title="New reservation" onClose={() => setOpen(false)}>
        <div className="space-y-3">
          <input className="input" placeholder="Customer name" value={form.customerName} onChange={(e) => setForm({ ...form, customerName: e.target.value })} />
          <input className="input" placeholder="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          <div className="grid grid-cols-2 gap-3">
            <label className="text-sm">Party size
              <input className="input" type="number" value={form.partySize} onChange={(e) => setForm({ ...form, partySize: Number(e.target.value) })} />
            </label>
            <label className="text-sm">Table
              <select className="input" value={form.tableId} onChange={(e) => setForm({ ...form, tableId: e.target.value })}>
                <option value="">Unassigned</option>
                {tables.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </label>
          </div>
          <label className="block text-sm">Date & time
            <input className="input" type="datetime-local" value={form.reservedAt} onChange={(e) => setForm({ ...form, reservedAt: e.target.value })} />
          </label>
          <button className="btn-primary w-full" disabled={create.isPending || !form.reservedAt} onClick={() => create.mutate()}>
            {create.isPending ? 'Saving…' : 'Reserve'}
          </button>
        </div>
      </Modal>
    </div>
  );
}
