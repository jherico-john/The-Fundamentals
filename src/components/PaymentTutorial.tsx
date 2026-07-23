'use client';
// PaymentTutorial — v4.1
// Updated to match the ACTUAL payment flow:
// Scan QR or Copy Number → Pay in GCash → Download Receipt → Upload Here → Get Access
// (Removed the old QRPh-scanning-a-PayMongo-QR flow)

import { useState } from 'react';
import { ChevronLeft, ChevronRight, Download, Copy, Upload, CheckCircle2 } from 'lucide-react';

const STEPS = [
  {
    img: '/tutorial/t1qrph.jpg',
    label: 'Step 1',
    title: 'Open GCash on Your Phone',
    desc: 'Open the GCash app. You have two ways to pay:\n• Scan our QR code (on this page)\n• Copy our GCash number and send via "Send Money"',
    tag: 'GCash App',
    tc: '#0070CD',
    Icon: null,
  },
  {
    img: '/tutorial/t1.jpg',
    label: 'Step 2',
    title: 'Scan Our QR or Use Send Money',
    desc: 'OPTION A — Scan: Tap the QR icon at the bottom of GCash → scan our QR code on this page OR download our QR first then upload from your gallery.\n\nOPTION B — Number: Tap "Send Money" → type our GCash number → enter the exact amount shown.',
    tag: 'Two Options',
    tc: '#00C46A',
    Icon: null,
  },
  {
    img: '/tutorial/t2.jpg',
    label: 'Step 3',
    title: 'Enter the Exact Amount',
    desc: 'Type the exact product price shown on this page. Make sure the amount is correct — our system verifies the amount from your receipt. Wrong amounts will fail verification.',
    tag: 'Exact Amount',
    tc: '#FF9500',
    Icon: null,
  },
  {
    img: '/tutorial/t3.jpg',
    label: 'Step 4',
    title: 'Review & Confirm Payment',
    desc: 'GCash will show a confirmation screen with:\n• Recipient: J. Balasa (Jherico Balasa Ministry)\n• Amount: the product price\n\nDouble-check both, then tap "Pay" or "Confirm" to complete your payment.',
    tag: 'Confirm',
    tc: '#FF9500',
    Icon: null,
  },
  {
    img: '/tutorial/t4.jpg',
    label: 'Step 5',
    title: 'Payment Success — Download Your Receipt',
    desc: 'GCash shows a success screen with your payment receipt. IMPORTANT: tap the "Download" button at the bottom of this screen to save the receipt image to your phone gallery.\n\nDo NOT just screenshot your screen — use GCash\'s built-in Download button for a cleaner image our system can read.',
    tag: '⬇ Download Receipt!',
    tc: '#FF4444',
    Icon: null,
  },
  {
    img: '/tutorial/t5.jpg',
    label: 'Step 6',
    title: 'Your GCash Receipt is Saved',
    desc: 'The receipt from GCash contains your:\n• Reference number (e.g. 9041 784 498164)\n• Amount paid\n• Date & time\n\nThis is what we verify. Keep this image — you\'ll need to upload it in the next step.',
    tag: 'Receipt Ready',
    tc: '#00FF87',
    Icon: null,
  },
  {
    img: '/tutorial/t7.jpg',
    label: 'Step 7',
    title: 'Upload Receipt → Instant Access!',
    desc: 'Come back to this checkout page. Tap the upload box below, select your GCash receipt from your phone gallery, and our system will automatically verify it.\n\nOnce verified, your file download starts immediately AND you\'re redirected to the download page. 🎉',
    tag: '🎉 Get Access!',
    tc: '#00FF87',
    Icon: null,
  },
];

// Visual flow icon row shown above the cards
function FlowBar() {
  const steps = [
    { icon: <Copy size={14}/>,          label: 'Copy/Scan',   color: '#0070CD' },
    { icon: <span className="text-sm font-bold">₱</span>, label: 'Send Money', color: '#00C46A' },
    { icon: <Download size={14}/>,      label: 'Download',    color: '#FF9500' },
    { icon: <Upload size={14}/>,        label: 'Upload',      color: '#FF4444' },
    { icon: <CheckCircle2 size={14}/>,  label: 'Get Access!', color: '#00FF87' },
  ];
  return (
    <div className="flex items-center justify-center gap-1 flex-wrap mb-6">
      {steps.map((s, i) => (
        <div key={i} className="flex items-center gap-1">
          <div className="flex flex-col items-center gap-1">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ background: `${s.color}18`, color: s.color, border: `1px solid ${s.color}44` }}>
              {s.icon}
            </div>
            <span className="text-[9px] font-semibold" style={{ color: s.color }}>{s.label}</span>
          </div>
          {i < steps.length - 1 && (
            <span className="text-gray-700 text-lg mb-3 mx-0.5">→</span>
          )}
        </div>
      ))}
    </div>
  );
}

