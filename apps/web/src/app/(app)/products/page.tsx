'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth-store';
import { money } from '@/lib/format';
import { Modal } from '@/components/Modal';
import { BarcodeGenerator } from '@/components/BarcodeGenerator';

interface Product {
  id: string;
  sku: string;
  barcode: string | null;
  name: string;
  purchasePrice: string;
  salePrice: string;
  stock: string;
  taxRate: string;
}

const empty = {
  name: '',
  barcode: '',
  purchasePrice: 0,
  salePrice: 0,
  stock: 0,
  taxRate: 13,
};

export default function ProductsPage() {
  const currency = useAuth((s) => s.user?.currency ?? 'NPR');
  const qc = useQueryClient();
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState<any>(empty);
  const [editing, setEditing] = useState<string | null>(null);
  const [barcodeFor, setBarcodeFor] = useState<Product | null>(null);

  const { data: products = [], isLoading } = useQuery<Product[]>({
    queryKey: ['products'],
    queryFn: async () => (await api.get('/products')).data,
  });

  const save = useMutation({
    mutationFn: async () => {
      const payload = {
        name: form.name,
        barcode: form.barcode || undefined,
        purchasePrice: Number(form.purchasePrice),
        salePrice: Number(form.salePrice),
        stock: Number(form.stock),
        taxRate: Number(form.taxRate),
      };
      return editing
        ? api.patch(`/products/${editing}`, payload)
        : api.post('/products', payload);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['products'] });
      setFormOpen(false);
      setForm(empty);
      setEditing(null);
      toast.success('Saved');
    },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Save failed'),
  });

  const openNew = () => {
    setForm(empty);
    setEditing(null);
    setFormOpen(true);
  };

  const openEdit = (p: Product) => {
    setForm({
      name: p.name,
      barcode: p.barcode ?? '',
      purchasePrice: Number(p.purchasePrice),
      salePrice: Number(p.salePrice),
      stock: Number(p.stock),
      taxRate: Number(p.taxRate),
    });
    setEditing(p.id);
    setFormOpen(true);
  };

  const set = (k: string) => (e: any) => setForm((f: any) => ({ ...f, [k]: e.target.value }));

  return (
    <div className="p-6">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Products</h1>
        <button className="btn-primary" onClick={openNew}>
          + Add product
        </button>
      </div>

      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b bg-slate-50 text-left text-slate-500">
            <tr>
              <th className="p-3">Name</th>
              <th className="p-3">SKU</th>
              <th className="p-3">Barcode</th>
              <th className="p-3 text-right">Cost</th>
              <th className="p-3 text-right">Price</th>
              <th className="p-3 text-right">Stock</th>
              <th className="p-3"></th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr><td className="p-3" colSpan={7}>Loading…</td></tr>
            )}
            {products.map((p) => (
              <tr key={p.id} className="border-b last:border-0">
                <td className="p-3 font-medium">{p.name}</td>
                <td className="p-3">{p.sku}</td>
                <td className="p-3">{p.barcode || <span className="text-slate-400">—</span>}</td>
                <td className="p-3 text-right">{money(Number(p.purchasePrice), currency)}</td>
                <td className="p-3 text-right">{money(Number(p.salePrice), currency)}</td>
                <td className="p-3 text-right">{Number(p.stock)}</td>
                <td className="p-3 text-right whitespace-nowrap">
                  <button className="mr-3 text-brand hover:underline" onClick={() => openEdit(p)}>Edit</button>
                  <button className="text-slate-600 hover:underline" onClick={() => setBarcodeFor(p)}>Barcode</button>
                </td>
              </tr>
            ))}
            {!isLoading && products.length === 0 && (
              <tr><td className="p-6 text-center text-slate-400" colSpan={7}>No products yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <Modal open={formOpen} title={editing ? 'Edit product' : 'Add product'} onClose={() => setFormOpen(false)}>
        <div className="space-y-3">
          <input className="input" placeholder="Name" value={form.name} onChange={set('name')} />
          <input className="input" placeholder="Barcode (optional — auto SKU if blank)" value={form.barcode} onChange={set('barcode')} />
          <div className="grid grid-cols-2 gap-3">
            <label className="text-sm">Cost
              <input className="input" type="number" value={form.purchasePrice} onChange={set('purchasePrice')} />
            </label>
            <label className="text-sm">Sale price
              <input className="input" type="number" value={form.salePrice} onChange={set('salePrice')} />
            </label>
            <label className="text-sm">Stock
              <input className="input" type="number" value={form.stock} onChange={set('stock')} />
            </label>
            <label className="text-sm">Tax %
              <input className="input" type="number" value={form.taxRate} onChange={set('taxRate')} />
            </label>
          </div>
          <button className="btn-primary w-full" disabled={save.isPending} onClick={() => save.mutate()}>
            {save.isPending ? 'Saving…' : 'Save'}
          </button>
        </div>
      </Modal>

      <Modal open={!!barcodeFor} title={barcodeFor?.name} onClose={() => setBarcodeFor(null)}>
        {barcodeFor && <BarcodeGenerator value={barcodeFor.barcode || barcodeFor.sku} label={barcodeFor.name} />}
      </Modal>
    </div>
  );
}
