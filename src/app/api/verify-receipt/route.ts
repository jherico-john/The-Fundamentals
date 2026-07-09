// src/app/api/verify-receipt/route.ts
// Accepts multipart/form-data with the uploaded GCash receipt image.
// Runs two-layer verification (QR scan + OCR).
// On success: returns a signed download token.

import { NextRequest, NextResponse } from 'next/server';
import { verifyGCashReceipt } from '@/lib/receiptVerifier';
import { issueDownloadToken } from '@/lib/downloadToken';

export const runtime = 'nodejs'; // required for Jimp/Tesseract

// Max upload: 10MB
const MAX_SIZE_BYTES = 10 * 1024 * 1024;

export async function POST(req: NextRequest) {
  try {
    const contentType = req.headers.get('content-type') || '';
    if (!contentType.includes('multipart/form-data')) {
      return NextResponse.json({ error: 'Expected multipart/form-data' }, { status: 400 });
    }

    const formData = await req.formData();
    const file = formData.get('receipt') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No receipt file uploaded' }, { status: 400 });
    }

    if (file.size > MAX_SIZE_BYTES) {
      return NextResponse.json({ error: 'File too large. Maximum size is 10MB.' }, { status: 400 });
    }

    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/heic'];
    if (!allowedTypes.includes(file.type) && !file.name.match(/\.(jpg|jpeg|png|webp|jfif)$/i)) {
      return NextResponse.json({
        error: 'Invalid file type. Please upload a JPG, PNG, or WEBP screenshot of your GCash receipt.',
      }, { status: 400 });
    }

    // Convert File to Buffer
    const arrayBuffer = await file.arrayBuffer();
    const imageBuffer = Buffer.from(arrayBuffer);

    // Verification config from env
    const expectedAmount = parseFloat(process.env.NEXT_PUBLIC_PRODUCT_PRICE || '497');
    const testMode = process.env.TEST_MODE === 'true';
    const priceTolerance = parseFloat(process.env.PRICE_TOLERANCE || '5');

    const result = await verifyGCashReceipt(imageBuffer, {
      expectedAmount,
      testMode,
      priceTolerance,
      maxAgeDays: 3,
    });

    if (!result.valid) {
      return NextResponse.json({
        success: false,
        error: result.reason,
        warnings: result.warnings,
      }, { status: 422 });
    }

    // Issue signed download token
    const token = issueDownloadToken(
      result.data!.referenceNumber,
      result.data!.amount
    );

    console.log('[verify-receipt] ✅ Receipt verified:', {
      refNo: result.data?.referenceNumber,
      amount: result.data?.amount,
      date: result.data?.dateStr,
      testMode,
    });

    return NextResponse.json({
      success: true,
      token,
      data: {
        referenceNumber: result.data?.referenceNumber,
        amount: result.data?.amount,
        dateStr: result.data?.dateStr,
      },
      warnings: result.warnings,
      testMode,
    });
  } catch (err: unknown) {
    console.error('[verify-receipt] Error:', err);
    return NextResponse.json({
      error: 'Verification failed due to a server error. Please try again or contact support.',
    }, { status: 500 });
  }
}
