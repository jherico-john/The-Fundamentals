'use client';
// Light / dark switch. The initial theme is applied before paint by the inline
// script in layout.tsx; this button only reads and changes it afterwards.
import { useEffect, useState } from 'react';
import { Moon, Sun } from 'lucide-react';

type Theme = 'light' | 'dark';
const KEY = 'tf-theme';

export default function ThemeToggle() {
  const [theme, setTheme] = useState<Theme | null>(null);

  useEffect(() => {
    const t = document.documentElement.getAttribute('data-theme');
    setTheme(t === 'dark' ? 'dark' : 'light');
  }, []);

  const toggle = () => {
    const next: Theme = theme === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    try { localStorage.setItem(KEY, next); } catch { /* private mode: still switches for this visit */ }
    setTheme(next);
  };

  const isDark = theme === 'dark';
  const label = isDark ? 'Switch to light theme' : 'Switch to dark theme';
  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={label}
      title={label}
      data-testid="theme-toggle"
      className="inline-flex items-center justify-center w-10 h-10 rounded-lg border border-line-strong text-fg2 hover:text-fg hover:bg-accent-soft transition-colors flex-shrink-0"
    >
      {theme === null ? <span className="w-[18px] h-[18px]" /> : isDark ? <Sun size={18} /> : <Moon size={18} />}
    </button>
  );
}
