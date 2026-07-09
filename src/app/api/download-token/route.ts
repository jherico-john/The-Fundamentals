// src/app/api/download-token/route.ts
// Validates a download token and returns the file URL + redirect URL.
// Called by the frontend after receipt verification succeeds.

import { NextRequest, NextResponse } from 'next/server';
import { verifyDownloadToken } from '@/lib/downloadToken';

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token');

  if (!token) {
    return NextResponse.json({ error: 'Missing token' }, { status: 400 });
  }

  const result = verifyDownloadToken(token);
  if (!result.valid) {
    return NextResponse.json({ error: result.reason }, { status: 401 });
  }

  const fileUrl = process.env.PRODUCT_FILE_URL;
  const downloadPageUrl = process.env.NEXT_PUBLIC_DOWNLOAD_PAGE_URL;

  if (!fileUrl) {
    return NextResponse.json({ error: 'Product file not configured' }, { status: 500 });
  }

  return NextResponse.json({
    valid: true,
    fileUrl,
    downloadPageUrl,
    referenceNumber: result.payload?.refNo,
  });
}
