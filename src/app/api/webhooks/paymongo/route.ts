// src/app/api/webhooks/paymongo/route.ts — v2
// Handles both source.chargeable and payment.paid webhook events from PayMongo.

import { NextRequest, NextResponse } from 'next/server';
import { verifyWebhookSignature, createPaymentFromSource } from '@/lib/paymongo';

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const sigHeader = req.headers.get('paymongo-signature') || '';
  const secret = process.env.PAYMONGO_WEBHOOK_SECRET || '';

  if (secret && !verifyWebhookSignature(rawBody, sigHeader, secret)) {
    console.warn('[webhook] Invalid PayMongo signature');
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }

  try {
    const event = JSON.parse(rawBody);
    const type: string = event?.data?.attributes?.type || '';

    console.log('[webhook] Event:', type);

    // When QRPh source becomes chargeable → capture payment automatically
    if (type === 'source.chargeable') {
      const source = event?.data?.attributes?.data;
      const sourceId: string = source?.id;
      const amount: number = source?.attributes?.amount;

      if (sourceId && amount) {
        try {
          const payment = await createPaymentFromSource(sourceId, amount);
          console.log('[webhook] Payment captured:', payment.id, payment.status);
        } catch (err) {
          console.error('[webhook] Capture failed:', err);
        }
      }
    }

    if (type === 'payment.paid') {
      const payment = event?.data?.attributes?.data;
      console.log('[webhook] Payment paid:', payment?.id);
      // TODO: persist to DB or send email confirmation here
    }

    return NextResponse.json({ received: true });
  } catch (err) {
    console.error('[webhook] Parse error:', err);
    return NextResponse.json({ error: 'Bad payload' }, { status: 400 });
  }
}
