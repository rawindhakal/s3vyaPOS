'use client';

import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { api } from '@/lib/api';

export default function SettingsPage() {
  const qc = useQueryClient();
  const { data: shop } = useQuery<any>({
    queryKey: ['shop'], queryFn: async () => (await api.get('/shop')).data,
  });
  const [form, setForm] = useState<any>(null);

  useEffect(() => {
    if (shop && !form) {
      setForm({
        name: shop.name,
        address: shop.address ?? '',
        phone: shop.phone ?? '',
        taxRate: Number(shop.taxRate),
        serviceChargeRate: Number(shop.serviceChargeRate),
        loyaltyEarnRate: Number(shop.loyaltyEarnRate),
        roundOff: shop.roundOff,
      });
    }
  }, [shop, form]);

  const save = useMutation({
    mutationFn: () => api.patch('/shop', {
      ...form,
      taxRate: Number(form.taxRate),
      serviceChargeRate: Number(form.serviceChargeRate),
      loyaltyEarnRate: Number(form.loyaltyEarnRate),
    }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['shop'] }); toast.success('Settings saved'); },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Failed'),
  });

  if (!form) return <div className="p-6 text-slate-500">Loading…</div>;
  const set = (k: string) => (e: any) => setForm({ ...form, [k]: e.target.value });

  return (
    <div className="p-6">
      <h1 className="mb-4 text-2xl font-bold">Settings</h1>
      <div className="card max-w-xl space-y-4 p-5">
        <label className="block text-sm">Restaurant name
          <input className="input" value={form.name} onChange={set('name')} />
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label className="block text-sm">Phone
            <input className="input" value={form.phone} onChange={set('phone')} />
          </label>
          <label className="block text-sm">Address
            <input className="input" value={form.address} onChange={set('address')} />
          </label>
        </div>
        <h2 className="border-t pt-3 font-semibold">Billing</h2>
        <div className="grid grid-cols-3 gap-3">
          <label className="block text-sm">Tax / VAT %
            <input className="input" type="number" value={form.taxRate} onChange={set('taxRate')} />
          </label>
          <label className="block text-sm">Service charge %
            <input className="input" type="number" value={form.serviceChargeRate} onChange={set('serviceChargeRate')} />
          </label>
          <label className="block text-sm">Loyalty pts / 100
            <input className="input" type="number" value={form.loyaltyEarnRate} onChange={set('loyaltyEarnRate')} />
          </label>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={form.roundOff} onChange={(e) => setForm({ ...form, roundOff: e.target.checked })} />
          Round off bill totals to nearest whole {' '}unit
        </label>
        <button className="btn-primary" disabled={save.isPending} onClick={() => save.mutate()}>
          {save.isPending ? 'Saving…' : 'Save settings'}
        </button>
      </div>
    </div>
  );
}
