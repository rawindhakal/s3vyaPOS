'use client';

import { useEffect, useState } from 'react';
import type { PaymentMethod, PaymentProviderName } from '@s3vya/types';
import { Modal } from './Modal';
import { money } from '@/lib/format';

const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

export interface CheckoutBilling {
  discount: number;
  customerId?: string;
  redeemPoints?: number;
  tip?: number;
  payments: { method: PaymentMethod; provider?: PaymentProviderName; amount: number; cardCode?: string }[];
}

interface Customer { id: string; name: string; loyaltyPoints?: string; storeCredit?: string }
interface PayRow { method: PaymentMethod; provider: PaymentProviderName; amount: number; cardCode?: string }

interface Props {
  open: boolean;
  onClose: () => void;
  currency: string;
  subtotal: number;
  tax: number;
  serviceChargeRate: number;
  roundOffEnabled: boolean;
  customers: Customer[];
  confirmLabel?: string;
  busy?: boolean;
  onConfirm: (billing: CheckoutBilling) => void;
}

const METHODS: PaymentMethod[] = ['CASH', 'BANK', 'QR', 'CREDIT', 'GIFT_CARD', 'STORE_CREDIT'];

export function CheckoutModal({
  open, onClose, currency, subtotal, tax, serviceChargeRate, roundOffEnabled,
  customers, confirmLabel = 'Confirm', busy, onConfirm,
}: Props) {
  const [discount, setDiscount] = useState(0);
  const [customerId, setCustomerId] = useState('');
  const [redeem, setRedeem] = useState(0);
  const [tip, setTip] = useState(0);
  const [rows, setRows] = useState<PayRow[]>([{ method: 'CASH', provider: 'FONEPAY', amount: 0 }]);

  const customer = customers.find((c) => c.id === customerId);
  const points = Number(customer?.loyaltyPoints ?? 0);
  const storeCredit = Number(customer?.storeCredit ?? 0);

  const afterDiscount = Math.max(0, round2(subtotal - discount - redeem));
  const serviceCharge = round2((afterDiscount * serviceChargeRate) / 100);
  const preRound = round2(afterDiscount + tax + serviceCharge);
  const total = roundOffEnabled ? Math.round(preRound) : preRound;
  const roundOff = round2(total - preRound);
  const payable = round2(total + tip);

  const paid = round2(rows.reduce((s, r) => s + (Number(r.amount) || 0), 0));
  const remaining = round2(payable - paid);

  useEffect(() => {
    if (rows.length === 1) setRows([{ ...rows[0], amount: payable }]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [payable, open]);

  const needsCustomer =
    rows.some((r) => r.method === 'CREDIT' || r.method === 'STORE_CREDIT') || redeem > 0;
  const giftRowsValid = rows.every((r) => r.method !== 'GIFT_CARD' || (r.cardCode && r.cardCode.length >= 3));
  const canConfirm =
    payable > 0 && Math.abs(remaining) < 0.01 && (!needsCustomer || !!customerId) && giftRowsValid && !busy;

  const setRow = (i: number, patch: Partial<PayRow>) =>
    setRows((rs) => rs.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));

  const confirm = () =>
    onConfirm({
      discount: round2(discount),
      customerId: customerId || undefined,
      redeemPoints: redeem || undefined,
      tip: tip || undefined,
      payments: rows.map((r) => ({
        method: r.method,
        provider: r.method === 'QR' ? r.provider : undefined,
        amount: round2(r.amount),
        cardCode: r.method === 'GIFT_CARD' ? r.cardCode : undefined,
      })),
    });

  return (
    <Modal open={open} title="Checkout" onClose={onClose}>
      <div className="space-y-3 text-sm">
        <div className="space-y-1 rounded-lg bg-slate-50 p-3">
          <Row label="Subtotal" value={money(subtotal, currency)} />
          <div className="flex items-center justify-between">
            <span>Discount</span>
            <input className="input h-8 w-28 text-right" type="number" value={discount} onChange={(e) => setDiscount(Number(e.target.value))} />
          </div>
          {serviceChargeRate > 0 && <Row label={`Service charge (${serviceChargeRate}%)`} value={money(serviceCharge, currency)} />}
          <Row label="Tax" value={money(tax, currency)} />
          {roundOff !== 0 && <Row label="Round off" value={money(roundOff, currency)} />}
          <div className="flex items-center justify-between">
            <span>Tip</span>
            <input className="input h-8 w-28 text-right" type="number" value={tip} onChange={(e) => setTip(Number(e.target.value))} />
          </div>
          <div className="flex justify-between border-t pt-1 text-lg font-bold">
            <span>Total payable</span><span>{money(payable, currency)}</span>
          </div>
        </div>

        <select className="input" value={customerId} onChange={(e) => { setCustomerId(e.target.value); setRedeem(0); }}>
          <option value="">Walk-in customer</option>
          {customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        {customer && points > 0 && (
          <div className="flex items-center justify-between">
            <span>Redeem points ({points} available)</span>
            <input className="input h-8 w-28 text-right" type="number" max={points} value={redeem} onChange={(e) => setRedeem(Math.min(Number(e.target.value), points))} />
          </div>
        )}
        {customer && storeCredit > 0 && (
          <p className="text-xs text-green-600">Store credit available: {money(storeCredit, currency)} (use STORE_CREDIT tender)</p>
        )}

        <div className="space-y-2">
          <div className="font-medium">Payment</div>
          {rows.map((r, i) => (
            <div key={i} className="space-y-1">
              <div className="flex items-center gap-2">
                <select className="input h-9 flex-1" value={r.method} onChange={(e) => setRow(i, { method: e.target.value as PaymentMethod })}>
                  {METHODS.map((m) => <option key={m} value={m}>{m.replace('_', ' ')}</option>)}
                </select>
                {r.method === 'QR' && (
                  <select className="input h-9 w-24" value={r.provider} onChange={(e) => setRow(i, { provider: e.target.value as PaymentProviderName })}>
                    <option value="FONEPAY">Fonepay</option>
                    <option value="ESEWA">eSewa</option>
                  </select>
                )}
                <input className="input h-9 w-24 text-right" type="number" value={r.amount} onChange={(e) => setRow(i, { amount: Number(e.target.value) })} />
                {rows.length > 1 && <button className="text-red-500" onClick={() => setRows((rs) => rs.filter((_, idx) => idx !== i))}>✕</button>}
              </div>
              {r.method === 'GIFT_CARD' && (
                <input className="input h-8" placeholder="Gift card code" value={r.cardCode ?? ''} onChange={(e) => setRow(i, { cardCode: e.target.value })} />
              )}
            </div>
          ))}
          <div className="flex items-center justify-between">
            <button className="text-brand hover:underline" onClick={() => setRows((rs) => [...rs, { method: 'CASH', provider: 'FONEPAY', amount: round2(remaining > 0 ? remaining : 0) }])}>+ Split payment</button>
            {Math.abs(remaining) >= 0.01 && (
              <span className={remaining > 0 ? 'text-amber-600' : 'text-red-600'}>{remaining > 0 ? 'Remaining' : 'Over'}: {money(Math.abs(remaining), currency)}</span>
            )}
          </div>
        </div>

        <button className="btn-primary w-full" disabled={!canConfirm} onClick={confirm}>
          {busy ? 'Processing…' : confirmLabel}
        </button>
      </div>
    </Modal>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return <div className="flex justify-between"><span>{label}</span><span>{value}</span></div>;
}
