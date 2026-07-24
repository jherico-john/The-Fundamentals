// src/lib/receiptVerifier.ts — v4.1 (PRODUCTION FIX)
// ─────────────────────────────────────────────────────────────────────────────
// ROOT CAUSE ANALYSIS — why OCR failed locally and 504'd on Vercel:
//
// BUG 1 (PRIMARY — caused 504 on Vercel + local fail):
//   Tesseract.js 5.x downloads the `eng.traineddata` language model from the
//   jsDelivr CDN at RUNTIME (on first createWorker call). On Vercel, this CDN
//   request hangs → function times out after 60s → 504 Gateway Timeout.
//   Locally it fails silently or 403s in restricted network environments.
//
//   FIX: Install `@tesseract.js-data/eng` as a real npm dependency and pass
//   its local path as `langPath` to createWorker. This completely eliminates
//   any CDN dependency. The traineddata is bundled into node_modules and read
//   directly from disk — zero network calls, works on Vercel cold starts.
//
// BUG 2 (secondary — workerPath MODULE_NOT_FOUND):
//   When webpack bundles the API route into .next/server/chunks/, __dirname
//   inside tesseract's defaultOptions becomes .next/server/chunks/ instead of
//   the real node_modules path → worker script not found.
//
//   FIX: Resolve workerPath from require.resolve() before webpack ever runs,
//   so tesseract.js receives an absolute on-disk path, not a relative one.
//
// BUG 3 (parser — ₱ misread as £):
//   Tesseract OCR frequently misreads the peso sign ₱ as £. Amount parser
//   now accepts both characters.
//
// BUG 4 (parser — date on same line as ref number):
//   GCash receipt format: "Ref No. 9042 996 774496  Jul17,2026 7:22 PM"
//   The date immediately follows the ref number with no newline. Previous date
//   regex required spaces that GCash doesn't always include (Jul17 not Jul 17).
//
// BUG 5 (preprocessing — contrast 0.35 hurt OCR accuracy):
//   GCash receipts are already high-contrast white-on-dark-blue design.
//   Aggressive contrast boost clips midtones and degrades OCR accuracy.
//   Fix: greyscale + normalize only, no additional contrast manipulation.
// ─────────────────────────────────────────────────────────────────────────────

import Jimp from 'jimp';
import QrCode from 'qrcode-reader';
import { createWorker, type Worker } from 'tesseract.js';
import path from 'path';
import crypto from 'crypto';
import { isRefUsed, isHashUsed, markReceiptUsed, recordPurchase } from '@/lib/supabase';

export interface VerifyResult {
  valid: boolean;
  reason?: string;
  data?: {
    referenceNumber: string;
    amount: number;
    dateStr: string;
    mobileNumber?: string;
    imageHash: string;
  };
  warnings?: string[];
}

// ── Image hash for anti-editing ───────────────────────────────────────────────
export function hashImage(buf: Buffer): string {
  return crypto.createHash('sha256').update(buf).digest('hex');
}

// ── Resolve tesseract paths at module load time (before any webpack bundling) ─
// These are computed once when the module is first required and cached.
// require.resolve() finds the real on-disk node_modules path, not .next/.

function resolveWorkerPath(): string | undefined {
  try {
    const pkg = require.resolve('tesseract.js/package.json');
    const p = path.join(path.dirname(pkg), 'src', 'worker-script', 'node', 'index.js');
    // Verify it actually exists before passing it
    require('fs').accessSync(p);
    return p;
  } catch {
    // If resolution fails, return undefined and let tesseract use its default.
    // This should never happen in practice when the package is installed.
    console.warn('[receiptVerifier] Could not resolve tesseract workerPath — using default');
    return undefined;
  }
}

