'use client';

import { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth-store';
import { useCart } from '@/store/cart';
import { money } from '@/lib/format';
import { CameraScanner } from '@/components/CameraScanner';
import { BarcodeGenerator } from '@/components/BarcodeGenerator';
import { Modal } from '@/components/Modal';
import { CheckoutModal, type CheckoutBilling } from '@/components/CheckoutModal';

interface Product {
  id: string; sku: string; barcode: string | null; name: string;
  salePrice: string; taxRate: string; stock: string; categoryId: string | null;
}

export default function PosPage() {
  const currency = useAuth((s) => s.user?.currency ?? 'NPR');
  const qc = useQueryClient();
  const cart = useCart();
  const [search, setSearch] = useState('');
  const [scanOpen, setScanOpen] = useState(false);
  const [barcodeFor, setBarcodeFor] = useState<Product | null>(null);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [receipt, setReceipt] = useState<any>(null);
  const [submitting, setSubmitting] = useState(false);
  const [cat, setCat] = useState('');

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

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return products.filter((p) => {
      if (cat && p.categoryId !== cat) return false;
      if (!q) return true;
      return p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q) || (p.barcode ?? '').includes(q);
    });
  }, [products, search, cat]);

  const addProduct = (p: Product) =>
    cart.addItem({ productId: p.id, sku: p.sku, name: p.name, unitPrice: Number(p.salePrice), taxRate: Number(p.taxRate) });

  const handleScan = (code: string) => {
    setScanOpen(false);
    const found = products.find((p) => p.barcode === code || p.sku === code);
    if (found) { addProduct(found); toast.success(`Added ${found.name}`); }
    else toast.error('Product not found for scanned code');
  };

  const checkout = async (billing: CheckoutBilling) => {
    setSubmitting(true);
    try {
      const { data } = await api.post('/sales', {
        items: cart.lines.map((l) => ({ productId: l.productId, quantity: l.quantity, discount: l.discount })),
        discount: billing.discount,
        customerId: billing.customerId,
        redeemPoints: billing.redeemPoints,
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
          <input className="input" placeholder="Search by name / SKU / barcode" value={search} onChange={(e) => setSearch(e.target.value)} />
          <button className="btn-ghost whitespace-nowrap" onClick={() => setScanOpen(true)}>📷 Scan</button>
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
            <div key={p.id} className="card flex flex-col p-3">
              <button className="flex-1 text-left" onClick={() => addProduct(p)}>
                <div className="font-medium">{p.name}</div>
                <div className="text-xs text-slate-500">{p.sku} · stock {Number(p.stock)}</div>
                <div className="mt-1 font-semibold text-brand">{money(Number(p.salePrice), currency)}</div>
              </button>
              <button className="mt-2 text-xs text-slate-500 hover:text-brand" onClick={() => setBarcodeFor(p)}>
                {p.barcode ? 'View barcode' : '⊕ Generate barcode'}
              </button>
            </div>
          ))}
          {filtered.length === 0 && <p className="col-span-full text-slate-500">No products.</p>}
        </div>
      </div>

      <div className="flex w-full flex-col border-t bg-white p-4 lg:w-96 lg:border-l lg:border-t-0">
        <h2 className="mb-3 text-lg font-semibold">Cart</h2>
        <div className="flex-1 space-y-3 overflow-y-auto">
          {cart.lines.length === 0 && <p className="text-slate-400">Cart is empty.</p>}
          {cart.lines.map((l) => (
            <div key={l.productId} className="border-b pb-2">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="truncate font-medium">{l.name}</div>
                  <div className="text-xs text-slate-500">{money(l.unitPrice, currency)}</div>
                </div>
                <div className="flex items-center gap-1">
                  <button className="btn-ghost px-2 py-1" onClick={() => cart.setQty(l.productId, l.quantity - 1)}>−</button>
                  <span className="w-8 text-center">{l.quantity}</span>
                  <button className="btn-ghost px-2 py-1" onClick={() => cart.setQty(l.productId, l.quantity + 1)}>+</button>
                  <button className="ml-1 text-red-500" onClick={() => cart.removeItem(l.productId)}>✕</button>
                </div>
              </div>
              <div className="mt-1 flex items-center justify-end gap-2 text-xs text-slate-500">
                <span>Disc</span>
                <input className="input h-7 w-20 text-right text-xs" type="number" value={l.discount}
                  onChange={(e) => cart.setDiscount(l.productId, Number(e.target.value))} />
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

      <Modal open={scanOpen} title="Scan barcode" onClose={() => setScanOpen(false)}>
        {scanOpen && <CameraScanner onScan={handleScan} onClose={() => setScanOpen(false)} />}
      </Modal>
      <Modal open={!!barcodeFor} title={barcodeFor?.name} onClose={() => setBarcodeFor(null)}>
        {barcodeFor && <BarcodeGenerator value={barcodeFor.barcode || barcodeFor.sku} label={barcodeFor.name} />}
      </Modal>

      <CheckoutModal
        open={checkoutOpen}
        onClose={() => setCheckoutOpen(false)}
        currency={currency}
        subtotal={cart.subtotal()}
        tax={cart.tax()}
        serviceChargeRate={Number(shop?.serviceChargeRate ?? 0)}
        roundOffEnabled={!!shop?.roundOff}
        customers={customers}
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
            <button className="btn-primary w-full" onClick={() => window.print()}>Print receipt</button>
          </div>
        )}
      </Modal>
    </div>
  );
}

function Line({ label, v }: { label: string; v: string }) {
  return <div className="flex justify-between"><span>{label}</span><span>{v}</span></div>;
}
