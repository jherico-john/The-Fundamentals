// src/lib/tokens.ts — HMAC-signed tokens for download, purchase cookie, admin session, customer session
import crypto from 'crypto';

const DL_SEC  = process.env.DOWNLOAD_TOKEN_SECRET  || 'dev-dl-secret-replace-in-prod-32c';
const ADM_SEC = process.env.ADMIN_SESSION_SECRET   || 'dev-adm-secret-replace-in-prod-32';
const DL_EXP  = parseInt(process.env.DOWNLOAD_TOKEN_EXPIRY_SEC || '600');

function sign(b64: string, secret: string) {
  return crypto.createHmac('sha256', secret).update(b64).digest('base64url');
}

function makeToken(payload: object, secret: string): string {
  const b64 = Buffer.from(JSON.stringify(payload)).toString('base64url');
  return `${b64}.${sign(b64, secret)}`;
}

function readToken<T>(token: string, secret: string): T | null {
  try {
    const [b64, sig] = token.split('.');
    if (!b64 || !sig) return null;
    const expected = sign(b64, secret);
    if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
    return JSON.parse(Buffer.from(b64, 'base64url').toString()) as T;
  } catch { return null; }
}

// ── Download Token (short-lived 10 min) ───────────────────────────────────────
export function issueDownloadToken(refNo: string, amount: number): string {
  return makeToken({ refNo, amount, iat: Math.floor(Date.now()/1000) }, DL_SEC);
}
export function verifyDownloadToken(t: string): { refNo: string; amount: number } | null {
  const p = readToken<{ refNo: string; amount: number; iat: number }>(t, DL_SEC);
  if (!p) return null;
  if (Math.floor(Date.now()/1000) - p.iat > DL_EXP) return null;
  return { refNo: p.refNo, amount: p.amount };
}

// ── Purchase Cookie (1 year — "already bought this device") ──────────────────
export const PURCHASE_COOKIE = 'tf_purchase';
export function signPurchaseCookie(refNo: string, amount: number): string {
  return makeToken({ refNo, amount, at: Math.floor(Date.now()/1000) }, DL_SEC);
}
export function verifyPurchaseCookie(v: string): { refNo: string; amount: number; at: number } | null {
  return readToken(v, DL_SEC);
}
export const purchaseCookieOpts = { path:'/', maxAge: 60*60*24*365, sameSite:'lax' as const, httpOnly:false };

// ── Admin Session Cookie (8 hours, httpOnly) ──────────────────────────────────
export const ADMIN_COOKIE = 'adm_sess';
export function signAdminSession(): string {
  return makeToken({ role:'admin', iat: Math.floor(Date.now()/1000) }, ADM_SEC);
}
export function verifyAdminSession(v: string): boolean {
  const p = readToken<{ role: string; iat: number }>(v, ADM_SEC);
  if (!p || p.role !== 'admin') return false;
  return Math.floor(Date.now()/1000) - p.iat <= 60*60*8;
}
export const adminCookieOpts = { path:'/', maxAge:60*60*8, sameSite:'lax' as const, httpOnly:true, secure: process.env.NODE_ENV==='production' };

// ── Customer Session Cookie (7 days) ─────────────────────────────────────────
export const CUST_COOKIE = 'cust_sess';
export function signCustomerSession(id: string, email: string): string {
  return makeToken({ id, email, iat: Math.floor(Date.now()/1000) }, DL_SEC);
}
export function verifyCustomerSession(v: string): { id: string; email: string } | null {
  const p = readToken<{ id: string; email: string; iat: number }>(v, DL_SEC);
  if (!p) return null;
  if (Math.floor(Date.now()/1000) - p.iat > 60*60*24*7) return null;
  return { id: p.id, email: p.email };
}
export const custCookieOpts = { path:'/', maxAge:60*60*24*7, sameSite:'lax' as const, httpOnly:true, secure: process.env.NODE_ENV==='production' };
