'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth-store';
import { money } from '@/lib/format';
import { PrintButton } from '@/components/PrintButton';

export default function ReportsPage() {
  const currency = useAuth((s) => s.user?.currency ?? 'NPR');
  const today = new Date().toISOString().slice(0, 10);
  const first = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10);
  const [from, setFrom] = useState(first);
  const [to, setTo] = useState(today);
  const params = { from: `${from}T00:00:00.000Z`, to: `${to}T23:59:59.999Z` };

  const top = useQuery<any[]>({ queryKey: ['r-top', from, to], queryFn: async () => (await api.get('/accounting/reports/top-items', { params })).data });
  const staff = useQuery<any[]>({ queryKey: ['r-staff', from, to], queryFn: async () => (await api.get('/accounting/reports/sales-by-staff', { params })).data });
  const cat = useQuery<any[]>({ queryKey: ['r-cat', from, to], queryFn: async () => (await api.get('/accounting/reports/sales-by-category', { params })).data });
  const waiters = useQuery<any[]>({ queryKey: ['r-waiter', from, to], queryFn: async () => (await api.get('/accounting/reports/waiter-performance', { params })).data });

  return (
    <div className="p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-bold">Sales Reports</h1>
        <div className="flex items-center gap-2 no-print">
          <input className="input h-9 w-40" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          <span>to</span>
          <input className="input h-9 w-40" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          <PrintButton />
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Top-selling items">
          <Table head={['Item', 'Qty', 'Revenue']} rows={(top.data ?? []).map((r) => [r.name, String(r.qty), money(r.revenue, currency)])} />
        </Card>
        <Card title="Sales by staff">
          <Table head={['Staff', 'Bills', 'Total']} rows={(staff.data ?? []).map((r) => [r.name, String(r.count), money(r.total, currency)])} />
        </Card>
        <Card title="Sales by category">
          <Table head={['Category', 'Qty', 'Revenue']} rows={(cat.data ?? []).map((r) => [r.category, String(r.qty), money(r.revenue, currency)])} />
        </Card>
        <Card title="Waiter performance">
          <Table head={['Waiter', 'Bills', 'Sales', 'Avg ticket']} rows={(waiters.data ?? []).map((r) => [r.name, String(r.settled), money(r.salesTotal, currency), money(r.avgTicket, currency)])} />
        </Card>
      </div>
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="card p-4">
      <h2 className="mb-3 font-semibold">{title}</h2>
      {children}
    </div>
  );
}

function Table({ head, rows }: { head: string[]; rows: string[][] }) {
  return (
    <table className="w-full text-sm">
      <thead className="border-b text-left text-slate-500">
        <tr>{head.map((h, i) => <th key={h} className={`py-2 ${i > 0 ? 'text-right' : ''}`}>{h}</th>)}</tr>
      </thead>
      <tbody>
        {rows.map((r, ri) => (
          <tr key={ri} className="border-b last:border-0">
            {r.map((c, ci) => <td key={ci} className={`py-1.5 ${ci > 0 ? 'text-right' : 'font-medium'}`}>{c}</td>)}
          </tr>
        ))}
        {rows.length === 0 && <tr><td className="py-4 text-center text-slate-400" colSpan={head.length}>No data.</td></tr>}
      </tbody>
    </table>
  );
}
