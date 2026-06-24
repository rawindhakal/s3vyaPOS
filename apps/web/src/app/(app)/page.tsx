'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth-store';
import { money } from '@/lib/format';

export default function Dashboard() {
  const { user } = useAuth();
  const currency = user?.currency ?? 'NPR';

  const { data: day } = useQuery<any>({ queryKey: ['day-end'], queryFn: async () => (await api.get('/accounting/reports/day-end')).data });
  const { data: tables = [] } = useQuery<any[]>({ queryKey: ['tables'], queryFn: async () => (await api.get('/tables')).data });
  const { data: pending = [] } = useQuery<any[]>({ queryKey: ['pending-kot'], queryFn: async () => (await api.get('/orders/pending-kot')).data });
  const { data: low = [] } = useQuery<any[]>({ queryKey: ['low-stock'], queryFn: async () => (await api.get('/products/stock/low')).data });
  const { data: top = [] } = useQuery<any[]>({ queryKey: ['top-today'], queryFn: async () => (await api.get('/accounting/reports/top-items')).data });

  const occupied = tables.filter((t) => t.status === 'OCCUPIED').length;
  const avgTicket = day && day.count ? day.total / day.count : 0;

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold">Good day, {user?.fullName?.split(' ')[0]} 👋</h1>
        <p className="text-slate-500">{user?.shopName} · today’s overview</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi label="Today's Sales" value={money(day?.total ?? 0, currency)} accent="from-brand/15" icon="💰" />
        <Kpi label="Bills" value={String(day?.count ?? 0)} accent="from-sky-100" icon="🧾" />
        <Kpi label="Gross Profit" value={money(day?.grossProfit ?? 0, currency)} accent="from-green-100" icon="📈" />
        <Kpi label="Avg Ticket" value={money(avgTicket, currency)} accent="from-amber-100" icon="🎯" />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Link href="/tables" className="card flex items-center justify-between p-5 transition hover:shadow-md">
          <div><div className="text-3xl font-bold">{occupied}<span className="text-base text-slate-400">/{tables.length}</span></div><div className="text-sm text-slate-500">Tables occupied</div></div>
          <span className="text-3xl">🍽️</span>
        </Link>
        <Link href="/kot" className="card flex items-center justify-between p-5 transition hover:shadow-md">
          <div><div className="text-3xl font-bold">{pending.length}</div><div className="text-sm text-slate-500">Orders awaiting kitchen</div></div>
          <span className="text-3xl">👨‍🍳</span>
        </Link>
        <Link href="/inventory" className="card flex items-center justify-between p-5 transition hover:shadow-md">
          <div><div className={`text-3xl font-bold ${low.length ? 'text-amber-600' : ''}`}>{low.length}</div><div className="text-sm text-slate-500">Low-stock items</div></div>
          <span className="text-3xl">📦</span>
        </Link>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="card p-5">
          <h2 className="mb-3 font-semibold">Collections by mode (today)</h2>
          {day?.payments?.length ? (
            <div className="space-y-2 text-sm">
              {day.payments.map((p: any) => (
                <div key={p.method} className="flex items-center justify-between">
                  <span className="rounded bg-slate-100 px-2 py-0.5 text-xs">{p.method}</span>
                  <span className="font-medium">{money(p.amount, currency)}</span>
                </div>
              ))}
            </div>
          ) : <p className="text-slate-400">No collections yet today.</p>}
        </div>
        <div className="card p-5">
          <h2 className="mb-3 font-semibold">Top sellers</h2>
          {top.length ? (
            <div className="space-y-2 text-sm">
              {top.slice(0, 6).map((t: any) => (
                <div key={t.name} className="flex items-center justify-between">
                  <span>{t.name}</span>
                  <span className="text-slate-500">{t.qty} · {money(t.revenue, currency)}</span>
                </div>
              ))}
            </div>
          ) : <p className="text-slate-400">No sales yet.</p>}
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <Link href="/pos" className="btn-primary">Open POS</Link>
        <Link href="/tables" className="btn-ghost">Floor / Tables</Link>
        <Link href="/reports" className="btn-ghost">Reports</Link>
        <Link href="/accounting/day-end" className="btn-ghost">Day-end</Link>
      </div>
    </div>
  );
}

function Kpi({ label, value, accent, icon }: { label: string; value: string; accent: string; icon: string }) {
  return (
    <div className={`card bg-gradient-to-br ${accent} to-white p-5`}>
      <div className="flex items-center justify-between">
        <span className="text-sm text-slate-600">{label}</span>
        <span className="text-xl">{icon}</span>
      </div>
      <div className="mt-2 text-2xl font-bold">{value}</div>
    </div>
  );
}
