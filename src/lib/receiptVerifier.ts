// src/lib/receiptVerifier.ts — v5
// ─────────────────────────────────────────────────────────────────────────────
// Multi-channel receipt verification (GCash primary + Maya / InstaPay / Security
// Bank / MariBank / BPI / GoTyme / BDO / UnionBank, standalone or bridged to
// GCash through InstaPay).
//
// PIPELINE (each step has its own, channel-aware error — see receiptErrors.ts)
//   1  anti-editing   editor fingerprints (Photoshop/Canva/…) + SHA-256 image hash
//   2  decode         sharp (JPG/PNG/WEBP)
//   3  OCR            multi-pass, model escalation (ocrEngine.ts)
//   4  parse          price · account type/number/name · fee · reference id ·
//                     InstaPay ref no  (receiptParser.ts) — all other text ignored
//   5  channel/route  direct GCash · bridge via InstaPay · standalone
//   6  recipient      receipt must show OUR account (PAYMENT_DEST_TOKENS)
//   7  stability      amount + fee = total, repeated amounts agree, no future date
//   8  amount         backend price-threshold window (priceThreshold.ts)
//   9  freshness      receipt age ≤ RECEIPT_MAX_AGE_DAYS
//  10  anti-replay    EVERY reference on the receipt is checked + unique-constraint claim
// ─────────────────────────────────────────────────────────────────────────────
import crypto from 'crypto';
import { findUsedKey, isHashUsed, recordVerifiedReceipt, type Attribution } from '@/lib/supabase';
import { readReceipt, inspectImage, detectEditorSignature } from '@/lib/ocrEngine';
import { judgeAmount, getPriceWindow } from '@/lib/priceThreshold';
import {
  getEnabledChannels, isChannelEnabled, matchDestination, getDestTokens, getDestMode,
  getStandaloneTokens, type ChannelId, type Route,
} from '@/lib/paymentChannels';
import { buildError, type ReceiptError } from '@/lib/receiptErrors';
import type { ParsedReceipt } from '@/lib/receiptParser';

export interface VerifyOptions {
  productSlug: string;
  productName: string;
  /** CATALOG price (what the UI shows). The threshold is applied internally. */
  expectedAmount: number;
  testMode: boolean;
  priceTolerance: number;
  maxAgeDays?: number;
  now?: Date;
  affiliateCode?: string | null;
  customerId?: string | null;
  isNewCustomer?: boolean;
  attribution?: Attribution | null;
  /** false → verify only, never write to the database (used by tests) */
  persist?: boolean;
  supportEmail?: string;
}

export interface VerifiedData {
  referenceNumber: string;
  amount: number;
  dateStr: string;
  mobileNumber?: string;
  imageHash: string;
  channel: ChannelId;
  channelLabel: string;
  route: Route;
  transferFee: number | null;
  instapayRefNo: string | null;
}

export type VerifyResult =
  | { valid: true; data: VerifiedData; warnings: string[] }
  | { valid: false; error: ReceiptError; warnings: string[]; /** legacy flat text */ reason: string };

export function hashImage(buf: Buffer): string {
  return crypto.createHash('sha256').update(buf).digest('hex');
}

// STRICT_DB=true → if Supabase is unreachable, refuse (fail CLOSED) instead of
// letting a possible replay through. Default keeps v4 behaviour (fail open) so a
// database blip never strands a customer who has really paid.
const STRICT_DB = process.env.STRICT_DB === 'true';

const fail = (error: ReceiptError, warnings: string[]): VerifyResult =>
  ({ valid: false, error, warnings, reason: `${error.title}. ${error.message}` });

// ── anti-replay keys ─────────────────────────────────────────────────────────
// STRONG refs (≥10 chars: GCash Ref No., BPI confirmation, BN-…, ITO…, UD…, MBADD…)
// are keyed per channel. WEAK refs (6-digit InstaPay refs / trace IDs) are
// keyed with channel + amount so two banks that happen to emit the same
// 6 digits can never block each other.
export function buildReplayKeys(p: ParsedReceipt, channel: ChannelId, amountForKey: number) {
  const amt = Math.round(amountForKey * 100);
  const mk = (value: string, strong: boolean) =>
    strong ? (channel === 'gcash' ? value : `${channel}:${value}`) : `weak:${channel}:${amt}:${value}`;
  const refs = new Map<string, boolean>();
  for (const r of p.allRefs) refs.set(r.value, r.strong);
  if (p.referenceId && !refs.has(p.referenceId)) refs.set(p.referenceId, p.referenceId.length >= 10);
  const keys = Array.from(refs.entries()).map(([v, strong]) => mk(v, strong));
  const primary = p.referenceId ? mk(p.referenceId, p.referenceId.length >= 10) : keys[0];
  return { keys: Array.from(new Set(keys)), primary };
}

