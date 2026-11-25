'use client';
// SupportSection — v6: "Having a Problem?" (position on the page unchanged).
// Theme-aware, no emojis, wording updated for the single-redirect flow.
import { useState } from 'react';
import { AlertTriangle, Mail, ChevronDown, ChevronUp, Send, CheckCircle2 } from 'lucide-react';

const FAQ = [
  { q: 'My receipt upload fails or says "Invalid receipt"', a: 'Upload the complete receipt from your payment app. Do not crop or edit it. It must show the amount, account number or name, fee and reference number. The message on screen tells you exactly what is missing and how to fix it.' },
  { q: 'Amount mismatch error', a: 'The amount on your receipt does not match the product price. Send the exact price shown on this page and try again. If you already paid, email us and we will check it by hand.' },
  { q: '"Reference number already used" error', a: 'Each payment receipt can only be used once. If this is your first time using it, email us right away with the reference number.' },
  { q: 'I was not taken to the download page', a: 'Tap the "Go to My Download Page" button that appears after your receipt is approved. It opens in the same window. If the button is gone, open this page again. Your purchase is remembered on this device and the button comes back.' },
  { q: 'I closed the page before I downloaded my files', a: 'Open this page again on the same phone or computer. Your purchase is remembered, so you can tap "Go to My Download Page" without paying again. Using a different device? Email us with your reference number.' },
  { q: 'The page crashed or showed a server error', a: 'Try a different browser or device. If the problem continues, email us with your reference number and we will send your download link directly.' },
];

const SUBJECTS = [
  { v: 'no-download', l: 'I paid but could not reach my downloads' },
  { v: 'receipt-error', l: 'Receipt upload or verification error' },
  { v: 'wrong-amount', l: 'I paid the wrong amount by mistake' },
  { v: 'page-error', l: 'Page crash or technical error' },
  { v: 'other', l: 'Other issue' },
];

const SUPPORT_EMAIL = process.env.NEXT_PUBLIC_SUPPORT_EMAIL || 'jhericojohnbalasa@gmail.com';

export default function SupportSection() {
  const [open, setOpen] = useState<number | null>(null);
  const [form, setForm] = useState({ name: '', subject: 'no-download', description: '', refNo: '' });
  const [sent, setSent] = useState(false);

  const buildMailto = () => {
    const sl = SUBJECTS.find(s => s.v === form.subject)?.l || '';
    const body = `Name: ${form.name}\nIssue: ${sl}\nRef No.: ${form.refNo || 'N/A'}\n\nDescription:\n${form.description}\n\n[Attach your payment receipt image]`;
    return `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(`[Ministry] ${sl}`)}&body=${encodeURIComponent(body)}`;
  };

  const handleSend = (e: React.MouseEvent) => { e.preventDefault(); if (!form.name || !form.description) return; window.location.href = buildMailto(); setTimeout(() => setSent(true), 800); };

  return (
    <section className="mb-14 section-anchor" id="help" aria-labelledby="help-heading" data-testid="support-section">
      <div className="text-center mb-8">
        <h2 id="help-heading" className="text-2xl md:text-3xl font-bold text-fg mb-2">Having a Problem?</h2>
        <p className="text-fg2 max-w-md mx-auto">If something goes wrong after you pay, do not worry. Email us and we will help you within 1 hour.</p>
      </div>

      <div className="max-w-4xl mx-auto mb-6">
        <div className="alert alert-warn p-5">
          <div className="flex gap-3">
            <AlertTriangle size={20} className="flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold mb-2">If you paid but could not reach your downloads:</p>
              <ol className="space-y-1 list-decimal list-inside">
                <li><strong>Do not pay again.</strong> Your first payment was received.</li>
                <li>Take a full screenshot of your receipt (reference number, amount and date must be visible).</li>
                <li>Email <strong>{SUPPORT_EMAIL}</strong> with the subject: <em>&quot;Paid but no download&quot;</em></li>
                <li>Include your name and reference number, and attach the receipt screenshot.</li>
                <li>We will check it and send your download link within 1 hour.</li>
              </ol>
            </div>
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
        <div>
          <h3 className="font-bold text-fg text-lg mb-4">Common issues and fixes</h3>
          <div className="space-y-2">
            {FAQ.map((f, i) => (
              <div key={i} className="card overflow-hidden">
                <button onClick={() => setOpen(open === i ? null : i)} aria-expanded={open === i}
                  className="w-full flex items-start justify-between gap-3 p-4 text-left min-h-[48px]">
                  <span className="text-base font-semibold text-fg leading-snug">{f.q}</span>
                  {open === i ? <ChevronUp size={18} className="text-accent flex-shrink-0 mt-0.5" /> : <ChevronDown size={18} className="text-muted flex-shrink-0 mt-0.5" />}
                </button>
                {open === i && <div className="px-4 pb-4 text-fg2 text-base leading-relaxed">{f.a}</div>}
              </div>
            ))}
          </div>
        </div>

        <div>
          <h3 className="font-bold text-fg text-lg flex items-center gap-2 mb-4"><Mail size={18} className="text-accent" />Contact support</h3>
          {sent ? (
            <div className="card p-8 flex flex-col items-center text-center">
              <CheckCircle2 size={38} className="text-accent mb-3" />
              <p className="text-fg font-bold mb-1">Your email app opened</p>
              <p className="text-fg2">Attach your payment receipt image before you send it.</p>
              <button onClick={() => setSent(false)} className="mt-4 text-sm text-accent underline">Send another</button>
            </div>
          ) : (
            <div className="card p-5 space-y-4">
              <div>
                <label htmlFor="sup-name" className="block text-sm text-fg2 mb-1.5 font-medium">Your name *</label>
                <input id="sup-name" type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Juan dela Cruz" className="field" autoComplete="name" />
              </div>
              <div>
                <label htmlFor="sup-subject" className="block text-sm text-fg2 mb-1.5 font-medium">What is the problem? *</label>
                <select id="sup-subject" value={form.subject} onChange={e => setForm({ ...form, subject: e.target.value })} className="field">
                  {SUBJECTS.map(s => <option key={s.v} value={s.v}>{s.l}</option>)}
                </select>
              </div>
              <div>
                <label htmlFor="sup-ref" className="block text-sm text-fg2 mb-1.5 font-medium">Reference number (if you have it)</label>
                <input id="sup-ref" type="text" value={form.refNo} onChange={e => setForm({ ...form, refNo: e.target.value })} placeholder="e.g. 9041 784 498164" className="field" />
              </div>
              <div>
                <label htmlFor="sup-desc" className="block text-sm text-fg2 mb-1.5 font-medium">Tell us what happened *</label>
                <textarea id="sup-desc" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={4} placeholder="What happened? When? What did you try?" className="field resize-none" />
              </div>
              <p className="alert alert-warn"><strong>Remember to attach your payment receipt image</strong> to the email before sending.</p>
              <button onClick={handleSend} disabled={!form.name || !form.description} className="btn-primary w-full text-base">
                <Send size={15} /> Send to {SUPPORT_EMAIL}
              </button>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
