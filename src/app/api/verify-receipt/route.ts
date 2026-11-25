// src/app/api/verify-receipt/route.ts — v6
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
import { safeExternalUrl } from '@/lib/safeUrl';
import { rateLimit, clientIp } from '@/lib/rateLimit';

export const runtime = 'nodejs';
export const maxDuration = 60;

const EMAIL = process.env.NEXT_PUBLIC_SUPPORT_EMAIL || 'jhericojohnbalasa@gmail.com';

function errorResponse(code: Parameters<typeof buildError>[0], status = 422, ctx = {}) {
  const e = buildError(code, { supportEmail: EMAIL, ...ctx });
  return NextResponse.json({ success: false, error: `${e.title}. ${e.message}`, errorDetail: e }, { status });
}

// Real image signatures — the browser-reported MIME type / file name is not trusted.
function looksLikeImage(b: Buffer): boolean {
  if (b.length < 12) return false;
  const png  = b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47;
  const jpg  = b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff;
  const webp = b.toString('ascii', 0, 4) === 'RIFF' && b.toString('ascii', 8, 12) === 'WEBP';
  return png || jpg || webp;
}

export async function POST(req: NextRequest) {
  // OCR is CPU-heavy: cap attempts per client (generous for real customers who retry).
  const rl = rateLimit(`verify:${clientIp(req)}`, 15, 600);
  if (!rl.ok) {
    return NextResponse.json({
      success: false,
      error: 'Too many attempts. Please wait a few minutes and try again, or email us if you already paid.',
    }, { status: 429, headers: { 'Retry-After': String(rl.retryAfter) } });
  }
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
    if (!looksLikeImage(buf)) return errorResponse('BAD_FILE_TYPE', 400);

    let customerId: string | null = null;
    const custCookie = req.cookies.get(CUST_COOKIE)?.value;
    if (custCookie) { const s = verifyCustomerSession(custCookie); if (s) customerId = s.id; }

    // new_customer flag for Google Ads: no buyer cookie AND no prior purchase on the account
    const buyerSlugsBefore = readBuyerCookie(req.cookies.get(BUYER_COOKIE)?.value || '');
    let isNewCustomer = buyerSlugsBefore.length === 0;
    if (isNewCustomer && customerId) { try { isNewCustomer = !(await customerHasPurchases(customerId)); } catch { /* keep */ } }

    const attribution = parseAttrCookie(req.cookies.get(ATTR_COOKIE)?.value);

    // TEST_MODE skips the amount / recipient / age checks. It is honoured only outside
    // production, so a forgotten TEST_MODE=true on the live site can never hand out
    // free downloads. (Opt-in override for staging: ALLOW_TEST_MODE_IN_PRODUCTION=true.)
    const wantsTest = process.env.TEST_MODE === 'true';
    const testMode = wantsTest && (process.env.NODE_ENV !== 'production' || process.env.ALLOW_TEST_MODE_IN_PRODUCTION === 'true');
    if (wantsTest && !testMode) console.error('[verify-receipt] TEST_MODE=true ignored in production — set TEST_MODE=false.');
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
      // v6: the ONLY post-payment destination is the funnel Thank You page.
      downloadPageUrl: safeExternalUrl(getDownloadPageUrl(slug)),
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