// ── main entry ───────────────────────────────────────────────────────────────
export async function verifyReceipt(buf: Buffer, opts: VerifyOptions): Promise<VerifyResult> {
  const {
    expectedAmount, testMode, priceTolerance, maxAgeDays = 3, productSlug, productName,
    affiliateCode, customerId, now = new Date(), persist = true, supportEmail,
  } = opts;
  const warnings: string[] = [];
  const imageHash = hashImage(buf);
  const ctx = { expected: expectedAmount, productName, maxAgeDays, supportEmail };

  // 1 ── anti-editing: tool fingerprints + duplicate image ─────────────────────
  if (!testMode) {
    const sig = detectEditorSignature(buf);
    if (sig) return fail(buildError('EDITED_IMAGE', ctx), warnings);
    try {
      if (await isHashUsed(imageHash)) return fail(buildError('DUPLICATE_IMAGE', ctx), warnings);
    } catch {
      if (STRICT_DB) return fail(buildError('SERVER_ERROR', ctx), warnings);
      warnings.push('Anti-duplicate image check temporarily unavailable');
    }
  }

  // 2 ── decode ────────────────────────────────────────────────────────────────
  try { await inspectImage(buf); }
  catch { return fail(buildError('UNREADABLE_IMAGE', ctx), warnings); }

  // 3 ── OCR ───────────────────────────────────────────────────────────────────
  let ocr;
  try { ocr = await readReceipt(buf); }
  catch (err) {
    console.error('[receiptVerifier] OCR failed:', err);
    return fail(buildError('OCR_FAILED', ctx), warnings);
  }
  const p = ocr.parsed;
  const combinedText = ocr.allTexts.join('\n');
  if (combinedText.replace(/\s/g, '').length < 15) return fail(buildError('OCR_FAILED', ctx), warnings);

  // 4/5 ── channel + route ──────────────────────────────────────────────────────
  const destMode = getDestMode();
  const destTokens = getDestTokens();
  const dest = matchDestination(combinedText, destTokens);

  let channel: ChannelId | 'unknown' = p.channel;
  if (channel === 'unknown') {
    // Unlisted bank: accept as generic InstaPay ONLY if it clearly paid our account.
    if ((p.mentionsInstaPay || dest.matched) && (p.referenceId || p.amount !== null || p.headerAmount !== null || p.total !== null)) {
      channel = 'instapay';
      warnings.push('Payment app not recognised — treated as a generic InstaPay transfer');
    } else if (p.completeness < 40) {
      return fail(buildError('NOT_A_RECEIPT', { ...ctx, channel }), warnings);
    } else {
      return fail(buildError('NOT_A_RECEIPT', { ...ctx, channel }), warnings);
    }
  }
  const ch = channel as ChannelId;
  const ectx = { ...ctx, channel: ch, amount: p.amount ?? p.total ?? p.headerAmount ?? undefined, fee: p.fee ?? undefined, reference: p.referenceId ?? undefined };

  if (!isChannelEnabled(ch) && !getEnabledChannels().some(c => c.id === ch)) {
    return fail(buildError('CHANNEL_NOT_ACCEPTED', ectx), warnings);
  }

  let route: Route = p.route;
  if (ch === 'gcash') route = 'direct_gcash';
  else if (p.mentionsGcashDestination || dest.matched) route = 'bridge_instapay_gcash';
  else route = 'standalone';

  if (route === 'standalone' && !testMode) {
    const toks = getStandaloneTokens(ch);
    const ok = toks.length > 0 && matchDestination(combinedText, toks).matched;
    if (!ok) return fail(buildError('STANDALONE_NOT_ACCEPTED', ectx), warnings);
  }

  // 6 ── recipient must be OUR account ────────────────────────────────────────
  if (route !== 'standalone') {
    if (destMode === 'strict' && destTokens.length && !dest.matched) {
      if (!testMode) return fail(buildError('WRONG_RECIPIENT', ectx), warnings);
      warnings.push('TEST MODE: recipient check skipped');
    } else if (destMode === 'warn' && !dest.matched) {
      warnings.push('Recipient could not be confirmed (set PAYMENT_DEST_TOKENS to enforce)');
    }
  }

  // reference ───────────────────────────────────────────────────────────────
  if (!p.referenceId && !testMode) return fail(buildError('MISSING_REFERENCE', ectx), warnings);

  // 7 ── stability / consistency ("unstable text ⇒ rejected") ────────────────
  const eq = (a: number, b: number) => Math.abs(a - b) < 0.011;
  if (!testMode) {
    if (p.amount !== null && p.total !== null && p.fee !== null && !eq(p.amount + p.fee, p.total) && !eq(p.amount, p.total))
      return fail(buildError('UNSTABLE_TEXT', ectx), warnings);
    if (new Set(p.amountMentions.map(v => v.toFixed(2))).size > 1)
      return fail(buildError('UNSTABLE_TEXT', ectx), warnings);
    if (p.headerAmount !== null && p.amount !== null && !eq(p.headerAmount, p.amount) && !(p.total !== null && eq(p.headerAmount, p.total)))
      return fail(buildError('UNSTABLE_TEXT', ectx), warnings);
  }

  // 8 ── amount, using the backend price window ────────────────────────────────
  // Figure checked = what reached us ("Amount"/"Transfer amount") when the
  // receipt states it explicitly, else the total debited / header amount.
  const paid: number | null = p.amount ?? p.total ?? p.headerAmount;
  if (paid === null) {
    if (!testMode) return fail(buildError('MISSING_AMOUNT', ectx), warnings);
    warnings.push('TEST MODE: amount not found in receipt — skipped');
  } else if (!testMode) {
    const verdict = judgeAmount(paid, expectedAmount, priceTolerance);
    if (verdict === 'short') return fail(buildError('AMOUNT_SHORT', { ...ectx, amount: paid }), warnings);
    if (verdict === 'over') return fail(buildError('AMOUNT_OVER', { ...ectx, amount: paid }), warnings);
    const w = getPriceWindow(expectedAmount, priceTolerance);
    if (paid > expectedAmount + priceTolerance) warnings.push(`Accepted with bridge/transfer fee allowance (window ${w.min}–${w.max})`);
  } else {
    warnings.push(`TEST MODE: amount check skipped — found ₱${paid.toFixed(2)}, expected ₱${expectedAmount.toFixed(2)}`);
  }

  // 9 ── freshness ────────────────────────────────────────────────────────────
  if (p.date) {
    const ageDays = (now.getTime() - p.date.getTime()) / 864e5;
    if (!testMode) {
      if (ageDays < -1.5) return fail(buildError('RECEIPT_FUTURE_DATE', ectx), warnings);
      if (ageDays > maxAgeDays) return fail(buildError('RECEIPT_TOO_OLD', { ...ectx, ageDays }), warnings);
    }
  } else {
    warnings.push('No date visible on this receipt — freshness check skipped (single-use reference still enforced)');
  }

  // 10 ── anti-replay ─────────────────────────────────────────────────────────
  const { keys, primary } = buildReplayKeys(p, ch, paid ?? 0);
  if (primary) {
    try {
      const used = await findUsedKey(keys);
      if (used) return fail(buildError('DUPLICATE_REFERENCE', { ...ectx, reference: p.referenceId || used }), warnings);
    } catch {
      if (STRICT_DB && !testMode) return fail(buildError('SERVER_ERROR', ctx), warnings);
      warnings.push('Anti-replay check temporarily unavailable');
    }

    if (persist) {
      try {
        const res = await recordVerifiedReceipt({
          referenceKey: primary, keys, imageHash,
          receiptDate: p.dateStr, paymentChannel: ch, route, productSlug, productName,
          expectedAmount, paidAmount: paid, transferFee: p.fee, totalAmount: p.total ?? p.headerAmount,
          accountType: p.accountType, accountNumber: p.accountNumber, accountName: p.accountName,
          referenceId: p.referenceId, instapayRefNo: p.instapayRefNo, ocrConfidence: p.completeness,
          affiliateCode, customerId, isNewCustomer: opts.isNewCustomer, attribution: opts.attribution,
        });
        if (!res.ok) return fail(buildError('DUPLICATE_REFERENCE', { ...ectx, reference: p.referenceId || primary }), warnings);
      } catch (err) {
        // The customer has paid and the receipt is valid; don't strand them if the DB blips.
        console.warn('[receiptVerifier] Supabase write error (non-fatal):', err);
        warnings.push('Purchase record could not be saved to the database (non-fatal)');
      }
    }
  }

  console.log('[receiptVerifier] ✓', {
    channel: ch, route, paid, fee: p.fee, expected: expectedAmount, passes: ocr.passes.join(','), completeness: p.completeness,
  });

  const info = getEnabledChannels().find(c => c.id === ch);
  return {
    valid: true,
    data: {
      referenceNumber: p.referenceId || 'N/A',
      amount: paid ?? 0,
      dateStr: p.dateStr || 'N/A',
      mobileNumber: p.mobileNumber || undefined,
      imageHash, channel: ch, channelLabel: info?.label || ch, route,
      transferFee: p.fee, instapayRefNo: p.instapayRefNo,
    },
    warnings: warnings.filter(Boolean),
  };
}

/** Backward-compatible name used by v4 callers. */
export const verifyGCashReceipt = verifyReceipt;
