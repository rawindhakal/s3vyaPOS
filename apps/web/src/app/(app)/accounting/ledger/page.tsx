'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { LedgerView, type LedgerData } from '@/components/LedgerView';
import { PrintButton } from '@/components/PrintButton';

interface Account { id: string; code: string; name: string }

export default function LedgerPage() {
  const [accountId, setAccountId] = useState('');

  const { data: accounts = [] } = useQuery<Account[]>({
    queryKey: ['accounts'],
    queryFn: async () => (await api.get('/accounting/accounts')).data,
  });

  const { data, isFetching } = useQuery<LedgerData>({
    queryKey: ['ledger', accountId],
    queryFn: async () => (await api.get(`/accounting/ledger/${accountId}`)).data,
    enabled: !!accountId,
  });

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold">General Ledger</h2>
        <div className="flex items-center gap-2">
          <select className="input no-print w-64" value={accountId} onChange={(e) => setAccountId(e.target.value)}>
            <option value="">— select account —</option>
            {accounts.map((a) => <option key={a.id} value={a.id}>{a.code} · {a.name}</option>)}
          </select>
          <PrintButton />
        </div>
      </div>
      <LedgerView data={data} loading={!!accountId && isFetching} />
    </div>
  );
}
