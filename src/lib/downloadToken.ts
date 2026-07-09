// src/lib/downloadToken.ts
// Signs and verifies short-lived download tokens.
// After receipt is verified, we issue a signed token.
// The download endpoint checks this token before serving the file redirect.

import crypto from 'crypto';

const SECRET = process.env.DOWNLOAD_TOKEN_SECRET || 'dev-secret-change-in-production';
const EXPIRY_SEC = parseInt(process.env.DOWNLOAD_TOKEN_EXPIRY_SEC || '600', 10);

export interface TokenPayload {
  refNo: string;
  amount: number;
  issuedAt: number; // unix timestamp seconds
}

export function issueDownloadToken(refNo: string, amount: number): string {
  const payload: TokenPayload = {
    refNo,
    amount,
    issuedAt: Math.floor(Date.now() / 1000),
  };
  const data = JSON.stringify(payload);
  const b64 = Buffer.from(data).toString('base64url');
  const sig = crypto.createHmac('sha256', SECRET).update(b64).digest('base64url');
  return `${b64}.${sig}`;
}

export function verifyDownloadToken(token: string): { valid: boolean; payload?: TokenPayload; reason?: string } {
  try {
    const [b64, sig] = token.split('.');
    if (!b64 || !sig) return { valid: false, reason: 'Malformed token' };

    const expectedSig = crypto.createHmac('sha256', SECRET).update(b64).digest('base64url');
    if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expectedSig))) {
      return { valid: false, reason: 'Invalid token signature' };
    }

    const payload: TokenPayload = JSON.parse(Buffer.from(b64, 'base64url').toString());
    const ageSeconds = Math.floor(Date.now() / 1000) - payload.issuedAt;
    if (ageSeconds > EXPIRY_SEC) {
      return { valid: false, reason: `Download token expired (${Math.floor(ageSeconds / 60)} min old)` };
    }

    return { valid: true, payload };
  } catch {
    return { valid: false, reason: 'Token parse error' };
  }
}
