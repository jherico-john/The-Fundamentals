'use client';
// NavBar — v6: flat, theme-aware header. The Dark / Light toggle sits directly
// after the "Join Free" button (and at the end of the bar for signed-in users).
import { useState, useEffect } from 'react';
import { User, LogOut, ChevronDown, LayoutDashboard, LogIn } from 'lucide-react';
import Link from 'next/link';
import ThemeToggle from '@/components/ThemeToggle';

interface NavUser { name: string; email: string; role: 'admin' | 'customer'; }

export default function NavBar({ product = 'The Fundamentals' }: { product?: string }) {
  const [user, setUser] = useState<NavUser | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    fetch('/api/auth/me').then(r => r.json()).then(d => {
      if (!d.authenticated) return;
      // Admin: d = { authenticated, role:'admin', email }
      // Customer: d = { authenticated, role:'customer', customer:{ id, name, email } }
      if (d.role === 'admin') {
        setUser({ name: 'Admin', email: d.email || '', role: 'admin' });
      } else if (d.role === 'customer' && d.customer) {
        setUser({ name: d.customer.name, email: d.customer.email, role: 'customer' });
      }
    }).catch(() => {});
  }, []);

  const logout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    setUser(null); setOpen(false);
    window.location.assign('/checkout');
  };

  const initials = user?.name?.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() || '';

  return (
    <nav className="border-b border-line bg-surface sticky top-0 z-40">
      <div className="max-w-5xl mx-auto px-4 py-2.5 flex items-center justify-between gap-3">
        <Link href="/checkout" className="min-w-0 flex items-center gap-2" aria-label={`${product} — home`}>
          <span className="truncate font-semibold text-[15px] text-fg">{product}</span>
        </Link>

        <div className="flex items-center gap-2 flex-shrink-0">
          {user ? (
            <div className="relative">
              <button onClick={() => setOpen(!open)} aria-expanded={open} aria-haspopup="menu"
                className="flex items-center gap-2 text-sm text-fg2 hover:text-fg transition-colors min-h-[40px]">
                <span className="w-8 h-8 rounded-full bg-accent-solid flex items-center justify-center text-on-accent text-xs font-bold">{initials}</span>
                <span className="hidden sm:block">{user.name}</span>
                <ChevronDown size={14} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
              </button>
              {open && (
                <div role="menu" className="absolute right-0 top-full mt-2 w-52 card py-2 z-50">
                  <div className="px-4 py-2 border-b border-line">
                    <p className="text-fg text-sm font-semibold truncate">{user.name}</p>
                    <p className="text-muted text-xs truncate">{user.email}</p>
                  </div>
                  <Link href={user.role === 'admin' ? '/dashboard' : '/account'} onClick={() => setOpen(false)}
                    className="flex items-center gap-2 px-4 py-2.5 text-sm text-fg2 hover:text-fg hover:bg-accent-soft transition-colors">
                    <LayoutDashboard size={15} /> {user.role === 'admin' ? 'Dashboard' : 'My Account'}
                  </Link>
                  <button onClick={logout} className="flex items-center gap-2 px-4 py-2.5 text-sm text-fg2 hover:text-fg hover:bg-accent-soft transition-colors w-full text-left">
                    <LogOut size={15} /> Sign Out
                  </button>
                </div>
              )}
            </div>
          ) : (
            <>
              <Link href="/login" className="btn-secondary text-sm px-3">
                <LogIn size={14} /> <span>Sign In</span>
              </Link>
              <Link href="/signup" className="btn-primary text-sm px-3 min-h-[44px]">
                Join Free
              </Link>
            </>
          )}
          <ThemeToggle />
        </div>
      </div>
    </nav>
  );
}