function resolveLangPath(): string | undefined {
  try {
    // FIX (BUG 1): Use locally installed @tesseract.js-data/eng instead of CDN.
    // This package must be listed in package.json dependencies.
    const pkg = require.resolve('@tesseract.js-data/eng/package.json');
    // 4.0.0_best_int is the "best integer" model — good balance of accuracy + speed
    const p = path.join(path.dirname(pkg), '4.0.0_best_int');
    require('fs').accessSync(path.join(p, 'eng.traineddata.gz'));
    return p;
  } catch {
    // If local data package is not installed, fall back to CDN (development only).
    // Production MUST have @tesseract.js-data/eng installed.
    console.warn('[receiptVerifier] @tesseract.js-data/eng not found — falling back to CDN (install it for production!)');
    return undefined;
  }
}

const WORKER_PATH = resolveWorkerPath();
const LANG_PATH   = resolveLangPath();

// ── Singleton Tesseract worker ────────────────────────────────────────────────
// One worker per serverless instance lifetime. Eliminates repeated cold-start
// costs and avoids any re-initialization of the traineddata load.
//
// On Vercel: each cold start pays the ~1-2s init cost once, then all subsequent
// requests on the same instance (~1s each) skip initialization entirely.

let _workerPromise: Promise<Worker> | null = null;

function getWorker(): Promise<Worker> {
  if (!_workerPromise) {
    _workerPromise = createWorker('eng', 1, {
      logger: () => {},           // silence progress logs in production
      ...(WORKER_PATH ? { workerPath: WORKER_PATH } : {}),
      ...(LANG_PATH   ? { langPath:   LANG_PATH   } : {}),
    }).catch((err) => {
      // If worker init fails, clear the singleton so the next request retries.
      _workerPromise = null;
      throw err;
    });
  }
  return _workerPromise;
}

// ── QR code scan ──────────────────────────────────────────────────────────────
async function scanQR(buf: Buffer): Promise<string | null> {
  return new Promise(resolve => {
    Jimp.read(buf)
      .then(img => {
        const qr = new QrCode();
        qr.callback = (e: Error | null, v: { result: string } | null) =>
          resolve(e || !v?.result ? null : v.result);
        qr.decode(img.bitmap);
      })
      .catch(() => resolve(null));
  });
}

// ── OCR text extraction ───────────────────────────────────────────────────────
async function ocrImage(buf: Buffer): Promise<string> {
  // FIX (BUG 5): Minimal preprocessing for GCash receipts.
  // GCash uses a clean white card design — text is already dark on white.
  // .normalize() corrects any brightness/exposure issues from the screenshot.
  // We deliberately skip .contrast() — boosting contrast on already-sharp text
  // clips midtones and makes OCR WORSE, not better.
  const img = await Jimp.read(buf);
  img.greyscale().normalize();
  const png = await img.getBufferAsync(Jimp.MIME_PNG);

  const worker = await getWorker();
  const { data } = await worker.recognize(png);
  return data.text;
}

// ── Field parsers (tuned to actual GCash OCR output) ─────────────────────────

function parseRef(t: string): string | null {
  const pats = [
    // Primary: "Ref No." followed by digits — stops before the date (Jul...)
    /Ref\.?\s*No\.?\s*[:\s]+([0-9][\d\s]{8,}?)(?=\s{2,}|\s*[A-Z][a-z]{2,}|\n|$)/im,
    /Reference\s*(?:No\.?|Number)?\s*[:\s]+([0-9][\d\s]{8,}?)(?=\s{2,}|\s*[A-Z][a-z]{2,}|\n|$)/im,
    // Exact GCash format: 4 digits · 3 digits · 6 digits
    /\b([0-9]{4}\s[0-9]{3}\s[0-9]{6})\b/,
    // Fallback: 13–16 consecutive digits
    /\b([0-9]{13,16})\b/,
  ];
  for (const p of pats) {
    const m = t.match(p);
    if (m) return m[1].replace(/\s+/g, '').trim();
  }
  return null;
}

