'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth-store';
import { money } from '@/lib/format';
import { printToStation, kotHtml, billHtml } from '@/lib/print';
import { Modal } from '@/components/Modal';
import { CheckoutModal, type CheckoutBilling } from '@/components/CheckoutModal';
import { ProductConfigModal, type ConfiguredItem } from '@/components/ProductConfigModal';

interface Variation { id: string; name: string; salePrice: string }
interface Modifier { id: string; name: string; price: string }
interface Product { id: string; sku: string; name: string; salePrice: string; station: string; hasVariations: boolean; variations: Variation[]; modifiers: Modifier[] }
interface Item { id: string; productId: string; name: string; unitPrice: string; quantity: string; note: string | null; sent: boolean; prepStatus: string }

export default function OrderPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const qc = useQueryClient();
  const currency = useAuth((s) => s.user?.currency ?? 'NPR');
  const role = useAuth((s) => s.user?.role);
  const waiter = role === 'WAITER';

  const [search, setSearch] = useState('');
  const [settleOpen, setSettleOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [configFor, setConfigFor] = useState<Product | null>(null);
  const [moveOpen, setMoveOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [guests, setGuests] = useState('');
  const [orderNote, setOrderNote] = useState('');

  const { data: order } = useQuery<any>({ queryKey: ['order', id], queryFn: async () => (await api.get(`/orders/${id}`)).data });
  const { data: products = [] } = useQuery<Product[]>({ queryKey: ['products'], queryFn: async () => (await api.get('/products')).data });
  const { data: customers = [] } = useQuery<any[]>({ queryKey: ['customers'], queryFn: async () => (await api.get('/customers')).data });
  const { data: shop } = useQuery<any>({ queryKey: ['shop'], queryFn: async () => (await api.get('/shop')).data });
  const { data: tables = [] } = useQuery<any[]>({ queryKey: ['tables'], queryFn: async () => (await api.get('/tables')).data });
  const { data: channels = [] } = useQuery<any[]>({ queryKey: ['payment-channels'], queryFn: async () => (await api.get('/payment-channels')).data });
  const { data: logs = [] } = useQuery<any[]>({ queryKey: ['order-logs', id], queryFn: async () => (await api.get(`/orders/${id}/logs`)).data, enabled: historyOpen });

  const items: Item[] = order?.items ?? [];
  const vat = Number(shop?.taxRate ?? 0);

  useEffect(() => {
    if (order) { setGuests(order.guests != null ? String(order.guests) : ''); setOrderNote(order.note ?? ''); }
  }, [order?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const productIds = [...new Set(items.map((l) => l.productId))];
  const { data: recs = [] } = useQuery<Product[]>({
    queryKey: ['recs', productIds.sort().join(',')],
    queryFn: async () => (await api.post('/recommendations', { productIds })).data,
    enabled: items.length > 0,
  });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return q ? products.filter((p) => p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q)) : products;
  }, [products, search]);

  const stationOf = useMemo(() => new Map(products.map((p) => [p.id, p.station])), [products]);
  const subtotal = items.reduce((s, l) => s + Number(l.unitPrice) * Number(l.quantity), 0);
  const tax = subtotal * vat / 100;

  // Run a mutation, then refresh the order, its log and the floor.
  const run = async (fn: () => Promise<any>, okMsg?: string) => {
    try {
      await fn();
      await qc.invalidateQueries({ queryKey: ['order', id] });
      qc.invalidateQueries({ queryKey: ['order-logs', id] });
      qc.invalidateQueries({ queryKey: ['tables'] });
      if (okMsg) toast.success(okMsg);
    } catch (e: any) { toast.error(e?.response?.data?.message ?? 'Action failed'); }
  };

  const addProduct = (p: Product) => {
    if (p.hasVariations || (p.modifiers?.length ?? 0) > 0) { setConfigFor(p); return; }
    run(() => api.post(`/orders/${id}/items`, { productId: p.id, quantity: 1 }));
  };
  const addConfigured = (c: ConfiguredItem) => {
    run(() => api.post(`/orders/${id}/items`, { productId: c.productId, variationId: c.variationId, modifierIds: c.modifierIds, quantity: 1, note: c.note }));
    setConfigFor(null);
  };
  const changeQty = (it: Item, delta: number) => {
    const next = Number(it.quantity) + delta;
    if (next <= 0) { voidLine(it); return; }
    run(() => api.patch(`/orders/${id}/items/${it.id}`, { quantity: next }));
  };
  const editNote = (it: Item) => {
    const note = window.prompt('Note to kitchen for ' + it.name, it.note ?? '');
    if (note === null) return;
    run(() => api.patch(`/orders/${id}/items/${it.id}`, { note }), 'Note saved');
  };
  const voidLine = (it: Item) => {
    let reason: string | null = '';
    if (it.sent) {
      reason = window.prompt(`Void "${it.name}" — this item was already sent to the kitchen. Reason?`);
      if (!reason) { if (reason !== null) toast.error('A reason is required to void a sent item'); return; }
    } else if (!window.confirm(`Remove ${it.name}?`)) return;
    run(() => api.post(`/orders/${id}/items/${it.id}/void`, { reason: reason || undefined }), 'Item voided');
  };
  const saveMeta = () => run(() => api.patch(`/orders/${id}/meta`, { note: orderNote || undefined, guests: guests ? Number(guests) : undefined }));
  const moveTable = (tableId: string) => { run(() => api.post(`/orders/${id}/move`, { tableId }), 'Order moved'); setMoveOpen(false); };

  const sendKitchen = () => run(() => api.post(`/orders/${id}/send-kot`), 'Sent to kitchen');
  const reprintKot = () => {
    const groups: Record<string, { name: string; quantity: number; note?: string }[]> = {};
    for (const it of items) {
      const st = stationOf.get(it.productId) ?? 'KITCHEN';
      (groups[st] ??= []).push({ name: it.name, quantity: Number(it.quantity), note: it.note ?? undefined });
    }
    const title = order?.table?.name ? `Table ${order.table.name}` : order?.orderType ?? 'Order';
    for (const st of ['KITCHEN', 'BAR'] as const) {
      if (groups[st]?.length) printToStation(st, kotHtml({ title, station: st, items: groups[st] }));
    }
    toast.success('Reprinted KOT');
  };

  const settle = async (billing: CheckoutBilling) => {
    setBusy(true);
    try {
      const { data } = await api.post(`/orders/${id}/settle`, {
        payments: billing.payments, customerId: billing.customerId,
        discount: billing.discount, redeemPoints: billing.redeemPoints, tip: billing.tip,
      });
      try { await printToStation('BILLING', billHtml({ shopName: shop?.name ?? '', currency, sale: data })); } catch { /* ignore */ }
      toast.success(`Settled · ${data.invoiceNo}`);
      router.push('/tables');
    } catch (e: any) { toast.error(e?.response?.data?.message ?? 'Settle failed'); }
    finally { setBusy(false); }
  };
  const cancel = async () => {
    if (!confirm('Cancel this order?')) return;
    await api.post(`/orders/${id}/cancel`);
    router.push('/tables');
  };

  const freeTables = tables.filter((t) => t.id !== order?.tableId && t.status === 'FREE');

  return (
    <div className="flex h-full flex-col lg:flex-row">
      <div className="flex-1 space-y-3 p-4">
        <div className="flex items-center gap-2">
          <button className="btn-ghost" onClick={() => router.push('/tables')}>← Floor</button>
          <input className="input" placeholder="Search menu" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
          {filtered.map((p) => (
            <button key={p.id} className="card p-3 text-left hover:border-brand" onClick={() => addProduct(p)}>
              <div className="font-medium">{p.name}</div>
              <div className="text-sm font-semibold text-brand">
                {p.hasVariations ? `${p.variations.length} sizes ▾` : money(Number(p.salePrice), currency)}
                {(p.modifiers?.length ?? 0) > 0 && <span className="ml-1 text-xs text-slate-400">+ add-ons</span>}
              </div>
            </button>
          ))}
        </div>
      </div>

      <div className="flex w-full flex-col border-t bg-white p-4 lg:w-[26rem] lg:border-l lg:border-t-0">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-lg font-semibold">{order?.table?.name ? `Table ${order.table.name}` : order?.orderType ?? 'Order'}</h2>
          <div className="flex gap-2 text-sm">
            <button className="text-slate-500 hover:text-brand" onClick={() => setMoveOpen(true)}>Move</button>
            <button className="text-slate-500 hover:text-brand" onClick={() => setHistoryOpen((v) => !v)}>History</button>
          </div>
        </div>

        <div className="mb-2 flex gap-2">
          <input className="input h-9 w-24" type="number" placeholder="Guests" value={guests} onChange={(e) => setGuests(e.target.value)} onBlur={saveMeta} />
          <input className="input h-9 flex-1" placeholder="Order note (e.g. birthday)" value={orderNote} onChange={(e) => setOrderNote(e.target.value)} onBlur={saveMeta} />
        </div>

        {historyOpen && (
          <div className="mb-2 max-h-40 overflow-y-auto rounded-lg bg-slate-50 p-2 text-xs">
            {logs.length === 0 ? <p className="text-slate-400">No activity yet.</p> : logs.map((l) => (
              <div key={l.id} className="flex justify-between gap-2 border-b border-slate-100 py-1 last:border-0">
                <span><b>{l.action.replace(/_/g, ' ').toLowerCase()}</b>{l.detail ? ` · ${l.detail}` : ''}</span>
                <span className="shrink-0 text-slate-400">{new Date(l.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
              </div>
            ))}
          </div>
        )}

        <div className="flex-1 space-y-2 overflow-y-auto">
          {items.length === 0 && <p className="text-slate-400">No items.</p>}
          {items.map((l) => (
            <div key={l.id} className="border-b pb-2">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="truncate font-medium">
                    {l.name}
                    {l.sent && <span className="ml-1 rounded bg-slate-100 px-1 text-[10px] uppercase text-slate-500">sent</span>}
                    {l.prepStatus === 'READY' && <span className="ml-1 text-[10px] text-green-600">● ready</span>}
                  </div>
                  <div className="text-xs text-slate-500">{money(Number(l.unitPrice), currency)}</div>
                  {l.note && <div className="text-xs text-amber-600">📝 {l.note}</div>}
                </div>
                <div className="flex items-center gap-1">
                  <button className="btn-ghost px-2 py-1" onClick={() => changeQty(l, -1)}>−</button>
                  <span className="w-7 text-center">{Number(l.quantity)}</span>
                  <button className="btn-ghost px-2 py-1" onClick={() => changeQty(l, 1)}>+</button>
                  <button className="ml-1 text-slate-400 hover:text-brand" title="Note" onClick={() => editNote(l)}>📝</button>
                  <button className="text-red-500" title="Void" onClick={() => voidLine(l)}>✕</button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {recs.length > 0 && (
          <div className="mt-2 border-t pt-2">
            <div className="mb-1 text-xs font-medium text-slate-500">✨ Suggested add-ons</div>
            <div className="flex flex-wrap gap-2">
              {recs.map((r) => (
                <button key={r.id} className="rounded-full bg-brand/10 px-3 py-1 text-xs text-brand hover:bg-brand/20" onClick={() => addProduct(r)}>
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
          <button className="btn-ghost" disabled={items.length === 0} onClick={sendKitchen}>🍳 Send to kitchen</button>
          <button className="btn-ghost" disabled={items.length === 0} onClick={reprintKot}>🖨 Reprint KOT</button>
          <button className="btn-ghost text-red-600" onClick={cancel}>Cancel order</button>
          <button className="btn-primary" disabled={items.length === 0} onClick={() => setSettleOpen(true)}>{waiter ? 'Settle (Fonepay)' : 'Settle'}</button>
        </div>
      </div>

      <CheckoutModal
        open={settleOpen} onClose={() => setSettleOpen(false)} currency={currency}
        subtotal={subtotal} tax={tax}
        serviceChargeRate={Number(shop?.serviceChargeRate ?? 0)} roundOffEnabled={!!shop?.roundOff}
        customers={customers} channels={channels} waiterMode={waiter} confirmLabel="Settle order" busy={busy} onConfirm={settle}
      />

      <ProductConfigModal product={configFor} currency={currency} withNote onClose={() => setConfigFor(null)} onAdd={addConfigured} />

      <Modal open={moveOpen} title="Move order to table" onClose={() => setMoveOpen(false)}>
        {freeTables.length === 0 ? <p className="text-slate-400">No free tables.</p> : (
          <div className="grid grid-cols-3 gap-2">
            {freeTables.map((t) => (
              <button key={t.id} className="card p-3 text-center hover:border-brand" onClick={() => moveTable(t.id)}>
                <div className="font-medium">{t.name}</div>
                {t.area && <div className="text-xs text-slate-500">{t.area}</div>}
              </button>
            ))}
          </div>
        )}
      </Modal>
    </div>
  );
}
