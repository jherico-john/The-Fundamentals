// src/app/api/check-source/[sourceId]/route.ts  — v2
// Polls a QRPh source status. When 'chargeable', captures payment.

import { NextRequest, NextResponse } from 'next/server';
import { getSource, createPaymentFromSource } from '@/lib/paymongo';

export async function GET(
  _req: NextRequest,
  { params }: { params: { sourceId: string } }
) {
  try {
    const { sourceId } = params;
    if (!sourceId) {
      return NextResponse.json({ error: 'Missing sourceId' }, { status: 400 });
    }

    const source = await getSource(sourceId);
    const status = source.attributes.status;

    // If chargeable — customer scanned & authorized — capture payment
    if (status === 'chargeable') {
      try {
        const payment = await createPaymentFromSource(
          sourceId,
          source.attributes.amount
        );
        if (payment.status === 'paid') {
          return NextResponse.json({
            status: 'paid',
            paid: true,
            downloadUrl: process.env.NEXT_PUBLIC_DOWNLOAD_PAGE_URL,
          });
        }
      } catch (captureErr) {
        console.error('[check-source] capture error:', captureErr);
        // Payment may already be captured — still return paid
        return NextResponse.json({
          status: 'paid',
          paid: true,
          downloadUrl: process.env.NEXT_PUBLIC_DOWNLOAD_PAGE_URL,
        });
      }
    }

    return NextResponse.json({
      status,
      paid: false,
      downloadUrl: null,
    });
  } catch (err: unknown) {
    console.error('[check-source]', err);
    const message = err instanceof Error ? err.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
