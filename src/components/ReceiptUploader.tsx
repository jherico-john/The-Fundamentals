'use client';
// ReceiptUploader — v4.1
// Changes: added QR Download button, cleaner GCash panel for mobile users.

import { useState, useRef, useCallback, useEffect } from 'react';
import {
  Upload, CheckCircle2, XCircle, Loader2, Download, AlertTriangle,
  Copy, Check, Smartphone, RefreshCw, ExternalLink, Info, RotateCcw, QrCode,
} from 'lucide-react';

interface Props {
  productSlug: string;
  productName: string;
  price: number;
  downloadPage: string;
}

type Stage = 'checking' | 'idle' | 'verifying' | 'success' | 'error';
interface VerifiedData {
  referenceNumber: string; amount: number; dateStr: string;
  token: string; productSlug: string; warnings?: string[]; testMode?: boolean;
}

const GCASH_NUM  = process.env.NEXT_PUBLIC_GCASH_NUMBER  || '09XX XXX XXXX';
const GCASH_NAME = process.env.NEXT_PUBLIC_GCASH_NAME    || 'J. Balasa';
const CUR        = process.env.NEXT_PUBLIC_CURRENCY      || 'PHP';
const EMAIL      = process.env.NEXT_PUBLIC_SUPPORT_EMAIL || 'jhericojohnbalasa@gmail.com';

