'use client';

import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth-store';
import { money } from '@/lib/format';
import { Modal } from '@/components/Modal';

interface Table {
  id: string;
  name: string;
  area: string | null;
  seats: number;
  status: 'FREE' | 'OCCUPIED' | 'RESERVED';
  openOrderId: string | null;
  openOrderItems: number;
  openOrderTotal: number;
}

const STATUS_STYLES: Record<Table['status'], string> = {
  FREE: 'border-slate-200 bg-white hover:border-brand',
  OCCUPIED: 'border-amber-300 bg-amber-50',
  RESERVED: 'border-sky-300 bg-sky-50',
};

export default function TablesPage() {
  const currency = useAuth((s) => s.user?.currency ?? 'NPR');
  const router = useRouter();
  const qc = useQueryClient();
  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState({ name: '', area: '', seats: 4 });

  const { data: tables = [], isLoading } = useQuery<Table[]>({
    queryKey: ['tables'],
    queryFn: async () => (await api.get('/tables')).data,
    refetchInterval: 10000,
  });

  const areas = useMemo(() => {
    const groups: Record<string, Table[]> = {};
    for (const t of tables) {
      const key = t.area || 'Main';
      (groups[key] ??= []).push(t);
    }
    return groups;
  }, [tables]);

  const addTable = useMutation({
    mutationFn: () => api.post('/tables', form),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tables'] });
      setAddOpen(false);
      setForm({ name: '', area: '', seats: 4 });
      toast.success('Table added');
    },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Failed'),
  });

  const openTable = useMutation({
    mutationFn: async (t: Table) => {
      if (t.openOrderId) return { id: t.openOrderId };
      const { data } = await api.post('/orders', { tableId: t.id, orderType: 'DINE_IN' });
      return data;
    },
    onSuccess: (order: any) => router.push(`/orders/${order.id}`),
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Failed'),
  });

  const newCounter = useMutation({
    mutationFn: async () => (await api.post('/orders', { orderType: 'COUNTER' })).data,
    onSuccess: (order: any) => router.push(`/orders/${order.id}`),
  });

  return (
    <div className="p-6">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Floor / Tables</h1>
        <div className="flex gap-2">
          <button className="btn-ghost" onClick={() => newCounter.mutate()}>+ Counter / takeaway order</button>
          <button className="btn-primary" onClick={() => setAddOpen(true)}>+ Add table</button>
        </div>
      </div>

      <div className="mb-4 flex gap-4 text-xs text-slate-500">
        <span>🟢 Free</span><span>🟡 Occupied</span><span>🔵 Reserved</span>
      </div>

      {isLoading && <p className="text-slate-500">Loading…</p>}
      {!isLoading && tables.length === 0 && (
        <p className="text-slate-400">No tables yet. Add your first table.</p>
      )}

      <div className="space-y-6">
        {Object.entries(areas).map(([area, list]) => (
          <div key={area}>
            <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500">{area}</h2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
              {list.map((t) => (
                <button
                  key={t.id}
                  onClick={() => openTable.mutate(t)}
                  className={`flex flex-col items-start rounded-xl border-2 p-4 text-left shadow-sm transition ${STATUS_STYLES[t.status]}`}
                >
                  <div className="flex w-full items-center justify-between">
                    <span className="text-lg font-bold">{t.name}</span>
                    <span className="text-xs text-slate-400">{t.seats} seats</span>
                  </div>
                  <span className="mt-1 text-xs font-medium uppercase text-slate-500">{t.status}</span>
                  {t.openOrderId && (
                    <span className="mt-2 text-sm text-amber-700">
                      {t.openOrderItems} items · {money(t.openOrderTotal, currency)}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      <Modal open={addOpen} title="Add table" onClose={() => setAddOpen(false)}>
        <div className="space-y-3">
          <input className="input" placeholder="Table name (e.g. T1)" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <input className="input" placeholder="Area (e.g. Ground Floor)" value={form.area} onChange={(e) => setForm({ ...form, area: e.target.value })} />
          <label className="text-sm">Seats
            <input className="input" type="number" value={form.seats} onChange={(e) => setForm({ ...form, seats: Number(e.target.value) })} />
          </label>
          <button className="btn-primary w-full" disabled={addTable.isPending} onClick={() => addTable.mutate()}>
            {addTable.isPending ? 'Saving…' : 'Save'}
          </button>
        </div>
      </Modal>
    </div>
  );
}
