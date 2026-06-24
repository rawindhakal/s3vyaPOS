'use client';

import { useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth-store';
import { getDesktop } from '@/lib/desktop';
import { printToStation, kotHtml } from '@/lib/print';

// Plays a short buzzer using the Web Audio API (no asset needed).
function buzz() {
  try {
    const Ctx = (window as any).AudioContext || (window as any).webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = 'square';
    o.frequency.value = 880;
    o.connect(g);
    g.connect(ctx.destination);
    g.gain.setValueAtTime(0.15, ctx.currentTime);
    o.start();
    o.stop(ctx.currentTime + 0.25);
    o.onended = () => ctx.close();
  } catch {
    /* ignore */
  }
}

/**
 * Runs on the cashier/main device: polls for orders waiting on a KOT, plays a
 * buzzer for newly placed ones, and (in the desktop app) auto-prints each item
 * to its station printer, then clears it from the queue.
 */
export function NewOrderWatcher() {
  const role = useAuth((s) => s.user?.role);
  const accessToken = useAuth((s) => s.accessToken);
  const seen = useRef<Set<string>>(new Set());
  const enabled = !!accessToken && role !== 'WAITER';

  const { data: products = [] } = useQuery<any[]>({
    queryKey: ['products'],
    queryFn: async () => (await api.get('/products')).data,
    enabled,
  });
  const { data: pending = [] } = useQuery<any[]>({
    queryKey: ['pending-kot'],
    queryFn: async () => (await api.get('/orders/pending-kot')).data,
    enabled,
    refetchInterval: 5000,
  });

  useEffect(() => {
    if (!enabled || !pending.length) return;
    const stationOf = new Map(products.map((p: any) => [p.id, p.station]));
    const desktop = getDesktop();

    for (const order of pending) {
      const isNew = !seen.current.has(order.id + ':' + order.kotVersion);
      if (isNew) {
        seen.current.add(order.id + ':' + order.kotVersion);
        buzz();
        const where = order.table?.name ? `Table ${order.table.name}` : order.orderType;
        toast(`🔔 New order — ${where}${order.waiter?.fullName ? ' · ' + order.waiter.fullName : ''}`, { icon: '🍽️' });
      }

      // Auto-print only on the desktop terminal (has the station printers).
      if (desktop?.printHtml) {
        const groups: Record<string, { name: string; quantity: number; note?: string }[]> = {};
        for (const it of order.items) {
          const st = stationOf.get(it.productId) ?? 'KITCHEN';
          (groups[st] ??= []).push({ name: it.name, quantity: Number(it.quantity), note: it.note });
        }
        const title = order.table?.name ? `Table ${order.table.name}` : order.orderType;
        (async () => {
          for (const st of ['KITCHEN', 'BAR'] as const) {
            if (groups[st]?.length) await printToStation(st, kotHtml({ title, station: st, items: groups[st] }));
          }
          await api.post(`/orders/${order.id}/kot-printed`).catch(() => undefined);
        })();
      }
    }
  }, [pending, products, enabled]);

  return null;
}
