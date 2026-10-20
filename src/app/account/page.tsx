'use client';
// /account — the signed-in CUSTOMER's panel (v5). Before v5 there was only an
// admin /dashboard, so a customer who logged in had nowhere to land.
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { BookOpen, LogOut, Download, ShoppingBag, KeyRound, CheckCircle2, AlertCircle, ShieldCheck } from 'lucide-react';
import { PRODUCTS } from '@/lib/products';
import SiteFooter from '@/components/SiteFooter';

interface Me { authenticated: boolean; role?: 'admin' | 'customer'; customer?: { name: string; email: string }; email?: string }
interface Purchase { id: number; ref: string; amount: number; name: string; slug: string; channel: string; at: string; downloadPage: string }

export default function AccountPage() {
  const [me, setMe] = useState<Me | null>(null);
  const [purchases, setPurchases] = useState<Purchase[] | null>(null);
  const [oldPw, setOldPw] = useState(''); const [newPw, setNewPw] = useState('');
  const [pwMsg, setPwMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetch('/api/auth/me').then(r => r.json()).then((d: Me) => {
      setMe(d);
      if (!d.authenticated) { window.location.replace('/login?next=/account'); return; }
      if (d.role === 'customer') fetch('/api/account/purchases').then(r => r.json()).then(x => setPurchases(x.purchases || [])).catch(() => setPurchases([]));
    }).catch(() => setMe({ authenticated: false }));
  }, []);

  const logout = async () => { await fetch('/api/auth/logout', { method: 'POST' }); window.location.assign('/login'); };

  const changePw = async (e: React.FormEvent) => {
    e.preventDefault(); setBusy(true); setPwMsg(null);
    try {
      const r = await fetch('/api/auth/change-password', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ oldPassword: oldPw, newPassword: newPw }) });
      const d = await r.json();
      setPwMsg(r.ok ? { ok: true, text: 'Password updated.' } : { ok: false, text: d.error || 'Could not update password.' });
      if (r.ok) { setOldPw(''); setNewPw(''); }
    } catch { setPwMsg({ ok: false, text: 'Network error.' }); } finally { setBusy(false); }
  };

  if (!me) return <main className="min-h-screen bg-radial-glow flex items-center justify-center text-gray-400 text-sm">Loading your account…</main>;
  if (!me.authenticated) return null;

  const ownedSlugs = new Set((purchases || []).map(p => p.slug));
  const isAdmin = me.role === 'admin';
  const name = isAdmin ? 'Admin' : me.customer?.name || '';

  return (
    <main className="min-h-screen bg-radial-glow">
      <nav className="border-b border-[var(--border)] bg-[var(--surface)] bg-opacity-90 backdrop-blur-sm sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/checkout" className="flex items-center gap-2"><BookOpen size={18} className="text-[var(--green)]" /><span className="font-semibold text-sm text-[var(--green)]">Jherico Balasa Ministry</span></Link>
          <button onClick={logout} className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-white border border-[var(--border)] rounded-lg px-3 py-1.5"><LogOut size={13} /> Sign out</button>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-4 py-10 space-y-8">
        <header>
          <h1 className="text-3xl font-bold text-white" style={{ fontFamily: 'Bebas Neue, Impact, sans-serif' }}>Welcome{name ? `, ${name.split(' ')[0]}` : ''} 👋</h1>
          <p className="text-gray-400 text-sm">{isAdmin ? me.email : me.customer?.email}</p>
        </header>

        {isAdmin ? (
          <div className="glass-card p-5 flex items-center justify-between" style={{ borderColor: 'rgba(0,255,135,0.3)' }}>
            <p className="text-sm text-gray-300 flex items-center gap-2"><ShieldCheck size={16} className="text-[var(--green)]" /> You are signed in as the administrator.</p>
            <Link href="/dashboard" className="btn-shimmer text-black text-sm font-bold px-4 py-2 rounded-lg">Open Admin Dashboard</Link>
          </div>
        ) : (
          <>
            <section data-testid="my-purchases">
              <h2 className="text-lg font-bold text-white mb-3 flex items-center gap-2"><Download size={16} className="text-[var(--green)]" /> My Purchases</h2>
              {purchases === null ? <p className="text-gray-500 text-sm">Loading…</p> : purchases.length === 0 ? (
                <div className="glass-card p-5 text-sm text-gray-400">No purchases on this account yet. Pick a pack below to get started.</div>
              ) : (
                <div className="space-y-2">
                  {purchases.map(p => (
                    <div key={p.id} className="glass-card p-4 flex items-center gap-4">
                      <CheckCircle2 size={18} className="text-[var(--green)] flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-white text-sm font-semibold truncate">{p.name}</p>
                        <p className="text-gray-500 text-xs">₱{p.amount.toLocaleString()} · {new Date(p.at).toLocaleDateString('en-PH')} · {String(p.channel || 'gcash').toUpperCase()}</p>
                      </div>
                      {p.downloadPage && <a href={p.downloadPage} target="_blank" rel="noopener noreferrer" className="text-xs font-bold text-black btn-shimmer px-3 py-1.5 rounded-lg">Download</a>}
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section>
              <h2 className="text-lg font-bold text-white mb-3 flex items-center gap-2"><ShoppingBag size={16} className="text-[var(--green)]" /> Ministry Packs</h2>
              <div className="grid sm:grid-cols-2 gap-3">
                {PRODUCTS.map(p => (
                  <Link key={p.slug} href={p.path} className="glass-card p-4 hover:border-[var(--green-dark)] transition-colors block">
                    <div className="flex items-center justify-between">
                      <p className="text-white text-sm font-semibold">{p.name}</p>
                      <span className="text-[var(--green)] text-sm font-bold">₱{p.price.toLocaleString()}</span>
                    </div>
                    <p className="text-gray-500 text-xs mt-1">{p.tagline}</p>
                    {ownedSlugs.has(p.slug) && <p className="text-[10px] text-[var(--green)] mt-2">✓ Purchased</p>}
                  </Link>
                ))}
              </div>
            </section>

            <section className="glass-card p-5">
              <h2 className="text-lg font-bold text-white mb-3 flex items-center gap-2"><KeyRound size={16} className="text-[var(--green)]" /> Change Password</h2>
              <form onSubmit={changePw} className="grid sm:grid-cols-3 gap-3 items-end">
                <input type="password" required placeholder="Current password" value={oldPw} onChange={e => setOldPw(e.target.value)} className="bg-[var(--bg)] border border-[var(--border)] rounded-lg px-3 py-2.5 text-white text-sm" />
                <input type="password" required minLength={6} placeholder="New password (min 6)" value={newPw} onChange={e => setNewPw(e.target.value)} className="bg-[var(--bg)] border border-[var(--border)] rounded-lg px-3 py-2.5 text-white text-sm" />
                <button disabled={busy} className="btn-shimmer text-black font-bold rounded-lg py-2.5 text-sm disabled:opacity-50">{busy ? 'Saving…' : 'Update'}</button>
              </form>
              {pwMsg && <p className={`mt-3 text-xs flex items-center gap-1.5 ${pwMsg.ok ? 'text-[var(--green)]' : 'text-red-400'}`}>{pwMsg.ok ? <CheckCircle2 size={12} /> : <AlertCircle size={12} />} {pwMsg.text}</p>}
            </section>
          </>
        )}
        <SiteFooter pageName="My Account" />
      </div>
    </main>
  );
}
