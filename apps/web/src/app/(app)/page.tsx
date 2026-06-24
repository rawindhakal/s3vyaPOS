'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import {
  Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
  PieChart, Pie, Cell, BarChart, Bar,
} from 'recharts';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth-store';
import { money } from '@/lib/format';

const COLORS = ['#0f766e', '#8b5cf6', '#f97316'];

export default function Dashboard() {
  const { user } = useAuth();
  const currency = user?.currency ?? 'NPR';

  const { data: day } = useQuery<any>({ queryKey: ['day-end'], queryFn: async () => (await api.get('/accounting/reports/day-end')).data });
  const { data: trend = [] } = useQuery<any[]>({ queryKey: ['sales-trend'], queryFn: async () => (await api.get('/accounting/reports/sales-trend', { params: { bucket: 'hour' } })).data });
  const { data: split = [] } = useQuery<any[]>({ queryKey: ['service-split'], queryFn: async () => (await api.get('/accounting/reports/service-split')).data });
  const { data: top = [] } = useQuery<any[]>({ queryKey: ['top-today'], queryFn: async () => (await api.get('/accounting/reports/top-items')).data });
  const { data: tables = [] } = useQuery<any[]>({ queryKey: ['tables'], queryFn: async () => (await api.get('/tables')).data });
  const { data: pending = [] } = useQuery<any[]>({ queryKey: ['pending-kot'], queryFn: async () => (await api.get('/orders/pending-kot')).data });
  const { data: low = [] } = useQuery<any[]>({ queryKey: ['low-stock'], queryFn: async () => (await api.get('/products/stock/low')).data });

  const occupied = tables.filter((t) => t.status === 'OCCUPIED').length;
  const avgTicket = day && day.count ? day.total / day.count : 0;
  const splitTotal = split.reduce((s, r) => s + r.total, 0);

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold">Good day, {user?.fullName?.split(' ')[0]} 👋</h1>
        <p className="text-slate-500">{user?.shopName} · today’s overview</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi label="Today's Sales" value={money(day?.total ?? 0, currency)} accent="from-brand/15" icon="💰" />
        <Kpi label="Bills" value={String(day?.count ?? 0)} accent="from-sky-100 dark:from-sky-900/30" icon="🧾" />
        <Kpi label="Gross Profit" value={money(day?.grossProfit ?? 0, currency)} accent="from-green-100 dark:from-green-900/30" icon="📈" />
        <Kpi label="Avg Ticket" value={money(avgTicket, currency)} accent="from-amber-100 dark:from-amber-900/30" icon="🎯" />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="card p-5 lg:col-span-2">
          <h2 className="mb-3 font-semibold">Sales today (by hour)</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trend} margin={{ left: -18, right: 8, top: 8 }}>
                <defs>
                  <linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#0f766e" stopOpacity={0.5} />
                    <stop offset="100%" stopColor="#0f766e" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="label" tick={{ fontSize: 11 }} interval={3} />
                <YAxis tick={{ fontSize: 11 }} width={48} />
                <Tooltip formatter={(v: any) => money(Number(v), currency)} />
                <Area type="monotone" dataKey="total" stroke="#0f766e" strokeWidth={2} fill="url(#g)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="card p-5">
          <h2 className="mb-3 font-semibold">Service split</h2>
          {splitTotal > 0 ? (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={split} dataKey="total" nameKey="type" innerRadius={50} outerRadius={80} paddingAngle={2}>
                    {split.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={(v: any) => money(Number(v), currency)} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : <p className="py-16 text-center text-slate-400">No sales yet today.</p>}
          <div className="mt-2 flex justify-center gap-4 text-xs">
            {split.map((s, i) => <span key={s.type} className="flex items-center gap-1"><span className="h-2 w-2 rounded-full" style={{ background: COLORS[i] }} />{s.type}</span>)}
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Link href="/tables" className="card flex items-center justify-between p-5 transition hover:shadow-md">
          <div><div className="text-3xl font-bold">{occupied}<span className="text-base text-slate-400">/{tables.length}</span></div><div className="text-sm text-slate-500">Tables occupied</div></div><span className="text-3xl">🍽️</span>
        </Link>
        <Link href="/kot" className="card flex items-center justify-between p-5 transition hover:shadow-md">
          <div><div className="text-3xl font-bold">{pending.length}</div><div className="text-sm text-slate-500">Orders awaiting kitchen</div></div><span className="text-3xl">👨‍🍳</span>
        </Link>
        <Link href="/inventory" className="card flex items-center justify-between p-5 transition hover:shadow-md">
          <div><div className={`text-3xl font-bold ${low.length ? 'text-amber-600' : ''}`}>{low.length}</div><div className="text-sm text-slate-500">Low-stock items</div></div><span className="text-3xl">📦</span>
        </Link>
      </div>

      <div className="card p-5">
        <h2 className="mb-3 font-semibold">Top sellers</h2>
        {top.length ? (
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={top.slice(0, 8)} margin={{ left: -18, right: 8 }}>
                <XAxis dataKey="name" tick={{ fontSize: 10 }} interval={0} angle={-15} textAnchor="end" height={50} />
                <YAxis tick={{ fontSize: 11 }} width={48} />
                <Tooltip formatter={(v: any) => money(Number(v), currency)} />
                <Bar dataKey="revenue" fill="#0f766e" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : <p className="py-12 text-center text-slate-400">No sales yet.</p>}
      </div>
    </div>
  );
}

function Kpi({ label, value, accent, icon }: { label: string; value: string; accent: string; icon: string }) {
  return (
    <div className={`card bg-gradient-to-br ${accent} to-white p-5 dark:to-slate-900`}>
      <div className="flex items-center justify-between">
        <span className="text-sm text-slate-600">{label}</span><span className="text-xl">{icon}</span>
      </div>
      <div className="mt-2 text-2xl font-bold">{value}</div>
    </div>
  );
}
