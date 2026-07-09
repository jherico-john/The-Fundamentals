'use client';
import { useState } from 'react';
import { Mail, AlertTriangle, Send, CheckCircle2, ChevronDown, ChevronUp } from 'lucide-react';

const COMMON_ERRORS = [
  {
    title: 'Receipt upload fails or shows "Invalid receipt"',
    desc: 'Make sure you upload a screenshot of the GCash payment receipt (not a photo of a screen). The receipt must clearly show: the amount, reference number, and date. Avoid cropping or editing the screenshot.',
  },
  {
    title: 'Amount mismatch error',
    desc: `The amount on your GCash receipt doesn't match the product price. This can happen if you sent the wrong amount. Contact us with your receipt — if the payment is confirmed, we'll process your download manually within 1 hour.`,
  },
  {
    title: 'Receipt is too old (date error)',
    desc: 'Receipts must be from within the last 3 days. If your receipt is older, contact us with proof of payment and we\'ll verify manually.',
  },
  {
    title: '"Reference number already used" error',
    desc: 'Each GCash receipt can only be used once. If you are sharing a receipt that was already used by another person, this will be rejected. Each purchase requires a unique payment.',
  },
  {
    title: 'File did not download after receipt verified',
    desc: 'Your download link expires after 10 minutes. If it expired, you can re-upload your receipt to get a new download link. If the problem persists, contact us.',
  },
  {
    title: 'Page shows error or crashes during upload',
    desc: 'This can be caused by a slow connection or a very large image file. Try compressing your screenshot or use a different browser. If the issue continues, email us your receipt and we\'ll send the file directly.',
  },
];

const SUBJECTS = [
  { value: 'no-download', label: '✅ Paid via GCash but could not download the file' },
  { value: 'receipt-error', label: '❌ Receipt upload or verification error' },
  { value: 'wrong-amount', label: '💸 Paid wrong amount by mistake' },
  { value: 'page-error', label: '🔴 Page crash or technical error' },
  { value: 'other', label: '❓ Other issue' },
];

