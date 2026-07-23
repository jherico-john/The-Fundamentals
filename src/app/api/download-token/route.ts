// src/app/api/download-token/route.ts — v4
// Returns the correct file URL for the given product slug.
// Each product has its own env var: PRODUCT_FILE_URL_SLUG
// Add new products by adding a new env var and entry to FILE_URLS below.

import { NextRequest, NextResponse } from 'next/server';
import { verifyDownloadToken } from '@/lib/tokens';

// Map slug → { fileUrl, downloadPageUrl }
// When you add a new product, add one line here and set the env var.
function getProductUrls(slug: string): { fileUrl: string; downloadPageUrl: string } | null {
  const map: Record<string, { fileEnv: string; pageEnv: string }> = {
    'fundamentals':   { fileEnv: 'PRODUCT_FILE_URL_FUNDAMENTALS',   pageEnv: 'NEXT_PUBLIC_DOWNLOAD_PAGE_URL_FUNDAMENTALS' },
    'pre-encounter':  { fileEnv: 'PRODUCT_FILE_URL_PRE_ENCOUNTER',  pageEnv: 'NEXT_PUBLIC_DOWNLOAD_PAGE_URL_PRE_ENCOUNTER' },
    'sunyl':          { fileEnv: 'PRODUCT_FILE_URL_SUNYL',          pageEnv: 'NEXT_PUBLIC_DOWNLOAD_PAGE_URL_SUNYL' },
    'encounter':      { fileEnv: 'PRODUCT_FILE_URL_ENCOUNTER',      pageEnv: 'NEXT_PUBLIC_DOWNLOAD_PAGE_URL_ENCOUNTER' },
    'post-encounter': { fileEnv: 'PRODUCT_FILE_URL_POST_ENCOUNTER', pageEnv: 'NEXT_PUBLIC_DOWNLOAD_PAGE_URL_POST_ENCOUNTER' },
    'lifegroup':      { fileEnv: 'PRODUCT_FILE_URL_LIFEGROUP',      pageEnv: 'NEXT_PUBLIC_DOWNLOAD_PAGE_URL_LIFEGROUP' },
  };

  const entry = map[slug];
  if (!entry) return null;

  const fileUrl        = process.env[entry.fileEnv] || '';
  const downloadPageUrl = process.env[entry.pageEnv] || '';
  return { fileUrl, downloadPageUrl };
}

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token');
  const slug  = req.nextUrl.searchParams.get('product') || 'fundamentals';

  if (!token) return NextResponse.json({ error: 'Missing token' }, { status: 400 });

  const payload = verifyDownloadToken(token);
  if (!payload) {
    return NextResponse.json(
      { error: 'Invalid or expired download link. Please re-upload your receipt.' },
      { status: 401 }
    );
  }

  const urls = getProductUrls(slug);
  if (!urls) {
    return NextResponse.json({ error: `Unknown product: ${slug}` }, { status: 400 });
  }

  if (!urls.fileUrl || urls.fileUrl.startsWith('PASTE_')) {
    return NextResponse.json(
      { error: 'Download file not configured yet. Please contact support.' },
      { status: 503 }
    );
  }

  return NextResponse.json({
    valid: true,
    fileUrl: urls.fileUrl,
    downloadPageUrl: urls.downloadPageUrl,
    referenceNumber: payload.refNo,
    product: slug,
  });
}
