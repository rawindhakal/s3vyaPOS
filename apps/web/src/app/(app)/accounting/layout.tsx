import { AccountingTabs } from '@/components/AccountingTabs';

export default function AccountingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="p-6">
      <h1 className="mb-4 text-2xl font-bold">Accounting</h1>
      <AccountingTabs />
      {children}
    </div>
  );
}
