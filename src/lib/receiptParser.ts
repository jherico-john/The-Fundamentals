// src/lib/receiptParser.ts — v5
// ─────────────────────────────────────────────────────────────────────────────
// Turns noisy OCR text from ANY supported channel into a structured receipt.
// Only the fields the business cares about are extracted (everything else on
// the receipt — promos, referral banners, "Share", "Get help" … — is ignored):
//
//   price (amount / total) · account type · account number · account name ·
//   transfer fee · reference id · InstaPay ref no · (date, for freshness)
//
// Layout study (12 real receipts): Maya ×2 layouts, BPI ×2, BDO ×2, MariBank ×2,
// GoTyme, UnionBank, Security Bank e-mail receipt, MariBank→GCash, GCash native.
// ─────────────────────────────────────────────────────────────────────────────
import { detectChannel, normalizeOcr, type ChannelId, type Route } from './paymentChannels';

export interface ParsedReceipt {
  channel: ChannelId | 'unknown';
  route: Route;
  channelScore: number;
  /** Explicit principal ("Amount", "Transfer amount", "Amount Sent") */
  amount: number | null;
  /** Labelled total ("Total", "Total Amount", "Total Amount Deducted") */
  total: number | null;
  /** Big unlabelled amount at the top of the receipt */
  headerAmount: number | null;
  fee: number | null;
  /** Primary bank/wallet reference (long & unique when available) */
  referenceId: string | null;
  /** InstaPay-level reference (Trace ID / Invoice no / InstaPay Ref. No …) */
  instapayRefNo: string | null;
  /** Every reference-like value seen (for anti-replay keys) */
  allRefs: { label: string; value: string; strong: boolean }[];
  accountType: string | null;
  accountNumber: string | null;
  accountName: string | null;
  mobileNumber: string | null;
  dateStr: string | null;
  date: Date | null;
  /** Every labelled money value seen — used by the stability check */
  amountMentions: number[];
  mentionsGcashDestination: boolean;
  mentionsInstaPay: boolean;
  /** 0‑100 completeness score of the core fields */
  completeness: number;
}

// ── helpers ──────────────────────────────────────────────────────────────────
const MONEY_G = /(\d{1,3}(?:,\d{3})+|\d+)\.(\d{2})\b/g;
const MONEY_1 = /(\d{1,3}(?:,\d{3})+|\d+)\.(\d{2})\b/;
const toNum = (s: string) => parseFloat(s.replace(/,/g, ''));

function moneyOnLine(line: string): number | null {
  const m = line.match(MONEY_1);
  return m ? toNum(m[0]) : null;
}
function startsWithMoney(line: string): boolean {
  return /^\W*(?:php|pup|ph|p|£|₱)?\s*-?\s*\d[\d,]*\.\d{2}\b/i.test(line);
}

/** First labelled money value: same line, else the next line if it begins with money. */
function labelledMoney(lines: string[], label: RegExp, allowFree = false): number | null {
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(label);
    if (!m) continue;
    const rest = lines[i].slice((m.index || 0) + m[0].length);
    const same = moneyOnLine(rest);
    if (same !== null) return same;
    if (allowFree && /\bFREE\b/i.test(rest)) return 0;
    const next = lines[i + 1];
    if (next !== undefined) {
      if (startsWithMoney(next)) return moneyOnLine(next);
      if (allowFree && /^\W*FREE\b/i.test(next)) return 0;
    }
  }
  return null;
}

function labelledText(lines: string[], label: RegExp, valueRe: RegExp, lookahead = 2, skip?: RegExp): string | null {
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(label);
    if (!m) continue;
    const rest = lines[i].slice((m.index || 0) + m[0].length).replace(/^[\s:.\-]+/, '');
    const hit = skip && skip.test(rest) ? null : rest.match(valueRe);
    if (hit) return hit[0];
    for (let k = 1; k <= lookahead && lines[i + k] !== undefined; k++) {
      if (skip && skip.test(lines[i + k])) continue;
      const nh = lines[i + k].trim().match(valueRe);
      // skip filler lines such as a lone "No." that OCR split off
      if (/^(no\.?|number|id)$/i.test(lines[i + k].trim())) continue;
      if (nh) return nh[0];
    }
  }
  return null;
}

