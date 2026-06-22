'use client';

import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth-store';
import { money } from '@/lib/format';
import { Modal } from './Modal';

interface Product { id: string; name: string; sku: string }
interface Row { componentId: string; quantity: number }

export function RecipeModal({ product, products, onClose }: { product: Product | null; products: Product[]; onClose: () => void }) {
  const currency = useAuth((s) => s.user?.currency ?? 'NPR');
  const qc = useQueryClient();
  const [rows, setRows] = useState<Row[]>([]);

  const { data } = useQuery<any>({
    queryKey: ['recipe', product?.id],
    queryFn: async () => (await api.get(`/products/${product!.id}/recipe`)).data,
    enabled: !!product,
  });

  useEffect(() => {
    if (data?.components) setRows(data.components.map((c: any) => ({ componentId: c.componentId, quantity: Number(c.quantity) })));
  }, [data]);

  const save = useMutation({
    mutationFn: () => api.put(`/products/${product!.id}/recipe`, { components: rows.filter((r) => r.componentId && r.quantity > 0) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['recipe', product?.id] }); qc.invalidateQueries({ queryKey: ['food-cost'] }); toast.success('Recipe saved'); onClose(); },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Failed'),
  });

  const cost = rows.reduce((s, r) => {
    const p = data?.components?.find((c: any) => c.componentId === r.componentId);
    const price = p ? Number(p.component.purchasePrice) : 0;
    return s + price * r.quantity;
  }, 0);

  if (!product) return null;
  const others = products.filter((p) => p.id !== product.id);

  return (
    <Modal open={!!product} title={`Recipe · ${product.name}`} onClose={onClose}>
      <div className="space-y-3 text-sm">
        <p className="text-slate-500">Ingredients consumed from stock each time this item is sold.</p>
        {rows.map((r, i) => (
          <div key={i} className="flex items-center gap-2">
            <select className="input h-9 flex-1" value={r.componentId}
              onChange={(e) => setRows((rs) => rs.map((x, idx) => idx === i ? { ...x, componentId: e.target.value } : x))}>
              <option value="">— ingredient —</option>
              {others.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            <input className="input h-9 w-24 text-right" type="number" value={r.quantity}
              onChange={(e) => setRows((rs) => rs.map((x, idx) => idx === i ? { ...x, quantity: Number(e.target.value) } : x))} />
            <button className="text-red-500" onClick={() => setRows((rs) => rs.filter((_, idx) => idx !== i))}>✕</button>
          </div>
        ))}
        <button className="text-brand hover:underline" onClick={() => setRows((rs) => [...rs, { componentId: '', quantity: 1 }])}>+ Add ingredient</button>
        {data && <div className="border-t pt-2 text-slate-600">Current recipe cost: <span className="font-semibold">{money(Number(data.cost ?? cost), currency)}</span></div>}
        <button className="btn-primary w-full" disabled={save.isPending} onClick={() => save.mutate()}>
          {save.isPending ? 'Saving…' : 'Save recipe'}
        </button>
      </div>
    </Modal>
  );
}
