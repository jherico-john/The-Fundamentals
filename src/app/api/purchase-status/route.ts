// src/app/api/purchase-status/route.ts — v4
// Checks the signed "already purchased" cookie for the given product.
// Cookie name is tf_purchase_{productSlug} so each product has its own state.

import { NextRequest, NextResponse } from 'next/server';
import { verifyPurchaseCookie, PURCHASE_COOKIE } from '@/lib/tokens';

function getDownloadPage(slug: string): string {
  const map: Record<string, string> = {
    'fundamentals':   process.env.NEXT_PUBLIC_DOWNLOAD_PAGE_URL_FUNDAMENTALS   || '',
    'pre-encounter':  process.env.NEXT_PUBLIC_DOWNLOAD_PAGE_URL_PRE_ENCOUNTER  || '',
    'sunyl':          process.env.NEXT_PUBLIC_DOWNLOAD_PAGE_URL_SUNYL          || '',
    'encounter':      process.env.NEXT_PUBLIC_DOWNLOAD_PAGE_URL_ENCOUNTER      || '',
    'post-encounter': process.env.NEXT_PUBLIC_DOWNLOAD_PAGE_URL_POST_ENCOUNTER || '',
    'lifegroup':      process.env.NEXT_PUBLIC_DOWNLOAD_PAGE_URL_LIFEGROUP      || '',
  };
  return map[slug] || map['fundamentals'];
}

export async function GET(req: NextRequest) {
  const slug = req.nextUrl.searchParams.get('product') || 'fundamentals';
  const cookieName = `${PURCHASE_COOKIE}_${slug}`;
  const cookie = req.cookies.get(cookieName)?.value;

  if (!cookie) return NextResponse.json({ purchased: false });
  const p = verifyPurchaseCookie(cookie);
  if (!p) return NextResponse.json({ purchased: false });

  return NextResponse.json({
    purchased: true,
    referenceNumber: p.refNo,
    amount: p.amount,
    purchasedAt: p.at,
    downloadPageUrl: getDownloadPage(slug),
    product: slug,
  });
}

export async function DELETE(req: NextRequest) {
  const slug = req.nextUrl.searchParams.get('product') || 'fundamentals';
  const cookieName = `${PURCHASE_COOKIE}_${slug}`;
  const res = NextResponse.json({ success: true });
  res.cookies.set(cookieName, '', { path: '/', maxAge: 0 });
  return res;
}
