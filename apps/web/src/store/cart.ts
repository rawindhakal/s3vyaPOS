'use client';

import { create } from 'zustand';

export interface CartLine {
  productId: string;
  sku: string;
  name: string;
  unitPrice: number;
  taxRate: number;
  quantity: number;
}

interface CartState {
  lines: CartLine[];
  addItem: (p: Omit<CartLine, 'quantity'>, qty?: number) => void;
  setQty: (productId: string, qty: number) => void;
  removeItem: (productId: string) => void;
  clear: () => void;
  subtotal: () => number;
  tax: () => number;
  total: () => number;
}

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
      return { lines: [...state.lines, { ...p, quantity: qty }] };
    }),
  setQty: (productId, qty) =>
    set((state) => ({
      lines: state.lines
        .map((l) => (l.productId === productId ? { ...l, quantity: qty } : l))
        .filter((l) => l.quantity > 0),
    })),
  removeItem: (productId) =>
    set((state) => ({ lines: state.lines.filter((l) => l.productId !== productId) })),
  clear: () => set({ lines: [] }),
  subtotal: () => get().lines.reduce((s, l) => s + l.unitPrice * l.quantity, 0),
  tax: () =>
    get().lines.reduce((s, l) => s + (l.unitPrice * l.quantity * l.taxRate) / 100, 0),
  total: () => get().subtotal() + get().tax(),
}));
