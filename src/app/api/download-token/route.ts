// src/app/api/download-token/route.ts — v6
// v6: ONE redirect only. After a receipt is verified the customer is sent to the
// funnel's Thank You page (the download links are embedded there). This endpoint
// therefore no longer returns any MediaFire / file URL — it only confirms the
// short-lived verification token and returns the Thank You page address.
// The old direct-file redirect is discontinued (links stay commented out in .env).
import { NextRequest, NextResponse } from 'next/server';
import { verifyDownloadToken } from '@/lib/tokens';
import { resolveSlug, getDownloadPageUrl } from '@/lib/products';
import { safeExternalUrl } from '@/lib/safeUrl';
import { rateLimit, clientIp } from '@/lib/rateLimit';

export async function GET(req: NextRequest) {
  const rl = rateLimit(`dl:${clientIp(req)}`, 30, 60);
  if (!rl.ok) return NextResponse.json({ error: 'Too many requests. Please wait a moment.' }, { status: 429, headers: { 'Retry-After': String(rl.retryAfter) } });

  const token = req.nextUrl.searchParams.get('token');
  const slug = resolveSlug(req.nextUrl.searchParams.get('product') || 'fundamentals');
  if (!token) return NextResponse.json({ error: 'Missing token' }, { status: 400 });
  const payload = verifyDownloadToken(token);
  if (!payload) return NextResponse.json({ error: 'Invalid or expired link. Please upload your receipt again.' }, { status: 401 });
  if (!slug) return NextResponse.json({ error: 'Unknown product' }, { status: 400 });

  const downloadPageUrl = safeExternalUrl(getDownloadPageUrl(slug));
  if (!downloadPageUrl) return NextResponse.json({ error: 'Download page is not configured yet. Please contact support.' }, { status: 503 });

  return NextResponse.json({
    valid: true,
    downloadPageUrl,
    referenceNumber: payload.refNo, product: slug,
  }, { headers: { 'Cache-Control': 'no-store' } });
}
