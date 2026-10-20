// src/lib/paymentChannels.ts — v5
// ─────────────────────────────────────────────────────────────────────────────
// Payment channel registry + detection. Pure functions (no I/O) so the same
// module is used by the API verifier, the checkout UI and the test-suite.
//
// TERMS
//   primary     GCash. Customer sends straight from the GCash app.
//   bridge      Customer pays from another app (Maya, BPI, GoTyme …). The app
//               uses InstaPay to deliver the money to our G-Xchange/GCash
//               account. Receipt shows destination = G-Xchange / GCash.
//   standalone  Customer pays inside the same network (e.g. Maya → Maya). Only
//               accepted when the owner enables it AND configures a matching
//               account (PAYMENT_STANDALONE_ACCOUNTS) — see verifier.
//
// ROTATION / PORTABILITY
//   NEXT_PUBLIC_PAYMENT_CHANNELS_ENABLED   comma list, order = display order
//   PAYMENT_DEST_TOKENS                    comma list of recipient identifiers;
//                                          add a new token to rotate accounts,
//                                          old tokens keep working until removed.
// ─────────────────────────────────────────────────────────────────────────────

export type ChannelId =
  | 'gcash' | 'maya' | 'instapay' | 'security_bank' | 'maribank'
  | 'bpi' | 'gotyme' | 'bdo' | 'unionbank';

export type Route = 'direct_gcash' | 'bridge_instapay_gcash' | 'standalone' | 'unknown';

export interface ChannelInfo {
  id: ChannelId;
  label: string;
  kind: 'ewallet' | 'bank' | 'network';
  primary?: boolean;
  /** Where the customer finds a savable receipt in that app */
  receiptTip: string;
}

export const CHANNELS: Record<ChannelId, ChannelInfo> = {
  gcash: { id: 'gcash', label: 'GCash', kind: 'ewallet', primary: true,
    receiptTip: 'In GCash open Transactions → tap your payment → View Receipt → Download/Save the full receipt.' },
  maya: { id: 'maya', label: 'Maya', kind: 'ewallet',
    receiptTip: 'In Maya open the transaction in Activity and save/share the full receipt screen (it must show Account number, Transfer Fee and Reference ID).' },
  instapay: { id: 'instapay', label: 'InstaPay (any bank)', kind: 'network',
    receiptTip: 'Save the full InstaPay transfer confirmation from your banking app — the InstaPay logo and reference number must be visible.' },
  security_bank: { id: 'security_bank', label: 'Security Bank', kind: 'bank',
    receiptTip: 'Use the "Bank Transfer Successful" receipt from the app or the confirmation email — include the whole card down to the Transaction Reference Number.' },
  maribank: { id: 'maribank', label: 'MariBank', kind: 'bank',
    receiptTip: 'Open the Transfer Result / Transaction Details screen and save it fully, from the amount down to Transfer Method.' },
  bpi: { id: 'bpi', label: 'BPI', kind: 'bank',
    receiptTip: 'On the "Transfer successful!" screen tap "Show other details" first, then save the full screen so Transfer amount, Fee and Transaction Ref. No. are visible.' },
  gotyme: { id: 'gotyme', label: 'GoTyme Bank', kind: 'bank',
    receiptTip: 'Save the "Transferred" screen with Amount, Fee, Total, Trace ID and Reference No. all visible.' },
  bdo: { id: 'bdo', label: 'BDO', kind: 'bank',
    receiptTip: 'On the "Sent!" screen tap Save Image — keep the Reference no. and Invoice number in the picture.' },
  unionbank: { id: 'unionbank', label: 'UnionBank (UD)', kind: 'bank',
    receiptTip: 'Open the transaction in UnionBank and save the full receipt including the Amount Breakdown and Reference No.' },
};

const DEFAULT_ENABLED: ChannelId[] =
  ['gcash', 'maya', 'instapay', 'security_bank', 'maribank', 'bpi', 'gotyme', 'bdo', 'unionbank'];

/** Enabled channels in display order (GCash is always first / always on). */
export function getEnabledChannels(): ChannelInfo[] {
  const raw = process.env.NEXT_PUBLIC_PAYMENT_CHANNELS_ENABLED || '';
  const ids = raw
    ? raw.split(',').map(s => s.trim().toLowerCase()).filter((s): s is ChannelId => s in CHANNELS)
    : DEFAULT_ENABLED;
  const ordered = Array.from(new Set<ChannelId>(['gcash', ...ids]));
  return ordered.map(id => CHANNELS[id]);
}

export function isChannelEnabled(id: ChannelId): boolean {
  return getEnabledChannels().some(c => c.id === id);
}

