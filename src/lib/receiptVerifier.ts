// src/lib/receiptVerifier.ts — v4
// ─────────────────────────────────────────────────────────────────────────────
// BUGFIX EXPLANATION:
// tesseract.js's createWorker() spawns a Node worker_thread. It resolves the
// worker script relative to the CALLING module's __dirname. When Next.js
// bundles the API route into .next/server/chunks/, __dirname becomes a path
// inside .next/ — but the worker-script/node/index.js file is only in
// node_modules/tesseract.js/src/. The file doesn't exist inside .next/ → crash.
//
// FIX: We require.resolve() the real on-disk path from node_modules and pass it
// as `workerPath` explicitly, so tesseract.js NEVER tries to guess .next/.
// We also use a module-level singleton to reuse the worker across requests
// (init only once = faster, and avoids re-triggering the path issue).
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
  data?: { referenceNumber: string; amount: number; dateStr: string; mobileNumber?: string; imageHash: string; };
  warnings?: string[];
}

// ── Image hash for anti-editing ───────────────────────────────────────────────
export function hashImage(buf: Buffer): string {
  return crypto.createHash('sha256').update(buf).digest('hex');
}

// ── Singleton Tesseract worker — avoids .next/ path resolution bug ────────────
let _worker: Promise<Worker> | null = null;

function getWorker(): Promise<Worker> {
  if (!_worker) {
    _worker = (async () => {
      // Resolve the REAL on-disk path — never relative to .next/
      let workerPath: string | undefined;
      try {
        const pkg = require.resolve('tesseract.js/package.json');
        workerPath = path.join(path.dirname(pkg), 'src', 'worker-script', 'node', 'index.js');
      } catch {
        // If resolve fails (edge case), let tesseract try its default
        workerPath = undefined;
      }
      return createWorker('eng', 1, {
        logger: () => {},
        ...(workerPath ? { workerPath } : {}),
      });
    })();
  }
  return _worker;
}

// ── QR code scan ──────────────────────────────────────────────────────────────
async function scanQR(buf: Buffer): Promise<string | null> {
  return new Promise(resolve => {
    Jimp.read(buf).then(img => {
      const qr = new QrCode();
      qr.callback = (e: Error | null, v: { result: string } | null) => resolve(e || !v ? null : v.result);
      qr.decode(img.bitmap);
    }).catch(() => resolve(null));
  });
}

// ── OCR text extraction ───────────────────────────────────────────────────────
async function ocr(buf: Buffer): Promise<string> {
  const img = await Jimp.read(buf);
  img.greyscale().contrast(0.35).normalize();
  const png = await img.getBufferAsync(Jimp.MIME_PNG);
  const w = await getWorker();
  const { data } = await w.recognize(png);
  return data.text;
}

// ── Field parsers ─────────────────────────────────────────────────────────────
function parseRef(t: string): string | null {
  const pats = [
    /Ref\.?\s*No\.?\s*[:\s]*([0-9][\d\s]{8,20})/i,
    /Reference\s*(?:No\.?|Number)\s*[:\s]*([0-9][\d\s]{8,20})/i,
    /\b([0-9]{4}\s[0-9]{3}\s[0-9]{6})\b/,
    /\b([0-9]{13,16})\b/,
  ];
  for (const p of pats) { const m = t.match(p); if (m) return m[1].replace(/\s+/g,''); }
  return null;
}

function parseAmount(t: string): number | null {
  const pats = [/Total\s+Amount\s+Sent\s+[₱P]?\s*([\d,]+\.?\d*)/i, /[₱P]\s*([\d,]+\.\d{2})/, /Amount\s+([\d,]+\.\d{2})/i];
  for (const p of pats) {
    const m = t.match(p);
    if (m) { const n = parseFloat(m[1].replace(/,/g,'')); if (!isNaN(n) && n > 0) return n; }
  }
  return null;
}