export default function PaymentTutorial() {
  const [active, setActive] = useState(0);
  const s = STEPS[active];

  return (
    <section className="mb-16">
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-2 bg-[var(--card)] border border-[var(--border)] rounded-full px-4 py-1.5 text-xs text-[var(--green)] font-medium mb-3 tracking-wider uppercase">
          📱 How to Pay via GCash
        </div>
        <h2 className="text-white mb-2"
          style={{ fontFamily: 'Bebas Neue,Impact,sans-serif', fontSize: '2rem', fontWeight: 700 }}>
          Step-by-Step GCash Guide
        </h2>
        <p className="text-gray-400 text-sm max-w-md mx-auto">
          Pay with GCash → Download your receipt → Upload here → Get instant access.
          No payment gateway — 100% goes to ministry.
        </p>
      </div>

      {/* Flow bar */}
      <FlowBar />

      {/* Step pills */}
      <div className="flex gap-2 justify-center flex-wrap mb-5">
        {STEPS.map((st, i) => (
          <button key={i} onClick={() => setActive(i)}
            className={`text-xs px-3 py-1.5 rounded-full font-semibold transition-all border ${
              active === i
                ? 'bg-[var(--green)] text-black border-[var(--green)]'
                : 'bg-transparent text-gray-400 border-[var(--border)] hover:border-[var(--green-dark)] hover:text-white'
            }`}>
            {st.label}
          </button>
        ))}
      </div>

      {/* Main card */}
      <div className="glass-card overflow-hidden max-w-3xl mx-auto" style={{ borderColor: 'rgba(0,255,135,0.2)' }}>
        <div className="flex flex-col md:flex-row">
          {/* Screenshot */}
          <div className="md:w-2/5 flex items-center justify-center p-6"
            style={{ background: 'linear-gradient(135deg,#051A0D,#0A2E18)' }}>
            <div className="relative">
              <div className="absolute -top-3 -right-3 w-8 h-8 rounded-full flex items-center justify-center text-black text-xs font-extrabold z-10"
                style={{ background: s.tc }}>
                {active + 1}
              </div>
              <div className="rounded-2xl overflow-hidden shadow-2xl border-2"
                style={{ borderColor: 'rgba(0,255,135,0.3)', maxWidth: 188, maxHeight: 332 }}>
                <img src={s.img} alt={s.title} className="w-full h-auto object-cover block" style={{ maxHeight: 332 }} />
              </div>
            </div>
          </div>

          {/* Text */}
          <div className="md:w-3/5 p-6 flex flex-col justify-center">
            <span className="inline-block text-xs font-bold px-3 py-1 rounded-full mb-3 w-fit"
              style={{ background: `${s.tc}22`, color: s.tc, border: `1px solid ${s.tc}44` }}>
              {s.tag}
            </span>
            <h3 className="text-xl font-bold text-white mb-3">{s.title}</h3>
            <div className="text-gray-300 text-sm leading-relaxed mb-6 space-y-2">
              {s.desc.split('\n').map((line, i) => (
                <p key={i}>{line}</p>
              ))}
            </div>

            {/* Navigation */}
            <div className="flex items-center gap-3">
              <button onClick={() => setActive(Math.max(0, active - 1))} disabled={active === 0}
                className="w-9 h-9 rounded-lg border border-[var(--border)] flex items-center justify-center text-gray-400 hover:text-white hover:border-[var(--green)] transition-colors disabled:opacity-30 disabled:cursor-not-allowed">
                <ChevronLeft size={16} />
              </button>
              <div className="flex gap-1.5 flex-1">
                {STEPS.map((_, i) => (
                  <button key={i} onClick={() => setActive(i)}
                    className="h-1.5 rounded-full transition-all duration-300"
                    style={{ width: active === i ? '24px' : '8px', background: active === i ? 'var(--green)' : 'var(--border)' }} />
                ))}
              </div>
              <button onClick={() => setActive(Math.min(STEPS.length - 1, active + 1))} disabled={active === STEPS.length - 1}
                className="w-9 h-9 rounded-lg border border-[var(--border)] flex items-center justify-center text-gray-400 hover:text-white hover:border-[var(--green)] transition-colors disabled:opacity-30 disabled:cursor-not-allowed">
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Quick summary below */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-5 max-w-3xl mx-auto">
        {[
          { emoji: '📱', label: 'GCash App',      sub: 'Any Philippine bank supported' },
          { emoji: '⬇️', label: 'Download Receipt', sub: 'Use GCash\'s Download button' },
          { emoji: '📤', label: 'Upload Here',     sub: 'Verified in seconds' },
          { emoji: '✅', label: 'Instant Access',  sub: 'File delivered immediately' },
        ].map((m, i) => (
          <div key={i} className="glass-card px-3 py-2.5 text-center">
            <span className="text-xl">{m.emoji}</span>
            <p className="text-white font-semibold text-xs mt-1">{m.label}</p>
            <p className="text-gray-500 text-[10px]">{m.sub}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
