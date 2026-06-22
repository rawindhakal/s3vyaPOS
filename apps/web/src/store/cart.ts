'use client';

import { create } from 'zustand';

export interface CartLine {
  productId: string;
  sku: string;
  name: string;
  unitPrice: number;
  taxRate: number;
  quantity: number;
  discount: number; // per-line discount amount
}

interface CartState {
  lines: CartLine[];
  addItem: (p: Omit<CartLine, 'quantity' | 'discount'>, qty?: number) => void;
  setQty: (productId: string, qty: number) => void;
  setDiscount: (productId: string, discount: number) => void;
  removeItem: (productId: string) => void;
  clear: () => void;
  subtotal: () => number; // net of line discounts
  tax: () => number;
  total: () => number;
}

const lineNet = (l: CartLine) => Math.max(0, l.unitPrice * l.quantity - l.discount);

export const useCart = create<CartState>((set, get) => ({
  lines: [],
  addItem: (p, qty = 1) =>
    set((state) => {
      const existing = state.lines.find((l) => l.productId === p.productId);
      if (existing) {
        return {
          lines: state.lines.map((l) =>
            l.productId === p.productId ? { ...l, quantity: l.quantity + qty } : l,
          ),
        };
      }
      return { lines: [...state.lines, { ...p, quantity: qty, discount: 0 }] };
    }),
  setQty: (productId, qty) =>
    set((state) => ({
      lines: state.lines
        .map((l) => (l.productId === productId ? { ...l, quantity: qty } : l))
        .filter((l) => l.quantity > 0),
    })),
  setDiscount: (productId, discount) =>
    set((state) => ({
      lines: state.lines.map((l) =>
        l.productId === productId ? { ...l, discount: Math.max(0, discount) } : l,
      ),
    })),
  removeItem: (productId) =>
    set((state) => ({ lines: state.lines.filter((l) => l.productId !== productId) })),
  clear: () => set({ lines: [] }),
  subtotal: () => get().lines.reduce((s, l) => s + lineNet(l), 0),
  tax: () => get().lines.reduce((s, l) => s + (lineNet(l) * l.taxRate) / 100, 0),
  total: () => get().subtotal() + get().tax(),
}));
