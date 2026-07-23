// src/app/api/verify-receipt/route.ts — v4
import { NextRequest, NextResponse } from 'next/server';
import { verifyGCashReceipt } from '@/lib/receiptVerifier';
import {
  issueDownloadToken, signPurchaseCookie, PURCHASE_COOKIE, purchaseCookieOpts,
  verifyCustomerSession, CUST_COOKIE,
} from '@/lib/tokens';

export const runtime = 'nodejs';

// Map product slug → expected price (reads from env)
function getPriceForProduct(slug: string): number {
  const map: Record<string, string> = {
    'fundamentals':   'NEXT_PUBLIC_PRODUCT_FUNDAMENTALS_PRICE',
    'pre-encounter':  'NEXT_PUBLIC_PRODUCT_PRE_ENCOUNTER_PRICE',
    'sunyl':          'NEXT_PUBLIC_PRODUCT_SUNYL_PRICE',
    'encounter':      'NEXT_PUBLIC_PRODUCT_ENCOUNTER_PRICE',
    'post-encounter': 'NEXT_PUBLIC_PRODUCT_POST_ENCOUNTER_PRICE',
    'lifegroup':      'NEXT_PUBLIC_PRODUCT_LIFEGROUP_PRICE',
  };
  const envKey = map[slug] || 'NEXT_PUBLIC_PRODUCT_FUNDAMENTALS_PRICE';
  return parseFloat(process.env[envKey] || '497');
}

export async function POST(req: NextRequest) {
  try {
    if (!req.headers.get('content-type')?.includes('multipart/form-data'))
      return NextResponse.json({ error: 'Expected multipart/form-data' }, { status: 400 });

    const form        = await req.formData();
    const file        = form.get('receipt') as File | null;
    const affiliateCode = (form.get('affiliateCode') as string) || null;
    const productSlug = (form.get('productSlug') as string) || 'fundamentals';
    const productName = (form.get('productName') as string) || 'The Fundamentals';

    if (!file) return NextResponse.json({ error: 'No receipt file uploaded.' }, { status: 400 });
    if (file.size > 10 * 1024 * 1024) return NextResponse.json({ error: 'File too large (max 10MB).' }, { status: 400 });
    if (!file.type.startsWith('image/') && !file.name.match(/\.(jpg|jpeg|png|webp|jfif)$/i))
      return NextResponse.json({ error: 'Please upload a JPG, PNG, or WEBP image.' }, { status: 400 });

    const buf = Buffer.from(await file.arrayBuffer());

    // Get logged-in customer if any
    let customerId: string | null = null;
    const custCookie = req.cookies.get(CUST_COOKIE)?.value;
    if (custCookie) { const s = verifyCustomerSession(custCookie); if (s) customerId = s.id; }

    const expectedAmount = getPriceForProduct(productSlug);

    const result = await verifyGCashReceipt(buf, {
      expectedAmount,
      testMode: process.env.TEST_MODE === 'true',
      priceTolerance: parseFloat(process.env.PRICE_TOLERANCE || '5'),
      affiliateCode,
      customerId,
      productName,
    });

    if (!result.valid) {
      return NextResponse.json({ success: false, error: result.reason, warnings: result.warnings }, { status: 422 });
    }

    const token = issueDownloadToken(result.data!.referenceNumber, result.data!.amount);
    const res = NextResponse.json({
      success: true, token, productSlug,
      data: {
        referenceNumber: result.data!.referenceNumber,
        amount: result.data!.amount,
        dateStr: result.data!.dateStr,
      },
      warnings: result.warnings,
      testMode: process.env.TEST_MODE === 'true',
    });

    // Persistent "already purchased" cookie (1 year) — keyed per product
    const cookieName = `${PURCHASE_COOKIE}_${productSlug}`;
    res.cookies.set(cookieName, signPurchaseCookie(result.data!.referenceNumber, result.data!.amount), purchaseCookieOpts);
    return res;
  } catch (err) {
    console.error('[verify-receipt]', err);
    return NextResponse.json({ error: 'Server error during verification. Please try again.' }, { status: 500 });
  }
}