const MONTHS: Record<string, number> = {
  jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5, jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11,
};

export function parseReceiptDate(text: string): { str: string; date: Date } | null {
  const t = text
    .replace(/(\d{1,2}:\d{2}(?::\d{2})?)\s*\n\s*([AP]M)/gi, '$1 $2')
    .replace(/\s+/g, ' ');
  const build = (y: number, mo: number, d: number, hh?: string, mm?: string, ap?: string) => {
    let h = hh ? parseInt(hh, 10) : 12;
    const mi = mm ? parseInt(mm, 10) : 0;
    if (ap) { const pm = /pm/i.test(ap); if (pm && h < 12) h += 12; if (!pm && h === 12) h = 0; }
    // Receipts are Philippine local time (UTC+8)
    return new Date(Date.UTC(y, mo, d, h - 8, mi));
  };
  // "Sep 22 2026; 09:38:55 AM", "Aug 29, 2026, 09:38 PM", "Jul17,2026 7:22 PM", "September 20, 2026 3:47:19 PM"
  let m = t.match(/\b([A-Za-z]{3,9})\.?\s*(\d{1,2})\s*,?\s*(20\d{2})(?:\s*[;,]?\s*(?:at\s+)?(\d{1,2}):(\d{2})(?::\d{2})?\s*([AP]M)?)?/i);
  if (m && MONTHS[m[1].slice(0, 3).toLowerCase()] !== undefined) {
    return { str: m[0].trim(), date: build(+m[3], MONTHS[m[1].slice(0, 3).toLowerCase()], +m[2], m[4], m[5], m[6]) };
  }
  // "17 Sep 2026 at 12:40 PM", "24 Sep 2026, 23:05"
  m = t.match(/\b(\d{1,2})\s+([A-Za-z]{3,9})\.?,?\s+(20\d{2})(?:\s*[;,]?\s*(?:at\s+)?(\d{1,2}):(\d{2})(?::\d{2})?\s*([AP]M)?)?/i);
  if (m && MONTHS[m[2].slice(0, 3).toLowerCase()] !== undefined) {
    return { str: m[0].trim(), date: build(+m[3], MONTHS[m[2].slice(0, 3).toLowerCase()], +m[1], m[4], m[5], m[6]) };
  }
  return null;
}

// ── reference extraction ─────────────────────────────────────────────────────
// Value: up to 3 space-separated alnum groups (C5B1 0A6F 1142, 9042 996 774496),
// or a dashed id (BN-20260902-69084647).
const REF_VALUE = /[A-Za-z0-9][A-Za-z0-9\-]{3,}(?: [A-Za-z0-9]{3,6}){0,2}/;

const REF_LABELS: { label: RegExp; kind: 'main' | 'instapay' | 'other'; name: string }[] = [
  { label: /Transaction\s+Reference\s+Number/i,            kind: 'main',     name: 'transaction_reference_number' },
  { label: /InstaPay\s+Ref(?:erence)?\.?\s*(?:No\.?|Number)?/i, kind: 'instapay', name: 'instapay_ref' },
  { label: /Reference\s*ID/i,                              kind: 'main',     name: 'reference_id' },
  { label: /Confirmation\s*(?:No\.?|Number)/i,             kind: 'main',     name: 'confirmation_no' },
  { label: /Transaction\s+Ref(?:erence)?\.?\s*(?:No\.?|Number)/i, kind: 'instapay', name: 'transaction_ref_no' },
  { label: /Reference\s*(?:No\.?|Number)/i,                kind: 'main',     name: 'reference_no' },
  { label: /Ref\.?\s*No\.?/i,                              kind: 'main',     name: 'ref_no' },
  { label: /Trace\s*ID/i,                                  kind: 'instapay', name: 'trace_id' },
  { label: /Instruction\s*ID/i,                            kind: 'instapay', name: 'instruction_id' },
  { label: /Invoice\s*(?:no\.?|number)/i,                  kind: 'instapay', name: 'invoice_no' },
];

function fixRef(v: string): string {
  let s = v.replace(/\s+/g, '').trim();
  // Maya reference IDs are 12 lowercase hex chars; OCR reads 1 as l/I
  if (/^[0-9a-fliI]{12}$/.test(s) && /[0-9]/.test(s)) s = s.replace(/[lI]/g, '1').toLowerCase();
  return s;
}

