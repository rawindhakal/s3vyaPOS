'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth-store';
import { money } from '@/lib/format';
import { Modal } from '@/components/Modal';

interface Product { id: string; name: string; sku: string; stock: string; reorderLevel: string; unit: string }

export default function InventoryPage() {
  const currency = useAuth((s) => s.user?.currency ?? 'NPR');
  const qc = useQueryClient();
  const [action, setAction] = useState<{ type: 'adjust' | 'waste'; product: Product } | null>(null);
  const [qty, setQty] = useState(0);
  const [reason, setReason] = useState('');

  const { data: products = [] } = useQuery<Product[]>({ queryKey: ['products'], queryFn: async () => (await api.get('/products')).data });
  const { data: low = [] } = useQuery<any[]>({ queryKey: ['low-stock'], queryFn: async () => (await api.get('/products/stock/low')).data });
  const { data: food = [] } = useQuery<any[]>({ queryKey: ['food-cost'], queryFn: async () => (await api.get('/products/reports/food-cost')).data });
  const { data: moves = [] } = useQuery<any[]>({ queryKey: ['movements'], queryFn: async () => (await api.get('/products/stock/movements')).data });

  const run = useMutation({
    mutationFn: () => {
      const p = action!.product;
      return action!.type === 'adjust'
        ? api.post(`/products/${p.id}/adjust`, { delta: qty, reason })
        : api.post(`/products/${p.id}/waste`, { quantity: qty, reason });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['products'] });
      qc.invalidateQueries({ queryKey: ['low-stock'] });
      qc.invalidateQueries({ queryKey: ['movements'] });
      setAction(null); setQty(0); setReason('');
      toast.success('Done');
    },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Failed'),
  });

  const open = (type: 'adjust' | 'waste', product: Product) => { setAction({ type, product }); setQty(0); setReason(''); };

  return (
    <div className="space-y-6 p-6">
      <h1 className="text-2xl font-bold">Inventory</h1>

      {low.length > 0 && (
        <div className="card border-l-4 border-amber-400 p-4">
          <h2 className="mb-2 font-semibold text-amber-700">⚠ Low stock ({low.length})</h2>
          <div className="flex flex-wrap gap-2 text-sm">
            {low.map((p) => (
              <span key={p.id} className="rounded-full bg-amber-50 px-3 py-1 text-amber-800">
                {p.name}: {p.stock}/{p.reorderLevel} {p.unit}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="card overflow-x-auto">
          <h2 className="p-3 font-semibold">Stock</h2>
          <table className="w-full text-sm">
            <thead className="border-y bg-slate-50 text-left text-slate-500">
              <tr><th className="p-3">Product</th><th className="p-3 text-right">Stock</th><th className="p-3 text-right">Reorder</th><th className="p-3"></th></tr>
            </thead>
            <tbody>
              {products.map((p) => {
                const lowFlag = Number(p.reorderLevel) > 0 && Number(p.stock) <= Number(p.reorderLevel);
                return (
                  <tr key={p.id} className="border-b last:border-0">
                    <td className="p-3 font-medium">{p.name}</td>
                    <td className={`p-3 text-right ${lowFlag ? 'font-semibold text-amber-700' : ''}`}>{Number(p.stock)}</td>
                    <td className="p-3 text-right text-slate-400">{Number(p.reorderLevel) || '—'}</td>
                    <td className="p-3 text-right whitespace-nowrap">
                      <button className="mr-3 text-brand hover:underline" onClick={() => open('adjust', p)}>Adjust</button>
                      <button className="text-red-600 hover:underline" onClick={() => open('waste', p)}>Waste</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="card overflow-x-auto">
          <h2 className="p-3 font-semibold">Food cost (recipe items)</h2>
          <table className="w-full text-sm">
            <thead className="border-y bg-slate-50 text-left text-slate-500">
              <tr><th className="p-3">Item</th><th className="p-3 text-right">Cost</th><th className="p-3 text-right">Price</th><th className="p-3 text-right">Food %</th></tr>
            </thead>
            <tbody>
              {food.map((f) => (
                <tr key={f.id} className="border-b last:border-0">
                  <td className="p-3 font-medium">{f.name}</td>
                  <td className="p-3 text-right">{money(f.foodCost, currency)}</td>
                  <td className="p-3 text-right">{money(f.salePrice, currency)}</td>
                  <td className={`p-3 text-right ${f.foodCostPct > 40 ? 'text-red-600' : 'text-green-700'}`}>{f.foodCostPct}%</td>
                </tr>
              ))}
              {food.length === 0 && <tr><td className="p-4 text-center text-slate-400" colSpan={4}>No recipes defined yet.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card overflow-x-auto">
        <h2 className="p-3 font-semibold">Recent stock movements</h2>
        <table className="w-full text-sm">
          <thead className="border-y bg-slate-50 text-left text-slate-500">
            <tr><th className="p-3">Date</th><th className="p-3">Product</th><th className="p-3">Type</th><th className="p-3 text-right">Qty</th><th className="p-3">Ref</th></tr>
          </thead>
          <tbody>
            {moves.map((m) => (
              <tr key={m.id} className="border-b last:border-0">
                <td className="p-3">{new Date(m.createdAt).toLocaleString()}</td>
                <td className="p-3">{m.product?.name}</td>
                <td className="p-3"><span className="rounded bg-slate-100 px-2 py-0.5 text-xs">{m.type}</span></td>
                <td className={`p-3 text-right ${Number(m.quantity) < 0 ? 'text-red-600' : 'text-green-700'}`}>{Number(m.quantity)}</td>
                <td className="p-3 text-slate-500">{m.reason || m.reference || '—'}</td>
              </tr>
            ))}
            {moves.length === 0 && <tr><td className="p-4 text-center text-slate-400" colSpan={5}>No movements yet.</td></tr>}
          </tbody>
        </table>
      </div>

      <Modal open={!!action} title={action ? `${action.type === 'adjust' ? 'Adjust' : 'Waste'} · ${action.product.name}` : ''} onClose={() => setAction(null)}>
        {action && (
          <div className="space-y-3">
            <label className="block text-sm">{action.type === 'adjust' ? 'Change (+/−)' : 'Quantity to waste'}
              <input className="input" type="number" value={qty} onChange={(e) => setQty(Number(e.target.value))} />
            </label>
            <input className="input" placeholder="Reason" value={reason} onChange={(e) => setReason(e.target.value)} />
            <button className="btn-primary w-full" disabled={run.isPending || qty === 0} onClick={() => run.mutate()}>
              {run.isPending ? 'Saving…' : 'Confirm'}
            </button>
          </div>
        )}
      </Modal>
    </div>
  );
}
