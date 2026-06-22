'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const TABS = [
  { href: '/accounting/journal', label: 'Journal' },
  { href: '/accounting/ledger', label: 'Ledger' },
  { href: '/accounting/trial-balance', label: 'Trial Balance' },
  { href: '/accounting/balance-sheet', label: 'Balance Sheet' },
  { href: '/accounting/profit-loss', label: 'Profit & Loss' },
  { href: '/accounting/cash-book', label: 'Cash Book' },
  { href: '/accounting/bank-book', label: 'Bank Book' },
  { href: '/accounting/accounts', label: 'Accounts' },
];

export function AccountingTabs() {
  const pathname = usePathname();
  return (
    <div className="no-print mb-6 border-b border-slate-200">
      <nav className="-mb-px flex gap-4 overflow-x-auto" aria-label="Accounting">
        {TABS.map((t) => {
          const active = pathname === t.href;
          return (
            <Link
              key={t.href}
              href={t.href}
              className={`whitespace-nowrap border-b-2 px-1 py-3 text-sm font-medium transition ${
                active
                  ? 'border-brand text-brand'
                  : 'border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700'
              }`}
            >
              {t.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
