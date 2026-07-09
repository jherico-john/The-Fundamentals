// src/app/api/create-payment/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createPaymentLink } from '@/lib/paymongo';

export async function POST(req: NextRequest) {
  try {
    const origin = req.headers.get('origin') || '';
    const allowedOrigin = process.env.ALLOWED_ORIGIN || '';

    // Basic CORS guard in production
    if (
      process.env.NODE_ENV === 'production' &&
      allowedOrigin &&
      origin !== allowedOrigin
    ) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const successUrl =
      process.env.NEXT_PUBLIC_SUCCESS_URL ||
      `${process.env.NEXT_PUBLIC_SITE_URL}/success`;
    const cancelUrl =
      process.env.NEXT_PUBLIC_CANCEL_URL ||
      `${process.env.NEXT_PUBLIC_SITE_URL}/checkout`;

    const link = await createPaymentLink(successUrl, cancelUrl);

    return NextResponse.json({
      linkId: link.id,
      checkoutUrl: link.attributes.checkout_url,
      referenceNumber: link.attributes.reference_number,
    });
  } catch (err: unknown) {
    console.error('[create-payment]', err);
    const message = err instanceof Error ? err.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