function parseAmount(t: string): number | null {
  const pats = [
    // FIX (BUG 3): Accept £ as OCR misread of ₱ peso sign
    /Total\s+Amount\s+Sent\s+[₱P£$]?\s*([\d,]+\.?\d*)/i,
    /Amount\s+Sent\s+[₱P£$]?\s*([\d,]+\.?\d*)/i,
    // Peso/pound sign immediately before number
    /[₱£]\s*([\d,]+\.\d{2})/,
    // Amount on its own row
    /^Amount\s+([\d,]+\.\d{2})\s*$/im,
  ];
  for (const p of pats) {
    const m = t.match(p);
    if (m) {
      const n = parseFloat(m[1].replace(/,/g, ''));
      if (!isNaN(n) && n > 0) return n;
    }
  }
  return null;
}

function parseDate(t: string): string | null {
  // FIX (BUG 4): Handle GCash compressed date format like "Jul17,2026" (no space)
  // Also handles "Jul 17, 2026", "Jul 24,2026" etc.
  const pats = [
    // With time: "Jul17,2026 7:22 PM" or "Jul 24,2026 7:03 AM"
    /([A-Za-z]{3}\s*\d{1,2},?\s*\d{4}\s+\d{1,2}:\d{2}\s*(?:AM|PM)?)/i,
    // Without time: "Jul 17, 2026" or "Jul17,2026"
    /([A-Za-z]{3}\s*\d{1,2},?\s*\d{4})/i,
  ];
  for (const p of pats) {
    const m = t.match(p);
    if (m) return m[1].trim();
  }
  return null;
}

function parseMobile(t: string): string | null {
  const m = t.match(/(\+63\s?[\d\s]{10,14}|09\d{2}[\s\-]?\d{3}[\s\-]?\d{4})/);
  return m ? m[1].replace(/\s/g, '') : null;
}

function isGCashQR(p: string): boolean {
  return p.startsWith('000201') || p.includes('gcash.com') || (p.includes('PH') && p.length > 20);
}

