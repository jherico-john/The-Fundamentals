// src/lib/priceThreshold.ts — v5
// ─────────────────────────────────────────────────────────────────────────────
// BACKEND-ONLY price scan threshold. The UI always shows the catalog price
// (e.g. ₱397); this module only widens what the receipt scanner ACCEPTS.
//
// Why: when a customer pays through a bridge (Maya → InstaPay → G-Xchange/GCash,
// GoTyme → InstaPay …) the sending app may add a transfer fee, or the customer
// may round up. Real examples from the receipt study:
//     Lifegroup 397  → Maya receipt shows ₱407  (₱10 fee)
//     Lifegroup 397  → MariBank customer sent ₱400
//     Fundamentals 597 → GoTyme total ₱606      (₱9 fee)
//     Encounter 997  → Maya ₱997 with ₱10 fee shown separately
//
// ALGORITHM (fully automatic — change a price in env and it re-computes):
//   nearestRound(P): the "next round number" at or above P.
//       charm-priced products (…90–…99, e.g. 397/597/997/1997) → next 100
//       otherwise → next multiple of 10
//   acceptMin = P − tolerance                     (never accept an underpayment)
//   acceptMax = nearestRound(P) + maxTransferFee  (round-up AND bank fee)
//
//   397 → [397, 425]   297 → [297, 325]   597 → [597, 625]
//   697 → [697, 725]   997 → [997, 1025]  1997 → [1997, 2025]   2997 → [2997, 3025]
//
// With the default 25 ceiling, no two catalog prices ever overlap, and
// `findPriceCollisions()` is run on boot/test to prove it.
// ─────────────────────────────────────────────────────────────────────────────

export interface PriceWindow {
  price: number;        // catalog price (what the UI shows)
  nearestRound: number; // e.g. 400 for 397
  min: number;
  max: number;
}

/** Highest sender-side fee we will tolerate (InstaPay fees range ₱0–₱25). */
export function maxTransferFee(): number {
  const v = parseFloat(process.env.RECEIPT_MAX_TRANSFER_FEE || '25');
  return Number.isFinite(v) && v >= 0 ? v : 25;
}

export function nearestRound(price: number): number {
  const p = Math.round(price);
  if (p % 100 >= 90) return Math.ceil(p / 100) * 100;   // 397→400, 997→1000, 1997→2000
  return Math.ceil(p / 10) * 10;                         // 450→450, 453→460
}

export function getPriceWindow(price: number, tolerance = 0, feeCeiling = maxTransferFee()): PriceWindow {
  return {
    price,
    nearestRound: nearestRound(price),
    min: price - tolerance,
    max: nearestRound(price) + feeCeiling,
  };
}

export type AmountVerdict = 'ok' | 'short' | 'over';

export function judgeAmount(paid: number, price: number, tolerance: number): AmountVerdict {
  const w = getPriceWindow(price, tolerance);
  if (paid < w.min - 0.001) return 'short';
  if (paid > w.max + 0.001) return 'over';
  return 'ok';
}

/** Overlap detector — two catalog products must never share an accept window. */
export function findPriceCollisions(prices: { slug: string; price: number }[], tolerance = 0): string[] {
  const out: string[] = [];
  for (let i = 0; i < prices.length; i++) {
    for (let j = i + 1; j < prices.length; j++) {
      const a = getPriceWindow(prices[i].price, tolerance);
      const b = getPriceWindow(prices[j].price, tolerance);
      if (a.min <= b.max && b.min <= a.max) {
        out.push(`${prices[i].slug} [${a.min}-${a.max}] overlaps ${prices[j].slug} [${b.min}-${b.max}]`);
      }
    }
  }
  return out;
}
