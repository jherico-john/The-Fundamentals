'use client';
// src/components/PaymentModal.tsx

import { useEffect, useRef, useState, useCallback } from 'react';
import { X, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  checkoutUrl: string;
  linkId: string;
}

type Stage = 'loading' | 'iframe' | 'polling' | 'success' | 'error';

export default function PaymentModal({
  isOpen,
  onClose,
  checkoutUrl,
  linkId,
}: PaymentModalProps) {
  const [stage, setStage] = useState<Stage>('loading');
  const [iframeLoaded, setIframeLoaded] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const pollRef = useRef<NodeJS.Timeout | null>(null);
  const pollCountRef = useRef(0);
  const MAX_POLLS = 120; // 10 minutes at 5s intervals

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  const startPolling = useCallback(() => {
    stopPolling();
    setStage('polling');
    pollRef.current = setInterval(async () => {
      pollCountRef.current += 1;
      if (pollCountRef.current > MAX_POLLS) {
        stopPolling();
        setStage('error');
        setErrorMsg('Payment verification timed out. Please contact support.');
        return;
      }
      try {
        const res = await fetch(`/api/check-payment/${linkId}`);
        const data = await res.json();
        if (data.paid && data.downloadUrl) {
          stopPolling();
          setStage('success');
          // Redirect to download page after 2s
          setTimeout(() => {
            window.location.href = data.downloadUrl;
          }, 2000);
        }
      } catch {
        // Keep polling on network error
      }
    }, 5000);
  }, [linkId, stopPolling]);

  // Start iframe when modal opens
  useEffect(() => {
    if (isOpen && checkoutUrl) {
      setStage('loading');
      setIframeLoaded(false);
      pollCountRef.current = 0;
    }
    if (!isOpen) {
      stopPolling();
      setStage('loading');
    }
    return () => stopPolling();
  }, [isOpen, checkoutUrl, stopPolling]);

  const handleIframeLoad = () => {
    setIframeLoaded(true);
    setStage('iframe');
  };

  if (!isOpen) return null;

  return (
    <div className="modal-backdrop fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="glass-card relative w-full max-w-2xl shadow-2xl overflow-hidden"
        style={{ maxHeight: '90vh', height: '700px' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border)]">
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-[var(--green)] animate-pulse" />
            <span className="font-semibold text-[var(--green)] text-sm tracking-wide uppercase">
              Secure Checkout
            </span>
          </div>
          {stage !== 'success' && (
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white transition-colors p-1"
              aria-label="Close"
            >
              <X size={20} />
            </button>
          )}
        </div>

        {/* Body */}
        <div className="relative flex-1" style={{ height: 'calc(100% - 64px)' }}>
          {/* Loading overlay */}
          {(stage === 'loading' || !iframeLoaded) && stage !== 'success' && stage !== 'error' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center z-10 bg-[var(--surface)]">
              <Loader2 className="text-[var(--green)] animate-spin mb-4" size={40} />
              <p className="text-gray-300 text-sm">Loading secure payment...</p>
            </div>
          )}

          {/* PayMongo iframe */}
          {stage !== 'success' && stage !== 'error' && checkoutUrl && (
            <iframe
              src={checkoutUrl}
              className="w-full h-full border-0"
              onLoad={handleIframeLoad}
              title="PayMongo Checkout"
              sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-top-navigation"
            />
          )}

          {/* Polling state */}
          {stage === 'polling' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center z-20 bg-[var(--surface)]">
              <Loader2 className="text-[var(--green)] animate-spin mb-4" size={40} />
              <p className="text-white font-semibold text-lg mb-2">Verifying your payment…</p>
              <p className="text-gray-400 text-sm text-center max-w-xs">
                Please wait while we confirm your transaction. This usually takes just a moment.
              </p>
            </div>
          )}

          {/* Success state */}
          {stage === 'success' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center z-20 bg-[var(--surface)]">
              <CheckCircle2 className="text-[var(--green)] mb-4" size={56} />
              <p className="text-white font-bold text-2xl mb-2">Payment Confirmed!</p>
              <p className="text-gray-300 text-sm text-center max-w-xs">
                Redirecting you to your download page…
              </p>
              <div className="mt-4 w-32 h-1 bg-[var(--border)] rounded-full overflow-hidden">
                <div className="h-full bg-[var(--green)] rounded-full" style={{ animation: 'shimmer 2s linear' }} />
              </div>
            </div>
          )}

          {/* Error state */}
          {stage === 'error' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center z-20 bg-[var(--surface)] p-6">
              <AlertCircle className="text-red-400 mb-4" size={48} />
              <p className="text-white font-bold text-xl mb-2">Something went wrong</p>
              <p className="text-gray-400 text-sm text-center mb-6">{errorMsg}</p>
              <button onClick={onClose} className="btn-shimmer text-black font-bold px-6 py-2 rounded-lg">
                Close & Try Again
              </button>
            </div>
          )}
        </div>

        {/* Footer note */}
        {stage === 'iframe' && (
          <div className="px-6 py-2 border-t border-[var(--border)] flex items-center justify-between">
            <span className="text-xs text-gray-500">🔒 Encrypted & secured by PayMongo</span>
            <button
              onClick={startPolling}
              className="text-xs text-[var(--green)] hover:underline"
            >
              Already paid? Click here
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