function extractRefs(lines: string[]) {
  const seen = new Set<string>();
  const out: { label: string; value: string; strong: boolean; kind: 'main' | 'instapay' | 'other' }[] = [];
  for (const { label, kind, name } of REF_LABELS) {
    // consider every line matching the label (OCR sometimes duplicates headers)
    for (let i = 0; i < lines.length; i++) {
      const m = lines[i].match(label);
      if (!m) continue;
      // avoid "Reference ID" matching inside longer labels handled earlier (e.g. InstaPay Ref. No)
      const before = lines[i].slice(0, m.index || 0);
      if (/InstaPay\s*$/i.test(before) && kind !== 'instapay') continue;
      const rest = lines[i].slice((m.index || 0) + m[0].length).replace(/^[\s:.\-]+/, '');
      let v: string | null = null;
      const same = rest.match(REF_VALUE);
      if (same && /\d/.test(same[0])) v = same[0];
      else {
        for (let k = 1; k <= 3 && lines[i + k] !== undefined; k++) {
          const ln = lines[i + k].trim();
          if (/^(no\.?|number|id)$/i.test(ln)) continue;
          const nh = ln.match(REF_VALUE);
          if (nh && /\d/.test(nh[0])) { v = nh[0]; break; }
          if (ln) break;
        }
      }
      if (!v) continue;
      const value = fixRef(v);
      if (value.length < 4 || seen.has(value)) continue;
      // a money value is not a reference
      if (/^\d+\.\d{2}$/.test(value)) continue;
      seen.add(value);
      out.push({ label: name, value, strong: value.length >= 10, kind });
      break; // one value per label
    }
  }
  return out;
}

