'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-store';
import { Sidebar } from '@/components/Sidebar';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { accessToken } = useAuth();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // Wait for the persisted store to hydrate before deciding.
    if (!accessToken) {
      router.replace('/login');
    } else {
      setReady(true);
    }
  }, [accessToken, router]);

  if (!ready) {
    return (
      <div className="flex h-screen items-center justify-center text-slate-500">
        Loading…
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">{children}</main>
    </div>
  );
}
