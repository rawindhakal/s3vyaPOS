'use client';

import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { api } from '@/lib/api';
import { Modal } from './Modal';

interface Product { id: string; name: string }
interface Row { name: string; price: number }

export function ModifiersModal({ product, onClose }: { product: Product | null; onClose: () => void }) {
  const qc = useQueryClient();
  const [rows, setRows] = useState<Row[]>([]);

  const { data } = useQuery<any[]>({
    queryKey: ['modifiers', product?.id],
    queryFn: async () => (await api.get(`/products/${product!.id}/modifiers`)).data,
    enabled: !!product,
  });

  useEffect(() => {
    if (data) setRows(data.map((m: any) => ({ name: m.name, price: Number(m.price) })));
  }, [data]);

  const save = useMutation({
    mutationFn: () => api.put(`/products/${product!.id}/modifiers`, { modifiers: rows.filter((r) => r.name.trim()) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['products'] }); qc.invalidateQueries({ queryKey: ['modifiers', product?.id] }); toast.success('Add-ons saved'); onClose(); },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Failed'),
  });

  if (!product) return null;

  return (
    <Modal open={!!product} title={`Add-ons · ${product.name}`} onClose={onClose}>
      <div className="space-y-3 text-sm">
        <p className="text-slate-500">Optional extras the customer can attach (e.g. Extra cheese, Make it spicy). Each adds its price to the item.</p>
        {rows.map((r, i) => (
          <div key={i} className="flex items-center gap-2">
            <input className="input h-9 min-w-0 flex-1" placeholder="Add-on name" value={r.name}
              onChange={(e) => setRows((rs) => rs.map((x, idx) => idx === i ? { ...x, name: e.target.value } : x))} />
            <input className="input h-9 w-20 shrink-0 text-right" type="number" placeholder="Price" value={r.price}
              onChange={(e) => setRows((rs) => rs.map((x, idx) => idx === i ? { ...x, price: Number(e.target.value) } : x))} />
            <button className="shrink-0 text-red-500" onClick={() => setRows((rs) => rs.filter((_, idx) => idx !== i))}>✕</button>
          </div>
        ))}
        <button className="text-brand hover:underline" onClick={() => setRows((rs) => [...rs, { name: '', price: 0 }])}>+ Add add-on</button>
        <button className="btn-primary w-full" disabled={save.isPending} onClick={() => save.mutate()}>
          {save.isPending ? 'Saving…' : 'Save add-ons'}
        </button>
      </div>
    </Modal>
  );
}