// ── main parse ───────────────────────────────────────────────────────────────
export function parseReceiptText(raw: string): ParsedReceipt {
  const text = normalizeOcr(raw);
  // strip leading OCR junk (| © » = ~ …) so label regexes can anchor on ^
  const lines = text.split('\n')
    .map(l => l.trim().replace(/^[^A-Za-z0-9£₱\-]+(?=\S)/, '').trim())
    .filter(Boolean);
  const det = detectChannel(text);

  // Money ─────────────────────────────────────────────────────────────────
  const amount = labelledMoney(lines, /^(?:Transfer\s+)?Amount(?:\s+Sent)?\b(?!\s*(?:Breakdown|Deducted|ing))/i)
              ?? labelledMoney(lines, /^Total\s+Amount\s+Sent/i);
  const total  = labelledMoney(lines, /^Total(?:\s+Amount)?(?:\s+(?:Sent|Deducted))?\b/i);
  const fee    = labelledMoney(lines, /^(?:(?:Transfer|Service|Transaction)\s+(?:Fee|Charge)|Fee)\b/i, true);

  let headerAmount: number | null = null;
  for (const l of lines.slice(0, 14)) {
    const m = l.match(/^\W*(?:php|pup|ph|p|£|₱)?\s*-?\s*(\d[\d,]*\.\d{2})\b(?:\s+InstaPay)?\W*$/i);
    if (m) { headerAmount = toNum(m[1]); break; }
  }
  // Legacy GCash native ("Total Amount Sent ₱597" / "Amount ₱597" without decimals)
  let legacyAmount: number | null = null;
  if (amount === null && total === null && headerAmount === null) {
    const lm = text.match(/(?:Total\s+Amount\s+Sent|Amount\s+Sent)\s+[₱P£$]?\s*([\d,]+(?:\.\d+)?)/i);
    if (lm) { const n = toNum(lm[1]); if (n > 0) legacyAmount = n; }
  }

  const amountMentions: number[] = [];
  for (const re of [/^(?:Transfer\s+)?Amount(?:\s+Sent)?\b(?!\s*(?:Breakdown|Deducted|ing))/i]) {
    for (let i = 0; i < lines.length; i++) {
      const m = lines[i].match(re); if (!m) continue;
      const v = moneyOnLine(lines[i].slice((m.index || 0) + m[0].length));
      if (v !== null) amountMentions.push(v);
    }
  }

  // References ────────────────────────────────────────────────────────────
  const refs = extractRefs(lines);
  const strongMain = refs.find(r => r.kind === 'main' && r.strong);
  const anyStrong  = refs.find(r => r.strong);
  const weakMain   = refs.find(r => r.kind === 'main' && !r.strong);
  const referenceId = (strongMain || anyStrong || weakMain || refs[0])?.value ?? null;
  const ipRef = refs.find(r => r.kind === 'instapay' && r.value !== referenceId)
             ?? (referenceId && refs.find(r => r.kind === 'instapay'));
  let instapayRefNo = ipRef ? ipRef.value : null;
  if (!instapayRefNo) {
    const other = refs.find(r => r.value !== referenceId && !r.strong);
    if (other) instapayRefNo = other.value;
  }

  // Legacy GCash ref fallback: "Ref No. 9042 996 774496" or bare 4-3-6 group
  let legacyRef: string | null = null;
  if (!referenceId) {
    const lr = text.match(/\b([0-9]{4}\s[0-9]{3}\s[0-9]{6})\b/) || text.match(/\b([0-9]{13,16})\b/);
    if (lr) legacyRef = lr[1].replace(/\s+/g, '');
  }

  // Account fields ────────────────────────────────────────────────────────
  let accountType = labelledText(lines, /^Account\s+type/i, /\S.*/);
  if (!accountType && det.mentionsGcashDestination) accountType = 'G-Xchange / GCash';

  const acctNoRe = /\b(?=[A-Z0-9]*[A-Z])(?=[A-Z0-9]*\d)[A-Z0-9]{15,18}\b/;
  let accountNumber: string | null = null;
  const squashedLine = lines.join(' ');
  const refSet = new Set(refs.map(r => r.value.toUpperCase()));
  const an = (squashedLine.match(new RegExp(acctNoRe.source, 'g')) || []).find(c => !refSet.has(c.toUpperCase()));
  if (an) accountNumber = an;
  else {
    const mask = squashedLine.match(/\b[Xx*•]{6,}[A-Z0-9]{3,5}\b/);
    if (mask) accountNumber = mask[0];
  }
  const mobile = text.match(/(?<![A-Za-z0-9])(\+63\s?[\d\s]{10,14}|09\d{2}[\s\-]?\d{3}[\s\-]?\d{4})(?!\d)/);
  const mobileNumber = mobile ? mobile[1].replace(/\s/g, '') : null;
  if (!accountNumber && mobileNumber) accountNumber = mobileNumber;

  let accountName: string | null = null;
  const nameMasked = text.match(/\b[A-Za-z]{1,2}[*•]{2,}[A-Za-z]{0,2}\s+[A-Za-z]{1,3}[*•]?[A-Za-z]{0,2}\s+[A-Za-z]\*?\.?/);
  if (nameMasked) accountName = nameMasked[0].trim();
  else {
    const mt = labelledText(lines, /^(?:Money\s+Sent\s+to:?|Account\s+name|Transfer\s+to)/i, /[A-Za-z][A-Za-z.\s]{2,30}/, 3, /G-?Xchange|GCash/i);
    if (mt) accountName = mt.trim();
  }

  // Date ──────────────────────────────────────────────────────────────────
  const d = parseReceiptDate(raw);

  // Completeness (core fields) ────────────────────────────────────────────
  const hasMoney = [amount, total, headerAmount, legacyAmount].some(v => v !== null);
  let completeness = 0;
  if (hasMoney) completeness += 30;
  if (referenceId || legacyRef) completeness += 30;
  if (det.channel !== 'unknown') completeness += 15;
  if (d) completeness += 10;
  if (accountNumber || accountName) completeness += 10;
  if (fee !== null) completeness += 5;

  return {
    channel: det.channel, route: det.route, channelScore: det.score,
    amount: amount ?? legacyAmount, total, headerAmount, fee,
    referenceId: referenceId ?? legacyRef,
    instapayRefNo,
    allRefs: refs.map(r => ({ label: r.label, value: r.value, strong: r.strong })),
    accountType, accountNumber, accountName, mobileNumber,
    dateStr: d?.str ?? null, date: d?.date ?? null,
    amountMentions,
    mentionsGcashDestination: det.mentionsGcashDestination,
    mentionsInstaPay: det.mentionsInstaPay,
    completeness,
  };
}
