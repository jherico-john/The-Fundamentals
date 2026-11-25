'use client';
import { useMetaPixel } from '@/lib/useMetaPixel';
import { useTikTokPixel } from '@/lib/useTikTokPixel';
import { useGoogleAds } from '@/lib/useGoogleAds';
import PaymentChannelsPanel from '@/components/PaymentChannelsPanel';
import type { ReceiptError } from '@/lib/receiptErrors';
import { safeExternalUrl } from '@/lib/safeUrl';
// ReceiptUploader — v6
// • ONE redirect: after the receipt is verified the customer is sent to the
//   funnel's Thank You page (same tab). The direct MediaFire download and the
//   second redirect are gone — the download links live on the Thank You page.
// • Hybrid payments: GCash primary + banks/e-wallets bridged through InstaPay
// • Channel-aware error cards (title, explanation, fix steps, what we read)
// • Meta + TikTok + Google Ads purchase events, fired with the CATALOG price
//   (unchanged), always BEFORE the redirect starts.

import { useState, useRef, useCallback, useEffect } from 'react';
import {
  Upload, CheckCircle2, XCircle, Loader2, Download, AlertTriangle,
  Copy, Check, RefreshCw, ArrowRight, Info, RotateCcw,
} from 'lucide-react';

interface Props {
  productSlug: string;
  productName: string;
  price: number;
}

type Stage = 'checking' | 'idle' | 'verifying' | 'success' | 'error';
interface VerifiedData {
  referenceNumber: string; amount: number; dateStr: string;
  token: string; productSlug: string; warnings?: string[]; testMode?: boolean;
  channelLabel?: string; transferFee?: number | null;
}

const GCASH_NUM  = process.env.NEXT_PUBLIC_GCASH_NUMBER  || '09XX XXX XXXX';
const GCASH_NAME = process.env.NEXT_PUBLIC_GCASH_NAME    || 'J. Balasa';
const CUR        = process.env.NEXT_PUBLIC_CURRENCY      || 'PHP';
const EMAIL      = process.env.NEXT_PUBLIC_SUPPORT_EMAIL || 'jhericojohnbalasa@gmail.com';
// Tracking pixels need a moment to send before the page is left (unchanged from v5).
const REDIRECT_DELAY_SEC = 3;
// Where the Thank You page opens. Default: a NEW tab. Set NEXT_PUBLIC_THANKYOU_OPEN_NEW_TAB=false
// to go back to opening it in this same tab. (Literal env access so Next inlines it.)
const NEW_TAB = process.env.NEXT_PUBLIC_THANKYOU_OPEN_NEW_TAB !== 'false';

