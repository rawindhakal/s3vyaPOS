'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { ACCOUNT_TYPES, type AccountType } from '@s3vya/types';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth-store';
import { money } from '@/lib/format';
import { Modal } from '@/components/Modal';

interface Account { id: string; code: string; name: string; type: string; balance: string; isSystem: boolean }
interface BankAccount { id: string; name: string; bankName: string | null; accountNumber: string | null }

export default function AccountsPage() {
  const currency = useAuth((s) => s.user?.currency ?? 'NPR');
  const qc = useQueryClient();
  const [acctOpen, setAcctOpen] = useState(false);
  const [bankOpen, setBankOpen] = useState(false);
  const [acct, setAcct] = useState({ code: '', name: '', type: 'EXPENSE' as AccountType });
  const [bank, setBank] = useState({ name: '', bankName: '', accountNumber: '' });

  const { data: accounts = [] } = useQuery<Account[]>({
    queryKey: ['accounts'],
    queryFn: async () => (await api.get('/accounting/accounts')).data,
  });
  const { data: banks = [] } = useQuery<BankAccount[]>({
    queryKey: ['bank-accounts'],
    queryFn: async () => (await api.get('/accounting/bank-accounts')).data,
  });

  const addAcct = useMutation({
    mutationFn: () => api.post('/accounting/accounts', acct),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['accounts'] });
      setAcctOpen(false);
      setAcct({ code: '', name: '', type: 'EXPENSE' });
      toast.success('Account added');
    },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Failed'),
  });

  const addBank = useMutation({
    mutationFn: () => api.post('/accounting/bank-accounts', bank),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['bank-accounts'] });
      setBankOpen(false);
      setBank({ name: '', bankName: '', accountNumber: '' });
      toast.success('Bank account added');
    },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Failed'),
  });

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Chart of Accounts</h2>
          <button className="btn-primary" onClick={() => setAcctOpen(true)}>+ Account</button>
        </div>
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b bg-slate-50 text-left text-slate-500">
              <tr><th className="p-3">Code</th><th className="p-3">Name</th><th className="p-3">Type</th><th className="p-3 text-right">Balance</th></tr>
            </thead>
            <tbody>
              {accounts.map((a) => (
                <tr key={a.id} className="border-b last:border-0">
                  <td className="p-3 text-slate-500">{a.code}</td>
                  <td className="p-3 font-medium">{a.name}{a.isSystem && <span className="ml-2 rounded bg-slate-100 px-1.5 py-0.5 text-[10px] uppercase text-slate-500">system</span>}</td>
                  <td className="p-3">{a.type}</td>
                  <td className="p-3 text-right">{money(Number(a.balance), currency)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Bank Accounts</h2>
          <button className="btn-primary" onClick={() => setBankOpen(true)}>+ Bank account</button>
        </div>
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b bg-slate-50 text-left text-slate-500">
              <tr><th className="p-3">Name</th><th className="p-3">Bank</th><th className="p-3">Account #</th></tr>
            </thead>
            <tbody>
              {banks.map((b) => (
                <tr key={b.id} className="border-b last:border-0">
                  <td className="p-3 font-medium">{b.name}</td>
                  <td className="p-3">{b.bankName || '—'}</td>
                  <td className="p-3">{b.accountNumber || '—'}</td>
                </tr>
              ))}
              {banks.length === 0 && <tr><td className="p-6 text-center text-slate-400" colSpan={3}>No bank accounts yet.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      <Modal open={acctOpen} title="Add account" onClose={() => setAcctOpen(false)}>
        <div className="space-y-3">
          <input className="input" placeholder="Code (e.g. 6100)" value={acct.code} onChange={(e) => setAcct({ ...acct, code: e.target.value })} />
          <input className="input" placeholder="Name" value={acct.name} onChange={(e) => setAcct({ ...acct, name: e.target.value })} />
          <select className="input" value={acct.type} onChange={(e) => setAcct({ ...acct, type: e.target.value as AccountType })}>
            {ACCOUNT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
          <button className="btn-primary w-full" disabled={addAcct.isPending} onClick={() => addAcct.mutate()}>
            {addAcct.isPending ? 'Saving…' : 'Save'}
          </button>
        </div>
      </Modal>

      <Modal open={bankOpen} title="Add bank account" onClose={() => setBankOpen(false)}>
        <div className="space-y-3">
          <input className="input" placeholder="Label (e.g. NIC Asia Current)" value={bank.name} onChange={(e) => setBank({ ...bank, name: e.target.value })} />
          <input className="input" placeholder="Bank name" value={bank.bankName} onChange={(e) => setBank({ ...bank, bankName: e.target.value })} />
          <input className="input" placeholder="Account number" value={bank.accountNumber} onChange={(e) => setBank({ ...bank, accountNumber: e.target.value })} />
          <button className="btn-primary w-full" disabled={addBank.isPending} onClick={() => addBank.mutate()}>
            {addBank.isPending ? 'Saving…' : 'Save'}
          </button>
        </div>
      </Modal>
    </div>
  );
}