export default function ReceiptUploader({ productSlug, productName, price, downloadPage }: Props) {
  const [stage, setStage]         = useState<Stage>('checking');
  const [drag, setDrag]           = useState(false);
  const [preview, setPreview]     = useState<string | null>(null);
  const [fname, setFname]         = useState('');
  const [error, setError]         = useState('');
  const [verified, setVerified]   = useState<VerifiedData | null>(null);
  const [copiedNum, setCopiedNum] = useState(false);
  const [dlDone, setDlDone]       = useState(false);
  const [resetting, setResetting] = useState(false);
  const [prog, setProg]           = useState(0);
  const fileRef = useRef<HTMLInputElement>(null);
  const progRef = useRef<NodeJS.Timeout | null>(null);

  // ── Persist purchase state per product ───────────────────────────────────────
  useEffect(() => {
    fetch(`/api/purchase-status?product=${productSlug}`)
      .then(r => r.json())
      .then(d => {
        if (d.purchased) {
          setVerified({
            referenceNumber: d.referenceNumber, amount: d.amount,
            dateStr: new Date(d.purchasedAt * 1000).toLocaleDateString('en-PH'),
            token: '', productSlug,
          });
          setStage('success'); setDlDone(true);
        } else { setStage('idle'); }
      }).catch(() => setStage('idle'));
  }, [productSlug]);

  const startProg = useCallback(() => {
    setProg(0);
    let p = 0;
    progRef.current = setInterval(() => {
      p += Math.random() * 7; if (p >= 90) { clearInterval(progRef.current!); p = 90; }
      setProg(Math.min(p, 90));
    }, 400);
  }, []);
  const endProg = useCallback(() => { if (progRef.current) clearInterval(progRef.current); setProg(100); }, []);
  useEffect(() => () => { if (progRef.current) clearInterval(progRef.current); }, []);

  const getAffCode = () => { const m = document.cookie.match(/affiliate_ref=([^;]+)/); return m ? m[1] : null; };

  const processFile = useCallback(async (file: File) => {
    setPreview(URL.createObjectURL(file)); setFname(file.name);
    setStage('verifying'); setError(''); setVerified(null); setDlDone(false);
    startProg();
    const form = new FormData();
    form.append('receipt', file);
    form.append('productSlug', productSlug);
    form.append('productName', productName);
    const ac = getAffCode(); if (ac) form.append('affiliateCode', ac);
    try {
      const res  = await fetch('/api/verify-receipt', { method: 'POST', body: form });
      endProg();
      const data = await res.json();
      if (!res.ok || !data.success) { setStage('error'); setError(data.error || 'Verification failed.'); return; }
      setVerified({ referenceNumber: data.data.referenceNumber, amount: data.data.amount, dateStr: data.data.dateStr, token: data.token, productSlug, warnings: data.warnings, testMode: data.testMode });
      setStage('success');
      triggerDownload(data.token);
    } catch { endProg(); setStage('error'); setError('Network error. Please check your connection and try again.'); }
  }, [productSlug, startProg, endProg]);

  const triggerDownload = async (token: string) => {
    if (!token) return;
    try {
      const res  = await fetch(`/api/download-token?token=${encodeURIComponent(token)}&product=${productSlug}`);
      const data = await res.json();
      if (!res.ok || !data.valid) { setError(`Download error: ${data.error}`); return; }
      setDlDone(true);
      if (data.fileUrl) {
        const a = document.createElement('a');
        a.href = data.fileUrl; a.download = `${productName.replace(/\s+/g,'-')}.zip`; a.target = '_blank';
        document.body.appendChild(a); a.click(); document.body.removeChild(a);
      }
      if (data.downloadPageUrl) setTimeout(() => { window.location.href = data.downloadPageUrl; }, 3000);
    } catch { setError('Download error. Use the button below to access your files.'); }
  };

  const reset = () => { setStage('idle'); setPreview(null); setFname(''); setError(''); setVerified(null); setDlDone(false); setProg(0); if (fileRef.current) fileRef.current.value = ''; };
  const buyAgain = async () => { setResetting(true); try { await fetch(`/api/purchase-status?product=${productSlug}`, { method: 'DELETE' }); } finally { setResetting(false); reset(); } };
  const copyNum = async () => { await navigator.clipboard.writeText(GCASH_NUM.replace(/\s/g,'')); setCopiedNum(true); setTimeout(() => setCopiedNum(false), 2000); };
  const downloadQR = () => {
    const a = document.createElement('a');
    a.href = '/gcash/qr.png'; a.download = 'GCash-QR-Jherico-Ministry.png';
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
  };

  if (stage === 'checking') return (
    <div className="glass-card p-12 flex flex-col items-center">
      <Loader2 size={28} className="text-[var(--green)] animate-spin mb-3" />
      <p className="text-gray-400 text-sm">Checking purchase status…</p>
    </div>
  );

  return (
    <div className="space-y-5">
      {/* ── STEP 1: GCash Payment Panel ── */}
      {stage !== 'success' && (
        <div className="glass-card p-6" style={{ borderColor: 'rgba(0,255,135,0.25)' }}>
          <div className="flex items-center gap-2 mb-5">
            <div className="w-7 h-7 rounded-full bg-[var(--green)] flex items-center justify-center text-black text-xs font-extrabold">1</div>
            <h3 className="font-bold text-white">Send Payment via GCash</h3>
          </div>

          <div className="grid sm:grid-cols-2 gap-5">
            {/* QR code + download button */}
            <div className="flex flex-col items-center">
              <div className="rounded-2xl border-2 border-[var(--border)] bg-white p-3 mb-3" style={{ width: 184, height: 184 }}>
                {/* Replace the inner div below with:
                    <img src="/gcash/qr.png" className="w-full h-full object-contain" alt="GCash QR" />
                    once you've saved your GCash QR at /public/gcash/qr.png */}
                <div className="w-full h-full flex flex-col items-center justify-center bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
                  {/*<QrCode size={44} className="text-[#0070CD] mb-2" />*/}
                  <img src="/gcash/qr.png" className="w-full h-full object-contain" alt="GCash QR" />
                  {/*
                  <p className="text-[10px] text-gray-500 text-center px-2 leading-tight">
                    Add GCash QR at<br /><code className="text-[9px]">/public/gcash/qr.png</code>
                  </p>
                  */}
                </div>
              </div>

              {/* ── DOWNLOAD QR BUTTON ── */}
              <button
                onClick={downloadQR}
                className="flex items-center gap-1.5 text-xs font-semibold text-[var(--green)] border border-[var(--green-deeper)] bg-[var(--green-deeper)] bg-opacity-20 hover:bg-opacity-30 px-3 py-1.5 rounded-lg transition-colors mb-2"
              >
                <Download size={13} /> Download QR Code
              </button>
              <p className="text-[10px] text-gray-500 text-center">Save to phone → open GCash → scan from gallery</p>
            </div>

            {/* Number + instructions */}
            <div className="flex flex-col justify-center space-y-3">
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">GCash Account Name</p>
                <p className="text-white font-bold text-base">{GCASH_NAME}</p>
              </div>

              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">GCash Number</p>
                <div className="flex items-center gap-2">
                  <span className="text-[var(--green)] font-mono font-bold text-xl tracking-wide">{GCASH_NUM}</span>
                  <button
                    onClick={copyNum}
                    className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg border border-[var(--border)] text-gray-300 hover:text-white hover:border-[var(--green)] transition-colors"
                    title="Copy number"
                  >
                    {copiedNum ? <><Check size={12} className="text-[var(--green)]" /> Copied!</> : <><Copy size={12} /> Copy</>}
                  </button>
                </div>
              </div>

              <div className="bg-[var(--bg)] rounded-xl p-3 border border-[var(--border)]">
                <p className="text-xs text-gray-400 mb-0.5">Send exactly:</p>
                <p className="text-2xl font-extrabold text-[var(--green)]">{CUR} {price.toLocaleString()}</p>
              </div>

              <div className="flex items-start gap-2 text-xs text-yellow-300 bg-yellow-950 bg-opacity-40 border border-yellow-800 rounded-lg p-2.5">
                <AlertTriangle size={12} className="flex-shrink-0 mt-0.5" />
                <span>Send the <strong>exact amount</strong> — wrong amounts fail verification.</span>
              </div>
            </div>
          </div>

          {/* Mobile tip row */}
          <div className="mt-4 pt-4 border-t border-[var(--border)] grid grid-cols-2 gap-2">
            <div className="flex items-center gap-2 text-xs text-gray-400 bg-[var(--bg)] rounded-lg px-3 py-2">
              <QrCode size={13} className="text-[var(--green)]" />
              <span><strong className="text-white">Option A:</strong> Scan our QR above in GCash</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-gray-400 bg-[var(--bg)] rounded-lg px-3 py-2">
              <Copy size={13} className="text-[var(--green)]" />
              <span><strong className="text-white">Option B:</strong> Copy number → GCash → Send Money</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-gray-400 bg-[var(--bg)] rounded-lg px-3 py-2 col-span-2">
              <Download size={13} className="text-[var(--green)]" />
              <span><strong className="text-white">On mobile:</strong> Download our QR → open GCash → scan from gallery</span>
            </div>
          </div>

          <div className="mt-3 flex items-center gap-2 text-xs text-gray-400">
            <Smartphone size={13} className="text-[var(--green)]" />
            <span>After paying, tap <strong className="text-white">Download</strong> at the bottom of the GCash success screen to save your receipt.</span>
          </div>
        </div>
      )}

      {/* ── STEP 2: Upload Receipt ── */}
      <div className="glass-card p-6" style={{ borderColor: stage === 'success' ? 'rgba(0,255,135,0.5)' : undefined }}>
        {stage !== 'success' && (
          <div className="flex items-center gap-2 mb-4">
            <div className="w-7 h-7 rounded-full bg-[var(--border)] text-gray-300 flex items-center justify-center text-xs font-extrabold">2</div>
            <h3 className="font-bold text-white">Upload Your GCash Receipt</h3>
          </div>
        )}

        {/* Idle */}
        {stage === 'idle' && (
          <div
            className={`upload-zone p-10 text-center ${drag ? 'drag-over' : ''}`}
            onClick={() => fileRef.current?.click()}
            onDragOver={e => { e.preventDefault(); setDrag(true); }}
            onDragLeave={() => setDrag(false)}
            onDrop={e => { e.preventDefault(); setDrag(false); const f = e.dataTransfer.files[0]; if (f) processFile(f); }}
          >
            <Upload size={36} className="text-[var(--green)] mx-auto mb-3" />
            <p className="text-white font-semibold mb-1">Tap to upload your GCash receipt</p>
            <p className="text-gray-500 text-xs">or drag & drop · JPG, PNG, WEBP · Max 10MB</p>
          </div>
        )}

        {/* Verifying */}
        {stage === 'verifying' && (
          <div className="space-y-4">
            {preview && (
              <div className="flex gap-4 items-start">
                <div className="rounded-xl overflow-hidden border border-[var(--border)] bg-white flex-shrink-0" style={{ width: 72, height: 96 }}>
                  <img src={preview} alt="Receipt" className="w-full h-full object-cover" />
                </div>
                <div className="flex-1">
                  <p className="text-white text-sm font-medium truncate mb-2">{fname}</p>
                  <div className="w-full h-2 bg-[var(--border)] rounded-full overflow-hidden">
                    <div className="h-full bg-[var(--green)] rounded-full transition-all duration-300" style={{ width: `${prog}%` }} />
                  </div>
                  <p className="text-[var(--green)] text-xs mt-1">{Math.round(prog)}% — scanning & verifying…</p>
                </div>
              </div>
            )}
            <div className="flex items-center gap-3 p-3 bg-[var(--bg)] rounded-xl border border-[var(--border)]">
              <Loader2 size={18} className="text-[var(--green)] animate-spin" />
              <div>
                <p className="text-white text-sm font-medium">Verifying GCash receipt…</p>
                <p className="text-gray-500 text-xs">Scanning QR · Checking amount · Anti-editing validation</p>
              </div>
            </div>
          </div>
        )}

        {/* Error */}
        {stage === 'error' && (
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              {preview && (
                <div className="rounded-xl overflow-hidden border border-[var(--border)] bg-white flex-shrink-0" style={{ width: 60, height: 80, opacity: 0.5 }}>
                  <img src={preview} alt="Receipt" className="w-full h-full object-cover" />
                </div>
              )}
              <div className="flex-1">
                <div className="flex items-start gap-2 p-3 bg-red-950 bg-opacity-50 border border-red-800 rounded-xl">
                  <XCircle size={18} className="text-red-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-red-300 font-semibold text-sm mb-1">Verification Failed</p>
                    <p className="text-red-200 text-xs leading-relaxed">{error}</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="p-3 bg-yellow-950 bg-opacity-40 border border-yellow-800 rounded-xl text-xs text-yellow-300">
              <strong>Already paid?</strong> Email{' '}
              <a href={`mailto:${EMAIL}?subject=Paid GCash but receipt failed - ${productName}`} className="underline font-semibold">{EMAIL}</a>{' '}
              with your GCash reference number and receipt screenshot.
            </div>
            <button onClick={reset} className="w-full py-3 rounded-xl border border-[var(--border)] text-gray-300 hover:text-white hover:border-[var(--green)] transition-colors text-sm flex items-center justify-center gap-2">
              <RefreshCw size={15} /> Try Again
            </button>
          </div>
        )}

        {/* Success */}
        {stage === 'success' && verified && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-4 bg-green-950 bg-opacity-50 border border-[var(--green-deeper)] rounded-xl">
              <CheckCircle2 size={28} className="text-[var(--green)] flex-shrink-0" />
              <div>
                <p className="text-[var(--green)] font-bold">
                  {verified.token === '' ? 'Already Purchased ✅' : 'Receipt Verified! ✅'}
                </p>
                <p className="text-gray-300 text-xs">
                  {verified.token === '' ? `You already purchased ${productName}. Use the button below to download.` : 'GCash payment confirmed.'}
                </p>
              </div>
            </div>

            {verified.testMode && (
              <div className="flex items-center gap-2 p-2 bg-blue-950 bg-opacity-50 border border-blue-700 rounded-lg text-xs text-blue-300">
                <Info size={12} /> TEST MODE — set TEST_MODE=false in production.
              </div>
            )}

            {verified.warnings?.filter(Boolean).map((w, i) => (
              <div key={i} className="flex items-center gap-2 text-xs text-yellow-400 bg-yellow-950 bg-opacity-30 rounded-lg px-3 py-1.5">
                <AlertTriangle size={11} /> {w}
              </div>
            ))}

            <div className="grid grid-cols-3 gap-2">
              {[
                { l: 'Ref No.', v: verified.referenceNumber },
                { l: 'Amount', v: verified.amount > 0 ? `₱${verified.amount.toFixed(2)}` : 'N/A' },
                { l: 'Date', v: verified.dateStr },
              ].map(f => (
                <div key={f.l} className="bg-[var(--bg)] rounded-xl p-3 border border-[var(--border)] text-center">
                  <p className="text-gray-500 text-[10px] uppercase mb-1">{f.l}</p>
                  <p className="text-white font-semibold text-xs truncate">{f.v}</p>
                </div>
              ))}
            </div>

            <a href={downloadPage} target="_blank" rel="noopener noreferrer"
              className="btn-shimmer w-full py-4 rounded-xl font-bold text-black flex items-center justify-center gap-2">
              <ExternalLink size={16} /> Go to Download Page
            </a>

            {dlDone && (
              <div className="flex items-center gap-2 p-3 bg-[var(--card)] border border-[var(--border)] rounded-xl text-xs text-gray-300">
                <Download size={14} className="text-[var(--green)]" />
                File download was triggered — check your browser's download bar.
              </div>
            )}

            {/* "Didn't see download" notice */}
            <div className="flex items-start gap-2 p-3 bg-yellow-950 bg-opacity-40 border border-yellow-800 rounded-lg text-xs text-yellow-300">
              <AlertTriangle size={13} className="flex-shrink-0 mt-0.5" />
              <span>
                <strong>Didn't see a download start?</strong> A popup blocker may have stopped it.
                Click the green button above or go directly to:{' '}
                <a href={downloadPage} target="_blank" rel="noopener noreferrer" className="underline font-semibold text-yellow-200 break-all">{downloadPage}</a>.
                Still stuck? Email <a href={`mailto:${EMAIL}`} className="underline font-semibold">{EMAIL}</a> with your Ref No.
              </span>
            </div>

            <button onClick={buyAgain} disabled={resetting}
              className="w-full py-2 rounded-xl border border-[var(--border)] text-gray-500 hover:text-gray-300 transition-colors text-xs flex items-center justify-center gap-2">
              <RotateCcw size={12} /> {resetting ? 'Resetting…' : 'Want to buy again? Click here to start a new purchase'}
            </button>
          </div>
        )}

        <input ref={fileRef} type="file" accept="image/*,.jfif" className="hidden"
          onChange={e => { const f = e.target.files?.[0]; if (f) processFile(f); }} />
      </div>

      {stage === 'idle' && (
        <div className="flex items-start gap-2 text-xs text-gray-500 px-1">
          <Info size={12} className="flex-shrink-0 mt-0.5 text-[var(--green-deeper)]" />
          <span>
            Upload your GCash receipt screenshot — must clearly show the <strong className="text-gray-400">amount</strong>,{' '}
            <strong className="text-gray-400">reference number</strong>, and <strong className="text-gray-400">date</strong>.
            Do not crop or edit. Use the Download button in the GCash app, not a phone screenshot.
          </span>
        </div>
      )}
    </div>
  );
}
