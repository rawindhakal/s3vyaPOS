'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

interface Item { id: string; name: string; quantity: string; note: string | null; prepStatus: 'PENDING' | 'READY'; product?: { station: string } }
interface Order { id: string; orderType: string; createdAt: string; table: { name: string } | null; waiter?: { fullName: string } | null; items: Item[] }

const STATIONS = ['ALL', 'KITCHEN', 'BAR'] as const;

export default function KdsPage() {
  const qc = useQueryClient();
  const [station, setStation] = useState<(typeof STATIONS)[number]>('ALL');

  const { data: orders = [] } = useQuery<Order[]>({
    queryKey: ['kds'],
    queryFn: async () => (await api.get('/orders/open')).data,
    refetchInterval: 4000,
  });

  const bump = useMutation({
    mutationFn: (v: { orderId: string; itemId: string }) => api.post(`/orders/${v.orderId}/items/${v.itemId}/bump`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['kds'] }),
  });

  const stationItems = (o: Order) => o.items.filter((i) => station === 'ALL' || (i.product?.station ?? 'KITCHEN') === station);
  const active = orders.map((o) => ({ o, items: stationItems(o) })).filter((x) => x.items.length > 0);
  const elapsed = (iso: string) => Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));

  return (
    <div className="min-h-full bg-slate-900 p-4 text-slate-100">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Kitchen Display</h1>
        <div className="flex gap-2">
          {STATIONS.map((s) => (
            <button key={s} onClick={() => setStation(s)} className={`rounded-lg px-4 py-2 text-sm font-medium ${station === s ? 'bg-brand text-white' : 'bg-slate-800 text-slate-300'}`}>{s}</button>
          ))}
        </div>
      </div>

      {active.length === 0 && <p className="py-20 text-center text-slate-500">No active tickets.</p>}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {active.map(({ o, items }) => {
          const allReady = items.every((i) => i.prepStatus === 'READY');
          const mins = elapsed(o.createdAt);
          return (
            <div key={o.id} className={`rounded-xl border-2 ${allReady ? 'border-green-500 bg-green-950/40' : mins >= 15 ? 'border-red-500 bg-red-950/30' : 'border-slate-700 bg-slate-800'}`}>
              <div className="flex items-center justify-between border-b border-slate-700 px-3 py-2">
                <span className="font-bold">{o.table?.name ? `Table ${o.table.name}` : o.orderType}</span>
                <span className={`text-sm ${mins >= 15 ? 'text-red-400' : 'text-slate-400'}`}>{mins}m</span>
              </div>
              {o.waiter?.fullName && <div className="px-3 pt-1 text-xs text-slate-400">by {o.waiter.fullName}</div>}
              <ul className="space-y-1 p-3">
                {items.map((i) => (
                  <li key={i.id}>
                    <button
                      onClick={() => bump.mutate({ orderId: o.id, itemId: i.id })}
                      className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm ${i.prepStatus === 'READY' ? 'bg-green-700/40 line-through opacity-70' : 'bg-slate-700/60 hover:bg-slate-700'}`}
                    >
                      <span><b>{Number(i.quantity)}×</b> {i.name}{i.note ? ` — ${i.note}` : ''}</span>
                      <span>{i.prepStatus === 'READY' ? '✓' : '○'}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>
    </div>
  );
}
