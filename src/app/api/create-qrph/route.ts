// src/app/api/create-qrph/route.ts  — v2
// Creates a PayMongo QRPh source and returns the QR code + source ID for polling.

import { NextRequest, NextResponse } from 'next/server';
import { createQRPhSource } from '@/lib/paymongo';

export async function POST(req: NextRequest) {
  try {
    const origin = req.headers.get('origin') || '';
    const allowedOrigin = process.env.ALLOWED_ORIGIN || '';

    if (
      process.env.NODE_ENV === 'production' &&
      allowedOrigin &&
      origin !== allowedOrigin
    ) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
    const successUrl = `${siteUrl}/success`;
    const failedUrl = `${siteUrl}/checkout?payment=failed`;

    const source = await createQRPhSource(successUrl, failedUrl);

    return NextResponse.json({
      sourceId: source.id,
      status: source.attributes.status,
      amount: source.attributes.amount,
      // The checkout_url is the PayMongo-hosted QRPh page (fallback)
      checkoutUrl: source.attributes.redirect?.checkout_url,
      // qr_code is a base64 PNG — send to frontend to display inline
      qrCode: source.attributes.qr_code ?? null,
    });
  } catch (err: unknown) {
    console.error('[create-qrph]', err);
    const message = err instanceof Error ? err.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
