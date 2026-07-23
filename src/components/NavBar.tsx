'use client';
import { useState, useEffect } from 'react';
import { BookOpen, User, LogOut, ChevronDown, LayoutDashboard, LogIn } from 'lucide-react';
import Link from 'next/link';

interface NavUser { name: string; email: string; }

export default function NavBar({ product = 'The Fundamentals' }: { product?: string }) {
  const [user, setUser] = useState<NavUser | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    fetch('/api/auth/me').then(r => r.json()).then(d => {
      if (d.authenticated === false && d.name) setUser({ name: d.name, email: d.email });
      else if (d.name) setUser({ name: d.name, email: d.email });
    }).catch(() => {});
  }, []);

  const logout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    setUser(null); setOpen(false);
    window.location.reload();
  };

  const initials = user?.name?.split(' ').map(w => w[0]).join('').slice(0,2).toUpperCase() || '';

  return (
    <nav className="border-b border-[var(--border)] bg-[var(--surface)] bg-opacity-90 backdrop-blur-sm sticky top-0 z-40">
      <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
        <Link href="/checkout" className="flex items-center gap-2">
          <BookOpen size={18} className="text-[var(--green)]" />
          <span className="font-semibold text-sm text-[var(--green)]">{product}</span>
        </Link>

        <div className="flex items-center gap-3">
          {user ? (
            <div className="relative">
              <button onClick={() => setOpen(!open)}
                className="flex items-center gap-2 text-sm text-gray-300 hover:text-white transition-colors">
                <div className="w-8 h-8 rounded-full bg-[var(--green)] flex items-center justify-center text-black text-xs font-bold">{initials}</div>
                <span className="hidden sm:block">{user.name}</span>
                <ChevronDown size={14} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
              </button>
              {open && (
                <div className="absolute right-0 top-full mt-2 w-48 glass-card py-2 shadow-xl" style={{borderColor:'rgba(0,255,135,0.25)'}}>
                  <div className="px-4 py-2 border-b border-[var(--border)]">
                    <p className="text-white text-sm font-semibold truncate">{user.name}</p>
                    <p className="text-gray-400 text-xs truncate">{user.email}</p>
                  </div>
                  <Link href="/dashboard" onClick={() => setOpen(false)} className="flex items-center gap-2 px-4 py-2 text-sm text-gray-300 hover:text-white hover:bg-[var(--card)] transition-colors">
                    <LayoutDashboard size={14} /> Dashboard
                  </Link>
                  <button onClick={logout} className="flex items-center gap-2 px-4 py-2 text-sm text-red-400 hover:text-red-300 hover:bg-[var(--card)] transition-colors w-full text-left">
                    <LogOut size={14} /> Sign Out
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link href="/login" className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-white transition-colors px-3 py-1.5 rounded-lg border border-[var(--border)] hover:border-[var(--green)]">
                <LogIn size={13} /> Sign In
              </Link>
              <Link href="/signup" className="btn-shimmer text-black text-xs font-bold px-3 py-1.5 rounded-lg">
                Join Free
              </Link>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
