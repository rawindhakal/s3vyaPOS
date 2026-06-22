'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth-store';

interface Feedback { id: string; rating: number; comment: string | null; customerName: string | null; createdAt: string }

const stars = (n: number) => '★'.repeat(n) + '☆'.repeat(5 - n);

export default function FeedbackPage() {
  const shopId = useAuth((s) => s.user?.shopId);
  const origin = typeof window !== 'undefined' ? window.location.origin : '';

  const { data: summary } = useQuery<any>({ queryKey: ['feedback-summary'], queryFn: async () => (await api.get('/feedback/summary')).data });
  const { data: list = [], isLoading } = useQuery<Feedback[]>({ queryKey: ['feedback'], queryFn: async () => (await api.get('/feedback')).data });

  return (
    <div className="p-6">
      <h1 className="mb-4 text-2xl font-bold">Customer Feedback</h1>

      {summary && (
        <div className="mb-4 grid gap-4 sm:grid-cols-3">
          <div className="card p-4">
            <div className="text-3xl font-bold">{summary.avg} <span className="text-lg text-amber-500">★</span></div>
            <div className="text-sm text-slate-500">{summary.count} responses</div>
          </div>
          <div className="card p-4 sm:col-span-2">
            {summary.distribution.slice().reverse().map((d: any) => (
              <div key={d.star} className="flex items-center gap-2 text-sm">
                <span className="w-8">{d.star}★</span>
                <div className="h-2 flex-1 rounded bg-slate-100">
                  <div className="h-2 rounded bg-amber-400" style={{ width: `${summary.count ? (d.count / summary.count) * 100 : 0}%` }} />
                </div>
                <span className="w-8 text-right text-slate-500">{d.count}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <p className="mb-3 text-sm text-slate-500">
        Public feedback form: <a className="text-brand hover:underline" href={`${origin}/f/${shopId}`} target="_blank">{origin}/f/{shopId}</a> (share via QR/receipt)
      </p>

      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b bg-slate-50 text-left text-slate-500">
            <tr><th className="p-3">When</th><th className="p-3">Rating</th><th className="p-3">Customer</th><th className="p-3">Comment</th></tr>
          </thead>
          <tbody>
            {isLoading && <tr><td className="p-3" colSpan={4}>Loading…</td></tr>}
            {list.map((f) => (
              <tr key={f.id} className="border-b last:border-0">
                <td className="p-3 whitespace-nowrap">{new Date(f.createdAt).toLocaleDateString()}</td>
                <td className="p-3 text-amber-500">{stars(f.rating)}</td>
                <td className="p-3">{f.customerName ?? 'Anonymous'}</td>
                <td className="p-3">{f.comment ?? '—'}</td>
              </tr>
            ))}
            {!isLoading && list.length === 0 && <tr><td className="p-6 text-center text-slate-400" colSpan={4}>No feedback yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
