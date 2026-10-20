// src/app/api/verify-receipt/route.ts — v5
import { NextRequest, NextResponse } from 'next/server';
import { verifyReceipt } from '@/lib/receiptVerifier';
import { buildError } from '@/lib/receiptErrors';
import {
  issueDownloadToken, signPurchaseCookie, PURCHASE_COOKIE, purchaseCookieOpts,
  verifyCustomerSession, CUST_COOKIE, BUYER_COOKIE, readBuyerCookie, signBuyerCookie, buyerCookieOpts,
} from '@/lib/tokens';
import { getProductBySlug, getCatalogPrice, getUnlockedSlugs, getDownloadPageUrl, resolveSlug } from '@/lib/products';
import { customerHasPurchases } from '@/lib/supabase';
import { parseAttrCookie, ATTR_COOKIE } from '@/lib/adAttribution';

export const runtime = 'nodejs';
export const maxDuration = 60;

const EMAIL = process.env.NEXT_PUBLIC_SUPPORT_EMAIL || 'jhericojohnbalasa@gmail.com';

function errorResponse(code: Parameters<typeof buildError>[0], status = 422, ctx = {}) {
  const e = buildError(code, { supportEmail: EMAIL, ...ctx });
  return NextResponse.json({ success: false, error: `${e.title}. ${e.message}`, errorDetail: e }, { status });
}

export async function POST(req: NextRequest) {
  try {
    if (!req.headers.get('content-type')?.includes('multipart/form-data'))
      return NextResponse.json({ success: false, error: 'Expected multipart/form-data' }, { status: 400 });

    const form = await req.formData();
    const file = form.get('receipt') as File | null;
    const affiliateCode = (form.get('affiliateCode') as string) || null;
    const rawSlug = (form.get('productSlug') as string) || 'fundamentals';

    if (!file) return errorResponse('NO_FILE', 400);
    if (file.size > 10 * 1024 * 1024) return errorResponse('FILE_TOO_LARGE', 400);
    if (!file.type.startsWith('image/') && !file.name.match(/\.(jpg|jpeg|png|webp|jfif)$/i))
      return errorResponse('BAD_FILE_TYPE', 400);

    // The SERVER decides the product and price — never the browser.
    const slug = resolveSlug(rawSlug);
    const product = slug ? getProductBySlug(slug) : undefined;
    const price = slug ? getCatalogPrice(slug) : null;
    if (!slug || !product || !price) return errorResponse('UNKNOWN_PRODUCT', 400);

    const buf = Buffer.from(await file.arrayBuffer());

    let customerId: string | null = null;
    const custCookie = req.cookies.get(CUST_COOKIE)?.value;
    if (custCookie) { const s = verifyCustomerSession(custCookie); if (s) customerId = s.id; }

    // new_customer flag for Google Ads: no buyer cookie AND no prior purchase on the account
    const buyerSlugsBefore = readBuyerCookie(req.cookies.get(BUYER_COOKIE)?.value || '');
    let isNewCustomer = buyerSlugsBefore.length === 0;
    if (isNewCustomer && customerId) { try { isNewCustomer = !(await customerHasPurchases(customerId)); } catch { /* keep */ } }

    const attribution = parseAttrCookie(req.cookies.get(ATTR_COOKIE)?.value);

    const testMode = process.env.TEST_MODE === 'true';
    const result = await verifyReceipt(buf, {
      productSlug: slug, productName: product.name, expectedAmount: price,
      testMode,
      priceTolerance: parseFloat(process.env.PRICE_TOLERANCE || '5'),
      maxAgeDays: parseFloat(process.env.RECEIPT_MAX_AGE_DAYS || '3'),
      affiliateCode, customerId, isNewCustomer, attribution, supportEmail: EMAIL,
    });

    if (!result.valid) {
      const status = result.error.code === 'SERVER_ERROR' ? 503 : 422;
      return NextResponse.json({
        success: false, error: result.reason, errorDetail: result.error, warnings: result.warnings,
      }, { status });
    }

    const token = issueDownloadToken(result.data.referenceNumber, result.data.amount);
    const unlocked = getUnlockedSlugs(slug);
    const res = NextResponse.json({
      success: true, token, productSlug: slug, unlocked,
      downloadPageUrl: getDownloadPageUrl(slug),
      // Ad pixels use the CATALOG price (never the fee-inflated paid amount)
      conversion: { value: price, currency: process.env.NEXT_PUBLIC_CURRENCY || 'PHP', newCustomer: isNewCustomer },
      data: {
        referenceNumber: result.data.referenceNumber,
        amount: result.data.amount,
        dateStr: result.data.dateStr,
        channel: result.data.channel, channelLabel: result.data.channelLabel, route: result.data.route,
        transferFee: result.data.transferFee, instapayRefNo: result.data.instapayRefNo,
      },
      warnings: result.warnings,
      testMode,
    });

    // Per-product purchase cookies (bundle ⇒ every product it contains) + buyer flag
    const signed = signPurchaseCookie(result.data.referenceNumber, price);
    for (const s of unlocked) res.cookies.set(`${PURCHASE_COOKIE}_${s}`, signed, purchaseCookieOpts);
    res.cookies.set(BUYER_COOKIE, signBuyerCookie([...buyerSlugsBefore, ...unlocked]), buyerCookieOpts);
    return res;
  } catch (err) {
    console.error('[verify-receipt]', err);
    return errorResponse('SERVER_ERROR', 500);
  }
}
