'use client';
import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { BookOpen, UserPlus, Eye, EyeOff, AlertCircle, CheckCircle2 } from 'lucide-react';
import { safeNext } from '@/lib/safeRedirect';
import SiteFooter from '@/components/SiteFooter';

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
    if (password.length < 8) { setError('Password must be at least 8 characters.'); return; }
    setLoading(true); setError('');
    try {
      const res  = await fetch('/api/auth/register', { method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ name, email, password, referredByCode }) });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Registration failed.');
        setLoading(false);
        return;
      }
      // Show success state — keep button loading during the brief redirect delay
      setDone(true);
      setTimeout(() => { window.location.assign(safeNext(sp.get('next'), '/account')); }, 1200);
    } catch {
      setError('Network error. Please try again.');
      setLoading(false);
    }
  };

  if (done) return (
    <div className="glass-card p-8 flex flex-col items-center text-center">
      <CheckCircle2 size={44} className="text-accent mb-3" />
      <p className="text-fg font-bold text-lg mb-1">Account Created!</p>
      <p className="text-muted text-sm">Taking you to your account…</p>
    </div>
  );

  return (
    <form onSubmit={handle} className="glass-card p-6 space-y-4">
      {referredByCode && (
        <div className="alert alert-ok px-3 py-2">
          You were referred by a friend! Sign up to join the affiliate program and earn commissions too.
        </div>
      )}
      {error && (
        <div className="alert alert-error flex items-center gap-2 p-3">
          <AlertCircle size={14} /> {error}
        </div>
      )}
      <div>
        <label className="block text-sm text-muted mb-1.5 font-medium">Full Name</label>
        <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Juan dela Cruz" required
          className="field" />
      </div>
      <div>
        <label className="block text-sm text-muted mb-1.5 font-medium">Email address</label>
        <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" required
          className="field" />
      </div>
      <div>
        <label className="block text-sm text-muted mb-1.5 font-medium">Password</label>
        <div className="relative">
          <input type={showPw ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)}
            placeholder="At least 8 characters" required
            className="field pr-10" />
          <button type="button" onClick={() => setShowPw(!showPw)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-fg">
            {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
          </button>
        </div>
        <p className="text-sm text-muted mt-1">No email confirmation required — you're in immediately.</p>
      </div>
      <button type="submit" disabled={loading || !name || !email || !password}
        className="btn-shimmer w-full py-3 rounded-xl font-bold text-on-accent flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
        {loading ? <><span className="animate-spin">⟳</span> Creating account…</> : <><UserPlus size={16} /> Create Free Account</>}
      </button>
      <p className="text-center text-sm text-muted">
        Already have an account?{' '}
        <Link href="/login" className="text-accent hover:underline font-medium">Sign in</Link>
      </p>
    </form>
  );
}

export default function SignupPage() {
  return (
    <main className="min-h-screen bg-radial-glow flex flex-col items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-3">
            <BookOpen size={28} className="text-accent" />
            <span className="text-xl font-bold text-fg">
              Jherico Balasa Ministry
            </span>
          </div>
          <h1 className="text-2xl font-bold text-fg mb-1">Create your account</h1>
          <p className="text-muted text-sm">Join free to participate in the affiliate program</p>
        </div>
        <Suspense fallback={<div className="glass-card p-6 text-center text-muted text-sm">Loading…</div>}>
          <SignupForm />
        </Suspense>
        <p className="text-center text-sm text-muted mt-6">
          <Link href="/checkout" className="hover:text-fg transition-colors">← Back to checkout</Link>
        </p>
      </div>
      <SiteFooter pageName="Create Account" showHelp={false} />
    </main>
  );
}
