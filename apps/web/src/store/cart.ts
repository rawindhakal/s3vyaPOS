'use client';

import { create } from 'zustand';

export interface CartLine {
  key: string; // variationId ?? productId
  productId: string;
  variationId?: string;
  sku: string;
  name: string;
  unitPrice: number;
  taxRate: number;
  quantity: number;
  discount: number;
}

interface CartState {
  lines: CartLine[];
  addItem: (p: Omit<CartLine, 'quantity' | 'discount' | 'key'>, qty?: number) => void;
  setQty: (key: string, qty: number) => void;
  setDiscount: (key: string, discount: number) => void;
  removeItem: (key: string) => void;
  clear: () => void;
  subtotal: () => number;
  tax: () => number;
  total: () => number;
}

const lineNet = (l: CartLine) => Math.max(0, l.unitPrice * l.quantity - l.discount);

export const useCart = create<CartState>((set, get) => ({
  lines: [],
  addItem: (p, qty = 1) =>
    set((state) => {
      const key = p.variationId ?? p.productId;
      const existing = state.lines.find((l) => l.key === key);
      if (existing) {
        return { lines: state.lines.map((l) => (l.key === key ? { ...l, quantity: l.quantity + qty } : l)) };
      }
      return { lines: [...state.lines, { ...p, key, quantity: qty, discount: 0 }] };
    }),
  setQty: (key, qty) =>
    set((state) => ({
      lines: state.lines.map((l) => (l.key === key ? { ...l, quantity: qty } : l)).filter((l) => l.quantity > 0),
    })),
  setDiscount: (key, discount) =>
    set((state) => ({
      lines: state.lines.map((l) => (l.key === key ? { ...l, discount: Math.max(0, discount) } : l)),
    })),
  removeItem: (key) => set((state) => ({ lines: state.lines.filter((l) => l.key !== key) })),
  clear: () => set({ lines: [] }),
  subtotal: () => get().lines.reduce((s, l) => s + lineNet(l), 0),
  tax: () => get().lines.reduce((s, l) => s + (lineNet(l) * l.taxRate) / 100, 0),
  total: () => get().subtotal() + get().tax(),
}));
