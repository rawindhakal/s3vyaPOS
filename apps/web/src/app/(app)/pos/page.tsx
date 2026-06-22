'use client';

import { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import type { PaymentMethod, PaymentProviderName } from '@s3vya/types';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth-store';
import { useCart } from '@/store/cart';
import { money } from '@/lib/format';
import { CameraScanner } from '@/components/CameraScanner';
import { BarcodeGenerator } from '@/components/BarcodeGenerator';
import { Modal } from '@/components/Modal';

interface Product {
  id: string;
  sku: string;
  barcode: string | null;
  name: string;
  salePrice: string;
  taxRate: string;
  stock: string;
}

export default function PosPage() {
  const currency = useAuth((s) => s.user?.currency ?? 'NPR');
  const qc = useQueryClient();
  const cart = useCart();
  const [search, setSearch] = useState('');
  const [scanOpen, setScanOpen] = useState(false);
  const [barcodeFor, setBarcodeFor] = useState<Product | null>(null);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [method, setMethod] = useState<PaymentMethod>('CASH');
  const [provider, setProvider] = useState<PaymentProviderName>('FONEPAY');
  const [customerId, setCustomerId] = useState('');
  const [receipt, setReceipt] = useState<any>(null);
  const [submitting, setSubmitting] = useState(false);

  const { data: products = [] } = useQuery<Product[]>({
    queryKey: ['products'],
    queryFn: async () => (await api.get('/products')).data,
  });

  const { data: customers = [] } = useQuery<{ id: string; name: string }[]>({
    queryKey: ['customers'],
    queryFn: async () => (await api.get('/customers')).data,
  });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return products;
    return products.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.sku.toLowerCase().includes(q) ||
        (p.barcode ?? '').includes(q),
    );
  }, [products, search]);

  const addProduct = (p: Product) =>
    cart.addItem({
      productId: p.id,
      sku: p.sku,
      name: p.name,
      unitPrice: Number(p.salePrice),
      taxRate: Number(p.taxRate),
    });

  const handleScan = (code: string) => {
    setScanOpen(false);
    const found = products.find((p) => p.barcode === code || p.sku === code);
    if (found) {
      addProduct(found);
      toast.success(`Added ${found.name}`);
    } else {
      toast.error('Product not found for scanned code');
    }
  };

  const checkout = async () => {
    if (cart.lines.length === 0) return;
    if (method === 'CREDIT' && !customerId) {
      toast.error('Select a customer for a credit sale');
      return;
    }
    setSubmitting(true);
    try {
      const { data } = await api.post('/sales', {
        items: cart.lines.map((l) => ({ productId: l.productId, quantity: l.quantity })),
        paymentMethod: method,
        provider: method === 'QR' ? provider : undefined,
        customerId: method === 'CREDIT' ? customerId : undefined,
      });
      setReceipt(data);
      cart.clear();
      setCheckoutOpen(false);
      qc.invalidateQueries({ queryKey: ['products'] });
      toast.success(`Sale ${data.invoiceNo} completed`);
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Sale failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex h-full flex-col lg:flex-row">
      {/* Product grid */}
      <div className="flex-1 space-y-4 p-4">
        <div className="flex gap-2">
          <input
            className="input"
            placeholder="Search by name / SKU / barcode"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <button className="btn-ghost whitespace-nowrap" onClick={() => setScanOpen(true)}>
            📷 Scan
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
          {filtered.map((p) => (
            <div key={p.id} className="card flex flex-col p-3">
              <button className="flex-1 text-left" onClick={() => addProduct(p)}>
                <div className="font-medium">{p.name}</div>
                <div className="text-xs text-slate-500">
                  {p.sku} · stock {Number(p.stock)}
                </div>
                <div className="mt-1 font-semibold text-brand">
                  {money(Number(p.salePrice), currency)}
                </div>
              </button>
              <button
                className="mt-2 text-xs text-slate-500 hover:text-brand"
                onClick={() => setBarcodeFor(p)}
              >
                {p.barcode ? 'View barcode' : '⊕ Generate barcode'}
              </button>
            </div>
          ))}
          {filtered.length === 0 && (
            <p className="col-span-full text-slate-500">No products.</p>
          )}
        </div>
      </div>

      {/* Cart */}
      <div className="flex w-full flex-col border-t bg-white p-4 lg:w-96 lg:border-l lg:border-t-0">
        <h2 className="mb-3 text-lg font-semibold">Cart</h2>
        <div className="flex-1 space-y-2 overflow-y-auto">
          {cart.lines.length === 0 && <p className="text-slate-400">Cart is empty.</p>}
          {cart.lines.map((l) => (
            <div key={l.productId} className="flex items-center justify-between gap-2">
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
          ))}
        </div>

        <div className="mt-3 space-y-1 border-t pt-3 text-sm">
          <div className="flex justify-between"><span>Subtotal</span><span>{money(cart.subtotal(), currency)}</span></div>
          <div className="flex justify-between"><span>Tax</span><span>{money(cart.tax(), currency)}</span></div>
          <div className="flex justify-between text-lg font-semibold"><span>Total</span><span>{money(cart.total(), currency)}</span></div>
        </div>
        <button
          className="btn-primary mt-3"
          disabled={cart.lines.length === 0}
          onClick={() => setCheckoutOpen(true)}
        >
          Checkout
        </button>
      </div>

      {/* Scanner modal */}
      <Modal open={scanOpen} title="Scan barcode" onClose={() => setScanOpen(false)}>
        {scanOpen && <CameraScanner onScan={handleScan} onClose={() => setScanOpen(false)} />}
      </Modal>

      {/* Barcode generator modal */}
      <Modal open={!!barcodeFor} title={barcodeFor?.name} onClose={() => setBarcodeFor(null)}>
        {barcodeFor && (
          <BarcodeGenerator value={barcodeFor.barcode || barcodeFor.sku} label={barcodeFor.name} />
        )}
      </Modal>

      {/* Checkout modal */}
      <Modal open={checkoutOpen} title="Checkout" onClose={() => setCheckoutOpen(false)}>
        <div className="space-y-4">
          <div className="text-2xl font-bold">{money(cart.total(), currency)}</div>
          <div className="grid grid-cols-4 gap-2">
            {(['CASH', 'BANK', 'QR', 'CREDIT'] as PaymentMethod[]).map((m) => (
              <button
                key={m}
                className={method === m ? 'btn-primary' : 'btn-ghost'}
                onClick={() => setMethod(m)}
              >
                {m}
              </button>
            ))}
          </div>
          {method === 'QR' && (
            <select className="input" value={provider} onChange={(e) => setProvider(e.target.value as PaymentProviderName)}>
              <option value="FONEPAY">Fonepay QR</option>
              <option value="ESEWA">eSewa QR</option>
            </select>
          )}
          {method === 'CREDIT' && (
            <select className="input" value={customerId} onChange={(e) => setCustomerId(e.target.value)}>
              <option value="">— select customer —</option>
              {customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          )}
          <button className="btn-primary w-full" disabled={submitting} onClick={checkout}>
            {submitting ? 'Processing…' : 'Confirm sale'}
          </button>
        </div>
      </Modal>

      {/* Receipt modal */}
      <Modal open={!!receipt} title={`Receipt ${receipt?.invoiceNo ?? ''}`} onClose={() => setReceipt(null)}>
        {receipt && (
          <div className="space-y-2 text-sm">
            {receipt.items?.map((it: any) => (
              <div key={it.id} className="flex justify-between">
                <span>{it.name} × {Number(it.quantity)}</span>
                <span>{money(Number(it.lineTotal), currency)}</span>
              </div>
            ))}
            <div className="flex justify-between border-t pt-2 font-semibold">
              <span>Total</span>
              <span>{money(Number(receipt.total), currency)}</span>
            </div>
            {receipt.payments?.[0]?.qrPayload && (
              <p className="break-all rounded bg-slate-100 p-2 text-xs">
                QR: {receipt.payments[0].qrPayload}
              </p>
            )}
            <button className="btn-primary w-full" onClick={() => window.print()}>
              Print receipt
            </button>
          </div>
        )}
      </Modal>
    </div>
  );
}
