// src/lib/tokensEdge.ts — v5
// Edge-runtime-safe verification of the signed session cookies, using Web
// Crypto. Next.js middleware runs on the Edge runtime, where Node's `crypto`
// (used by tokens.ts) is NOT available — v4's middleware imported it, which is
// a prime suspect for the "logged in but cannot reach the dashboard" bug.
// Token format is identical to tokens.ts: base64url(payload) + '.' + base64url(HMAC-SHA256).

function b64urlToBytes(s: string): Uint8Array {
  const pad = s.length % 4 ? '='.repeat(4 - (s.length % 4)) : '';
  const bin = atob(s.replace(/-/g, '+').replace(/_/g, '/') + pad);
  return Uint8Array.from(bin, c => c.charCodeAt(0));
}
function bytesToB64url(b: ArrayBuffer): string {
  let s = ''; new Uint8Array(b).forEach(x => (s += String.fromCharCode(x)));
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function readEdgeToken<T>(token: string, secret: string): Promise<T | null> {
  try {
    const [b64, sig] = token.split('.');
    if (!b64 || !sig) return null;
    const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
    const expected = bytesToB64url(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(b64)));
    if (expected.length !== sig.length) return null;
    let diff = 0; for (let i = 0; i < sig.length; i++) diff |= expected.charCodeAt(i) ^ sig.charCodeAt(i);
    if (diff !== 0) return null;
    return JSON.parse(new TextDecoder().decode(b64urlToBytes(b64))) as T;
  } catch { return null; }
}

export async function isAdminEdge(cookie: string | undefined): Promise<boolean> {
  if (!cookie) return false;
  const secret = process.env.ADMIN_SESSION_SECRET || 'dev-adm-secret-replace-in-prod-32';
  const p = await readEdgeToken<{ role: string; iat: number }>(cookie, secret);
  return !!p && p.role === 'admin' && Math.floor(Date.now() / 1000) - p.iat <= 60 * 60 * 8;
}

export async function isCustomerEdge(cookie: string | undefined): Promise<boolean> {
  if (!cookie) return false;
  const secret = process.env.DOWNLOAD_TOKEN_SECRET || 'dev-dl-secret-replace-in-prod-32c';
  const p = await readEdgeToken<{ id: string; iat: number }>(cookie, secret);
  return !!p && !!p.id && Math.floor(Date.now() / 1000) - p.iat <= 60 * 60 * 24 * 7;
}
