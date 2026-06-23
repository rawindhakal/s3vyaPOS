'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth-store';
import { money } from '@/lib/format';
import { Modal } from '@/components/Modal';
import { BarcodeGenerator } from '@/components/BarcodeGenerator';
import { RecipeModal } from '@/components/RecipeModal';
import { VariationsModal } from '@/components/VariationsModal';

interface Variation { id: string; name: string; salePrice: string }
interface Product {
  id: string;
  sku: string;
  barcode: string | null;
  name: string;
  categoryId: string | null;
  purchasePrice: string;
  salePrice: string;
  station: string;
  hasVariations: boolean;
  variations: Variation[];
}
interface Category { id: string; name: string }

const empty = { name: '', barcode: '', categoryId: '', purchasePrice: 0, salePrice: 0, station: 'KITCHEN' };

export default function ProductsPage() {
  const currency = useAuth((s) => s.user?.currency ?? 'NPR');
  const qc = useQueryClient();
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState<any>(empty);
  const [editing, setEditing] = useState<string | null>(null);
  const [barcodeFor, setBarcodeFor] = useState<Product | null>(null);
  const [catOpen, setCatOpen] = useState(false);
  const [newCat, setNewCat] = useState('');
  const [recipeFor, setRecipeFor] = useState<Product | null>(null);
  const [variationsFor, setVariationsFor] = useState<Product | null>(null);

  const { data: products = [], isLoading } = useQuery<Product[]>({
    queryKey: ['products'], queryFn: async () => (await api.get('/products')).data,
  });
  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: ['categories'], queryFn: async () => (await api.get('/products/categories')).data,
  });

  const addCategory = useMutation({
    mutationFn: () => api.post('/products/categories', { name: newCat }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['categories'] }); setNewCat(''); toast.success('Category added'); },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Failed'),
  });

  const save = useMutation({
    mutationFn: async () => {
      const payload = {
        name: form.name,
        barcode: form.barcode || undefined,
        categoryId: form.categoryId || undefined,
        purchasePrice: Number(form.purchasePrice),
        salePrice: Number(form.salePrice),
        station: form.station,
      };
      return editing ? api.patch(`/products/${editing}`, payload) : api.post('/products', payload);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['products'] });
      setFormOpen(false); setForm(empty); setEditing(null);
      toast.success('Saved');
    },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Save failed'),
  });

  const openNew = () => { setForm(empty); setEditing(null); setFormOpen(true); };
  const openEdit = (p: Product) => {
    setForm({
      name: p.name, barcode: p.barcode ?? '', categoryId: p.categoryId ?? '',
      purchasePrice: Number(p.purchasePrice), salePrice: Number(p.salePrice), station: p.station ?? 'KITCHEN',
    });
    setEditing(p.id); setFormOpen(true);
  };
  const set = (k: string) => (e: any) => setForm((f: any) => ({ ...f, [k]: e.target.value }));

  return (
    <div className="p-6">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Products / Menu</h1>
        <div className="flex gap-2">
          <button className="btn-ghost" onClick={() => setCatOpen(true)}>Categories</button>
          <button className="btn-primary" onClick={openNew}>+ Add product</button>
        </div>
      </div>

      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b bg-slate-50 text-left text-slate-500">
            <tr>
              <th className="p-3">Name</th>
              <th className="p-3">Station</th>
              <th className="p-3 text-right">Cost</th>
              <th className="p-3 text-right">Price</th>
              <th className="p-3"></th>
            </tr>
          </thead>
          <tbody>
            {isLoading && <tr><td className="p-3" colSpan={5}>Loading…</td></tr>}
            {products.map((p) => (
              <tr key={p.id} className="border-b last:border-0">
                <td className="p-3 font-medium">{p.name}</td>
                <td className="p-3"><span className="rounded bg-slate-100 px-2 py-0.5 text-xs">{p.station}</span></td>
                <td className="p-3 text-right">{money(Number(p.purchasePrice), currency)}</td>
                <td className="p-3 text-right">
                  {p.hasVariations
                    ? <span className="text-slate-500">{p.variations.length} variants</span>
                    : money(Number(p.salePrice), currency)}
                </td>
                <td className="p-3 text-right whitespace-nowrap">
                  <button className="mr-3 text-brand hover:underline" onClick={() => openEdit(p)}>Edit</button>
                  <button className="mr-3 text-slate-600 hover:underline" onClick={() => setVariationsFor(p)}>Variations</button>
                  <button className="mr-3 text-slate-600 hover:underline" onClick={() => setRecipeFor(p)}>Recipe</button>
                  <button className="text-slate-600 hover:underline" onClick={() => setBarcodeFor(p)}>Barcode</button>
                </td>
              </tr>
            ))}
            {!isLoading && products.length === 0 && (
              <tr><td className="p-6 text-center text-slate-400" colSpan={5}>No products yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <Modal open={formOpen} title={editing ? 'Edit product' : 'Add product'} onClose={() => setFormOpen(false)}>
        <div className="space-y-3">
          <input className="input" placeholder="Name" value={form.name} onChange={set('name')} />
          <input className="input" placeholder="Barcode (optional — auto SKU if blank)" value={form.barcode} onChange={set('barcode')} />
          <select className="input" value={form.categoryId} onChange={set('categoryId')}>
            <option value="">No category</option>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <label className="text-sm">Prep station (KOT routing)
            <select className="input" value={form.station} onChange={set('station')}>
              <option value="KITCHEN">Kitchen</option>
              <option value="BAR">Bar</option>
            </select>
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="text-sm">Cost
              <input className="input" type="number" value={form.purchasePrice} onChange={set('purchasePrice')} />
            </label>
            <label className="text-sm">Price (single)
              <input className="input" type="number" value={form.salePrice} onChange={set('salePrice')} />
            </label>
          </div>
          <p className="text-xs text-slate-400">VAT is applied globally from Settings. For multi-size items, leave price as 0 and add Variations after saving.</p>
          <button className="btn-primary w-full" disabled={save.isPending} onClick={() => save.mutate()}>
            {save.isPending ? 'Saving…' : 'Save'}
          </button>
        </div>
      </Modal>

      <Modal open={!!barcodeFor} title={barcodeFor?.name} onClose={() => setBarcodeFor(null)}>
        {barcodeFor && <BarcodeGenerator value={barcodeFor.barcode || barcodeFor.sku} label={barcodeFor.name} />}
      </Modal>

      <RecipeModal product={recipeFor} products={products} onClose={() => setRecipeFor(null)} />
      <VariationsModal product={variationsFor} onClose={() => setVariationsFor(null)} />

      <Modal open={catOpen} title="Menu categories" onClose={() => setCatOpen(false)}>
        <div className="space-y-3">
          <div className="flex gap-2">
            <input className="input" placeholder="New category" value={newCat} onChange={(e) => setNewCat(e.target.value)} />
            <button className="btn-primary" disabled={!newCat || addCategory.isPending} onClick={() => addCategory.mutate()}>Add</button>
          </div>
          <ul className="space-y-1 text-sm">
            {categories.map((c) => <li key={c.id} className="rounded bg-slate-50 px-3 py-2">{c.name}</li>)}
            {categories.length === 0 && <li className="text-slate-400">No categories yet.</li>}
          </ul>
        </div>
      </Modal>
    </div>
  );
}
