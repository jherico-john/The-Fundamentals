'use client';
import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const STEPS = [
  {
    img: '/tutorial/t1.jpg',
    imgAlt: 'PayMongo QRPh QR code',
    label: 'Step 1',
    title: 'Scan the GCash QR Code',
    desc: 'On this page, you\'ll see our GCash QR code and number. Open your GCash app and scan the QR code, or tap "Send Money" and enter our GCash number manually to send the payment.',
    tag: 'On this page',
    tagColor: '#00FF87',
  },
  {
    img: '/tutorial/t1qrph.png',
    imgAlt: 'GCash app QR tab',
    label: 'Step 2',
    title: 'Open GCash → Tap QR Tab',
    desc: 'Open your GCash app. At the bottom navigation bar, tap the QR icon (center button). This opens the QR scanner screen where you can scan our GCash QR code.',
    tag: 'GCash App',
    tagColor: '#0070CD',
  },
  {
    img: '/tutorial/t2.jpg',
    imgAlt: 'GCash Generate QR button',
    label: 'Step 3',
    title: 'Scan or Enter Amount',
    desc: 'Point your camera at the QR code on this page to scan it. GCash will automatically fill in the recipient. Enter the exact product amount when prompted.',
    tag: 'GCash',
    tagColor: '#0070CD',
  },
  {
    img: '/tutorial/t3.jpg',
    imgAlt: 'GCash QR options',
    label: 'Step 4',
    title: 'Confirm the Payment',
    desc: 'Review the payment details — recipient name and amount. Make sure the amount is correct, then confirm the transaction in GCash.',
    tag: 'GCash',
    tagColor: '#0070CD',
  },
  {
    img: '/tutorial/t4.jpg',
    imgAlt: 'GCash scan QR',
    label: 'Step 5',
    title: 'Payment Sent Successfully',
    desc: 'GCash will show a success screen with your payment details. You\'ll need to save this receipt — tap the Download or Share icon to save the receipt screenshot to your phone.',
    tag: 'Save Receipt!',
    tagColor: '#FF9500',
  },
  {
    img: '/tutorial/t5.jpg',
    imgAlt: 'GCash payment confirmation',
    label: 'Step 6',
    title: 'Download Your GCash Receipt',
    desc: 'On the GCash success screen, tap "Download" at the bottom to save your receipt as an image. This receipt screenshot is what you\'ll upload on this checkout page.',
    tag: 'Download Receipt',
    tagColor: '#FF9500',
  },
  {
    img: '/tutorial/t6.jpg',
    imgAlt: 'GCash receipt downloaded',
    label: 'Step 7',
    title: 'Upload Receipt → Get Access!',
    desc: 'Come back to this page and tap the upload box. Select the GCash receipt screenshot from your gallery. Our system will verify it automatically and unlock your instant download. 🎉',
    tag: 'Upload Here!',
    tagColor: '#00FF87',
  },
];

export default function PaymentTutorial() {
  const [active, setActive] = useState(0);
  const step = STEPS[active];

  return (
    <section className="mb-16">
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-2 bg-[var(--card)] border border-[var(--border)] rounded-full px-4 py-1.5 text-xs text-[var(--green)] font-medium mb-3 tracking-wider uppercase">
          📱 How to Pay & Get Access
        </div>
        <h2 className="text-white mb-2" style={{ fontFamily: 'Bebas Neue, Impact, sans-serif', fontSize: '2rem', fontWeight: 700 }}>
          Step-by-Step Payment Guide
        </h2>
        <p className="text-gray-400 text-sm max-w-lg mx-auto">
          Pay via GCash, download your receipt, then upload it here for instant access.
        </p>
      </div>

      <div className="flex gap-2 justify-center flex-wrap mb-6">
        {STEPS.map((s, i) => (
          <button key={i} onClick={() => setActive(i)}
            className={`text-xs px-3 py-1.5 rounded-full font-semibold transition-all duration-200 border ${
              active === i ? 'bg-[var(--green)] text-black border-[var(--green)]' : 'bg-transparent text-gray-400 border-[var(--border)] hover:border-[var(--green-dark)] hover:text-white'
            }`}>
            {s.label}
          </button>
        ))}
      </div>

      <div className="glass-card overflow-hidden max-w-3xl mx-auto" style={{ borderColor: 'rgba(0,255,135,0.2)' }}>
        <div className="flex flex-col md:flex-row">
          <div className="md:w-2/5 flex items-center justify-center p-6"
            style={{ background: 'linear-gradient(135deg, #051A0D 0%, #0A2E18 100%)' }}>
            <div className="relative">
              <div className="absolute -top-3 -right-3 w-8 h-8 rounded-full flex items-center justify-center text-black text-xs font-extrabold z-10"
                style={{ background: step.tagColor }}>
                {active + 1}
              </div>
              <div className="rounded-2xl overflow-hidden shadow-2xl border-2"
                style={{ borderColor: 'rgba(0,255,135,0.3)', maxWidth: 190, maxHeight: 340 }}>
                <img src={step.img} alt={step.imgAlt} className="w-full h-auto object-cover block" style={{ maxHeight: 340 }} />
              </div>
            </div>
          </div>

          <div className="md:w-3/5 p-6 flex flex-col justify-center">
            <span className="inline-block text-xs font-bold px-3 py-1 rounded-full mb-3 w-fit"
              style={{ background: `${step.tagColor}22`, color: step.tagColor, border: `1px solid ${step.tagColor}44` }}>
              {step.tag}
            </span>
            <h3 className="text-xl font-bold text-white mb-3">{step.title}</h3>
            <p className="text-gray-300 text-sm leading-relaxed mb-6">{step.desc}</p>

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
    </section>
  );
}
