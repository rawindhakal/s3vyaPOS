'use client';

import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth-store';
import { useTheme } from '@/lib/theme';

const TITLES: Record<string, string> = {
  '': 'Dashboard',
  pos: 'Billing',
  tables: 'Floor',
  kot: 'Kitchen Display',
  orders: 'Order',
  reservations: 'Reservations',
  customers: 'Customers',
  products: 'Products & Menu',
  inventory: 'Inventory',
  sales: 'Sales',
  purchases: 'Purchases',
  parties: 'Vendors & Suppliers',
  payments: 'Payments',
  'gift-cards': 'Gift Cards',
  accounting: 'Accounting',
  reports: 'Reports',
  staff: 'Staff',
  notifications: 'Notifications',
  feedback: 'Feedback',
  printers: 'Printers',
  settings: 'Settings',
};

export function Topbar() {
  const pathname = usePathname();
  const seg = pathname.split('/')[1] ?? '';
  const title = TITLES[seg] ?? 'Dashboard';
  const { user } = useAuth();
  const { theme, toggle } = useTheme();
  const initials = (user?.fullName ?? 'U').split(' ').map((s) => s[0]).slice(0, 2).join('').toUpperCase();

  return (
    <header className="no-print sticky top-0 z-20 flex h-14 items-center justify-between border-b border-slate-200 bg-white px-5 dark:border-slate-800 dark:bg-slate-900">
      <h1 className="text-lg font-semibold">{title}</h1>
      <div className="flex items-center gap-3">
        <button
          onClick={toggle}
          className="rounded-lg px-2 py-1.5 text-lg ring-1 ring-slate-200 hover:bg-slate-50 dark:ring-slate-700 dark:hover:bg-slate-800"
          aria-label="Toggle theme"
        >
          {theme === 'dark' ? '☀️' : '🌙'}
        </button>
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-brand/15 text-sm font-semibold text-brand">{initials}</div>
          <div className="hidden sm:block">
            <div className="text-sm font-medium leading-tight">{user?.fullName}</div>
            <div className="text-xs text-slate-500">{user?.role}</div>
          </div>
        </div>
      </div>
    </header>
  );
}
