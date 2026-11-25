'use client';
import { useEffect, useState } from 'react';
import { CheckCircle2, Download, BookOpen } from 'lucide-react';

export default function SuccessPage() {
  const [cd, setCd] = useState(5);
  const dlUrl = process.env.NEXT_PUBLIC_DOWNLOAD_PAGE_URL || 'https://jhericojohnbalasa.systeme.io/thankyou-page-fundamentals';
  useEffect(() => {
    const t = setInterval(() => setCd(c => { if (c <= 1) { clearInterval(t); window.location.href = dlUrl; return 0; } return c - 1; }), 1000);
    return () => clearInterval(t);
  }, [dlUrl]);
  return (
    <main className="min-h-screen bg-radial-glow flex items-center justify-center px-4">
      <div className="glass-card p-10 max-w-md w-full text-center">
        <div className="relative mx-auto w-20 h-20 mb-6">
          <div className="relative w-20 h-20 rounded-full bg-accent-soft flex items-center justify-center border-2 border-accent">
            <CheckCircle2 size={40} className="text-accent" />
          </div>
        </div>
        <h1 className="text-4xl font-bold text-fg mb-2">Payment verified</h1>
        <p className="text-accent font-semibold mb-4">Receipt confirmed</p>
        <p className="text-fg2 text-sm mb-6">Redirecting to your download page in <span className="text-accent font-bold text-lg">{cd}</span> seconds.</p>
        <div className="w-full h-1.5 bg-line rounded-full overflow-hidden mb-6">
          <div className="h-full bg-accent-solid rounded-full transition-all duration-1000" style={{ width: `${((5-cd)/5)*100}%` }} />
        </div>
        <a href={dlUrl} className="btn-shimmer inline-flex items-center gap-2 px-8 py-3 rounded-xl font-bold text-on-accent mb-4">
          <Download size={18} /> Go to Download Page Now
        </a>
        <div className="mt-4 pt-4 border-t border-line">
          <div className="flex items-center justify-center gap-2 text-sm text-muted">
            <BookOpen size={12} className="text-accent" /> The Fundamentals — 16 Core Christian Truths
          </div>
          <p className="text-sm text-muted mt-2">Issues? Email <a href="mailto:jhericojohnbalasa@gmail.com" className="text-accent hover:underline">jhericojohnbalasa@gmail.com</a></p>
        </div>
      </div>
    </main>
  );
}
