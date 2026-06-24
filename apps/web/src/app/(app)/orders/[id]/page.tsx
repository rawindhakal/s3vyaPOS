'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth-store';
import { money } from '@/lib/format';
import { printToStation, billHtml } from '@/lib/print';
import { Modal } from '@/components/Modal';
import { CheckoutModal, type CheckoutBilling } from '@/components/CheckoutModal';

interface Variation { id: string; name: string; salePrice: string }
interface Product { id: string; sku: string; name: string; salePrice: string; station: string; hasVariations: boolean; variations: Variation[] }
interface Line { key: string; productId: string; variationId?: string; name: string; unitPrice: number; quantity: number }

export default function OrderPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const currency = useAuth((s) => s.user?.currency ?? 'NPR');
  const [lines, setLines] = useState<Line[]>([]);
  const [search, setSearch] = useState('');
  const [saving, setSaving] = useState(false);
  const [settleOpen, setSettleOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [variationFor, setVariationFor] = useState<Product | null>(null);

  const { data: order } = useQuery<any>({
    queryKey: ['order', id], queryFn: async () => (await api.get(`/orders/${id}`)).data,
  });
  const { data: products = [] } = useQuery<Product[]>({
    queryKey: ['products'], queryFn: async () => (await api.get('/products')).data,
  });
  const { data: customers = [] } = useQuery<any[]>({
    queryKey: ['customers'], queryFn: async () => (await api.get('/customers')).data,
  });
  const { data: shop } = useQuery<any>({
    queryKey: ['shop'], queryFn: async () => (await api.get('/shop')).data,
  });
  const role = useAuth((s) => s.user?.role);
  const waiter = role === 'WAITER';

  const productIds = [...new Set(lines.map((l) => l.productId))];
  const { data: recs = [] } = useQuery<Product[]>({
    queryKey: ['recs', productIds.sort().join(',')],
    queryFn: async () => (await api.post('/recommendations', { productIds })).data,
    enabled: lines.length > 0,
  });

  const vat = Number(shop?.taxRate ?? 0);

  useEffect(() => {
    if (order?.items) {
      setLines(order.items.map((i: any) => ({
        key: i.variationId ?? i.productId, productId: i.productId, variationId: i.variationId ?? undefined,
        name: i.name, unitPrice: Number(i.unitPrice), quantity: Number(i.quantity),
      })));
    }
  }, [order?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return q ? products.filter((p) => p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q)) : products;
  }, [products, search]);

  const addLine = (productId: string, variationId: string | undefined, name: string, unitPrice: number) =>
    setLines((ls) => {
      const key = variationId ?? productId;
      const ex = ls.find((l) => l.key === key);
      if (ex) return ls.map((l) => (l.key === key ? { ...l, quantity: l.quantity + 1 } : l));
      return [...ls, { key, productId, variationId, name, unitPrice, quantity: 1 }];
    });
  const add = (p: Product) => {
    if (p.hasVariations) { setVariationFor(p); return; }
    addLine(p.id, undefined, p.name, Number(p.salePrice));
  };
  const pickVariation = (p: Product, v: Variation) => {
    addLine(p.id, v.id, `${p.name} (${v.name})`, Number(v.salePrice));
    setVariationFor(null);
  };
  const setQty = (key: string, q: number) =>
    setLines((ls) => ls.map((l) => (l.key === key ? { ...l, quantity: q } : l)).filter((l) => l.quantity > 0));

  const subtotal = lines.reduce((s, l) => s + l.unitPrice * l.quantity, 0);
  const tax = lines.reduce((s, l) => s + (l.unitPrice * l.quantity * vat) / 100, 0);

  const saveItems = () =>
    api.put(`/orders/${id}/items`, { items: lines.map((l) => ({ productId: l.productId, variationId: l.variationId, quantity: l.quantity })) });

  const save = async () => {
    setSaving(true);
    try { await saveItems(); toast.success('Order saved'); }
    catch (e: any) { toast.error(e?.response?.data?.message ?? 'Save failed'); }
    finally { setSaving(false); }
  };

  // Save items, then queue the order for KOT — the cashier device prints + buzzes.
  const sendKitchen = async () => {
    try {
      await saveItems();
      await api.post(`/orders/${id}/send-kot`);
      toast.success('Sent to kitchen');
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? 'Failed to send');
    }
  };

  const settle = async (billing: CheckoutBilling) => {
    setBusy(true);
    try {
      await saveItems();
      const { data } = await api.post(`/orders/${id}/settle`, {
        payments: billing.payments,
        customerId: billing.customerId,
        discount: billing.discount,
        redeemPoints: billing.redeemPoints,
        tip: billing.tip,
      });
      try { await printToStation('BILLING', billHtml({ shopName: shop?.name ?? '', currency, sale: data })); } catch { /* ignore */ }
      toast.success(`Settled · ${data.invoiceNo}`);
      router.push('/tables');
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? 'Settle failed');
    } finally { setBusy(false); }
  };

  const cancel = async () => {
    if (!confirm('Cancel this order?')) return;
    await api.post(`/orders/${id}/cancel`);
    router.push('/tables');
  };

  return (
    <div className="flex h-full flex-col lg:flex-row">
      <div className="flex-1 space-y-3 p-4">
        <div className="flex items-center gap-2">
          <button className="btn-ghost" onClick={() => router.push('/tables')}>← Floor</button>
          <input className="input" placeholder="Search menu" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
          {filtered.map((p) => (
            <button key={p.id} className="card p-3 text-left hover:border-brand" onClick={() => add(p)}>
              <div className="font-medium">{p.name}</div>
              <div className="text-sm font-semibold text-brand">
                {p.hasVariations ? `${p.variations.length} sizes ▾` : money(Number(p.salePrice), currency)}
              </div>
            </button>
          ))}
        </div>
      </div>

      <div className="flex w-full flex-col border-t bg-white p-4 lg:w-96 lg:border-l lg:border-t-0">
        <h2 className="mb-1 text-lg font-semibold">
          {order?.table?.name ? `Table ${order.table.name}` : order?.orderType ?? 'Order'}
        </h2>
        <div className="flex-1 space-y-2 overflow-y-auto">
          {lines.length === 0 && <p className="text-slate-400">No items.</p>}
          {lines.map((l) => (
            <div key={l.key} className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <div className="truncate font-medium">{l.name}</div>
                <div className="text-xs text-slate-500">{money(l.unitPrice, currency)}</div>
              </div>
              <div className="flex items-center gap-1">
                <button className="btn-ghost px-2 py-1" onClick={() => setQty(l.key, l.quantity - 1)}>−</button>
                <span className="w-8 text-center">{l.quantity}</span>
                <button className="btn-ghost px-2 py-1" onClick={() => setQty(l.key, l.quantity + 1)}>+</button>
              </div>
            </div>
          ))}
        </div>
        {recs.length > 0 && (
          <div className="mt-2 border-t pt-2">
            <div className="mb-1 text-xs font-medium text-slate-500">✨ Suggested add-ons</div>
            <div className="flex flex-wrap gap-2">
              {recs.map((r) => (
                <button key={r.id} className="rounded-full bg-brand/10 px-3 py-1 text-xs text-brand hover:bg-brand/20" onClick={() => add(r)}>
                  + {r.name}{!r.hasVariations ? ` · ${money(Number(r.salePrice), currency)}` : ''}
                </button>
              ))}
            </div>
          </div>
        )}
        <div className="mt-3 space-y-1 border-t pt-3 text-sm">
          <div className="flex justify-between"><span>Subtotal</span><span>{money(subtotal, currency)}</span></div>
          <div className="flex justify-between"><span>Tax</span><span>{money(tax, currency)}</span></div>
          <div className="flex justify-between text-lg font-semibold"><span>Total</span><span>{money(subtotal + tax, currency)}</span></div>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <button className="btn-ghost" disabled={saving} onClick={save}>{saving ? 'Saving…' : 'Save'}</button>
          <button className="btn-ghost" onClick={sendKitchen}>🖨 Send to kitchen</button>
          <button className="btn-ghost text-red-600" onClick={cancel}>Cancel order</button>
          {!waiter && <button className="btn-primary" disabled={lines.length === 0} onClick={() => setSettleOpen(true)}>Settle</button>}
        </div>
      </div>

      <CheckoutModal
        open={settleOpen}
        onClose={() => setSettleOpen(false)}
        currency={currency}
        subtotal={subtotal}
        tax={tax}
        serviceChargeRate={Number(shop?.serviceChargeRate ?? 0)}
        roundOffEnabled={!!shop?.roundOff}
        customers={customers}
        confirmLabel="Settle order"
        busy={busy}
        onConfirm={settle}
      />

      <Modal open={!!variationFor} title={`Select size · ${variationFor?.name ?? ''}`} onClose={() => setVariationFor(null)}>
        <div className="grid grid-cols-2 gap-2">
          {variationFor?.variations.map((v) => (
            <button key={v.id} className="card p-3 text-left hover:border-brand" onClick={() => pickVariation(variationFor, v)}>
              <div className="font-medium">{v.name}</div>
              <div className="text-sm font-semibold text-brand">{money(Number(v.salePrice), currency)}</div>
            </button>
          ))}
        </div>
      </Modal>
    </div>
  );
}
