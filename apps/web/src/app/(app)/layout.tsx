'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-store';
import { isCashierMode } from '@/lib/desktop';
import { Sidebar } from '@/components/Sidebar';

const CASHIER_ALLOWED = ['/pos', '/tables', '/orders', '/kot', '/reservations', '/customers', '/products', '/printers'];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { accessToken } = useAuth();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!accessToken) {
      router.replace('/login');
      return;
    }
    // In the cashier terminal, keep the cashier inside the allowed screens.
    if (isCashierMode() && !CASHIER_ALLOWED.some((a) => pathname === a || pathname.startsWith(a + '/') || pathname.startsWith(a))) {
      router.replace('/pos');
      return;
    }
    setReady(true);
  }, [accessToken, pathname, router]);

  if (!ready) {
    return <div className="flex h-screen items-center justify-center text-slate-500">Loading…</div>;
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">{children}</main>
    </div>
  );
}
