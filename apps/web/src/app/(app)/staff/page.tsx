'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { ROLES, type Role } from '@s3vya/types';
import { api } from '@/lib/api';
import { Modal } from '@/components/Modal';

interface Staff { id: string; email: string; fullName: string; role: Role; active: boolean; phone: string | null }

export default function StaffPage() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ fullName: '', email: '', role: 'CASHIER' as Role, password: '', phone: '' });

  const { data: staff = [], isLoading, error } = useQuery<Staff[]>({
    queryKey: ['staff'], queryFn: async () => (await api.get('/staff')).data,
  });

  const create = useMutation({
    mutationFn: () => api.post('/staff', form),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['staff'] }); setOpen(false); setForm({ fullName: '', email: '', role: 'CASHIER', password: '', phone: '' }); toast.success('Staff added'); },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Failed'),
  });
  const patch = useMutation({
    mutationFn: (v: { id: string; data: any }) => api.patch(`/staff/${v.id}`, v.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['staff'] }); toast.success('Updated'); },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Failed'),
  });

  if ((error as any)?.response?.status === 403)
    return <div className="p-6 text-slate-500">Only owners/managers can manage staff.</div>;

  return (
    <div className="p-6">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Staff</h1>
        <button className="btn-primary" onClick={() => setOpen(true)}>+ Add staff</button>
      </div>
      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b bg-slate-50 text-left text-slate-500">
            <tr><th className="p-3">Name</th><th className="p-3">Email</th><th className="p-3">Role</th><th className="p-3">Active</th></tr>
          </thead>
          <tbody>
            {isLoading && <tr><td className="p-3" colSpan={4}>Loading…</td></tr>}
            {staff.map((u) => (
              <tr key={u.id} className="border-b last:border-0">
                <td className="p-3 font-medium">{u.fullName}</td>
                <td className="p-3">{u.email}</td>
                <td className="p-3">
                  <select className="input h-8" value={u.role} onChange={(e) => patch.mutate({ id: u.id, data: { role: e.target.value } })}>
                    {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                  </select>
                </td>
                <td className="p-3">
                  <button className={u.active ? 'text-green-600' : 'text-red-500'} onClick={() => patch.mutate({ id: u.id, data: { active: !u.active } })}>
                    {u.active ? 'Active' : 'Disabled'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal open={open} title="Add staff" onClose={() => setOpen(false)}>
        <div className="space-y-3">
          <input className="input" placeholder="Full name" value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} />
          <input className="input" placeholder="Email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          <input className="input" placeholder="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          <select className="input" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as Role })}>
            {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
          <input className="input" placeholder="Temp password (min 6)" type="text" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
          <button className="btn-primary w-full" disabled={create.isPending} onClick={() => create.mutate()}>
            {create.isPending ? 'Saving…' : 'Create staff'}
          </button>
        </div>
      </Modal>
    </div>
  );
}
