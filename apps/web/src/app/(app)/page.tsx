'use client';

import Link from 'next/link';
import { useAuth } from '@/lib/auth-store';

export default function Dashboard() {
  const { user } = useAuth();
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold">Welcome, {user?.fullName}</h1>
      <p className="text-slate-500">{user?.shopName}</p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Link href="/pos" className="card p-6 transition hover:shadow-md">
          <div className="text-3xl">🧾</div>
          <div className="mt-2 text-lg font-semibold">Open POS Terminal</div>
          <p className="text-sm text-slate-500">Scan, sell, and take payments.</p>
        </Link>
        <Link href="/products" className="card p-6 transition hover:shadow-md">
          <div className="text-3xl">📦</div>
          <div className="mt-2 text-lg font-semibold">Manage Products</div>
          <p className="text-sm text-slate-500">Add stock, SKUs and barcodes.</p>
        </Link>
        <div className="card p-6 opacity-70">
          <div className="text-3xl">📒</div>
          <div className="mt-2 text-lg font-semibold">Accounting</div>
          <p className="text-sm text-slate-500">
            Ledger, Trial Balance & Balance Sheet (coming next).
          </p>
        </div>
      </div>
    </div>
  );
}
