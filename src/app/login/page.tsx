'use client';
import { useState } from 'react';
import Link from 'next/link';
import { BookOpen, LogIn, Eye, EyeOff, AlertCircle } from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw]     = useState(false);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');

  const handle = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      const res  = await fetch('/api/auth/login', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ email, password }) });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Login failed.'); return; }
      // Redirect admin to dashboard, customers back to checkout
      window.location.href = data.role === 'admin' ? '/dashboard' : '/checkout';
    } catch { setError('Network error. Please try again.'); }
    finally { setLoading(false); }
  };

  return (
    <main className="min-h-screen bg-radial-glow flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-3">
            <BookOpen size={28} className="text-[var(--green)]" />
            <span className="text-xl font-bold text-white" style={{ fontFamily: 'Bebas Neue, Impact, sans-serif', letterSpacing: '0.05em' }}>
              The Fundamentals
            </span>
          </div>
          <h1 className="text-2xl font-bold text-white mb-1">Welcome back</h1>
          <p className="text-gray-400 text-sm">Sign in to your account</p>
        </div>

        <div className="glass-card p-6 space-y-4" style={{ borderColor: 'rgba(0,255,135,0.2)' }}>
          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-950 bg-opacity-60 border border-red-800 rounded-lg text-xs text-red-300">
              <AlertCircle size={14} /> {error}
            </div>
          )}

          <div>
            <label className="block text-xs text-gray-400 mb-1.5 font-medium">Email address</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)}
              placeholder="you@example.com" required
              className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-lg px-3 py-2.5 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-[var(--green)] transition-colors" />
          </div>

          <div>
            <label className="block text-xs text-gray-400 mb-1.5 font-medium">Password</label>
            <div className="relative">
              <input type={showPw ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)}
                placeholder="••••••••" required
                className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-lg px-3 py-2.5 pr-10 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-[var(--green)] transition-colors" />
              <button type="button" onClick={() => setShowPw(!showPw)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300">
                {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>

          <button onClick={handle} disabled={loading || !email || !password}
            className="btn-shimmer w-full py-3 rounded-xl font-bold text-black flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
            {loading ? <><span className="animate-spin">⟳</span> Signing in…</> : <><LogIn size={16} /> Sign In</>}
          </button>

          <p className="text-center text-xs text-gray-500">
            Don't have an account?{' '}
            <Link href="/signup" className="text-[var(--green)] hover:underline font-medium">Create one free</Link>
          </p>
        </div>

        <p className="text-center text-xs text-gray-600 mt-6">
          <Link href="/checkout" className="hover:text-gray-400 transition-colors">← Back to checkout</Link>
        </p>
      </div>
    </main>
  );
}
