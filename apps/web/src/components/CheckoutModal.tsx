'use client';

import { useEffect, useMemo, useState } from 'react';
import type { PaymentMethod, PaymentProviderName } from '@s3vya/types';
import { Modal } from './Modal';
import { money } from '@/lib/format';

const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

export interface CheckoutBilling {
  discount: number;
  customerId?: string;
  redeemPoints?: number;
  payments: { method: PaymentMethod; provider?: PaymentProviderName; amount: number }[];
}

interface Customer { id: string; name: string; loyaltyPoints?: string }
interface PayRow { method: PaymentMethod; provider: PaymentProviderName; amount: number }

interface Props {
  open: boolean;
  onClose: () => void;
  currency: string;
  subtotal: number; // net of line discounts
  tax: number;
  serviceChargeRate: number;
  roundOffEnabled: boolean;
  customers: Customer[];
  confirmLabel?: string;
  busy?: boolean;
  onConfirm: (billing: CheckoutBilling) => void;
}

export function CheckoutModal({
  open, onClose, currency, subtotal, tax, serviceChargeRate, roundOffEnabled,
  customers, confirmLabel = 'Confirm', busy, onConfirm,
}: Props) {
  const [discount, setDiscount] = useState(0);
  const [customerId, setCustomerId] = useState('');
  const [redeem, setRedeem] = useState(0);
  const [rows, setRows] = useState<PayRow[]>([{ method: 'CASH', provider: 'FONEPAY', amount: 0 }]);

  const customer = customers.find((c) => c.id === customerId);
  const points = Number(customer?.loyaltyPoints ?? 0);

  const afterDiscount = Math.max(0, round2(subtotal - discount - redeem));
  const serviceCharge = round2((afterDiscount * serviceChargeRate) / 100);
  const preRound = round2(afterDiscount + tax + serviceCharge);
  const total = roundOffEnabled ? Math.round(preRound) : preRound;
  const roundOff = round2(total - preRound);

  const paid = round2(rows.reduce((s, r) => s + (Number(r.amount) || 0), 0));
  const remaining = round2(total - paid);

  // Keep a single payment row synced to the total.
  useEffect(() => {
    if (rows.length === 1) setRows([{ ...rows[0], amount: total }]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [total, open]);

  const needsCustomer = rows.some((r) => r.method === 'CREDIT') || redeem > 0;
  const canConfirm =
    total > 0 && Math.abs(remaining) < 0.01 && (!needsCustomer || !!customerId) && !busy;

  const setRow = (i: number, patch: Partial<PayRow>) =>
    setRows((rs) => rs.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));

  const confirm = () =>
    onConfirm({
      discount: round2(discount),
      customerId: customerId || undefined,
      redeemPoints: redeem || undefined,
      payments: rows.map((r) => ({
        method: r.method,
        provider: r.method === 'QR' ? r.provider : undefined,
        amount: round2(r.amount),
      })),
    });

  const methods: PaymentMethod[] = ['CASH', 'BANK', 'QR', 'CREDIT'];

  return (
    <Modal open={open} title="Checkout" onClose={onClose}>
      <div className="space-y-3 text-sm">
        <div className="space-y-1 rounded-lg bg-slate-50 p-3">
          <Row label="Subtotal" value={money(subtotal, currency)} />
          <div className="flex items-center justify-between">
            <span>Discount</span>
            <input className="input h-8 w-28 text-right" type="number" value={discount}
              onChange={(e) => setDiscount(Number(e.target.value))} />
          </div>
          {serviceChargeRate > 0 && <Row label={`Service charge (${serviceChargeRate}%)`} value={money(serviceCharge, currency)} />}
          <Row label="Tax" value={money(tax, currency)} />
          {roundOff !== 0 && <Row label="Round off" value={money(roundOff, currency)} />}
          <div className="flex justify-between border-t pt-1 text-lg font-bold">
            <span>Total</span><span>{money(total, currency)}</span>
          </div>
        </div>

        <select className="input" value={customerId} onChange={(e) => { setCustomerId(e.target.value); setRedeem(0); }}>
          <option value="">Walk-in customer</option>
          {customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        {customer && points > 0 && (
          <div className="flex items-center justify-between">
            <span>Redeem points ({points} available)</span>
            <input className="input h-8 w-28 text-right" type="number" max={points} value={redeem}
              onChange={(e) => setRedeem(Math.min(Number(e.target.value), points))} />
          </div>
        )}

        <div className="space-y-2">
          <div className="font-medium">Payment</div>
          {rows.map((r, i) => (
            <div key={i} className="flex items-center gap-2">
              <select className="input h-9 flex-1" value={r.method} onChange={(e) => setRow(i, { method: e.target.value as PaymentMethod })}>
                {methods.map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
              {r.method === 'QR' && (
                <select className="input h-9 w-28" value={r.provider} onChange={(e) => setRow(i, { provider: e.target.value as PaymentProviderName })}>
                  <option value="FONEPAY">Fonepay</option>
                  <option value="ESEWA">eSewa</option>
                </select>
              )}
              <input className="input h-9 w-28 text-right" type="number" value={r.amount}
                onChange={(e) => setRow(i, { amount: Number(e.target.value) })} />
              {rows.length > 1 && (
                <button className="text-red-500" onClick={() => setRows((rs) => rs.filter((_, idx) => idx !== i))}>✕</button>
              )}
            </div>
          ))}
          <div className="flex items-center justify-between">
            <button className="text-brand hover:underline" onClick={() => setRows((rs) => [...rs, { method: 'CASH', provider: 'FONEPAY', amount: round2(remaining > 0 ? remaining : 0) }])}>
              + Split payment
            </button>
            {Math.abs(remaining) >= 0.01 && (
              <span className={remaining > 0 ? 'text-amber-600' : 'text-red-600'}>
                {remaining > 0 ? 'Remaining' : 'Over'}: {money(Math.abs(remaining), currency)}
              </span>
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
  return (
    <div className="flex justify-between">
      <span>{label}</span><span>{value}</span>
    </div>
  );
}
