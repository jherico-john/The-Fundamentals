// src/app/api/purchase-status/route.ts — v6
import { NextRequest, NextResponse } from 'next/server';
import { verifyPurchaseCookie, PURCHASE_COOKIE } from '@/lib/tokens';
import { resolveSlug, getDownloadPageUrl } from '@/lib/products';
import { safeExternalUrl } from '@/lib/safeUrl';

export async function GET(req: NextRequest) {
  const slug = resolveSlug(req.nextUrl.searchParams.get('product') || 'fundamentals') || 'fundamentals';
  const cookie = req.cookies.get(`${PURCHASE_COOKIE}_${slug}`)?.value;
  if (!cookie) return NextResponse.json({ purchased: false });
  const p = verifyPurchaseCookie(cookie);
  if (!p) return NextResponse.json({ purchased: false });
  return NextResponse.json({
    purchased: true, referenceNumber: p.refNo, amount: p.amount, purchasedAt: p.at,
    downloadPageUrl: safeExternalUrl(getDownloadPageUrl(slug)), product: slug,
  }, { headers: { 'Cache-Control': 'no-store' } });
}

export async function DELETE(req: NextRequest) {
  const slug = resolveSlug(req.nextUrl.searchParams.get('product') || 'fundamentals') || 'fundamentals';
  const res = NextResponse.json({ success: true });
  res.cookies.set(`${PURCHASE_COOKIE}_${slug}`, '', { path: '/', maxAge: 0 });
  return res;
}
