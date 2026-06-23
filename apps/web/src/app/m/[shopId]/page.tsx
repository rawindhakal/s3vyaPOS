'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5300/api';

interface Variation { id: string; name: string; salePrice: string }
interface Product { id: string; name: string; description?: string | null; salePrice: string; categoryId: string | null; hasVariations?: boolean; variations?: Variation[] }
interface Category { id: string; name: string }
interface Entry { key: string; productId: string; variationId?: string; name: string; description?: string | null; price: number; categoryId: string | null }

export default function PublicMenuPage() {
  const { shopId } = useParams<{ shopId: string }>();
  const tableId = useSearchParams().get('table') ?? undefined;

  const [data, setData] = useState<{ shop: any; categories: Category[]; products: Product[] } | null>(null);
  const [cart, setCart] = useState<Record<string, number>>({});
  const [cat, setCat] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [placed, setPlaced] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch(`${API}/public/menu/${shopId}`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then(setData)
      .catch(() => setError('Menu not available'));
  }, [shopId]);

  const currency = data?.shop?.currency ?? 'NPR';
  const fmt = (n: number) => `${currency} ${n.toFixed(2)}`;

  // Flatten products into menu entries — one per variation (size).
  const allEntries = useMemo<Entry[]>(() => {
    const out: Entry[] = [];
    for (const p of data?.products ?? []) {
      if (p.hasVariations && p.variations?.length) {
        for (const v of p.variations) {
          out.push({ key: v.id, productId: p.id, variationId: v.id, name: `${p.name} (${v.name})`, description: p.description, price: Number(v.salePrice), categoryId: p.categoryId });
        }
      } else {
        out.push({ key: p.id, productId: p.id, name: p.name, description: p.description, price: Number(p.salePrice), categoryId: p.categoryId });
      }
    }
    return out;
  }, [data]);

  const entries = useMemo(() => allEntries.filter((e) => !cat || e.categoryId === cat), [allEntries, cat]);
  const lines = allEntries.filter((e) => cart[e.key] > 0);
  const total = lines.reduce((s, e) => s + e.price * cart[e.key], 0);

  const setQty = (key: string, q: number) =>
    setCart((c) => { const n = { ...c }; if (q <= 0) delete n[key]; else n[key] = q; return n; });

  const place = async () => {
    setBusy(true); setError('');
    try {
      const res = await fetch(`${API}/public/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shopId,
          tableId,
          orderType: tableId ? 'DINE_IN' : 'TAKEAWAY',
          customerName: name || undefined,
          phone: phone || undefined,
          items: lines.map((e) => ({ productId: e.productId, variationId: e.variationId, quantity: cart[e.key] })),
        }),
      });
      if (!res.ok) throw new Error((await res.json()).message ?? 'Failed');
      setPlaced(await res.json());
      setCart({});
    } catch (e: any) {
      setError(e.message ?? 'Could not place order');
    } finally { setBusy(false); }
  };

  if (error && !data) return <Centered>{error}</Centered>;
  if (!data) return <Centered>Loading menu…</Centered>;

  if (placed) {
    return (
      <Centered>
        <div className="text-5xl">✅</div>
        <h1 className="mt-3 text-xl font-bold">Order placed!</h1>
        <p className="mt-1 text-slate-500">
          {tableId ? 'Your order has been sent to the kitchen.' : 'We’ll prepare your takeaway shortly.'}
        </p>
        <p className="mt-2 text-sm text-slate-400">Status: {placed.status}</p>
        <button className="btn-primary mt-6" onClick={() => setPlaced(null)}>Order more</button>
      </Centered>
    );
  }

  return (
    <div className="mx-auto min-h-screen max-w-lg bg-slate-50 pb-40">
      <header className="bg-brand p-5 text-white">
        <h1 className="text-2xl font-bold">{data.shop.name}</h1>
        <p className="text-sm opacity-90">{tableId ? 'Dine-in order' : 'Takeaway order'}</p>
      </header>

      {data.categories.length > 0 && (
        <div className="flex gap-2 overflow-x-auto p-3">
          <Chip active={!cat} onClick={() => setCat('')}>All</Chip>
          {data.categories.map((c) => <Chip key={c.id} active={cat === c.id} onClick={() => setCat(c.id)}>{c.name}</Chip>)}
        </div>
      )}

      <div className="space-y-2 px-3">
        {entries.map((e) => (
          <div key={e.key} className="flex items-center justify-between rounded-xl bg-white p-3 shadow-sm">
            <div className="min-w-0">
              <div className="font-medium">{e.name}</div>
              {e.description && <div className="truncate text-xs text-slate-400">{e.description}</div>}
              <div className="text-sm font-semibold text-brand">{fmt(e.price)}</div>
            </div>
            <div className="flex items-center gap-2">
              {cart[e.key] ? (
                <>
                  <button className="h-8 w-8 rounded-full bg-slate-200" onClick={() => setQty(e.key, (cart[e.key] ?? 0) - 1)}>−</button>
                  <span className="w-5 text-center">{cart[e.key]}</span>
                  <button className="h-8 w-8 rounded-full bg-brand text-white" onClick={() => setQty(e.key, (cart[e.key] ?? 0) + 1)}>+</button>
                </>
              ) : (
                <button className="rounded-lg bg-brand px-3 py-1.5 text-sm text-white" onClick={() => setQty(e.key, 1)}>Add</button>
              )}
            </div>
          </div>
        ))}
        {entries.length === 0 && <p className="py-8 text-center text-slate-400">No items.</p>}
      </div>

      {lines.length > 0 && (
        <div className="fixed inset-x-0 bottom-0 mx-auto max-w-lg space-y-2 border-t bg-white p-4 shadow-lg">
          {!tableId && (
            <div className="grid grid-cols-2 gap-2">
              <input className="input" placeholder="Your name" value={name} onChange={(e) => setName(e.target.value)} />
              <input className="input" placeholder="Phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>
          )}
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button className="btn-primary w-full" disabled={busy} onClick={place}>
            {busy ? 'Placing…' : `Place order · ${fmt(total)}`}
          </button>
        </div>
      )}
    </div>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return <div className="flex min-h-screen flex-col items-center justify-center p-6 text-center">{children}</div>;
}
function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} className={`whitespace-nowrap rounded-full px-4 py-1.5 text-sm ${active ? 'bg-brand text-white' : 'bg-white ring-1 ring-slate-200'}`}>
      {children}
    </button>
  );
}
