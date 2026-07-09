// src/app/api/check-payment/[linkId]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getPaymentLink } from '@/lib/paymongo';

export async function GET(
  _req: NextRequest,
  { params }: { params: { linkId: string } }
) {
  try {
    const { linkId } = params;
    if (!linkId || typeof linkId !== 'string') {
      return NextResponse.json({ error: 'Missing linkId' }, { status: 400 });
    }

    const link = await getPaymentLink(linkId);
    const isPaid = link.attributes.status === 'paid';

    return NextResponse.json({
      status: link.attributes.status,
      paid: isPaid,
      downloadUrl: isPaid
        ? process.env.NEXT_PUBLIC_DOWNLOAD_PAGE_URL
        : null,
    });
  } catch (err: unknown) {
    console.error('[check-payment]', err);
    const message = err instanceof Error ? err.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
