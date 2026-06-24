'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-store';
import { isCashierMode } from '@/lib/desktop';
import { Sidebar } from '@/components/Sidebar';
import { Topbar } from '@/components/Topbar';
import { NewOrderWatcher } from '@/components/NewOrderWatcher';

const CASHIER_ALLOWED = ['/pos', '/tables', '/orders', '/kot', '/kds', '/reservations', '/customers', '/products', '/printers'];
const WAITER_ALLOWED = ['/tables', '/orders', '/kot'];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { accessToken, user } = useAuth();
  const [ready, setReady] = useState(false);

  const waiter = user?.role === 'WAITER';

  useEffect(() => {
    if (!accessToken) {
      router.replace('/login');
      return;
    }
    const allowed = waiter ? WAITER_ALLOWED : isCashierMode() ? CASHIER_ALLOWED : null;
    if (allowed && !allowed.some((a) => pathname === a || pathname.startsWith(a + '/') || pathname.startsWith(a))) {
      router.replace('/tables');
      return;
    }
    setReady(true);
  }, [accessToken, pathname, router, waiter]);

  if (!ready) {
    return <div className="flex h-screen items-center justify-center text-slate-500">Loading…</div>;
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Topbar />
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
      <NewOrderWatcher />
    </div>
  );
}
