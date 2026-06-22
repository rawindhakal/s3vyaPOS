'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { BUSINESS_TYPES, type BusinessType } from '@s3vya/types';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth-store';

export default function SignupPage() {
  const router = useRouter();
  const setAuth = useAuth((s) => s.setAuth);
  const [form, setForm] = useState({
    shopName: '',
    businessType: 'RETAIL' as BusinessType,
    fullName: '',
    email: '',
    password: '',
  });
  const [loading, setLoading] = useState(false);

  const set = (k: keyof typeof form) => (e: any) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await api.post('/auth/signup', form);
      setAuth(data);
      router.replace('/');
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Signup failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <form onSubmit={submit} className="card w-full max-w-sm space-y-3 p-6">
        <h1 className="text-2xl font-bold">Create your shop</h1>
        <input className="input" placeholder="Shop name" value={form.shopName} onChange={set('shopName')} />
        <select className="input" value={form.businessType} onChange={set('businessType')}>
          {BUSINESS_TYPES.map((t) => (
            <option key={t} value={t}>
              {t === 'BOTH' ? 'Retail + Restaurant' : t.charAt(0) + t.slice(1).toLowerCase()}
            </option>
          ))}
        </select>
        <input className="input" placeholder="Your name" value={form.fullName} onChange={set('fullName')} />
        <input className="input" type="email" placeholder="Email" value={form.email} onChange={set('email')} />
        <input className="input" type="password" placeholder="Password (min 6)" value={form.password} onChange={set('password')} />
        <button className="btn-primary w-full" disabled={loading}>
          {loading ? 'Creating…' : 'Create shop'}
        </button>
        <p className="text-center text-sm text-slate-500">
          Already have a shop?{' '}
          <Link href="/login" className="text-brand hover:underline">
            Sign in
          </Link>
        </p>
      </form>
    </div>
  );
}