// ── OCR normalisation ────────────────────────────────────────────────────────
// Tesseract regularly mangles a handful of brand strings. Fix those first so
// every downstream regex can stay simple.
export function normalizeOcr(raw: string): string {
  return raw
    .replace(/\r/g, '')
    .replace(/[ \t]+/g, ' ')
    // brand repairs
    .replace(/\binsta\s*[Fp]ay\b/gi, 'InstaPay')
    .replace(/\binstaray\b/gi, 'InstaPay')
    .replace(/\binsta\s*Pay['’`]?/gi, 'InstaPay')
    .replace(/G\s*[-–—]?\s*X\s*change/gi, 'G-Xchange')
    .replace(/\bGo\s*Tyme\b/gi, 'GoTyme')
    .replace(/\bMari\s*Bank\b/gi, 'MariBank')
    .trim();
}

// ── Channel detection ────────────────────────────────────────────────────────
interface Cue { re: RegExp; w: number }
const CUES: Record<ChannelId, Cue[]> = {
  gcash: [
    { re: /Total\s+Amount\s+Sent/i, w: 4 },
    { re: /Sent\s+via\s+GCash/i, w: 4 },
    { re: /Express\s+Send/i, w: 3 },
    { re: /\b\d{4}\s\d{3}\s\d{6}\b/, w: 3 },              // GCash Ref No. 9042 996 774496
    { re: /Ref\.?\s*No\.?\s*\d{4}\s?\d{3}\s?\d{6}/i, w: 3 },
    { re: /\bMynt\b/i, w: 2 },
  ],
  maya: [
    { re: /\bmaya\b/i, w: 3 },
    { re: /Pay\s?Maya/i, w: 3 },
    { re: /Sent\s+money\s+via/i, w: 2 },
    { re: /My\s+Wallet/i, w: 2 },
    { re: /Bank\s+transfer\s+to/i, w: 1 },
  ],
  bpi: [
    { re: /Sent\s+via\s+BPI/i, w: 5 },
    { re: /\bBPI\b/, w: 3 },
    { re: /Confirmation\s+No\.?/i, w: 2 },
  ],
  bdo: [
    { re: /BDO\s*pay/i, w: 5 },
    { re: /\bBDO\b/, w: 3 },
    { re: /\bBN-\d{8}-\d{6,}\b/, w: 4 },
    { re: /SA\s*W\/\s*ATM/i, w: 2 },
    { re: /Invoice\s+(?:no\.?|number)/i, w: 1 },
  ],
  maribank: [
    { re: /MariBank/i, w: 5 },
    { re: /Transfer\s+Result/i, w: 1 },
  ],
  gotyme: [
    { re: /GoTyme/i, w: 5 },
    { re: /\bITO\d{10,}\b/, w: 4 },
    { re: /Trace\s+ID/i, w: 1 },
  ],
  unionbank: [
    { re: /Union\s*Bank/i, w: 5 },
    { re: /\bUD\s*Save\b/i, w: 4 },
    { re: /\bUD\d{10,}\b/, w: 4 },
    { re: /Instruction\s+ID/i, w: 2 },
  ],
  security_bank: [
    { re: /Security\s*Bank/i, w: 6 },
    { re: /BANK\s+TRANSFER\s+SUCCESSFUL/i, w: 3 },
    { re: /Amounting\s+to/i, w: 2 },
    { re: /Total\s+Amount\s+Deducted/i, w: 2 },
  ],
  instapay: [
    { re: /InstaPay/i, w: 1 },
  ],
};

export interface Detection {
  channel: ChannelId | 'unknown';
  score: number;
  route: Route;
  mentionsGcashDestination: boolean;
  mentionsInstaPay: boolean;
}

const PRIORITY: ChannelId[] = ['bpi', 'bdo', 'maribank', 'gotyme', 'unionbank', 'maya', 'security_bank', 'gcash', 'instapay'];

export function detectChannel(text: string): Detection {
  const t = normalizeOcr(text);
  const scores: Partial<Record<ChannelId, number>> = {};
  for (const id of Object.keys(CUES) as ChannelId[]) {
    scores[id] = CUES[id].reduce((s, c) => s + (c.re.test(t) ? c.w : 0), 0);
  }
  const mentionsInstaPay = /InstaPay/i.test(t);
  const mentionsGcashDestination = /G-Xchange|GCASH/i.test(t);

  // A bridge receipt ALWAYS mentions GCash (as destination). GCash is only the
  // SOURCE channel when native GCash cues exist and no bank/e-wallet scored.
  const sourceCandidates = PRIORITY.filter(id => id !== 'gcash' && id !== 'instapay');
  let best: ChannelId | 'unknown' = 'unknown';
  let bestScore = 0;
  for (const id of sourceCandidates) {
    const s = scores[id] || 0;
    if (s > bestScore) { best = id; bestScore = s; }
  }
  const gcashScore = scores.gcash || 0;

  if (bestScore < 3) {
    if (gcashScore >= 3 && !mentionsInstaPay) { best = 'gcash'; bestScore = gcashScore; }
    else if (mentionsInstaPay) { best = 'instapay'; bestScore = scores.instapay || 1; }
    else if (/GCASH/i.test(t)) { best = 'gcash'; bestScore = 1; }
    else { best = 'unknown'; bestScore = 0; }
  } else if (gcashScore >= 6 && !mentionsInstaPay && bestScore <= 3) {
    best = 'gcash'; bestScore = gcashScore;
  }

  let route: Route = 'unknown';
  if (best === 'gcash') route = 'direct_gcash';
  else if (best !== 'unknown') route = mentionsGcashDestination && mentionsInstaPay ? 'bridge_instapay_gcash'
    : mentionsGcashDestination ? 'bridge_instapay_gcash' : 'standalone';

  return { channel: best, score: bestScore, route, mentionsGcashDestination, mentionsInstaPay };
}

// ── Destination (recipient) matching ─────────────────────────────────────────
// Receipt text is noisy; receipts MASK the recipient's name/number; and
// multi-line wrapping splits account numbers. We therefore:
//   • squash the receipt to [A-Za-z0-9] and look for alnum tokens,
//   • compare digit tokens by their last 7 digits,
//   • turn masked names ("JH****O JO*N B.") into an OCR-tolerant regex.
const OCR_CLASS: Record<string, string> = {
  O: '[OoQq0g]', Q: '[OoQq0g]', '0': '[OoQq0g]',
  J: '[JjIiLs]', H: '[HhsS]', N: '[Nn]', B: '[B8]', I: '[Il1]', L: '[Il1L]',
};

const STAR = '[^A-Za-z0-9\\s]{0,8}';
function maskedNameRegex(token: string): RegExp {
  const parts = token.trim().split(/\s+/).map(w => {
    let out = '';
    for (const ch of w) {
      if (ch === '*') { if (!out.endsWith(STAR)) out += STAR; continue; }
      if (ch === '.') { out += '\\.?'; continue; }
      out += OCR_CLASS[ch.toUpperCase()] || ch.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }
    return out;
  });
  return new RegExp(parts.join('\\s*'), 'i');
}

export function getDestTokens(): string[] {
  const explicit = (process.env.PAYMENT_DEST_TOKENS || '').split(',').map(s => s.trim()).filter(Boolean);
  if (explicit.length) return explicit;
  const num = (process.env.NEXT_PUBLIC_GCASH_NUMBER || '').replace(/\D/g, '');
  return num.length >= 7 && !/X/i.test(process.env.NEXT_PUBLIC_GCASH_NUMBER || '') ? [num] : [];
}

export type DestMode = 'strict' | 'warn' | 'off';
export function getDestMode(): DestMode {
  const m = (process.env.PAYMENT_DEST_CHECK || '').toLowerCase();
  if (m === 'strict' || m === 'warn' || m === 'off') return m;
  return (process.env.PAYMENT_DEST_TOKENS || '').trim() ? 'strict' : 'warn';
}

export function matchDestination(text: string, tokens = getDestTokens()): { matched: boolean; hit?: string } {
  if (!tokens.length) return { matched: false };
  const squashed = text.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
  const digits = text.replace(/\D/g, '');
  for (const tok of tokens) {
    if (/\*/.test(tok)) {
      if (maskedNameRegex(tok).test(text)) return { matched: true, hit: 'name' };
      continue;
    }
    const alnum = tok.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
    if (!alnum) continue;
    if (/^\d+$/.test(alnum)) {
      const tail = alnum.slice(-7);
      if (tail.length >= 4 && digits.includes(tail)) return { matched: true, hit: 'number' };
    } else if (squashed.includes(alnum)) {
      return { matched: true, hit: 'account' };
    } else if (alnum.length >= 4 && alnum.length <= 8) {
      // tolerate one OCR slip between O / 0 / Q on a masked account tail (4PDO ↔ 4PD0)
      const loose = alnum.replace(/[O0Q]/g, '[O0Q]');
      if (new RegExp(loose).test(squashed)) return { matched: true, hit: 'account' };
    }
  }
  return { matched: false };
}

// ── Standalone accounts (optional) ───────────────────────────────────────────
// PAYMENT_STANDALONE_ACCOUNTS='{"maya":["09171234567","J Balasa"],"bpi":["1234567890"]}'
export function getStandaloneTokens(channel: ChannelId): string[] {
  try {
    const obj = JSON.parse(process.env.PAYMENT_STANDALONE_ACCOUNTS || '{}');
    const v = obj?.[channel];
    return Array.isArray(v) ? v.map(String) : [];
  } catch { return []; }
}
