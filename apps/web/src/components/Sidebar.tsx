'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-store';
import { isCashierMode } from '@/lib/desktop';

// `cashier: true` items are the only ones shown in the desktop cashier terminal.
const NAV = [
  { href: '/pos', label: 'Billing (POS)', icon: '🧾', cashier: true },
  { href: '/tables', label: 'Tables', icon: '🍽️', cashier: true, waiter: true },
  { href: '/kot', label: 'Kitchen (KOT)', icon: '👨‍🍳', cashier: true, waiter: true },
  { href: '/reservations', label: 'Reservations', icon: '📅', cashier: true },
  { href: '/customers', label: 'Customers', icon: '👤', cashier: true },
  { href: '/products', label: 'Products', icon: '📦', cashier: true },
  { href: '/printers', label: 'Printers', icon: '🖨️', cashier: true },
  { href: '/', label: 'Dashboard', icon: '🏠' },
  { href: '/inventory', label: 'Inventory', icon: '📦' },
  { href: '/sales', label: 'Sales', icon: '💰' },
  { href: '/purchases', label: 'Purchases', icon: '🛒' },
  { href: '/parties', label: 'Vendors & Suppliers', icon: '👥' },
  { href: '/payments', label: 'Payments', icon: '💳' },
  { href: '/gift-cards', label: 'Gift Cards', icon: '🎁' },
  { href: '/accounting/journal', label: 'Accounting', icon: '📒' },
  { href: '/reports', label: 'Reports', icon: '📊' },
  { href: '/staff', label: 'Staff', icon: '🧑‍💼' },
  { href: '/notifications', label: 'Notifications', icon: '🔔' },
  { href: '/feedback', label: 'Feedback', icon: '⭐' },
  { href: '/settings', label: 'Settings', icon: '⚙️' },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();
  const [cashier, setCashier] = useState(false);
  useEffect(() => setCashier(isCashierMode()), []);

  const waiter = user?.role === 'WAITER';
  const items = waiter
    ? NAV.filter((n) => (n as any).waiter)
    : NAV.filter((n) => !cashier || n.cashier);

  return (
    <aside className="no-print flex h-full w-60 shrink-0 flex-col bg-slate-900 text-slate-100">
      <div className="px-5 py-4 text-xl font-bold">
        s3vya<span className="text-brand-light">POS</span>
        {cashier && <span className="ml-2 rounded bg-brand px-1.5 py-0.5 text-[10px] uppercase">Cashier</span>}
      </div>
      <div className="px-5 pb-3 text-xs text-slate-400">{user?.shopName}</div>
      <nav className="flex-1 space-y-1 overflow-y-auto px-2">
        {items.map((n) => {
          const base = '/' + (n.href.split('/')[1] ?? '');
          const active = n.href === '/' ? pathname === '/' : pathname.startsWith(base);
          return (
            <Link
              key={n.href}
              href={n.href}
              className={`flex items-center justify-between rounded-lg px-3 py-2 text-sm ${
                active ? 'bg-brand text-white' : 'hover:bg-slate-800'
              }`}
            >
              <span>
                <span className="mr-2">{n.icon}</span>
                {n.label}
              </span>
            </Link>
          );
        })}
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
