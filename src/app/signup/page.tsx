'use client';
import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { BookOpen, UserPlus, Eye, EyeOff, AlertCircle, CheckCircle2 } from 'lucide-react';

function SignupForm() {
  const sp = useSearchParams();
  const [name, setName]         = useState('');
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw]     = useState(false);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');
  const [done, setDone]         = useState(false);

  const referredByCode = sp.get('ref') || (() => {
    if (typeof document === 'undefined') return null;
    const m = document.cookie.match(/affiliate_ref=([^;]+)/);
    return m ? m[1] : null;
  })();

  const handle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) { setError('Password must be at least 6 characters.'); return; }
    setLoading(true); setError('');
    try {
      const res  = await fetch('/api/auth/register', { method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ name, email, password, referredByCode }) });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Registration failed.'); return; }
      setDone(true);
      setTimeout(() => { window.location.href = '/checkout'; }, 1500);
    } catch { setError('Network error. Please try again.'); }
    finally { setLoading(false); }
  };

  if (done) return (
    <div className="glass-card p-8 flex flex-col items-center text-center" style={{ borderColor: 'rgba(0,255,135,0.3)' }}>
      <CheckCircle2 size={44} className="text-[var(--green)] mb-3" />
      <p className="text-white font-bold text-lg mb-1">Account Created!</p>
      <p className="text-gray-400 text-sm">Redirecting you to checkout…</p>
    </div>
  );

  return (
    <div className="glass-card p-6 space-y-4" style={{ borderColor: 'rgba(0,255,135,0.2)' }}>
      {referredByCode && (
        <div className="text-xs text-[var(--green)] bg-green-950 bg-opacity-30 border border-[var(--green-deeper)] rounded-lg px-3 py-2">
          👋 You were referred by a friend! Sign up to join the affiliate program and earn commissions too.
        </div>
      )}
      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-950 bg-opacity-60 border border-red-800 rounded-lg text-xs text-red-300">
          <AlertCircle size={14} /> {error}
        </div>
      )}
      <div>
        <label className="block text-xs text-gray-400 mb-1.5 font-medium">Full Name</label>
        <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Juan dela Cruz" required
          className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-lg px-3 py-2.5 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-[var(--green)] transition-colors" />
      </div>
      <div>
        <label className="block text-xs text-gray-400 mb-1.5 font-medium">Email address</label>
        <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" required
          className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-lg px-3 py-2.5 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-[var(--green)] transition-colors" />
      </div>
      <div>
        <label className="block text-xs text-gray-400 mb-1.5 font-medium">Password</label>
        <div className="relative">
          <input type={showPw ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)}
            placeholder="Min. 6 characters" required
            className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-lg px-3 py-2.5 pr-10 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-[var(--green)] transition-colors" />
          <button type="button" onClick={() => setShowPw(!showPw)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300">
            {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
          </button>
        </div>
        <p className="text-[10px] text-gray-600 mt-1">No email confirmation required — you're in immediately.</p>
      </div>
      <button onClick={handle} disabled={loading || !name || !email || !password}
        className="btn-shimmer w-full py-3 rounded-xl font-bold text-black flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
        {loading ? <><span className="animate-spin">⟳</span> Creating account…</> : <><UserPlus size={16} /> Create Free Account</>}
      </button>
      <p className="text-center text-xs text-gray-500">
        Already have an account?{' '}
        <Link href="/login" className="text-[var(--green)] hover:underline font-medium">Sign in</Link>
      </p>
    </div>
  );
}

export default function SignupPage() {
  return (
    <main className="min-h-screen bg-radial-glow flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-3">
            <BookOpen size={28} className="text-[var(--green)]" />
            <span className="text-xl font-bold text-white" style={{ fontFamily: 'Bebas Neue, Impact, sans-serif', letterSpacing: '0.05em' }}>
              The Fundamentals
            </span>
          </div>
          <h1 className="text-2xl font-bold text-white mb-1">Create your account</h1>
          <p className="text-gray-400 text-sm">Join free to participate in the affiliate program</p>
        </div>
        <Suspense fallback={<div className="glass-card p-6 text-center text-gray-400 text-sm">Loading…</div>}>
          <SignupForm />
        </Suspense>
        <p className="text-center text-xs text-gray-600 mt-6">
          <Link href="/checkout" className="hover:text-gray-400 transition-colors">← Back to checkout</Link>
        </p>
      </div>
    </main>
  );
}