export default function SupportSection() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [form, setForm] = useState({ name: '', subject: 'no-download', description: '', refNo: '' });
  const [sent, setSent] = useState(false);

  const SUPPORT_EMAIL = process.env.NEXT_PUBLIC_SUPPORT_EMAIL || 'jhericojohnbalasa@gmail.com';
  const subjectLabel = SUBJECTS.find((s) => s.value === form.subject)?.label || '';

  const buildMailto = () => {
    const body = [
      `Name: ${form.name}`,
      `Issue: ${subjectLabel}`,
      `GCash Reference No.: ${form.refNo || 'N/A'}`,
      ``,
      `Description:`,
      form.description,
      ``,
      `[IMPORTANT: Please attach a screenshot of your GCash receipt to this email]`,
    ].join('\n');
    return `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(`[Ministry Checkout] ${subjectLabel}`)}&body=${encodeURIComponent(body)}`;
  };

  const handleSend = (e: React.MouseEvent) => {
    e.preventDefault();
    if (!form.name || !form.description) return;
    window.location.href = buildMailto();
    setTimeout(() => setSent(true), 800);
  };

  return (
    <section className="mb-16">
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-2 bg-yellow-950 bg-opacity-60 border border-yellow-800 rounded-full px-4 py-1.5 text-xs text-yellow-400 font-medium mb-3 tracking-wider uppercase">
          ⚠️ Important Notice
        </div>
        <h2 className="text-white mb-2" style={{ fontFamily: 'Bebas Neue, Impact, sans-serif', fontSize: '2rem', fontWeight: 700 }}>
          Having a Problem? We've Got You.
        </h2>
        <p className="text-gray-400 text-sm max-w-lg mx-auto">
          If anything goes wrong after payment — don't worry. Email us and we'll resolve it within 1 hour.
        </p>
      </div>

      {/* Important notice banner */}
      <div className="max-w-4xl mx-auto mb-6">
        <div className="border border-yellow-700 bg-yellow-950 bg-opacity-40 rounded-xl p-5">
          <div className="flex gap-3">
            <AlertTriangle size={20} className="text-yellow-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-yellow-300 font-semibold text-sm mb-2">
                If you paid via GCash but the receipt upload fails or the file doesn't download:
              </p>
              <ol className="text-yellow-200 text-xs space-y-1.5 list-decimal list-inside">
                <li>Do <strong>NOT</strong> pay again — your first payment was received.</li>
                <li>Take a screenshot of your GCash receipt showing the reference number, amount, and date.</li>
                <li>Email us at <strong>{SUPPORT_EMAIL}</strong> with the subject: <em>"Paid but no download"</em></li>
                <li>Include: your name, GCash reference number, and attach the receipt screenshot.</li>
                <li>We will manually verify and send you the download link within 1 hour.</li>
              </ol>
            </div>
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
        {/* FAQ */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle size={16} className="text-yellow-400" />
            <h3 className="font-bold text-white">Common Issues & Fixes</h3>
          </div>
          <div className="space-y-2">
            {COMMON_ERRORS.map((err, i) => (
              <div key={i} className="glass-card overflow-hidden">
                <button onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full flex items-start justify-between gap-3 p-4 text-left">
                  <span className="text-sm font-semibold text-white leading-snug">{err.title}</span>
                  {openFaq === i
                    ? <ChevronUp size={16} className="text-[var(--green)] flex-shrink-0 mt-0.5" />
                    : <ChevronDown size={16} className="text-gray-400 flex-shrink-0 mt-0.5" />}
                </button>
                {openFaq === i && (
                  <div className="px-4 pb-4">
                    <p className="text-gray-400 text-xs leading-relaxed">{err.desc}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Contact Form */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Mail size={16} className="text-[var(--green)]" />
            <h3 className="font-bold text-white">Contact Support</h3>
          </div>

          {sent ? (
            <div className="glass-card p-8 flex flex-col items-center text-center">
              <CheckCircle2 size={44} className="text-[var(--green)] mb-3" />
              <p className="text-white font-bold text-lg mb-1">Email Opened!</p>
              <p className="text-gray-400 text-sm">Please attach your GCash receipt screenshot before sending.</p>
              <button onClick={() => setSent(false)} className="mt-4 text-xs text-[var(--green)] hover:underline">Send another message</button>
            </div>
          ) : (
            <div className="glass-card p-5 space-y-4">
              <div>
                <label className="block text-xs text-gray-400 mb-1.5 font-medium">Your Name *</label>
                <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Juan dela Cruz"
                  className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-lg px-3 py-2.5 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-[var(--green)] transition-colors" />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1.5 font-medium">Issue Type *</label>
                <select value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })}
                  className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-[var(--green)] transition-colors">
                  {SUBJECTS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1.5 font-medium">GCash Reference No.</label>
                <input type="text" value={form.refNo} onChange={(e) => setForm({ ...form, refNo: e.target.value })}
                  placeholder="e.g. 9041 784 498164"
                  className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-lg px-3 py-2.5 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-[var(--green)] transition-colors" />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1.5 font-medium">Describe the issue *</label>
                <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="What happened? When did it occur? What did you try?"
                  rows={4}
                  className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-lg px-3 py-2.5 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-[var(--green)] transition-colors resize-none" />
              </div>
              <div className="bg-yellow-950 bg-opacity-40 border border-yellow-800 rounded-lg p-3 text-xs text-yellow-300">
                📎 <strong>Attach your GCash receipt screenshot</strong> to the email before sending — this is required for us to verify your payment.
              </div>
              <button onClick={handleSend} disabled={!form.name || !form.description}
                className="btn-shimmer w-full py-3 rounded-xl font-bold text-black flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed hover:scale-[1.01] active:scale-95 transition-transform">
                <Send size={15} /> Send to {SUPPORT_EMAIL}
              </button>
              <p className="text-center text-[10px] text-gray-600">
                Or manually email <a href={`mailto:${SUPPORT_EMAIL}`} className="text-[var(--green)] hover:underline">{SUPPORT_EMAIL}</a>
              </p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
