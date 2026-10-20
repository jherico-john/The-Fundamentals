// src/app/api/purchase-status/route.ts — v5
import { NextRequest, NextResponse } from 'next/server';
import { verifyPurchaseCookie, PURCHASE_COOKIE } from '@/lib/tokens';
import { resolveSlug, getDownloadPageUrl } from '@/lib/products';

export async function GET(req: NextRequest) {
  const slug = resolveSlug(req.nextUrl.searchParams.get('product') || 'fundamentals') || 'fundamentals';
  const cookie = req.cookies.get(`${PURCHASE_COOKIE}_${slug}`)?.value;
  if (!cookie) return NextResponse.json({ purchased: false });
  const p = verifyPurchaseCookie(cookie);
  if (!p) return NextResponse.json({ purchased: false });
  return NextResponse.json({
    purchased: true, referenceNumber: p.refNo, amount: p.amount, purchasedAt: p.at,
    downloadPageUrl: getDownloadPageUrl(slug), product: slug,
  });
}

export async function DELETE(req: NextRequest) {
  const slug = resolveSlug(req.nextUrl.searchParams.get('product') || 'fundamentals') || 'fundamentals';
  const res = NextResponse.json({ success: true });
  res.cookies.set(`${PURCHASE_COOKIE}_${slug}`, '', { path: '/', maxAge: 0 });
  return res;
}