function parseDate(t: string): string | null {
  const m = t.match(/([A-Za-z]{3,9}\s+\d{1,2},?\s+\d{4}\s+\d{1,2}:\d{2}\s*(?:AM|PM)?)/i)
         || t.match(/(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/);
  return m ? m[1].trim() : null;
}

function parseMobile(t: string): string | null {
  const m = t.match(/(\+63\s?[\d\s]{10,14}|09\d{2}[\s\-]?\d{3}[\s\-]?\d{4})/);
  return m ? m[1].replace(/\s/g,'') : null;
}

function isGCashQR(p: string): boolean {
  return p.startsWith('000201') || p.includes('gcash.com') || (p.includes('PH') && p.length > 20);
}

// ── Main verification ─────────────────────────────────────────────────────────
export async function verifyGCashReceipt(
  buf: Buffer,
  opts: { expectedAmount: number; testMode: boolean; priceTolerance: number; maxAgeDays?: number; affiliateCode?: string | null; customerId?: string | null; productName?: string;}
): Promise<VerifyResult> {
  const { expectedAmount, testMode, priceTolerance, maxAgeDays = 3, affiliateCode, customerId,  productName = 'The Fundamentals' } = opts;
  const warnings: string[] = [];
  const imageHash = hashImage(buf);

  // ── Anti-editing: reject tampered/reused image hash ────────────────────
  if (!testMode) {
    let hashUsed = false;
    try { hashUsed = await isHashUsed(imageHash); } catch { /* sb offline */ }
    if (hashUsed) return { valid: false, reason: 'This image has already been submitted. Please use the original, unedited GCash receipt screenshot.' };
  }

  // ── QR scan ────────────────────────────────────────────────────────────
  let qrPayload: string | null = null;
  try { qrPayload = await scanQR(buf); } catch { warnings.push('QR scan error — using OCR only'); }

  if (!qrPayload || !isGCashQR(qrPayload)) {
    if (!testMode) warnings.push('No valid GCash QR detected in image');
  }

  // ── OCR ────────────────────────────────────────────────────────────────
  let rawText = '';
  try { rawText = await ocr(buf); }
  catch { return { valid: false, reason: 'Cannot read text from image. Please upload a clear, unedited GCash receipt screenshot.' }; }

  const looksLikeReceipt = /gcash/i.test(rawText) || /ref\.?\s*no/i.test(rawText) || /total amount sent/i.test(rawText) || /sent via/i.test(rawText);
  if (!looksLikeReceipt && !testMode) {
    return { valid: false, reason: 'This does not look like a GCash receipt. Please upload your GCash payment receipt screenshot.' };
  }

  const refNumber    = parseRef(rawText);
  const amount       = parseAmount(rawText);
  const dateStr      = parseDate(rawText);
  const mobileNumber = parseMobile(rawText);

  // ── Ref number anti-replay ─────────────────────────────────────────────
  if (!refNumber && !testMode) {
    return { valid: false, reason: 'Cannot find the reference number. Make sure the receipt is not cropped and is clearly visible.' };
  }
  if (refNumber) {
    let refUsed = false;
    try { refUsed = await isRefUsed(refNumber); } catch { /* sb offline */ }
    if (refUsed) return { valid: false, reason: `Ref No. ${refNumber} has already been used. Each receipt can only be used once.` };
  }

  // ── Amount check ───────────────────────────────────────────────────────
  if (!testMode) {
    if (amount === null) return { valid: false, reason: 'Cannot read the payment amount. Please upload a clearer screenshot.' };
    if (Math.abs(amount - expectedAmount) > priceTolerance) {
      return { valid: false, reason: `Amount ₱${amount.toFixed(2)} does not match ₱${expectedAmount.toFixed(2)}. Please pay the exact amount.` };
    }
  } else {
    warnings.push(`TEST MODE: Amount check skipped (found ₱${amount?.toFixed(2) ?? '?'}, expected ₱${expectedAmount.toFixed(2)})`);
  }

  // ── Date freshness ─────────────────────────────────────────────────────
  if (!testMode && dateStr) {
    const d = new Date(dateStr.replace(/,/g,''));
    if (!isNaN(d.getTime()) && (Date.now() - d.getTime()) / 86400000 > maxAgeDays) {
      return { valid: false, reason: `Receipt is too old (>${maxAgeDays} days). Please use a recent receipt.` };
    }
  }

  // ── Persist to Supabase ────────────────────────────────────────────────
  if (refNumber) {
    try {
      await markReceiptUsed(refNumber, imageHash, amount ?? 0, dateStr ?? '');
      await recordPurchase(refNumber, amount ?? 0, productName, affiliateCode, customerId);
    } catch (err) { console.warn('[verifier] Supabase write error (non-fatal):', err); }
  }

  return {
    valid: true,
    data: { referenceNumber: refNumber || 'N/A', amount: amount ?? 0, dateStr: dateStr || 'N/A', mobileNumber: mobileNumber || undefined, imageHash },
    warnings: warnings.filter(Boolean),
  };
}
