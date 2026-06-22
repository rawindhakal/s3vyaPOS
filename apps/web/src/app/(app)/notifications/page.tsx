'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { api } from '@/lib/api';
import { Modal } from '@/components/Modal';

interface Notification { id: string; channel: string; to: string; subject: string | null; body: string; status: string; createdAt: string }

const STATUS_STYLE: Record<string, string> = {
  SENT: 'text-green-600', LOGGED: 'text-slate-500', QUEUED: 'text-amber-600', FAILED: 'text-red-600',
};

export default function NotificationsPage() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ channel: 'SMS', to: '', subject: '', body: '' });

  const { data: list = [], isLoading } = useQuery<Notification[]>({
    queryKey: ['notifications'], queryFn: async () => (await api.get('/notifications')).data,
  });

  const send = useMutation({
    mutationFn: () => api.post('/notifications/send', form),
    onSuccess: (r: any) => {
      qc.invalidateQueries({ queryKey: ['notifications'] });
      setOpen(false); setForm({ channel: 'SMS', to: '', subject: '', body: '' });
      toast.success(r.data.status === 'LOGGED' ? 'Logged (no provider configured)' : 'Sent');
    },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Failed'),
  });

  return (
    <div className="p-6">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Notifications</h1>
        <button className="btn-primary" onClick={() => setOpen(true)}>+ Send message</button>
      </div>
      <p className="mb-3 text-sm text-slate-500">SMS / Email / WhatsApp. Without provider keys, messages are recorded as <b>LOGGED</b> so flows work; add keys in env to actually deliver.</p>
      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b bg-slate-50 text-left text-slate-500">
            <tr><th className="p-3">Time</th><th className="p-3">Channel</th><th className="p-3">To</th><th className="p-3">Message</th><th className="p-3">Status</th></tr>
          </thead>
          <tbody>
            {isLoading && <tr><td className="p-3" colSpan={5}>Loading…</td></tr>}
            {list.map((n) => (
              <tr key={n.id} className="border-b last:border-0">
                <td className="p-3 whitespace-nowrap">{new Date(n.createdAt).toLocaleString()}</td>
                <td className="p-3">{n.channel}</td>
                <td className="p-3">{n.to}</td>
                <td className="p-3 max-w-xs truncate">{n.subject ? <b>{n.subject}: </b> : ''}{n.body}</td>
                <td className={`p-3 font-medium ${STATUS_STYLE[n.status] ?? ''}`}>{n.status}</td>
              </tr>
            ))}
            {!isLoading && list.length === 0 && <tr><td className="p-6 text-center text-slate-400" colSpan={5}>No messages yet.</td></tr>}
          </tbody>
        </table>
      </div>

      <Modal open={open} title="Send message" onClose={() => setOpen(false)}>
        <div className="space-y-3">
          <select className="input" value={form.channel} onChange={(e) => setForm({ ...form, channel: e.target.value })}>
            {['SMS', 'EMAIL', 'WHATSAPP'].map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <input className="input" placeholder={form.channel === 'EMAIL' ? 'Email address' : 'Phone number'} value={form.to} onChange={(e) => setForm({ ...form, to: e.target.value })} />
          {form.channel === 'EMAIL' && <input className="input" placeholder="Subject" value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} />}
          <textarea className="input" rows={4} placeholder="Message" value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} />
          <button className="btn-primary w-full" disabled={send.isPending || !form.to || !form.body} onClick={() => send.mutate()}>
            {send.isPending ? 'Sending…' : 'Send'}
          </button>
        </div>
      </Modal>
    </div>
  );
}
