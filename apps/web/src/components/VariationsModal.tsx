'use client';

import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { api } from '@/lib/api';
import { Modal } from './Modal';

interface Product { id: string; name: string }
interface Row { name: string; salePrice: number }

export function VariationsModal({ product, onClose }: { product: Product | null; onClose: () => void }) {
  const qc = useQueryClient();
  const [rows, setRows] = useState<Row[]>([]);

  const { data } = useQuery<any[]>({
    queryKey: ['variations', product?.id],
    queryFn: async () => (await api.get(`/products/${product!.id}/variations`)).data,
    enabled: !!product,
  });

  useEffect(() => {
    if (data) setRows(data.map((v: any) => ({ name: v.name, salePrice: Number(v.salePrice) })));
  }, [data]);

  const save = useMutation({
    mutationFn: () => api.put(`/products/${product!.id}/variations`, { variations: rows.filter((r) => r.name.trim()) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['products'] }); qc.invalidateQueries({ queryKey: ['variations', product?.id] }); toast.success('Variations saved'); onClose(); },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Failed'),
  });

  if (!product) return null;

  return (
    <Modal open={!!product} title={`Variations · ${product.name}`} onClose={onClose}>
      <div className="space-y-3 text-sm">
        <p className="text-slate-500">e.g. 30ml, 60ml, 1L — each with its own price. Leave empty for a single-price item.</p>
        {rows.map((r, i) => (
          <div key={i} className="flex items-center gap-2">
            <input className="input h-9 flex-1" placeholder="Size / name" value={r.name}
              onChange={(e) => setRows((rs) => rs.map((x, idx) => idx === i ? { ...x, name: e.target.value } : x))} />
            <input className="input h-9 w-28 text-right" type="number" placeholder="Price" value={r.salePrice}
              onChange={(e) => setRows((rs) => rs.map((x, idx) => idx === i ? { ...x, salePrice: Number(e.target.value) } : x))} />
            <button className="text-red-500" onClick={() => setRows((rs) => rs.filter((_, idx) => idx !== i))}>✕</button>
          </div>
        ))}
        <button className="text-brand hover:underline" onClick={() => setRows((rs) => [...rs, { name: '', salePrice: 0 }])}>+ Add variation</button>
        <button className="btn-primary w-full" disabled={save.isPending} onClick={() => save.mutate()}>
          {save.isPending ? 'Saving…' : 'Save variations'}
        </button>
      </div>
    </Modal>
  );
}
