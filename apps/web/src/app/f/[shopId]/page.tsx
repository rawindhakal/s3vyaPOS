'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5300/api';

export default function PublicFeedbackPage() {
  const { shopId } = useParams<{ shopId: string }>();
  const [shop, setShop] = useState<any>(null);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [name, setName] = useState('');
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetch(`${API}/public/menu/${shopId}`).then((r) => (r.ok ? r.json() : null)).then((d) => setShop(d?.shop)).catch(() => {});
  }, [shopId]);

  const submit = async () => {
    if (!rating) return;
    setBusy(true);
    try {
      await fetch(`${API}/public/feedback`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shopId, rating, comment: comment || undefined, customerName: name || undefined }),
      });
      setDone(true);
    } finally { setBusy(false); }
  };

  if (done) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-6 text-center">
        <div className="text-5xl">🙏</div>
        <h1 className="mt-3 text-xl font-bold">Thank you!</h1>
        <p className="text-slate-500">Your feedback helps us improve.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center p-6">
      <div className="card p-6 text-center">
        <h1 className="text-xl font-bold">{shop?.name ?? 'Rate your experience'}</h1>
        <p className="mt-1 text-sm text-slate-500">How was your visit?</p>
        <div className="my-4 flex justify-center gap-2 text-4xl">
          {[1, 2, 3, 4, 5].map((s) => (
            <button key={s} onClick={() => setRating(s)} className={s <= rating ? 'text-amber-400' : 'text-slate-300'}>★</button>
          ))}
        </div>
        <input className="input mb-2" placeholder="Your name (optional)" value={name} onChange={(e) => setName(e.target.value)} />
        <textarea className="input mb-3" rows={3} placeholder="Comments (optional)" value={comment} onChange={(e) => setComment(e.target.value)} />
        <button className="btn-primary w-full" disabled={!rating || busy} onClick={submit}>{busy ? 'Submitting…' : 'Submit feedback'}</button>
      </div>
    </div>
  );
}
