'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth-store';
import { money } from '@/lib/format';
import { PrintButton } from '@/components/PrintButton';

export default function DayEndPage() {
  const currency = useAuth((s) => s.user?.currency ?? 'NPR');
  const today = new Date().toISOString().slice(0, 10);
  const [from, setFrom] = useState(today);
  const [to, setTo] = useState(today);

  const range = { from: `${from}T00:00:00.000Z`, to: `${to}T23:59:59.999Z` };

  const { data } = useQuery<any>({
    queryKey: ['day-end', from, to],
    queryFn: async () => (await api.get('/accounting/reports/day-end', { params: range })).data,
  });
  const { data: taxSum } = useQuery<any>({
    queryKey: ['tax-summary', from, to],
    queryFn: async () => (await api.get('/accounting/reports/tax-summary', { params: range })).data,
  });

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold">Day-end (Z) Report</h2>
        <div className="flex items-center gap-2 no-print">
          <input className="input h-9 w-40" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          <span>to</span>
          <input className="input h-9 w-40" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          <PrintButton />
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="card p-5">
          <h3 className="mb-3 font-semibold">Sales summary</h3>
          {data && (
            <table className="w-full text-sm">
              <tbody>
                <Row label="Bills" v={String(data.count)} />
                <Row label="Subtotal" v={money(data.subtotal, currency)} />
                <Row label="Discount" v={money(data.discount, currency)} />
                <Row label="Service charge" v={money(data.serviceCharge, currency)} />
                <Row label="Tax" v={money(data.tax, currency)} />
                <Row label="Round off" v={money(data.roundOff, currency)} />
                <tr className="border-t font-bold"><td className="py-2">Total sales</td><td className="py-2 text-right">{money(data.total, currency)}</td></tr>
                <Row label="COGS" v={money(data.cogs, currency)} />
                <tr className="font-semibold text-green-700"><td className="py-1">Gross profit</td><td className="py-1 text-right">{money(data.grossProfit, currency)}</td></tr>
              </tbody>
            </table>
          )}
        </div>

        <div className="space-y-4">
          <div className="card p-5">
            <h3 className="mb-3 font-semibold">Collections by mode</h3>
            <table className="w-full text-sm">
              <tbody>
                {data?.payments?.map((p: any) => <Row key={p.method} label={p.method} v={money(p.amount, currency)} />)}
                {(!data?.payments || data.payments.length === 0) && <tr><td className="py-2 text-slate-400">No collections.</td></tr>}
              </tbody>
            </table>
          </div>
          <div className="card p-5">
            <h3 className="mb-3 font-semibold">Tax summary</h3>
            {taxSum && (
              <table className="w-full text-sm">
                <tbody>
                  <Row label="Taxable amount" v={money(taxSum.taxable, currency)} />
                  <Row label="Tax collected" v={money(taxSum.tax, currency)} />
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Row({ label, v }: { label: string; v: string }) {
  return <tr><td className="py-1 text-slate-600">{label}</td><td className="py-1 text-right">{v}</td></tr>;
}
