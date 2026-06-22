'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-store';

const NAV = [
  { href: '/', label: 'Dashboard', icon: '🏠' },
  { href: '/pos', label: 'POS Terminal', icon: '🧾' },
  { href: '/products', label: 'Products', icon: '📦' },
  { href: '/sales', label: 'Sales', icon: '💰', soon: true },
  { href: '/purchases', label: 'Purchases', icon: '🛒' },
  { href: '/parties', label: 'Vendors & Customers', icon: '👥' },
  { href: '/accounting/journal', label: 'Accounting', icon: '📒' },
  { href: '/reports', label: 'Reports', icon: '📊', soon: true },
  { href: '/tables', label: 'Tables', icon: '🍽️', restaurant: true },
  { href: '/kot', label: 'Kitchen (KOT)', icon: '👨‍🍳', restaurant: true },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();

  const showRestaurant =
    user?.businessType === 'RESTAURANT' || user?.businessType === 'BOTH';

  return (
    <aside className="no-print flex h-full w-60 shrink-0 flex-col bg-slate-900 text-slate-100">
      <div className="px-5 py-4 text-xl font-bold">
        s3vya<span className="text-brand-light">POS</span>
      </div>
      <div className="px-5 pb-3 text-xs text-slate-400">
        {user?.shopName} · {user?.businessType}
      </div>
      <nav className="flex-1 space-y-1 overflow-y-auto px-2">
        {NAV.filter((n) => !n.restaurant || showRestaurant).map((n) => {
          const base = '/' + (n.href.split('/')[1] ?? '');
          const active = n.href === '/' ? pathname === '/' : pathname.startsWith(base);
          return (
            <Link
              key={n.href}
              href={n.soon ? '#' : n.href}
              className={`flex items-center justify-between rounded-lg px-3 py-2 text-sm ${
                active ? 'bg-brand text-white' : 'hover:bg-slate-800'
              } ${n.soon ? 'cursor-not-allowed opacity-50' : ''}`}
            >
              <span>
                <span className="mr-2">{n.icon}</span>
                {n.label}
              </span>
              {n.soon && <span className="text-[10px] uppercase">soon</span>}
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
