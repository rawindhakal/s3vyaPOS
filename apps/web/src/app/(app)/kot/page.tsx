'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { api } from '@/lib/api';

interface Order {
  id: string;
  orderType: string;
  createdAt: string;
  table: { name: string } | null;
  items: { id: string; name: string; quantity: string; note: string | null }[];
}

export default function KotPage() {
  const { data: orders = [], isLoading } = useQuery<Order[]>({
    queryKey: ['open-orders'],
    queryFn: async () => (await api.get('/orders/open')).data,
    refetchInterval: 5000,
  });

  const active = orders.filter((o) => o.items.length > 0);

  return (
    <div className="p-6">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Running Orders</h1>
        <span className="text-sm text-slate-500">Auto-refreshing · {active.length} active</span>
      </div>

      {isLoading && <p className="text-slate-500">Loading…</p>}
      {!isLoading && active.length === 0 && <p className="text-slate-400">No active orders.</p>}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {active.map((o) => (
          <Link key={o.id} href={`/orders/${o.id}`} className="card flex flex-col p-4 transition hover:shadow-md">
            <div className="mb-2 flex items-center justify-between">
              <span className="font-bold">{o.table?.name ? `Table ${o.table.name}` : o.orderType}</span>
              <span className="text-xs text-slate-400">{new Date(o.createdAt).toLocaleTimeString()}</span>
            </div>
            <ul className="space-y-1 text-sm">
              {o.items.map((it) => (
                <li key={it.id} className="flex justify-between">
                  <span>{it.name}{it.note ? ` — ${it.note}` : ''}</span>
                  <span className="font-semibold">×{Number(it.quantity)}</span>
                </li>
              ))}
            </ul>
          </Link>
        ))}
      </div>
    </div>
  );
}
