'use client';
// src/components/ReceiptUploader.tsx
// The heart of v3 — GCash QR display + receipt upload + verification + download trigger.

import { useState, useRef, useCallback, useEffect } from 'react';
import {
  Upload, CheckCircle2, XCircle, Loader2, Download, AlertTriangle,
  Copy, Check, Smartphone, QrCode, RefreshCw, ExternalLink, Info,
} from 'lucide-react';

type Stage = 'idle' | 'uploading' | 'verifying' | 'success' | 'error';

interface VerifiedData {
  referenceNumber: string;
  amount: number;
  dateStr: string;
  token: string;
  warnings?: string[];
  testMode?: boolean;
}

const GCASH_NUMBER = process.env.NEXT_PUBLIC_GCASH_NUMBER || '09XX XXX XXXX';
const GCASH_NAME = process.env.NEXT_PUBLIC_GCASH_NAME || 'J. Balasa';
const PRICE = parseInt(process.env.NEXT_PUBLIC_PRODUCT_PRICE || '497', 10);
const CURRENCY = process.env.NEXT_PUBLIC_CURRENCY || 'PHP';
const SUPPORT_EMAIL = process.env.NEXT_PUBLIC_SUPPORT_EMAIL || 'jhericojohnbalasa@gmail.com';
const DOWNLOAD_PAGE = process.env.NEXT_PUBLIC_DOWNLOAD_PAGE_URL || '';

