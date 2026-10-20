// src/app/api/download-token/route.ts — v5
// Returns the file URL(s) for the purchased product. Bundle ⇒ the bundle zip if
// PRODUCT_FILE_URL_BUNDLE is set, otherwise every individual product file.
import { NextRequest, NextResponse } from 'next/server';
import { verifyDownloadToken } from '@/lib/tokens';
import { getProductBySlug, resolveSlug, getFileUrl, getDownloadPageUrl, getUnlockedSlugs } from '@/lib/products';

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token');
  const slug = resolveSlug(req.nextUrl.searchParams.get('product') || 'fundamentals');
  if (!token) return NextResponse.json({ error: 'Missing token' }, { status: 400 });
  const payload = verifyDownloadToken(token);
  if (!payload) return NextResponse.json({ error: 'Invalid or expired download link. Please re-upload your receipt.' }, { status: 401 });
  if (!slug) return NextResponse.json({ error: 'Unknown product' }, { status: 400 });

  let files: { slug: string; name: string; url: string }[] = [];
  const own = getFileUrl(slug);
  if (own) files = [{ slug, name: getProductBySlug(slug)!.name, url: own }];
  else if (slug === 'bundle') {
    files = getUnlockedSlugs('bundle').filter(s => s !== 'bundle')
      .map(s => ({ slug: s, name: getProductBySlug(s)!.name, url: getFileUrl(s) })).filter(f => f.url);
  }
  if (!files.length) return NextResponse.json({ error: 'Download file not configured yet. Please contact support.' }, { status: 503 });

  return NextResponse.json({
    valid: true, fileUrl: files[0].url, files,
    downloadPageUrl: getDownloadPageUrl(slug),
    referenceNumber: payload.refNo, product: slug,
  });
}
