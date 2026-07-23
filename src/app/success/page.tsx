'use client';
import { useEffect, useState } from 'react';
import { CheckCircle2, Download, BookOpen } from 'lucide-react';

export default function SuccessPage() {
  const [cd, setCd] = useState(5);
  const dlUrl = process.env.NEXT_PUBLIC_DOWNLOAD_PAGE_URL || 'https://jhericojohnbalasa.systeme.io/fundementals-truth';
  useEffect(() => {
    const t = setInterval(() => setCd(c => { if (c <= 1) { clearInterval(t); window.location.href = dlUrl; return 0; } return c - 1; }), 1000);
    return () => clearInterval(t);
  }, [dlUrl]);
  return (
    <main className="min-h-screen bg-radial-glow flex items-center justify-center px-4">
      <div className="glass-card p-10 max-w-md w-full text-center" style={{ borderColor: 'rgba(0,255,135,0.4)' }}>
        <div className="relative mx-auto w-20 h-20 mb-6">
          <div className="absolute inset-0 rounded-full bg-[var(--green)] opacity-20 animate-ping" />
          <div className="relative w-20 h-20 rounded-full bg-[var(--green-deeper)] bg-opacity-30 flex items-center justify-center border-2 border-[var(--green)]">
            <CheckCircle2 size={40} className="text-[var(--green)]" />
          </div>
        </div>
        <h1 className="text-4xl font-bold text-white mb-2" style={{ fontFamily: 'Bebas Neue, Impact, sans-serif' }}>Payment Verified! 🎉</h1>
        <p className="text-[var(--green)] font-semibold mb-4">GCash Receipt Confirmed</p>
        <p className="text-gray-300 text-sm mb-6">Redirecting to your download page in <span className="text-[var(--green)] font-bold text-lg">{cd}</span> seconds.</p>
        <div className="w-full h-1.5 bg-[var(--border)] rounded-full overflow-hidden mb-6">
          <div className="h-full bg-[var(--green)] rounded-full transition-all duration-1000" style={{ width: `${((5-cd)/5)*100}%` }} />
        </div>
        <a href={dlUrl} className="btn-shimmer inline-flex items-center gap-2 px-8 py-3 rounded-xl font-bold text-black mb-4">
          <Download size={18} /> Go to Download Page Now
        </a>
        <div className="mt-4 pt-4 border-t border-[var(--border)]">
          <div className="flex items-center justify-center gap-2 text-xs text-gray-500">
            <BookOpen size={12} className="text-[var(--green)]" /> The Fundamentals — 16 Core Christian Truths
          </div>
          <p className="text-[10px] text-gray-600 mt-2">Issues? Email <a href="mailto:jhericojohnbalasa@gmail.com" className="text-[var(--green)] hover:underline">jhericojohnbalasa@gmail.com</a></p>
        </div>
      </div>
    </main>
  );
}
