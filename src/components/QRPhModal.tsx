'use client';
// src/components/QRPhModal.tsx — v2
// QRPh payment modal: shows QR code, polls for payment, redirects on success.

import { useEffect, useRef, useState, useCallback } from 'react';
import {
  X, Loader2, CheckCircle2, AlertCircle, RefreshCw, Clock, Smartphone,
  Shield, Zap, Copy, Check,
} from 'lucide-react';

interface QRPhModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type Stage = 'creating' | 'qr_ready' | 'polling' | 'success' | 'error' | 'expired';

const POLL_INTERVAL_MS = 4000;
const MAX_POLLS = 150; // ~10 minutes
const QR_EXPIRY_SEC = 10 * 60; // 10 minutes

const PAYMENT_METHODS = [
  { name: 'GCash', color: '#0070CD', bg: '#E8F4FF' },
  { name: 'Maya', color: '#2DC653', bg: '#E8F9ED' },
  { name: 'BPI', color: '#C41E3A', bg: '#FEE8EC' },
  { name: 'GoTyme', color: '#FF6B00', bg: '#FFF0E5' },
  { name: 'Home Credit', color: '#E30613', bg: '#FEE8EA' },
];

export default function QRPhModal({ isOpen, onClose }: QRPhModalProps) {
  const [stage, setStage] = useState<Stage>('creating');
  const [sourceId, setSourceId] = useState('');
  const [qrCode, setQrCode] = useState(''); // base64 or URL
  const [checkoutUrl, setCheckoutUrl] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [timeLeft, setTimeLeft] = useState(QR_EXPIRY_SEC);
  const [copied, setCopied] = useState(false);
  const pollRef = useRef<NodeJS.Timeout | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const pollCount = useRef(0);

  const price = process.env.NEXT_PUBLIC_PRODUCT_PRICE || '497';
  const currency = process.env.NEXT_PUBLIC_CURRENCY || 'PHP';

  const stopAll = useCallback(() => {
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
  }, []);

  const startPolling = useCallback((sid: string) => {
    stopAll();
    pollCount.current = 0;
    setStage('qr_ready');

    // Countdown timer
    let remaining = QR_EXPIRY_SEC;
    setTimeLeft(remaining);
    timerRef.current = setInterval(() => {
      remaining -= 1;
      setTimeLeft(remaining);
      if (remaining <= 0) {
        stopAll();
        setStage('expired');
      }
    }, 1000);

    // Payment poll
    pollRef.current = setInterval(async () => {
      pollCount.current += 1;
      if (pollCount.current > MAX_POLLS) {
        stopAll();
        setStage('expired');
        return;
      }
      try {
        const res = await fetch(`/api/check-source/${sid}`);
        const data = await res.json();
        if (data.paid && data.downloadUrl) {
          stopAll();
          setStage('success');
          setTimeout(() => { window.location.href = data.downloadUrl; }, 2200);
        }
      } catch { /* keep polling */ }
    }, POLL_INTERVAL_MS);
  }, [stopAll]);

  const createQR = useCallback(async () => {
    setStage('creating');
    setErrorMsg('');
    setQrCode('');
    setSourceId('');
    stopAll();

    try {
      const res = await fetch('/api/create-qrph', { method: 'POST' });
      if (!res.ok) throw new Error('Failed to create QR code');
      const data = await res.json();

      setSourceId(data.sourceId);
      setCheckoutUrl(data.checkoutUrl || '');

      if (data.qrCode) {
        // base64 PNG from PayMongo
        setQrCode(`data:image/png;base64,${data.qrCode}`);
      } else if (data.checkoutUrl) {
        // Fallback: use PayMongo hosted page QR
        setQrCode('');
      }

      startPolling(data.sourceId);
    } catch (err) {
      setStage('error');
      setErrorMsg(err instanceof Error ? err.message : 'Could not generate QR code.');
    }
  }, [startPolling, stopAll]);

  useEffect(() => {
    if (isOpen) { createQR(); }
    if (!isOpen) { stopAll(); setStage('creating'); }
    return () => stopAll();
  }, [isOpen]); // eslint-disable-line

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  const copyLink = async () => {
    if (!checkoutUrl) return;
    await navigator.clipboard.writeText(checkoutUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!isOpen) return null;

  return (
    <div className="modal-backdrop fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="glass-card relative w-full max-w-md shadow-2xl overflow-hidden"
        style={{ borderColor: 'rgba(0,255,135,0.3)', maxHeight: '95vh', overflowY: 'auto' }}>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border)]">
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-[var(--green)] animate-pulse" />
            <span className="font-semibold text-[var(--green)] text-sm tracking-wide uppercase">
              QRPh Secure Payment
            </span>
          </div>
          {(stage !== 'success') && (
            <button onClick={() => { stopAll(); onClose(); }}
              className="text-gray-400 hover:text-white transition-colors p-1" aria-label="Close">
              <X size={20} />
            </button>
          )}
        </div>

        {/* ── CREATING ── */}
        {stage === 'creating' && (
          <div className="flex flex-col items-center justify-center py-16 px-6">
            <Loader2 className="text-[var(--green)] animate-spin mb-4" size={44} />
            <p className="text-white font-semibold text-lg mb-1">Generating your QR Code…</p>
            <p className="text-gray-400 text-sm text-center">Creating a secure QRPh payment code</p>
          </div>
        )}

        {/* ── QR READY ── */}
        {(stage === 'qr_ready' || stage === 'polling') && (
          <div className="px-5 py-5">
            {/* Amount */}
            <div className="text-center mb-4">
              <p className="text-gray-400 text-xs uppercase tracking-widest mb-1">Amount to Pay</p>
              <p className="text-4xl font-extrabold text-[var(--green)]">
                {currency} {parseInt(price).toLocaleString()}
              </p>
              <p className="text-gray-500 text-xs mt-1">The Fundamentals — Digital Pack</p>
            </div>

            {/* Accepted wallets */}
            <div className="flex flex-wrap gap-2 justify-center mb-4">
              {PAYMENT_METHODS.map((m) => (
                <span key={m.name} className="text-xs font-semibold px-2 py-1 rounded-full"
                  style={{ background: m.bg, color: m.color }}>
                  {m.name}
                </span>
              ))}
            </div>

            {/* QR Code box */}
            <div className="relative rounded-2xl overflow-hidden mb-3 mx-auto"
              style={{ width: 220, height: 220, background: '#fff', padding: 12 }}>
              {qrCode ? (
                <img src={qrCode} alt="QRPh Payment QR Code"
                  className="w-full h-full object-contain" />
              ) : (
                /* Placeholder grid when no base64 QR (PayMongo test mode) */
                <div className="w-full h-full flex flex-col items-center justify-center bg-white rounded-xl">
                  <div className="grid grid-cols-5 gap-0.5 mb-2">
                    {Array.from({ length: 25 }).map((_, i) => (
                      <div key={i} className="w-4 h-4 rounded-sm"
                        style={{ background: Math.random() > 0.45 ? '#000' : '#fff' }} />
                    ))}
                  </div>
                  <p className="text-[9px] text-gray-500 text-center px-2 leading-tight">
                    QRPh code<br />shown on PayMongo page
                  </p>
                </div>
              )}
              {/* Expiry overlay pulse */}
              {timeLeft < 60 && (
                <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-60 rounded-2xl">
                  <p className="text-red-400 font-bold text-lg">Expiring!</p>
                </div>
              )}
            </div>

            {/* Timer */}
            <div className="flex items-center justify-center gap-2 mb-4">
              <Clock size={14} className={timeLeft < 60 ? 'text-red-400' : 'text-gray-400'} />
              <span className={`text-sm font-mono font-semibold ${timeLeft < 60 ? 'text-red-400' : 'text-gray-300'}`}>
                Expires in {formatTime(timeLeft)}
              </span>
            </div>

            {/* Instructions */}
            <div className="glass-card p-3 mb-4 text-xs text-gray-300 space-y-1.5">
              <p className="font-semibold text-[var(--green)] text-sm mb-2 flex items-center gap-2">
                <Smartphone size={14} /> How to Pay
              </p>
              <p>1. Open <strong>GCash</strong> → tap <strong>QR</strong> tab at the bottom</p>
              <p>2. Tap <strong>"Scan QR Code"</strong> or <strong>"Upload QR"</strong></p>
              <p>3. Scan or upload this QRPh code</p>
              <p>4. Confirm the amount and tap <strong>"Pay"</strong></p>
              <p>5. This page will automatically redirect to your download 🎉</p>
            </div>

            {/* Open on PayMongo / Copy link */}
            {checkoutUrl && (
              <div className="flex gap-2 mb-3">
                <a href={checkoutUrl} target="_blank" rel="noopener noreferrer"
                  className="flex-1 text-center text-xs py-2.5 rounded-lg border border-[var(--border)] text-gray-300 hover:text-white hover:border-[var(--green)] transition-colors">
                  Open PayMongo Page ↗
                </a>
                <button onClick={copyLink}
                  className="flex items-center gap-1 px-3 py-2.5 rounded-lg border border-[var(--border)] text-gray-400 hover:text-white hover:border-[var(--green)] transition-colors text-xs">
                  {copied ? <Check size={14} className="text-[var(--green)]" /> : <Copy size={14} />}
                  {copied ? 'Copied!' : 'Copy'}
                </button>
              </div>
            )}

            {/* Polling indicator */}
            <div className="flex items-center justify-center gap-2 text-xs text-gray-500">
              <span className="w-2 h-2 rounded-full bg-[var(--green)] animate-pulse inline-block" />
              Waiting for payment confirmation…
            </div>

            <button onClick={() => startPolling(sourceId)}
              className="w-full mt-3 text-xs text-[var(--green)] hover:underline flex items-center justify-center gap-1">
              <RefreshCw size={11} /> Already paid? Click to verify
            </button>
          </div>
        )}

        {/* ── SUCCESS ── */}
        {stage === 'success' && (
          <div className="flex flex-col items-center justify-center py-14 px-6">
            <CheckCircle2 className="text-[var(--green)] mb-4" size={60} />
            <p className="text-white font-bold text-2xl mb-2">Payment Received! 🎉</p>
            <p className="text-gray-300 text-sm text-center mb-4">
              Thank you! Redirecting you to your download page in a moment…
            </p>
            <div className="w-40 h-1.5 bg-[var(--border)] rounded-full overflow-hidden">
              <div className="h-full bg-[var(--green)] rounded-full animate-[shimmer_2s_linear_forwards]"
                style={{ animation: 'progressBar 2.2s ease forwards' }} />
            </div>
            <style>{`@keyframes progressBar { from { width: 0% } to { width: 100% } }`}</style>
          </div>
        )}

        {/* ── EXPIRED ── */}
        {stage === 'expired' && (
          <div className="flex flex-col items-center justify-center py-12 px-6">
            <Clock className="text-yellow-400 mb-4" size={48} />
            <p className="text-white font-bold text-xl mb-2">QR Code Expired</p>
            <p className="text-gray-400 text-sm text-center mb-6">
              The QR code has expired. Generate a new one to continue.
            </p>
            <button onClick={createQR}
              className="btn-shimmer px-8 py-3 rounded-xl font-bold text-black flex items-center gap-2">
              <RefreshCw size={16} /> Generate New QR
            </button>
          </div>
        )}

        {/* ── ERROR ── */}
        {stage === 'error' && (
          <div className="flex flex-col items-center justify-center py-12 px-6">
            <AlertCircle className="text-red-400 mb-4" size={48} />
            <p className="text-white font-bold text-xl mb-2">Something Went Wrong</p>
            <p className="text-gray-400 text-sm text-center mb-6">{errorMsg}</p>
            <div className="flex gap-3">
              <button onClick={createQR}
                className="btn-shimmer px-6 py-3 rounded-xl font-bold text-black flex items-center gap-2">
                <RefreshCw size={16} /> Try Again
              </button>
              <button onClick={() => { stopAll(); onClose(); }}
                className="px-6 py-3 rounded-xl font-semibold text-gray-300 border border-[var(--border)] hover:border-[var(--green)] transition-colors">
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Footer trust bar */}
        {(stage === 'qr_ready' || stage === 'polling') && (
          <div className="px-5 pb-4 flex items-center justify-center gap-4 text-[10px] text-gray-600">
            <span className="flex items-center gap-1"><Shield size={10} className="text-[var(--green)]" /> Secured by PayMongo</span>
            <span className="flex items-center gap-1"><Zap size={10} className="text-[var(--green)]" /> BSP-accredited QRPh</span>
          </div>
        )}
      </div>
    </div>
  );
}