// ── Main verification ─────────────────────────────────────────────────────────
export async function verifyGCashReceipt(
  buf: Buffer,
  opts: {
    expectedAmount: number;
    testMode: boolean;
    priceTolerance: number;
    maxAgeDays?: number;
    affiliateCode?: string | null;
    customerId?: string | null;
    productName?: string;
  }
): Promise<VerifyResult> {
  const {
    expectedAmount, testMode, priceTolerance, maxAgeDays = 3,
    affiliateCode, customerId, productName = 'Ministry Product',
  } = opts;
  const warnings: string[] = [];
  const imageHash = hashImage(buf);

  // ── Anti-editing: reject tampered/reused image hash ────────────────────────
  if (!testMode) {
    try {
      if (await isHashUsed(imageHash)) {
        return {
          valid: false,
          reason: 'This image has already been submitted. Do not edit or re-screenshot your receipt — upload the original file saved from the GCash app.',
        };
      }
    } catch {
      // Supabase temporarily unavailable — continue with verification
      warnings.push('Anti-duplicate check temporarily unavailable (Supabase)');
    }
  }

  // ── QR code scan ───────────────────────────────────────────────────────────
  // Best-effort only. GCash receipts DO contain a QR but it's not critical.
  // We don't fail hard on QR scan error — OCR is the authoritative check.
  let qrPayload: string | null = null;
  try {
    qrPayload = await scanQR(buf);
  } catch {
    warnings.push('QR scan skipped — using OCR verification only');
  }

  if (!qrPayload || !isGCashQR(qrPayload)) {
    // Non-fatal in all modes — log it but never reject based on QR alone
    warnings.push('No GCash QR code detected in image — continuing with OCR verification');
  }

  // ── OCR ────────────────────────────────────────────────────────────────────
  let rawText = '';
  try {
    rawText = await ocrImage(buf);
  } catch (err) {
    console.error('[receiptVerifier] OCR failed:', err);
    return {
      valid: false,
      reason: 'Could not read text from the uploaded image. Please upload a clear, unedited screenshot saved directly from the GCash app.',
    };
  }

  // Loose check — only two keywords needed (both always present on GCash receipts)
  const looksLikeReceipt =
    /ref\.?\s*no/i.test(rawText) ||
    /total amount sent/i.test(rawText) ||
    /gcash/i.test(rawText) ||
    /sent via/i.test(rawText);

  if (!looksLikeReceipt && !testMode) {
    return {
      valid: false,
      reason: 'This does not look like a GCash receipt. Please upload the payment receipt screenshot saved from the GCash app.',
    };
  }

  // ── Extract fields ──────────────────────────────────────────────────────────
  const refNumber    = parseRef(rawText);
  const amount       = parseAmount(rawText);
  const dateStr      = parseDate(rawText);
  const mobileNumber = parseMobile(rawText);

  // Log for debugging (visible in Vercel function logs)
  console.log('[receiptVerifier] OCR extracted:', {
    refNumber, amount, dateStr, mobileNumber: mobileNumber ? '***masked***' : null,
    textLength: rawText.length, testMode,
  });

  // ── Ref number anti-replay ─────────────────────────────────────────────────
  if (!refNumber && !testMode) {
    return {
      valid: false,
      reason: 'Cannot find the reference number on the receipt. Make sure the receipt is not cropped and the Ref No. row is fully visible.',
    };
  }

  if (refNumber) {
    try {
      if (await isRefUsed(refNumber)) {
        return {
          valid: false,
          reason: `Reference No. ${refNumber} has already been used to unlock a download. Each payment receipt can only be used once.`,
        };
      }
    } catch {
      warnings.push('Anti-replay check temporarily unavailable (Supabase)');
    }
  }

  // ── Amount check ───────────────────────────────────────────────────────────
  if (!testMode) {
    if (amount === null) {
      return {
        valid: false,
        reason: 'Cannot read the payment amount from the receipt. Please upload a clearer screenshot with the full receipt visible.',
      };
    }
    if (Math.abs(amount - expectedAmount) > priceTolerance) {
      return {
        valid: false,
        reason: `Payment amount ₱${amount.toFixed(2)} does not match the required amount ₱${expectedAmount.toFixed(2)}. Please pay the exact amount shown on this page.`,
      };
    }
  } else {
    if (amount !== null) {
      warnings.push(`TEST MODE: Amount check skipped — found ₱${amount.toFixed(2)}, expected ₱${expectedAmount.toFixed(2)}`);
    } else {
      warnings.push('TEST MODE: Amount not found in receipt — skipped');
    }
  }

  // ── Date freshness check ───────────────────────────────────────────────────
  if (!testMode && dateStr) {
    try {
      // Normalize compressed GCash date "Jul17,2026" → "Jul 17,2026" for Date parsing
      const normalized = dateStr.replace(/([A-Za-z]{3})(\d)/, '$1 $2').replace(/,(\d{4})/, ', $1');
      const d = new Date(normalized);
      if (!isNaN(d.getTime())) {
        const ageDays = (Date.now() - d.getTime()) / 86400000;
        if (ageDays > maxAgeDays) {
          return {
            valid: false,
            reason: `This receipt is ${Math.floor(ageDays)} days old. Please use a receipt from within the last ${maxAgeDays} days.`,
          };
        }
      }
    } catch {
      warnings.push('Could not parse receipt date — date check skipped');
    }
  }

  // ── Persist to Supabase ────────────────────────────────────────────────────
  // Write after ALL validation passes. Non-fatal on error (Supabase can be
  // briefly unavailable without breaking the payment flow).
  if (refNumber) {
    try {
      await markReceiptUsed(refNumber, imageHash, amount ?? 0, dateStr ?? '');
      await recordPurchase(refNumber, amount ?? 0, productName, affiliateCode, customerId);
    } catch (err) {
      // Non-fatal: the customer already paid and their receipt is valid.
      // The Supabase write will fail silently and the download still proceeds.
      console.warn('[receiptVerifier] Supabase write error (non-fatal):', err);
      warnings.push('Purchase record could not be saved to database (non-fatal)');
    }
  }

  return {
    valid: true,
    data: {
      referenceNumber: refNumber || 'N/A',
      amount: amount ?? 0,
      dateStr: dateStr || 'N/A',
      mobileNumber: mobileNumber || undefined,
      imageHash,
    },
    warnings: warnings.filter(Boolean),
  };
}
