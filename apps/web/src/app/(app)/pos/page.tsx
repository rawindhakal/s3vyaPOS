'use client';

import { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth-store';
import { useCart } from '@/store/cart';
import { money } from '@/lib/format';
import { printToStation, billHtml } from '@/lib/print';
import { Modal } from '@/components/Modal';
import { CheckoutModal, type CheckoutBilling } from '@/components/CheckoutModal';
import { ProductConfigModal, type ConfiguredItem } from '@/components/ProductConfigModal';

interface Variation { id: string; name: string; salePrice: string }
interface Modifier { id: string; name: string; price: string }
interface Product {
  id: string; sku: string; name: string;
  salePrice: string; categoryId: string | null;
  hasVariations: boolean; variations: Variation[]; modifiers: Modifier[];
}

export default function PosPage() {
  const currency = useAuth((s) => s.user?.currency ?? 'NPR');
  const qc = useQueryClient();
  const cart = useCart();
  const [search, setSearch] = useState('');
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [receipt, setReceipt] = useState<any>(null);
  const [submitting, setSubmitting] = useState(false);
  const [cat, setCat] = useState('');
  const [configFor, setConfigFor] = useState<Product | null>(null);

  const { data: products = [] } = useQuery<Product[]>({
    queryKey: ['products'], queryFn: async () => (await api.get('/products')).data,
  });
  const { data: categories = [] } = useQuery<{ id: string; name: string }[]>({
    queryKey: ['categories'], queryFn: async () => (await api.get('/products/categories')).data,
  });
  const { data: customers = [] } = useQuery<any[]>({
    queryKey: ['customers'], queryFn: async () => (await api.get('/customers')).data,
  });
  const { data: shop } = useQuery<any>({
    queryKey: ['shop'], queryFn: async () => (await api.get('/shop')).data,
  });
  const { data: channels = [] } = useQuery<any[]>({
    queryKey: ['payment-channels'], queryFn: async () => (await api.get('/payment-channels')).data,
  });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return products.filter((p) => {
      if (cat && p.categoryId !== cat) return false;
      if (!q) return true;
      return p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q);
    });
  }, [products, search, cat]);

  const vat = Number(shop?.taxRate ?? 0);

  const addProduct = (p: Product) => {
    if (p.hasVariations || (p.modifiers?.length ?? 0) > 0) { setConfigFor(p); return; }
    cart.addItem({ productId: p.id, sku: p.sku, name: p.name, unitPrice: Number(p.salePrice), taxRate: vat });
  };

  const addConfigured = (c: ConfiguredItem) => {
    cart.addItem({ productId: c.productId, variationId: c.variationId, modifierIds: c.modifierIds, sku: c.sku, name: c.name, unitPrice: c.unitPrice, taxRate: vat });
    setConfigFor(null);
  };

  const checkout = async (billing: CheckoutBilling) => {
    setSubmitting(true);
    try {
      const { data } = await api.post('/sales', {
        items: cart.lines.map((l) => ({ productId: l.productId, variationId: l.variationId, modifierIds: l.modifierIds, quantity: l.quantity, discount: l.discount })),
        discount: billing.discount,
        customerId: billing.customerId,
        redeemPoints: billing.redeemPoints,
        tip: billing.tip,
        payments: billing.payments,
      });
      setReceipt(data);
      cart.clear();
      setCheckoutOpen(false);
      qc.invalidateQueries({ queryKey: ['products'] });
      qc.invalidateQueries({ queryKey: ['customers'] });
      toast.success(`Sale ${data.invoiceNo} completed`);
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Sale failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex h-full flex-col lg:flex-row">
      <div className="flex-1 space-y-4 p-4">
        <div className="flex gap-2">
          <input className="input" placeholder="Search by name / SKU" value={search} onChange={(e) => setSearch(e.target.value)} />
          <button className="btn-ghost whitespace-nowrap no-print" onClick={() => { const el: any = document.documentElement; if (document.fullscreenElement) document.exitFullscreen(); else el.requestFullscreen?.(); }}>⛶</button>
        </div>
        {categories.length > 0 && (
          <div className="flex flex-wrap gap-2">
            <button className={`rounded-full px-3 py-1 text-sm ${!cat ? 'bg-brand text-white' : 'bg-white ring-1 ring-slate-200'}`} onClick={() => setCat('')}>All</button>
            {categories.map((c) => (
              <button key={c.id} className={`rounded-full px-3 py-1 text-sm ${cat === c.id ? 'bg-brand text-white' : 'bg-white ring-1 ring-slate-200'}`} onClick={() => setCat(c.id)}>{c.name}</button>
            ))}
          </div>
        )}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
          {filtered.map((p) => (
            <button key={p.id} className="card flex flex-col p-3 text-left hover:border-brand" onClick={() => addProduct(p)}>
              <div className="font-medium">{p.name}</div>
              <div className="text-xs text-slate-500">{p.sku}</div>
              <div className="mt-1 font-semibold text-brand">
                {p.hasVariations ? `${p.variations.length} sizes ▾` : money(Number(p.salePrice), currency)}
                {(p.modifiers?.length ?? 0) > 0 && <span className="ml-1 text-xs text-slate-400">+ add-ons</span>}
              </div>
            </button>
          ))}
          {filtered.length === 0 && <p className="col-span-full text-slate-500">No products.</p>}
        </div>
      </div>

      <div className="flex w-full flex-col border-t bg-white p-4 lg:w-96 lg:border-l lg:border-t-0">
        <h2 className="mb-3 text-lg font-semibold">Cart</h2>
        <div className="flex-1 space-y-3 overflow-y-auto">
          {cart.lines.length === 0 && <p className="text-slate-400">Cart is empty.</p>}
          {cart.lines.map((l) => (
            <div key={l.key} className="border-b pb-2">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="truncate font-medium">{l.name}</div>
                  <div className="text-xs text-slate-500">{money(l.unitPrice, currency)}</div>
                </div>
                <div className="flex items-center gap-1">
                  <button className="btn-ghost px-2 py-1" onClick={() => cart.setQty(l.key, l.quantity - 1)}>−</button>
                  <span className="w-8 text-center">{l.quantity}</span>
                  <button className="btn-ghost px-2 py-1" onClick={() => cart.setQty(l.key, l.quantity + 1)}>+</button>
                  <button className="ml-1 text-red-500" onClick={() => cart.removeItem(l.key)}>✕</button>
                </div>
              </div>
              <div className="mt-1 flex items-center justify-end gap-2 text-xs text-slate-500">
                <span>Disc</span>
                <input className="input h-7 w-20 text-right text-xs" type="number" value={l.discount}
                  onChange={(e) => cart.setDiscount(l.key, Number(e.target.value))} />
              </div>
            </div>
          ))}
        </div>
        <div className="mt-3 space-y-1 border-t pt-3 text-sm">
          <div className="flex justify-between"><span>Subtotal</span><span>{money(cart.subtotal(), currency)}</span></div>
          <div className="flex justify-between"><span>Tax</span><span>{money(cart.tax(), currency)}</span></div>
          <div className="flex justify-between text-lg font-semibold"><span>Total</span><span>{money(cart.total(), currency)}</span></div>
        </div>
        <button className="btn-primary mt-3" disabled={cart.lines.length === 0} onClick={() => setCheckoutOpen(true)}>Checkout</button>
      </div>

      <ProductConfigModal product={configFor} currency={currency} onClose={() => setConfigFor(null)} onAdd={addConfigured} />

      <CheckoutModal
        open={checkoutOpen}
        onClose={() => setCheckoutOpen(false)}
        currency={currency}
        subtotal={cart.subtotal()}
        tax={cart.tax()}
        serviceChargeRate={Number(shop?.serviceChargeRate ?? 0)}
        roundOffEnabled={!!shop?.roundOff}
        customers={customers}
        channels={channels}
        confirmLabel="Confirm sale"
        busy={submitting}
        onConfirm={checkout}
      />

      <Modal open={!!receipt} title={`Receipt ${receipt?.invoiceNo ?? ''}`} onClose={() => setReceipt(null)}>
        {receipt && (
          <div className="space-y-2 text-sm">
            {receipt.items?.map((it: any) => (
              <div key={it.id} className="flex justify-between">
                <span>{it.name} × {Number(it.quantity)}{Number(it.discount) ? ` (−${money(Number(it.discount), currency)})` : ''}</span>
                <span>{money(Number(it.lineTotal), currency)}</span>
              </div>
            ))}
            <div className="space-y-1 border-t pt-2">
              <Line label="Subtotal" v={money(Number(receipt.subtotal), currency)} />
              {Number(receipt.discount) > 0 && <Line label="Discount" v={`−${money(Number(receipt.discount), currency)}`} />}
              {Number(receipt.serviceCharge) > 0 && <Line label="Service charge" v={money(Number(receipt.serviceCharge), currency)} />}
              <Line label="Tax" v={money(Number(receipt.tax), currency)} />
              {Number(receipt.roundOff) !== 0 && <Line label="Round off" v={money(Number(receipt.roundOff), currency)} />}
              <div className="flex justify-between font-bold"><span>Total</span><span>{money(Number(receipt.total), currency)}</span></div>
            </div>
            <div className="border-t pt-2 text-xs text-slate-500">
              {receipt.payments?.map((p: any) => <div key={p.id}>{p.method} {money(Number(p.amount), currency)}{p.qrPayload ? ` · ${p.qrPayload}` : ''}</div>)}
              {Number(receipt.loyaltyEarned) > 0 && <div>Loyalty earned: {Number(receipt.loyaltyEarned)} pts</div>}
            </div>
            <button className="btn-primary w-full" onClick={() => printToStation('BILLING', billHtml({ shopName: shop?.name ?? '', currency, sale: receipt }))}>Print receipt</button>
          </div>
        )}
      </Modal>
    </div>
  );
}

function Line({ label, v }: { label: string; v: string }) {
  return <div className="flex justify-between"><span>{label}</span><span>{v}</span></div>;
}
