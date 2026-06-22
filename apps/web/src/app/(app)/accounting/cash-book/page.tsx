'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { LedgerView, type LedgerData } from '@/components/LedgerView';
import { PrintButton } from '@/components/PrintButton';

export default function CashBookPage() {
  const { data, isLoading } = useQuery<LedgerData>({
    queryKey: ['cash-book'],
    queryFn: async () => (await api.get('/accounting/reports/cash-book')).data,
  });
  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-semibold">Cash Book</h2>
        <PrintButton />
      </div>
      <LedgerView data={data} loading={isLoading} />
    </div>
  );
}
