'use client';
import { BookOpen, CheckCircle2, Zap, Users, Star, Lock, Play, Shield } from 'lucide-react';
import ReceiptUploader from '@/components/ReceiptUploader';
import PaymentTutorial from '@/components/PaymentTutorial';
import SupportSection from '@/components/SupportSection';

const FEATURES = [
  { icon: <Play size={18} />, label: '30-Minute Ready-to-Teach PPT Sessions', sub: 'Open and teach the same day — no prep fatigue' },
  { icon: <Star size={18} />, label: 'Premium-Designed Visuals & Slides', sub: 'Professional quality your congregation will feel' },
  { icon: <BookOpen size={18} />, label: '16 Core Fundamental Truths', sub: 'Trinity · Deity of Christ · Salvation · Holy Spirit · and more' },
  { icon: <Zap size={18} />, label: 'Simplified but In-Depth Explanations', sub: 'Clear enough for new believers, deep enough for veterans' },
  { icon: <Users size={18} />, label: 'Addresses Real Questions New Believers Ask', sub: 'Meet your congregation where they actually are' },
];

const TESTIMONIALS = [
  { name: 'Pastor Marco R.', role: 'Church of God · Davao', text: 'We used these slides for our discipleship class. Even our long-time members said they finally understood the Trinity clearly.', stars: 5 },
  { name: 'Sis. Grace T.', role: 'Youth Leader · Cagayan de Oro', text: "I was nervous teaching the Deity of Christ — the slides made it so clear and confident. My youth group loved it.", stars: 5 },
  { name: 'Bro. Joel M.', role: 'Cell Group Facilitator', text: "Worth every peso. I've tried making slides myself — this is on another level.", stars: 5 },
];

const PRICE = parseInt(process.env.NEXT_PUBLIC_PRODUCT_PRICE || '497', 10);
const CURRENCY = process.env.NEXT_PUBLIC_CURRENCY || 'PHP';