export default function ReceiptUploader({ productSlug, productName, price }: Props) {
  const pixel  = useMetaPixel();
  const tiktok = useTikTokPixel();
  const google = useGoogleAds();
  const [errDetail, setErrDetail] = useState<ReceiptError | null>(null);
  const convRef = useRef<{ value: number; currency: string; newCustomer?: boolean } | null>(null);
  const [stage, setStage]         = useState<Stage>('checking');
  const [drag, setDrag]           = useState(false);
  const [preview, setPreview]     = useState<string | null>(null);
  const [fname, setFname]         = useState('');
  const [error, setError]         = useState('');
  const [verified, setVerified]   = useState<VerifiedData | null>(null);
  const [copiedNum, setCopiedNum] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [prog, setProg]           = useState(0);
  const [destination, setDestination] = useState<string | null>(null);
  const [redirectIn, setRedirectIn]   = useState<number | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const progRef = useRef<NodeJS.Timeout | null>(null);
  const redirectRef = useRef<NodeJS.Timeout | null>(null);

  // ── Persist purchase state per product ───────────────────────────────────────
  useEffect(() => {
    fetch(`/api/purchase-status?product=${productSlug}`)
      .then(r => r.json())
      .then(d => {
        if (d.purchased) {
          setDestination(safeExternalUrl(d.downloadPageUrl));
          setVerified({
            referenceNumber: d.referenceNumber, amount: d.amount,
            dateStr: new Date(d.purchasedAt * 1000).toLocaleDateString('en-PH'),
            token: '', productSlug,
          });
          setStage('success');
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
  useEffect(() => () => {
    if (progRef.current) clearInterval(progRef.current);
    if (redirectRef.current) clearInterval(redirectRef.current);
  }, []);

  const getAffCode = () => { const m = document.cookie.match(/affiliate_ref=([^;]+)/); return m ? m[1] : null; };

  // ── The single post-payment redirect ─────────────────────────────────────────
  // 1) confirm the token  2) fire Meta / TikTok / Google purchase events
  // 3) count down, then send the customer to the funnel Thank You page (same tab).
  const finishPurchase = useCallback(async (token: string, fallbackUrl: string | null) => {
    let url = safeExternalUrl(fallbackUrl);
    let refNo: string | undefined;
    try {
      const res  = await fetch(`/api/download-token?token=${encodeURIComponent(token)}&product=${productSlug}`);
      const data = await res.json();
      if (res.ok && data.valid) {
        url = safeExternalUrl(data.downloadPageUrl) || url;
        refNo = data.referenceNumber || undefined;
      }
    } catch { /* the verify response already carries the destination */ }
    setDestination(url);

    // ── Purchase events: Meta + TikTok + Google Ads ──────────────────────────
    // value = CATALOG price (e.g. 397 even if the bank added a ₱10 fee), so all
    // three engines report the same revenue per product.
    const conv = convRef.current;
    const safePrice = conv && Number.isFinite(conv.value) && conv.value > 0 ? conv.value : (Number.isFinite(price) && price > 0 ? price : 0);
    pixel.trackPurchase({ name: productName, price: safePrice, currency: 'PHP', transactionId: refNo, contentId: productSlug });
    tiktok.trackPurchase({ name: productName, price: safePrice, currency: 'PHP', transactionId: refNo, contentId: productSlug });
    google.trackPurchase({ slug: productSlug, name: productName, price: safePrice, currency: 'PHP', transactionId: refNo, newCustomer: conv?.newCustomer });
    // ─────────────────────────────────────────────────────────────────────────

    if (!url) return; // no destination configured: the support notice below tells the customer what to do
    let left = REDIRECT_DELAY_SEC;
    setRedirectIn(left);
    redirectRef.current = setInterval(() => {
      left -= 1;
      setRedirectIn(Math.max(left, 0));
      if (left <= 0) {
        if (redirectRef.current) clearInterval(redirectRef.current);
        // A new tab opened by a timer (not a tap) can be blocked by the phone's popup blocker.
        // If that happens we fall back to this tab so the customer is never left without the page.
        if (NEW_TAB) {
          const w = window.open(url as string, '_blank');
          if (w) { try { w.opener = null; } catch { /* ignore */ } } else window.location.assign(url as string);
        } else {
          window.location.assign(url as string);
        }
      }
    }, 1000);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productSlug, productName, price]);

  const processFile = useCallback(async (file: File) => {
    setPreview(URL.createObjectURL(file)); setFname(file.name);
    setStage('verifying'); setError(''); setErrDetail(null); setVerified(null); setRedirectIn(null);
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
      if (!res.ok || !data.success) {
        setStage('error'); setError(data.error || 'Verification failed.'); setErrDetail(data.errorDetail || null); return;
      }
      convRef.current = data.conversion || null;
      setVerified({ referenceNumber: data.data.referenceNumber, amount: data.data.amount, dateStr: data.data.dateStr, token: data.token, productSlug, warnings: data.warnings, testMode: data.testMode, channelLabel: data.data.channelLabel, transferFee: data.data.transferFee });
      setStage('success');
      void finishPurchase(data.token, data.downloadPageUrl || null);
    } catch { endProg(); setStage('error'); setError('Network error. Please check your connection and try again.'); }
  }, [productSlug, productName, startProg, endProg, finishPurchase]);

  const reset = () => {
    if (redirectRef.current) clearInterval(redirectRef.current);
    setStage('idle'); setPreview(null); setFname(''); setError(''); setErrDetail(null); setVerified(null); setProg(0); setRedirectIn(null);
    if (fileRef.current) fileRef.current.value = '';
  };
  const buyAgain = async () => { setResetting(true); try { await fetch(`/api/purchase-status?product=${productSlug}`, { method: 'DELETE' }); } finally { setResetting(false); reset(); } };
  const copyNum = async () => {
    try { await navigator.clipboard.writeText(GCASH_NUM.replace(/\s/g, '')); setCopiedNum(true); setTimeout(() => setCopiedNum(false), 2000); }
    catch { /* clipboard blocked: the number is shown on screen to copy by hand */ }
  };
  const downloadQR = () => {
    const a = document.createElement('a');
    a.href = '/gcash/qr.png'; a.download = 'GCash-QR-Jherico-Ministry.png';
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
  };

  if (stage === 'checking') return (
    <div className="card p-10 flex flex-col items-center" role="status">
      <Loader2 size={26} className="text-accent animate-spin mb-3" />
      <p className="text-muted">Checking purchase status…</p>
    </div>
  );

  const justVerified = !!verified && verified.token !== '';

  return (
    <div className="space-y-5">
      {/* ── STEP 1: payment details ── */}
      {stage !== 'success' && (
        <div className="card p-5 md:p-6">
          <div className="flex items-center gap-3 mb-5">
            <span className="w-8 h-8 rounded-full bg-accent-solid text-on-accent flex items-center justify-center text-sm font-bold" aria-hidden="true">1</span>
            <h3 className="text-lg font-bold text-fg">Send your payment</h3>
          </div>

          <div className="grid sm:grid-cols-2 gap-6">
            {/* QR code + download button */}
            <div className="flex flex-col items-center">
              <div className="rounded-xl border border-line-strong bg-white p-3 mb-3" style={{ width: 188, height: 188 }}>
                <img src="/gcash/qr.png" className="w-full h-full object-contain" alt="Our GCash QR code" />
              </div>
              <button onClick={downloadQR} className="btn-secondary text-sm px-4 mb-2">
                <Download size={15} /> Download QR Code
              </button>
              <p className="text-sm text-muted text-center">On a phone: download it, open GCash, tap QR, then &quot;Upload QR&quot;.</p>
            </div>

            {/* Number + amount */}
            <div className="flex flex-col justify-center space-y-4">
              <div>
                <p className="text-sm text-muted mb-0.5">GCash account name</p>
                <p className="text-fg font-bold text-lg">{GCASH_NAME}</p>
              </div>

              <div>
                <p className="text-sm text-muted mb-1">GCash number</p>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-fg font-mono font-bold text-xl tracking-wide">{GCASH_NUM}</span>
                  <button onClick={copyNum} className="btn-secondary text-sm px-3 min-h-[40px]" aria-label="Copy GCash number">
                    {copiedNum ? <><Check size={14} /> Copied</> : <><Copy size={14} /> Copy</>}
                  </button>
                </div>
              </div>

              <div className="rounded-xl bg-surface border border-line-strong p-4">
                <p className="text-sm text-muted">Amount to send</p>
                <p className="text-3xl font-extrabold text-fg" data-testid="amount-to-send">{CUR} {price.toLocaleString()}</p>
              </div>

              <p className="alert alert-warn flex items-start gap-2">
                <AlertTriangle size={16} className="flex-shrink-0 mt-0.5" />
                <span>Send exactly <strong>{CUR} {price.toLocaleString()}</strong>. A transfer fee added by your bank or e-wallet is accepted automatically.</span>
              </p>
            </div>
          </div>

          <PaymentChannelsPanel />

          <p className="mt-4 text-sm text-muted">
            After paying, save the <strong className="text-fg2">full receipt</strong> from your app. In GCash tap <em>Download</em>. In banks and Maya use <em>Save Image</em>, or take a screenshot of the complete receipt.
          </p>
        </div>
      )}

      {/* ── STEP 2: upload receipt ── */}
      <div className="card p-5 md:p-6" style={{ borderColor: stage === 'success' ? 'var(--ok-border)' : undefined }}>
        {stage !== 'success' && (
          <div className="flex items-center gap-3 mb-4">
            <span className="w-8 h-8 rounded-full bg-accent-solid text-on-accent flex items-center justify-center text-sm font-bold" aria-hidden="true">2</span>
            <h3 className="text-lg font-bold text-fg">Upload Your Payment Receipt</h3>
          </div>
        )}

        {/* Idle */}
        {stage === 'idle' && (
          <div
            className={`upload-zone p-8 md:p-10 text-center ${drag ? 'drag-over' : ''}`}
            role="button" tabIndex={0}
            aria-label="Upload your payment receipt picture"
            onClick={() => fileRef.current?.click()}
            onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fileRef.current?.click(); } }}
            onDragOver={e => { e.preventDefault(); setDrag(true); }}
            onDragLeave={() => setDrag(false)}
            onDrop={e => { e.preventDefault(); setDrag(false); const f = e.dataTransfer.files[0]; if (f) processFile(f); }}
          >
            <Upload size={34} className="text-accent mx-auto mb-3" />
            <p className="text-fg font-semibold text-lg mb-1">Tap here to upload your receipt</p>
            <p className="text-muted text-sm">Choose the receipt picture from your phone gallery. JPG, PNG or WEBP, up to 10MB.</p>
          </div>
        )}

        {/* Verifying */}
        {stage === 'verifying' && (
          <div className="space-y-4" role="status" aria-live="polite">
            {preview && (
              <div className="flex gap-4 items-start">
                <div className="rounded-xl overflow-hidden border border-line bg-white flex-shrink-0" style={{ width: 72, height: 96 }}>
                  <img src={preview} alt="Your receipt" className="w-full h-full object-cover" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-fg text-sm font-medium truncate mb-2">{fname}</p>
                  <div className="w-full h-2 bg-line rounded-full overflow-hidden">
                    <div className="h-full bg-accent-solid rounded-full transition-all duration-300" style={{ width: `${prog}%` }} />
                  </div>
                  <p className="text-muted text-sm mt-1">{Math.round(prog)}% · checking your receipt</p>
                </div>
              </div>
            )}
            <div className="flex items-center gap-3 p-4 bg-surface rounded-xl border border-line">
              <Loader2 size={20} className="text-accent animate-spin flex-shrink-0" />
              <div>
                <p className="text-fg font-medium">Checking your receipt…</p>
                <p className="text-muted text-sm">This takes a few seconds. Please do not close this page.</p>
              </div>
            </div>
          </div>
        )}

        {/* Error */}
        {stage === 'error' && (
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              {preview && (
                <div className="rounded-xl overflow-hidden border border-line bg-white flex-shrink-0" style={{ width: 60, height: 80, opacity: 0.6 }}>
                  <img src={preview} alt="Your receipt" className="w-full h-full object-cover" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="alert alert-error flex items-start gap-2.5" role="alert">
                  <XCircle size={20} className="flex-shrink-0 mt-0.5" />
                  <div data-testid="receipt-error">
                    <p className="font-semibold mb-1">{errDetail?.title || 'Verification Failed'}</p>
                    <p className="leading-relaxed">{errDetail?.message || error}</p>
                    {errDetail?.fixes?.length ? (
                      <ul className="mt-2 space-y-1 list-disc pl-5">
                        {errDetail.fixes.map((f, i) => <li key={i}>{f}</li>)}
                      </ul>
                    ) : null}
                    {errDetail?.detected && (errDetail.detected.amount || errDetail.detected.reference) ? (
                      <p className="mt-2 text-sm opacity-80">
                        We read: {[errDetail.detected.channel && errDetail.detected.channel !== 'unknown' ? String(errDetail.detected.channel).toUpperCase() : null,
                          errDetail.detected.amount ? `₱${errDetail.detected.amount.toFixed(2)}` : null,
                          errDetail.detected.fee ? `fee ₱${errDetail.detected.fee.toFixed(2)}` : null,
                          errDetail.detected.reference ? `ref ${errDetail.detected.reference}` : null].filter(Boolean).join(' · ')}
                      </p>
                    ) : null}
                  </div>
                </div>
              </div>
            </div>
            <p className="alert alert-warn">
              <strong>Already paid?</strong> Do not pay again. Email{' '}
              <a href={`mailto:${EMAIL}?subject=Paid but receipt failed - ${productName}`} className="underline font-semibold">{EMAIL}</a>{' '}
              with your reference number and receipt picture.
            </p>
            <button onClick={reset} className="btn-secondary w-full text-base">
              <RefreshCw size={16} /> Try Again
            </button>
          </div>
        )}

        {/* Success */}
        {stage === 'success' && verified && (
          <div className="space-y-4" role="status" aria-live="polite">
            <div className="alert alert-ok flex items-center gap-3 p-4">
              <CheckCircle2 size={28} className="flex-shrink-0" />
              <div>
                <p className="font-bold text-lg">{justVerified ? 'Payment confirmed' : 'You already purchased this'}</p>
                <p>
                  {justVerified
                    ? `Your receipt was approved${verified.channelLabel ? ' (' + verified.channelLabel + ')' : ''}.`
                    : `You already bought ${productName} on this device. Use the button below to open your download page.`}
                </p>
              </div>
            </div>

            {verified.testMode && (
              <p className="alert alert-info flex items-center gap-2">
                <Info size={14} /> TEST MODE is on. Set TEST_MODE=false in production.
              </p>
            )}

            {verified.warnings?.filter(Boolean).map((w, i) => (
              <p key={i} className="alert alert-warn flex items-center gap-2">
                <AlertTriangle size={14} className="flex-shrink-0" /> {w}
              </p>
            ))}

            <div className="grid grid-cols-3 gap-2">
              {[
                { l: 'Ref No.', v: verified.referenceNumber },
                { l: verified.channelLabel || 'Amount', v: verified.amount > 0 ? `₱${verified.amount.toFixed(2)}` : 'N/A' },
                { l: 'Date', v: verified.dateStr },
              ].map(f => (
                <div key={f.l} className="bg-surface rounded-xl p-3 border border-line text-center">
                  <p className="text-muted text-xs mb-1">{f.l}</p>
                  <p className="text-fg font-semibold text-sm truncate">{f.v}</p>
                </div>
              ))}
            </div>

            {destination ? (
              <>
                {justVerified && redirectIn !== null && (
                  <p className="text-fg2 text-center text-base" data-testid="redirect-notice">
                    {NEW_TAB ? 'Opening your download page in a new tab in' : 'Taking you to your download page in'} <strong className="text-fg">{redirectIn}</strong> second{redirectIn === 1 ? '' : 's'}…
                  </p>
                )}
                {/* One destination only. Opens in a new tab (default) or this tab, see NEW_TAB above. */}
                <a href={destination} {...(NEW_TAB ? { target: '_blank', rel: 'noopener noreferrer' } : {})} className="btn-primary w-full text-lg py-4 min-h-[56px]" data-testid="go-download">
                  Go to My Download Page <ArrowRight size={18} />
                </a>
                <p className="text-sm text-muted text-center">
                  Your files are on the download page. Bookmark it, so you can come back to it later.
                </p>
              </>
            ) : (
              <p className="alert alert-warn">
                Your payment is confirmed, but the download page is not set up yet. Please email{' '}
                <a href={`mailto:${EMAIL}?subject=Paid - download page needed - ${productName}`} className="underline font-semibold">{EMAIL}</a>{' '}
                with reference <strong>{verified.referenceNumber}</strong> and we will send your files.
              </p>
            )}

            <p className="text-sm text-muted">
              Did not get to the download page? Tap the button above. Still stuck? Email{' '}
              <a href={`mailto:${EMAIL}`} className="underline font-semibold text-fg2">{EMAIL}</a> with your Ref No.
            </p>

            <button onClick={buyAgain} disabled={resetting}
              className="w-full py-2.5 rounded-xl border border-line text-muted hover:text-fg hover:border-line-strong transition-colors text-sm flex items-center justify-center gap-2">
              <RotateCcw size={13} /> {resetting ? 'Resetting…' : 'Want to buy again? Start a new purchase'}
            </button>
          </div>
        )}

        <input ref={fileRef} type="file" accept="image/*,.jfif" className="hidden"
          onChange={e => { const f = e.target.files?.[0]; if (f) processFile(f); }} />
      </div>

      {stage === 'idle' && (
        <p className="flex items-start gap-2 text-sm text-muted px-1">
          <Info size={15} className="flex-shrink-0 mt-0.5" />
          <span>
            Upload the <strong className="text-fg2">complete</strong> receipt. It must show the <strong className="text-fg2">amount</strong>,{' '}
            <strong className="text-fg2">account number or name</strong>, <strong className="text-fg2">fee</strong> and{' '}
            <strong className="text-fg2">reference number</strong>. Please do not crop or edit it, and do not use an old receipt.
          </span>
        </p>
      )}
    </div>
  );
}