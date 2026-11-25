// Small in-memory fixed-window rate limiter (v6).
// Best-effort: on serverless platforms each warm instance keeps its own counters,
// which still blunts brute force, receipt-spam and OCR-cost abuse from a single
// client. For a hard global limit put a WAF / Vercel Firewall rule in front.
import type { NextRequest } from 'next/server';

interface Bucket { count: number; resetAt: number; }
const buckets = new Map<string, Bucket>();
let lastSweep = 0;

export function clientIp(req: NextRequest): string {
  const xf = req.headers.get('x-forwarded-for');
  if (xf) return xf.split(',')[0].trim() || 'unknown';
  return req.headers.get('x-real-ip') || 'unknown';
}

// RATE_LIMIT_SCALE multiplies every limit (default 1). Only for automated tests that
// hammer the API from one address — never set it on the live site.
const scale = () => { const n = parseFloat(process.env.RATE_LIMIT_SCALE || '1'); return Number.isFinite(n) && n > 0 ? n : 1; };

export function rateLimit(key: string, baseLimit: number, windowSec: number): { ok: boolean; retryAfter: number } {
  const limit = Math.ceil(baseLimit * scale());
  const now = Date.now();
  if (now - lastSweep > 60_000) {
    lastSweep = now;
    buckets.forEach((b, k) => { if (b.resetAt <= now) buckets.delete(k); });
  }
  const b = buckets.get(key);
  if (!b || b.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowSec * 1000 });
    return { ok: true, retryAfter: 0 };
  }
  b.count += 1;
  if (b.count > limit) return { ok: false, retryAfter: Math.max(1, Math.ceil((b.resetAt - now) / 1000)) };
  return { ok: true, retryAfter: 0 };
}
