'use client';

import { Fragment, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth-store';
import { money } from '@/lib/format';
import { PrintButton } from '@/components/PrintButton';

interface Line {
  id: string;
  debit: string;
  credit: string;
  account: { code: string; name: string };
}
interface Entry {
  id: string;
  date: string;
  description: string;
  reference: string | null;
  source: string;
  lines: Line[];
}

export default function JournalPage() {
  const currency = useAuth((s) => s.user?.currency ?? 'NPR');
  const [open, setOpen] = useState<string | null>(null);

  const { data: entries = [], isLoading } = useQuery<Entry[]>({
    queryKey: ['journal'],
    queryFn: async () => (await api.get('/accounting/journal')).data,
  });

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-semibold">Journal entries</h2>
        <PrintButton />
      </div>
      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b bg-slate-50 text-left text-slate-500">
            <tr>
              <th className="p-3">Date</th>
              <th className="p-3">Description</th>
              <th className="p-3">Ref</th>
              <th className="p-3">Source</th>
              <th className="p-3 text-right">Amount</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && <tr><td className="p-3" colSpan={5}>Loading…</td></tr>}
            {entries.map((e) => {
              const amount = e.lines.reduce((s, l) => s + Number(l.debit), 0);
              const isOpen = open === e.id;
              return (
                <Fragment key={e.id}>
                  <tr
                    className="cursor-pointer border-b hover:bg-slate-50"
                    onClick={() => setOpen(isOpen ? null : e.id)}
                  >
                    <td className="p-3">{new Date(e.date).toLocaleDateString()}</td>
                    <td className="p-3 font-medium">{e.description}</td>
                    <td className="p-3">{e.reference || '—'}</td>
                    <td className="p-3"><span className="rounded bg-slate-100 px-2 py-0.5 text-xs">{e.source}</span></td>
                    <td className="p-3 text-right">{money(amount, currency)}</td>
                  </tr>
                  {isOpen && (
                    <tr className="bg-slate-50/60">
                      <td colSpan={5} className="p-3">
                        <table className="w-full text-sm">
                          <thead className="text-left text-slate-400">
                            <tr>
                              <th className="py-1">Account</th>
                              <th className="py-1 text-right">Debit</th>
                              <th className="py-1 text-right">Credit</th>
                            </tr>
                          </thead>
                          <tbody>
                            {e.lines.map((l) => (
                              <tr key={l.id}>
                                <td className="py-1">{l.account.code} · {l.account.name}</td>
                                <td className="py-1 text-right">{Number(l.debit) ? money(Number(l.debit), currency) : ''}</td>
                                <td className="py-1 text-right">{Number(l.credit) ? money(Number(l.credit), currency) : ''}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
            {!isLoading && entries.length === 0 && (
              <tr><td className="p-6 text-center text-slate-400" colSpan={5}>No journal entries yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