export default function ReceiptUploader() {
  const [stage, setStage] = useState<Stage>('idle');
  const [dragOver, setDragOver] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [fileName, setFileName] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [verified, setVerified] = useState<VerifiedData | null>(null);
  const [copied, setCopied] = useState(false);
  const [downloadStarted, setDownloadStarted] = useState(false);
  const [verifyProgress, setVerifyProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const progressRef = useRef<NodeJS.Timeout | null>(null);

  // Simulate progress bar during verification
  const startProgress = useCallback(() => {
    setVerifyProgress(0);
    let p = 0;
    progressRef.current = setInterval(() => {
      p += Math.random() * 8;
      if (p >= 90) { clearInterval(progressRef.current!); p = 90; }
      setVerifyProgress(Math.min(p, 90));
    }, 400);
  }, []);

  const finishProgress = useCallback(() => {
    if (progressRef.current) clearInterval(progressRef.current);
    setVerifyProgress(100);
  }, []);

  useEffect(() => () => { if (progressRef.current) clearInterval(progressRef.current); }, []);

  const processFile = useCallback(async (file: File) => {
    if (!file) return;

    // Preview
    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);
    setFileName(file.name);
    setStage('uploading');
    setErrorMsg('');
    setVerified(null);

    // Build form data
    const formData = new FormData();
    formData.append('receipt', file);

    setStage('verifying');
    startProgress();

    try {
      const res = await fetch('/api/verify-receipt', {
        method: 'POST',
        body: formData,
      });

      finishProgress();
      const data = await res.json();

      if (!res.ok || !data.success) {
        setStage('error');
        setErrorMsg(data.error || 'Verification failed. Please try again.');
        return;
      }

      setVerified({
        referenceNumber: data.data.referenceNumber,
        amount: data.data.amount,
        dateStr: data.data.dateStr,
        token: data.token,
        warnings: data.warnings,
        testMode: data.testMode,
      });
      setStage('success');

      // Auto-trigger download
      triggerDownload(data.token);

    } catch {
      finishProgress();
      setStage('error');
      setErrorMsg('Network error during verification. Please check your connection and try again.');
    }
  }, [startProgress, finishProgress]);

  const triggerDownload = async (token: string) => {
    try {
      const res = await fetch(`/api/download-token?token=${encodeURIComponent(token)}`);
      const data = await res.json();

      if (!res.ok || !data.valid) {
        setErrorMsg(`Download link error: ${data.error}. Please re-upload your receipt.`);
        return;
      }

      setDownloadStarted(true);

      // 1) Start file download
      if (data.fileUrl) {
        const a = document.createElement('a');
        a.href = data.fileUrl;
        a.download = 'The-Fundamentals-Ministry-Pack.zip';
        a.target = '_blank';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      }

      // 2) Redirect to Systeme.io thank-you page after 3s
      if (data.downloadPageUrl) {
        setTimeout(() => {
          window.location.href = data.downloadPageUrl;
        }, 3000);
      }
    } catch {
      setErrorMsg('Could not initiate download. Please contact support with your reference number.');
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  };

  const reset = () => {
    setStage('idle');
    setPreviewUrl(null);
    setFileName('');
    setErrorMsg('');
    setVerified(null);
    setDownloadStarted(false);
    setVerifyProgress(0);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const copyGCashNumber = async () => {
    await navigator.clipboard.writeText(GCASH_NUMBER.replace(/\s/g, ''));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">

      {/* ── STEP 1: GCash Payment Info ── */}
      <div className="glass-card p-6" style={{ borderColor: 'rgba(0,255,135,0.25)' }}>
        <div className="flex items-center gap-2 mb-4">
          <div className="w-7 h-7 rounded-full bg-[var(--green)] flex items-center justify-center text-black text-xs font-extrabold flex-shrink-0">1</div>
          <h3 className="font-bold text-white">Send Payment via GCash</h3>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          {/* GCash QR Code */}
          <div className="flex flex-col items-center">
            <div className="rounded-2xl overflow-hidden border-2 border-[var(--border)] bg-white p-3 mb-3"
              style={{ width: 180, height: 180 }}>
              {/* 
                REPLACE THIS: Put your actual GCash QR code image at /public/gcash/qr.png
                Generate it from GCash app: Profile → QR Code → Share/Download
              */}
              <div className="w-full h-full flex flex-col items-center justify-center bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
                <QrCode size={40} className="text-[#0070CD] mb-2" />
                <p className="text-xs text-gray-500 text-center px-2 leading-tight">
                  Add your GCash QR at<br /><code className="text-[10px]">/public/gcash/qr.png</code>
                </p>
              </div>
            </div>
            <p className="text-xs text-gray-400 text-center">Scan with any GCash-compatible app</p>
          </div>

          {/* GCash Number + Instructions */}
          <div className="flex flex-col justify-center space-y-3">
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">GCash Account</p>
              <p className="text-white font-bold text-lg">{GCASH_NAME}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">GCash Number</p>
              <div className="flex items-center gap-2">
                <span className="text-[var(--green)] font-mono font-bold text-xl tracking-wide">{GCASH_NUMBER}</span>
                <button onClick={copyGCashNumber}
                  className="w-8 h-8 rounded-lg border border-[var(--border)] flex items-center justify-center text-gray-400 hover:text-white hover:border-[var(--green)] transition-colors"
                  title="Copy number">
                  {copied ? <Check size={14} className="text-[var(--green)]" /> : <Copy size={14} />}
                </button>
              </div>
            </div>
            <div className="bg-[var(--bg)] rounded-xl p-3 border border-[var(--border)]">
              <p className="text-xs text-gray-400 mb-1 font-medium">Send exactly:</p>
              <p className="text-2xl font-extrabold text-[var(--green)]">{CURRENCY} {PRICE.toLocaleString()}</p>
            </div>

            <div className="flex items-start gap-2 text-xs text-yellow-300 bg-yellow-950 bg-opacity-40 border border-yellow-800 rounded-lg p-2.5">
              <AlertTriangle size={12} className="flex-shrink-0 mt-0.5" />
              <span>Send the <strong>exact amount</strong>. Wrong amounts will fail verification.</span>
            </div>
          </div>
        </div>

        <div className="mt-4 pt-4 border-t border-[var(--border)]">
          <div className="flex items-center gap-2 text-xs text-gray-400">
            <Smartphone size={13} className="text-[var(--green)]" />
            <span>After sending, tap <strong className="text-white">Download</strong> on the GCash success screen to save your receipt screenshot.</span>
          </div>
        </div>
      </div>

      {/* ── STEP 2: Upload Receipt ── */}
      <div className="glass-card p-6" style={{ borderColor: stage === 'success' ? 'rgba(0,255,135,0.5)' : 'rgba(255,255,255,0.05)' }}>
        <div className="flex items-center gap-2 mb-4">
          <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-extrabold flex-shrink-0 ${
            stage === 'success' ? 'bg-[var(--green)] text-black' : 'bg-[var(--border)] text-gray-300'
          }`}>2</div>
          <h3 className="font-bold text-white">Upload Your GCash Receipt</h3>
        </div>

        {/* ── Idle / Upload Zone ── */}
        {stage === 'idle' && (
          <div
            className={`upload-zone p-8 text-center cursor-pointer ${dragOver ? 'drag-over' : ''}`}
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
          >
            <Upload size={36} className="text-[var(--green)] mx-auto mb-3" />
            <p className="text-white font-semibold mb-1">Tap to upload your GCash receipt</p>
            <p className="text-gray-500 text-xs">or drag and drop here</p>
            <p className="text-gray-600 text-xs mt-3">JPG, PNG, WEBP · Max 10MB</p>
          </div>
        )}

        {/* ── Verifying ── */}
        {(stage === 'uploading' || stage === 'verifying') && (
          <div className="space-y-4">
            {/* Receipt preview thumbnail */}
            {previewUrl && (
              <div className="flex gap-4 items-start">
                <div className="receipt-frame flex-shrink-0" style={{ width: 80, height: 100 }}>
                  <img src={previewUrl} alt="Receipt preview" className="w-full h-full object-cover" />
                </div>
                <div className="flex-1">
                  <p className="text-white font-medium text-sm mb-1 truncate">{fileName}</p>
                  <p className="text-gray-400 text-xs mb-3">
                    {stage === 'uploading' ? 'Reading image…' : 'Scanning QR code & extracting receipt data…'}
                  </p>
                  {/* Progress bar */}
                  <div className="w-full h-2 bg-[var(--border)] rounded-full overflow-hidden">
                    <div className="h-full bg-[var(--green)] rounded-full transition-all duration-300"
                      style={{ width: `${verifyProgress}%` }} />
                  </div>
                  <p className="text-[var(--green)] text-xs mt-1">{Math.round(verifyProgress)}% — verifying…</p>
                </div>
              </div>
            )}

            <div className="flex items-center gap-3 p-3 bg-[var(--bg)] rounded-xl border border-[var(--border)]">
              <Loader2 size={18} className="text-[var(--green)] animate-spin flex-shrink-0" />
              <div>
                <p className="text-white text-sm font-medium">
                  {stage === 'uploading' ? 'Processing image…' : 'Verifying GCash receipt…'}
                </p>
                <p className="text-gray-500 text-xs">Scanning QR code · Checking amount · Validating reference number</p>
              </div>
            </div>
          </div>
        )}

        {/* ── Error ── */}
        {stage === 'error' && (
          <div className="space-y-4">
            {previewUrl && (
              <div className="flex gap-3 items-start">
                <div className="receipt-frame flex-shrink-0" style={{ width: 70, height: 90, opacity: 0.6 }}>
                  <img src={previewUrl} alt="Receipt preview" className="w-full h-full object-cover" />
                </div>
                <div className="flex-1">
                  <div className="flex items-start gap-2 p-3 bg-red-950 bg-opacity-50 border border-red-800 rounded-xl">
                    <XCircle size={18} className="text-red-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-red-300 font-semibold text-sm mb-1">Verification Failed</p>
                      <p className="text-red-200 text-xs leading-relaxed">{errorMsg}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
            <div className="p-3 bg-yellow-950 bg-opacity-40 border border-yellow-800 rounded-xl text-xs text-yellow-300">
              <strong>Already paid?</strong> If you paid successfully but this keeps failing, email us at{' '}
              <a href={`mailto:${SUPPORT_EMAIL}?subject=Paid but receipt verification failed`}
                className="underline font-semibold">{SUPPORT_EMAIL}</a>{' '}
              with your GCash reference number and a screenshot of your receipt.
            </div>
            <button onClick={reset}
              className="w-full py-3 rounded-xl border border-[var(--border)] text-gray-300 hover:text-white hover:border-[var(--green)] transition-colors text-sm flex items-center justify-center gap-2">
              <RefreshCw size={15} /> Try Again with a Different Screenshot
            </button>
          </div>
        )}

        {/* ── Success ── */}
        {stage === 'success' && verified && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-4 bg-green-950 bg-opacity-50 border border-[var(--green-deeper)] rounded-xl">
              <CheckCircle2 size={28} className="text-[var(--green)] flex-shrink-0" />
              <div>
                <p className="text-[var(--green)] font-bold text-base">Receipt Verified! ✅</p>
                <p className="text-gray-300 text-xs">Your GCash payment has been confirmed.</p>
              </div>
            </div>

            {/* Test mode badge */}
            {verified.testMode && (
              <div className="flex items-center gap-2 p-2 bg-blue-950 bg-opacity-50 border border-blue-800 rounded-lg text-xs text-blue-300">
                <Info size={12} />
                <span>TEST MODE — Verification was lenient. Set TEST_MODE=false in production.</span>
              </div>
            )}

            {/* Warnings */}
            {verified.warnings && verified.warnings.length > 0 && (
              <div className="space-y-1">
                {verified.warnings.map((w, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs text-yellow-400 bg-yellow-950 bg-opacity-30 rounded-lg px-3 py-1.5">
                    <AlertTriangle size={11} /> {w}
                  </div>
                ))}
              </div>
            )}

            {/* Verified details */}
            <div className="grid grid-cols-3 gap-2">
              {[
                { label: 'Ref No.', value: verified.referenceNumber },
                { label: 'Amount', value: verified.amount > 0 ? `₱${verified.amount.toFixed(2)}` : 'N/A' },
                { label: 'Date', value: verified.dateStr },
              ].map((f) => (
                <div key={f.label} className="bg-[var(--bg)] rounded-xl p-3 border border-[var(--border)] text-center">
                  <p className="text-gray-500 text-[10px] uppercase tracking-wider mb-1">{f.label}</p>
                  <p className="text-white font-semibold text-xs truncate">{f.value}</p>
                </div>
              ))}
            </div>

            {/* Download status */}
            {downloadStarted ? (
              <div className="space-y-3">
                <div className="flex items-center gap-3 p-4 bg-[var(--card)] rounded-xl border border-[var(--border)]">
                  <Download size={20} className="text-[var(--green)] animate-bounce" />
                  <div>
                    <p className="text-white font-semibold text-sm">Download started!</p>
                    <p className="text-gray-400 text-xs">Redirecting to your download page in 3 seconds…</p>
                  </div>
                </div>
                <a href={DOWNLOAD_PAGE} target="_blank" rel="noopener noreferrer"
                  className="btn-shimmer w-full py-3 rounded-xl font-bold text-black flex items-center justify-center gap-2 text-sm">
                  <ExternalLink size={15} /> Go to Download Page Now
                </a>
              </div>
            ) : (
              <button onClick={() => triggerDownload(verified.token)}
                className="btn-shimmer w-full py-3 rounded-xl font-bold text-black flex items-center justify-center gap-2">
                <Download size={18} /> Download Your Files Now
              </button>
            )}
          </div>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,.jfif"
          className="hidden"
          onChange={handleFileChange}
        />
      </div>

      {/* Accepted info */}
      {stage === 'idle' && (
        <div className="flex items-start gap-2 text-xs text-gray-500 px-1">
          <Info size={12} className="flex-shrink-0 mt-0.5 text-[var(--green-deeper)]" />
          <span>
            We accept screenshots from GCash. The receipt must show the <strong className="text-gray-400">amount</strong>,{' '}
            <strong className="text-gray-400">reference number</strong>, and <strong className="text-gray-400">date</strong>.{' '}
            Do not crop or edit the screenshot.
          </span>
        </div>
      )}
    </div>
  );
}