export default function CheckoutPage() {
  return (
    <main className="relative min-h-screen bg-radial-glow">
      {/* Top bar */}
      <div className="border-b border-[var(--border)] bg-[var(--surface)] bg-opacity-80 backdrop-blur-sm sticky top-0 z-40">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BookOpen size={18} className="text-[var(--green)]" />
            <span className="font-semibold text-sm text-[var(--green)]">The Fundamentals</span>
          </div>
          <div className="flex items-center gap-4 text-xs text-gray-400">
            <span className="flex items-center gap-1"><Lock size={11} className="text-[var(--green)]" /> GCash Secure</span>
            <span className="flex items-center gap-1"><Shield size={11} className="text-[var(--green)]" /> Instant Download</span>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-12 relative z-10">

        {/* ── HERO ── */}
        <section className="text-center mb-14 fade-up">
          <div className="inline-flex items-center gap-2 bg-[var(--card)] border border-[var(--border)] rounded-full px-4 py-1.5 text-xs text-[var(--green)] font-medium mb-6 tracking-wider uppercase">
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--green)] animate-pulse inline-block" />
            Pay via GCash · Instant Access
          </div>
          <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-4"
            style={{ fontFamily: 'Bebas Neue, Impact, sans-serif', color: '#fff', lineHeight: 1.05 }}>
            THE <span style={{ color: 'var(--green)' }}>FUNDAMENTALS</span>
          </h1>
          <p className="text-lg md:text-xl text-gray-300 max-w-2xl mx-auto leading-relaxed mb-2">
            Perfect for those who have started their walk with God but are{' '}
            <span className="text-[var(--green)] font-medium">still asking the deeper questions.</span>
          </p>
          <p className="text-base text-gray-400 max-w-xl mx-auto">
            Not just for beginners —{' '}
            <span className="text-[var(--green-dark)] font-medium">even long-time believers</span>{' '}
            gain clarity, confidence, and renewed understanding.
          </p>
        </section>

        {/* ── MAIN GRID ── */}
        <div className="grid md:grid-cols-5 gap-8 mb-16">

          {/* Features */}
          <div className="md:col-span-3 space-y-4 fade-up-1">
            <h2 className="text-xl font-bold text-white mb-4">What's Inside Your Pack</h2>
            {FEATURES.map((f, i) => (
              <div key={i} className="glass-card p-4 flex items-start gap-4 hover:border-[var(--green-dark)] transition-colors duration-300">
                <div className="flex-shrink-0 w-9 h-9 rounded-lg bg-[var(--green-deeper)] bg-opacity-40 flex items-center justify-center text-[var(--green)]">
                  {f.icon}
                </div>
                <div>
                  <p className="font-semibold text-white text-sm">{f.label}</p>
                  <p className="text-gray-400 text-xs mt-0.5">{f.sub}</p>
                </div>
                <CheckCircle2 size={16} className="text-[var(--green)] ml-auto flex-shrink-0 mt-0.5" />
              </div>
            ))}
          </div>

          {/* Price + GCash Payment panel */}
          <div className="md:col-span-2 fade-up-2">
            <div className="glass-card p-6 sticky top-20 glow-pulse" style={{ borderColor: 'rgba(0,255,135,0.3)' }}>
              <div className="w-full h-32 rounded-xl mb-4 flex items-center justify-center overflow-hidden relative"
                style={{ background: 'linear-gradient(135deg, #0D3B20, #051A0D)' }}>
                <div className="text-center">
                  <BookOpen size={36} className="text-[var(--green)] mx-auto mb-2 float-anim" />
                  <p className="text-xs text-[var(--green)] tracking-widest uppercase font-semibold">Digital Pack</p>
                </div>
                <div className="absolute -top-2 -right-2 w-16 h-24 rounded-lg bg-[var(--surface)] border border-[var(--border)] rotate-6 opacity-40" />
                <div className="absolute -top-1 right-2 w-16 h-24 rounded-lg bg-[var(--surface)] border border-[var(--border)] rotate-3 opacity-60" />
              </div>

              <h3 className="text-2xl font-bold text-white mb-1" style={{ fontFamily: 'Bebas Neue, Impact, sans-serif' }}>
                The Fundamentals
              </h3>
              <p className="text-xs text-gray-400 mb-4">16 Ready-to-Teach PPT Sessions · Instant Digital Download</p>

              <div className="flex items-baseline gap-2 mb-4">
                <span className="text-3xl font-extrabold text-[var(--green)]">{CURRENCY} {PRICE.toLocaleString()}</span>
                <span className="text-gray-500 line-through text-base">{CURRENCY} 997</span>
                <span className="bg-[var(--green-deeper)] text-[var(--green)] text-xs font-bold px-2 py-0.5 rounded-full">50% OFF</span>
              </div>

              {/* How it works summary */}
              <div className="space-y-2 mb-4">
                {[
                  { n: '1', t: 'Send GCash payment to our number' },
                  { n: '2', t: 'Download your GCash receipt' },
                  { n: '3', t: 'Upload receipt below to verify' },
                  { n: '4', t: 'File downloads automatically! 🎉' },
                ].map((s) => (
                  <div key={s.n} className="flex items-center gap-2.5 text-xs text-gray-300">
                    <span className="w-5 h-5 rounded-full bg-[var(--green-deeper)] text-[var(--green)] flex items-center justify-center font-bold text-[10px] flex-shrink-0">
                      {s.n}
                    </span>
                    {s.t}
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-center gap-4 text-xs text-gray-500 pt-3 border-t border-[var(--border)]">
                <span className="flex items-center gap-1"><Lock size={10} className="text-[var(--green)]" /> No PayMongo fees</span>
                <span className="flex items-center gap-1"><Zap size={10} className="text-[var(--green)]" /> Instant Download</span>
              </div>
            </div>
          </div>
        </div>

        {/* ── PAYMENT + RECEIPT UPLOAD (the main action) ── */}
        <section className="mb-16 fade-up-2">
          <div className="text-center mb-6">
            <h2 className="text-white font-bold mb-1" style={{ fontFamily: 'Bebas Neue, Impact, sans-serif', fontSize: '1.8rem' }}>
              Pay & Get Instant Access
            </h2>
            <p className="text-gray-400 text-sm">Send {CURRENCY} {PRICE.toLocaleString()} via GCash, then upload your receipt below.</p>
          </div>
          <div className="max-w-xl mx-auto">
            <ReceiptUploader />
          </div>
        </section>

        {/* ── TUTORIAL ── */}
        <PaymentTutorial />

        {/* ── TESTIMONIALS ── */}
        <section className="mb-16 fade-up-3">
          <h2 className="text-2xl font-bold text-white text-center mb-8">What Ministry Leaders Are Saying</h2>
          <div className="grid md:grid-cols-3 gap-4">
            {TESTIMONIALS.map((t, i) => (
              <div key={i} className="glass-card p-5">
                <div className="flex gap-0.5 mb-3">
                  {Array.from({ length: t.stars }).map((_, s) => (
                    <Star key={s} size={14} className="text-[var(--green)] fill-[var(--green)]" />
                  ))}
                </div>
                <p className="text-gray-300 text-sm leading-relaxed mb-4 italic">&ldquo;{t.text}&rdquo;</p>
                <div>
                  <p className="font-semibold text-white text-sm">{t.name}</p>
                  <p className="text-gray-500 text-xs">{t.role}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── SUPPORT ── */}
        <SupportSection />

        {/* ── BOTTOM CTA ── */}
        <section className="text-center mb-16 fade-up-4">
          <div className="glass-card p-8 max-w-2xl mx-auto" style={{ borderColor: 'rgba(0,255,135,0.25)' }}>
            <h3 className="text-3xl font-bold text-white mb-3" style={{ fontFamily: 'Bebas Neue, Impact, sans-serif' }}>
              Ready to Equip Your Church?
            </h3>
            <p className="text-gray-400 mb-4 text-sm">
              Pay via GCash · No payment gateway fees · 100% goes to ministry
            </p>
            <p className="text-[var(--green)] font-bold text-2xl mb-4">{CURRENCY} {PRICE.toLocaleString()}</p>
            <a href="#top" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
              className="btn-shimmer inline-flex px-10 py-4 rounded-xl font-bold text-black text-lg items-center gap-2 transition-transform hover:scale-[1.02] active:scale-95">
              Pay with GCash Now
            </a>
          </div>
        </section>

        <footer className="text-center text-xs text-gray-600 pb-8">
          <p>© {new Date().getFullYear()} The Fundamentals Ministry by Jherico Balasa. All rights reserved.</p>
          <p className="mt-1">
            Need help?{' '}
            <a href="mailto:jhericojohnbalasa@gmail.com" className="text-[var(--green)] hover:underline">
              jhericojohnbalasa@gmail.com
            </a>
          </p>
        </footer>
      </div>
    </main>
  );
}
