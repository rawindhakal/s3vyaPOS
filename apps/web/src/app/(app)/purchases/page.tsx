'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import type { PaymentMethod } from '@s3vya/types';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth-store';
import { money } from '@/lib/format';

interface Vendor { id: string; name: string }
interface Product { id: string; sku: string; name: string; purchasePrice: string }
interface Row { productId: string; name: string; sku: string; quantity: number; unitCost: number }

const emptyRow: Row = { productId: '', name: '', sku: '', quantity: 1, unitCost: 0 };

export default function PurchasesPage() {
  const currency = useAuth((s) => s.user?.currency ?? 'NPR');
  const qc = useQueryClient();
  const [vendorId, setVendorId] = useState('');
  const [method, setMethod] = useState<PaymentMethod>('CREDIT');
  const [rows, setRows] = useState<Row[]>([{ ...emptyRow }]);

  const { data: vendors = [] } = useQuery<Vendor[]>({
    queryKey: ['vendors'],
    queryFn: async () => (await api.get('/vendors')).data,
  });
  const { data: products = [] } = useQuery<Product[]>({
    queryKey: ['products'],
    queryFn: async () => (await api.get('/products')).data,
  });
  const { data: purchases = [] } = useQuery<any[]>({
    queryKey: ['purchases'],
    queryFn: async () => (await api.get('/purchases')).data,
  });

  const setRow = (i: number, patch: Partial<Row>) =>
    setRows((rs) => rs.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));

  const pickProduct = (i: number, productId: string) => {
    const p = products.find((x) => x.id === productId);
    if (p) setRow(i, { productId, name: p.name, sku: p.sku, unitCost: Number(p.purchasePrice) });
    else setRow(i, { productId: '', name: '', sku: '' });
  };

  const total = rows.reduce((s, r) => s + r.quantity * r.unitCost, 0);

  const submit = useMutation({
    mutationFn: () => {
      const items = rows
        .filter((r) => r.quantity > 0 && (r.productId || r.sku || r.name))
        .map((r) =>
          r.productId
            ? { productId: r.productId, quantity: r.quantity, unitCost: r.unitCost }
            : { sku: r.sku || undefined, name: r.name || undefined, quantity: r.quantity, unitCost: r.unitCost },
        );
      if (items.length === 0) throw new Error('Add at least one item');
      return api.post('/purchases', {
        vendorId: vendorId || undefined,
        items,
        paymentMethod: method,
      });
    },
    onSuccess: (res: any) => {
      qc.invalidateQueries({ queryKey: ['purchases'] });
      qc.invalidateQueries({ queryKey: ['products'] });
      qc.invalidateQueries({ queryKey: ['vendors'] });
      setRows([{ ...emptyRow }]);
      toast.success(`Purchase ${res.data.billNo} recorded`);
    },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? e?.message ?? 'Failed'),
  });

  return (
    <div className="p-6">
      <h1 className="mb-4 text-2xl font-bold">Purchases</h1>

      <div className="card mb-6 space-y-4 p-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-sm">Vendor
            <select className="input" value={vendorId} onChange={(e) => setVendorId(e.target.value)}>
              <option value="">— cash purchase / no vendor —</option>
              {vendors.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
            </select>
          </label>
          <label className="text-sm">Payment
            <select className="input" value={method} onChange={(e) => setMethod(e.target.value as PaymentMethod)}>
              <option value="CREDIT">On credit (Accounts Payable)</option>
              <option value="CASH">Cash</option>
              <option value="BANK">Bank</option>
            </select>
          </label>
        </div>

        <div className="space-y-2">
          {rows.map((r, i) => (
            <div key={i} className="grid grid-cols-12 gap-2">
              <select
                className="input col-span-4"
                value={r.productId}
                onChange={(e) => pickProduct(i, e.target.value)}
              >
                <option value="">— new item —</option>
                {products.map((p) => <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>)}
              </select>
              <input
                className="input col-span-4"
                placeholder="Name (for new item)"
                value={r.name}
                disabled={!!r.productId}
                onChange={(e) => setRow(i, { name: e.target.value })}
              />
              <input
                className="input col-span-2"
                type="number"
                placeholder="Qty"
                value={r.quantity}
                onChange={(e) => setRow(i, { quantity: Number(e.target.value) })}
              />
              <input
                className="input col-span-2"
                type="number"
                placeholder="Cost"
                value={r.unitCost}
                onChange={(e) => setRow(i, { unitCost: Number(e.target.value) })}
              />
            </div>
          ))}
          <button className="btn-ghost" onClick={() => setRows([...rows, { ...emptyRow }])}>
            + Add line
          </button>
        </div>

        <div className="flex items-center justify-between border-t pt-3">
          <span className="text-lg font-semibold">Total: {money(total, currency)}</span>
          <button className="btn-primary" disabled={submit.isPending} onClick={() => submit.mutate()}>
            {submit.isPending ? 'Saving…' : 'Record purchase'}
          </button>
        </div>
      </div>

      <h2 className="mb-2 text-lg font-semibold">Recent purchases</h2>
      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b bg-slate-50 text-left text-slate-500">
            <tr>
              <th className="p-3">Bill</th>
              <th className="p-3">Vendor</th>
              <th className="p-3">Payment</th>
              <th className="p-3 text-right">Items</th>
              <th className="p-3 text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            {purchases.map((p) => (
              <tr key={p.id} className="border-b last:border-0">
                <td className="p-3 font-medium">{p.billNo}</td>
                <td className="p-3">{p.vendor?.name || <span className="text-slate-400">—</span>}</td>
                <td className="p-3">{p.paymentMethod}</td>
                <td className="p-3 text-right">{p.items?.length ?? 0}</td>
                <td className="p-3 text-right">{money(Number(p.total), currency)}</td>
              </tr>
            ))}
            {purchases.length === 0 && (
              <tr><td className="p-6 text-center text-slate-400" colSpan={5}>No purchases yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
