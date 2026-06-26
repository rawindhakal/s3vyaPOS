'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-store';
import { isCashierMode } from '@/lib/desktop';

interface NavItem { href: string; label: string; icon: string; cashier?: boolean; waiter?: boolean }
interface NavGroup { title: string | null; items: NavItem[] }

const GROUPS: NavGroup[] = [
  { title: null, items: [{ href: '/', label: 'Dashboard', icon: '🏠' }] },
  {
    title: 'Operations',
    items: [
      { href: '/pos', label: 'Billing (POS)', icon: '🧾', cashier: true },
      { href: '/tables', label: 'Tables', icon: '🍽️', cashier: true, waiter: true },
      { href: '/kot', label: 'Running Orders', icon: '🧑‍🍳', cashier: true, waiter: true },
      { href: '/kds', label: 'Kitchen Display', icon: '🖥️' },
      { href: '/reservations', label: 'Reservations', icon: '📅', cashier: true },
    ],
  },
  {
    title: 'Catalog',
    items: [
      { href: '/products', label: 'Products / Menu', icon: '📦', cashier: true },
      { href: '/inventory', label: 'Inventory', icon: '📊' },
    ],
  },
  {
    title: 'Sales & Money',
    items: [
      { href: '/sales', label: 'Sales', icon: '💰' },
      { href: '/payments', label: 'Payments', icon: '💳' },
      { href: '/gift-cards', label: 'Gift Cards', icon: '🎁' },
      { href: '/accounting/journal', label: 'Accounting', icon: '📒' },
      { href: '/reports', label: 'Reports', icon: '📈' },
    ],
  },
  {
    title: 'People',
    items: [
      { href: '/customers', label: 'Customers', icon: '👤', cashier: true },
      { href: '/parties', label: 'Vendors & Suppliers', icon: '👥' },
      { href: '/staff', label: 'Staff', icon: '🧑‍💼' },
    ],
  },
  {
    title: 'Engage',
    items: [
      { href: '/notifications', label: 'Notifications', icon: '🔔' },
      { href: '/feedback', label: 'Feedback', icon: '⭐' },
    ],
  },
  {
    title: 'Setup',
    items: [
      { href: '/printers', label: 'Printers', icon: '🖨️', cashier: true },
      { href: '/settings', label: 'Settings', icon: '⚙️' },
    ],
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();
  const [cashier, setCashier] = useState(false);
  useEffect(() => setCashier(isCashierMode()), []);

  const waiter = user?.role === 'WAITER';
  const visible = (n: NavItem) => (waiter ? !!n.waiter : !cashier || !!n.cashier);
  const groups = GROUPS.map((g) => ({ ...g, items: g.items.filter(visible) })).filter((g) => g.items.length);

  return (
    <aside className="no-print flex h-full w-60 shrink-0 flex-col bg-slate-900 text-slate-100">
      <div className="px-5 py-4 text-xl font-bold">
        s3vya<span className="text-brand-light">POS</span>
        {waiter && <span className="ml-2 rounded bg-amber-500 px-1.5 py-0.5 text-[10px] uppercase text-white">Waiter</span>}
        {!waiter && cashier && <span className="ml-2 rounded bg-brand px-1.5 py-0.5 text-[10px] uppercase">Cashier</span>}
      </div>
      <div className="px-5 pb-3 text-xs text-slate-400">{user?.shopName}</div>

      <nav className="flex-1 space-y-4 overflow-y-auto px-2 pb-4">
        {groups.map((g) => (
          <div key={g.title ?? 'top'}>
            {g.title && <div className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-wider text-slate-500">{g.title}</div>}
            <div className="space-y-0.5">
              {g.items.map((n) => {
                const base = '/' + (n.href.split('/')[1] ?? '');
                const active = n.href === '/' ? pathname === '/' : pathname.startsWith(base);
                return (
                  <Link
                    key={n.href}
                    href={n.href}
                    className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition ${
                      active ? 'bg-brand text-white' : 'text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    <span>{n.icon}</span>
                    <span>{n.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="border-t border-slate-800 p-3 text-sm">
        <div className="mb-2 px-2 text-slate-300">{user?.fullName}</div>
        <button
          className="w-full rounded-lg bg-slate-800 px-3 py-2 text-left hover:bg-slate-700"
          onClick={() => {
            logout();
            router.replace('/login');
          }}
        >
          Sign out
        </button>
      </div>
    </aside>
  );
}
