'use client';
import { useState } from 'react';
import { AlertTriangle, Mail, ChevronDown, ChevronUp, Send, CheckCircle2 } from 'lucide-react';

const FAQ = [
  { q:'Receipt upload fails or shows "Invalid receipt"', a:'Upload the original GCash receipt screenshot — do not crop or edit it. The receipt must clearly show the amount, reference number, and date.' },
  { q:'Amount mismatch error', a:'The amount on your receipt does not match the product price. Send the exact amount and try again. If you already paid, email us — we verify manually.' },
  { q:'"Reference number already used" error', a:'Each GCash receipt can only be used once for one download. If this is your first time using it, email us immediately.' },
  { q:'Didn\'t see a file download start', a:'A popup blocker likely stopped it. Click the download page button, or visit the Systeme.io link directly. Email us with your ref number if still stuck.' },
  { q:'File download expired', a:'Download tokens expire in 10 minutes. Re-upload your receipt to get a fresh download link.' },
  { q:'Page crashed or showed a server error', a:'Try a different browser or device. If the problem continues, email us with your GCash reference number and we\'ll send the file directly.' },
];

const SUBJECTS = [
  {v:'no-download', l:'✅ Paid via GCash but could not download the file'},
  {v:'receipt-error', l:'❌ Receipt upload or verification error'},
  {v:'wrong-amount', l:'💸 Paid wrong amount by mistake'},
  {v:'page-error', l:'🔴 Page crash or technical error'},
  {v:'other', l:'❓ Other issue'},
];

const SUPPORT_EMAIL = process.env.NEXT_PUBLIC_SUPPORT_EMAIL || 'jhericojohnbalasa@gmail.com';

export default function SupportSection() {
  const [open, setOpen] = useState<number|null>(null);
  const [form, setForm] = useState({name:'', subject:'no-download', description:'', refNo:''});
  const [sent, setSent] = useState(false);

  const buildMailto = ()=>{
    const sl = SUBJECTS.find(s=>s.v===form.subject)?.l||'';
    const body = `Name: ${form.name}\nIssue: ${sl}\nRef No.: ${form.refNo||'N/A'}\n\nDescription:\n${form.description}\n\n[Attach your GCash receipt screenshot]`;
    return `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(`[Ministry] ${sl}`)}&body=${encodeURIComponent(body)}`;
  };

  const handleSend = (e:React.MouseEvent)=>{ e.preventDefault(); if(!form.name||!form.description) return; window.location.href=buildMailto(); setTimeout(()=>setSent(true),800); };

  return (
    <section className="mb-16">
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-2 bg-yellow-950 bg-opacity-60 border border-yellow-800 rounded-full px-4 py-1.5 text-xs text-yellow-400 font-medium mb-3 uppercase tracking-wider">⚠️ Important Notice</div>
        <h2 className="text-white mb-2" style={{fontFamily:'Bebas Neue,Impact,sans-serif',fontSize:'2rem',fontWeight:700}}>Having a Problem? We've Got You.</h2>
        <p className="text-gray-400 text-sm max-w-md mx-auto">If anything goes wrong after payment — don't panic. Email us and we'll resolve within 1 hour.</p>
      </div>

      <div className="max-w-4xl mx-auto mb-6">
        <div className="border border-yellow-700 bg-yellow-950 bg-opacity-40 rounded-xl p-5">
          <div className="flex gap-3">
            <AlertTriangle size={20} className="text-yellow-400 flex-shrink-0 mt-0.5"/>
            <div>
              <p className="text-yellow-300 font-semibold text-sm mb-2">If you paid via GCash but the file didn't download:</p>
              <ol className="text-yellow-200 text-xs space-y-1 list-decimal list-inside">
                <li><strong>Do NOT pay again</strong> — your first payment was received.</li>
                <li>Take a full screenshot of your GCash receipt (ref number, amount, date visible).</li>
                <li>Email <strong>{SUPPORT_EMAIL}</strong> with subject: <em>"Paid but no download"</em></li>
                <li>Include: your name, GCash reference number, and attach the receipt screenshot.</li>
                <li>We will verify and send your download link within 1 hour.</li>
              </ol>
            </div>
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
        <div>
          <h3 className="font-bold text-white flex items-center gap-2 mb-4"><AlertTriangle size={16} className="text-yellow-400"/> Common Issues & Fixes</h3>
          <div className="space-y-2">
            {FAQ.map((f,i)=>(
              <div key={i} className="glass-card overflow-hidden">
                <button onClick={()=>setOpen(open===i?null:i)} className="w-full flex items-start justify-between gap-3 p-4 text-left">
                  <span className="text-sm font-semibold text-white leading-snug">{f.q}</span>
                  {open===i?<ChevronUp size={16} className="text-[var(--green)] flex-shrink-0 mt-0.5"/>:<ChevronDown size={16} className="text-gray-400 flex-shrink-0 mt-0.5"/>}
                </button>
                {open===i && <div className="px-4 pb-4 text-gray-400 text-xs leading-relaxed">{f.a}</div>}
              </div>
            ))}
          </div>
        </div>

        <div>
          <h3 className="font-bold text-white flex items-center gap-2 mb-4"><Mail size={16} className="text-[var(--green)]"/> Contact Support</h3>
          {sent ? (
            <div className="glass-card p-8 flex flex-col items-center text-center">
              <CheckCircle2 size={40} className="text-[var(--green)] mb-3"/>
              <p className="text-white font-bold mb-1">Email Opened!</p>
              <p className="text-gray-400 text-sm">Attach your GCash receipt screenshot before sending.</p>
              <button onClick={()=>setSent(false)} className="mt-4 text-xs text-[var(--green)] hover:underline">Send another</button>
            </div>
          ) : (
            <div className="glass-card p-5 space-y-4">
              <div><label className="block text-xs text-gray-400 mb-1.5 font-medium">Your Name *</label><input type="text" value={form.name} onChange={e=>setForm({...form,name:e.target.value})} placeholder="Juan dela Cruz" className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-lg px-3 py-2.5 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-[var(--green)] transition-colors"/></div>
              <div><label className="block text-xs text-gray-400 mb-1.5 font-medium">Issue Type *</label><select value={form.subject} onChange={e=>setForm({...form,subject:e.target.value})} className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-[var(--green)] transition-colors">{SUBJECTS.map(s=><option key={s.v} value={s.v}>{s.l}</option>)}</select></div>
              <div><label className="block text-xs text-gray-400 mb-1.5 font-medium">GCash Reference No.</label><input type="text" value={form.refNo} onChange={e=>setForm({...form,refNo:e.target.value})} placeholder="e.g. 9041 784 498164" className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-lg px-3 py-2.5 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-[var(--green)] transition-colors"/></div>
              <div><label className="block text-xs text-gray-400 mb-1.5 font-medium">Describe the issue *</label><textarea value={form.description} onChange={e=>setForm({...form,description:e.target.value})} rows={4} placeholder="What happened? When? What did you try?" className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-lg px-3 py-2.5 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-[var(--green)] transition-colors resize-none"/></div>
              <div className="bg-yellow-950 bg-opacity-40 border border-yellow-800 rounded-lg p-3 text-xs text-yellow-300">📎 <strong>Attach your GCash receipt screenshot</strong> to the email before sending.</div>
              <button onClick={handleSend} disabled={!form.name||!form.description} className="btn-shimmer w-full py-3 rounded-xl font-bold text-black flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
                <Send size={14}/> Send to {SUPPORT_EMAIL}
              </button>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
