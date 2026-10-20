'use client';
// src/lib/useGoogleAds.ts — v5
// Google Ads events, mirroring useMetaPixel / useTikTokPixel.
//   trackViewContent → view_item (dynamic-remarketing signal) — SKIPPED if this
//                       device already bought the product (no re-advertising).
//   trackPurchase    → Google Ads conversion (AW-18516168856/79WvCJ3Vwp4dEJihmf1E)
//                       with the product's catalog price, the transaction id
//                       (receipt reference) and the new_customer flag, plus a
//                       GA-style `purchase` event for building a "purchasers"
//                       audience to EXCLUDE in Google Ads.
import { GOOGLE_ADS_ID } from '@/components/GoogleTag';
import { hasBought } from './buyerState';

declare global {
  interface Window { gtag?: (...a: unknown[]) => void; __gtagReady?: Promise<unknown>; }
}

const SEND_TO = process.env.NEXT_PUBLIC_GOOGLE_ADS_PURCHASE_SEND_TO || `${GOOGLE_ADS_ID}/79WvCJ3Vwp4dEJihmf1E`;

async function safeGtag(...args: unknown[]): Promise<boolean> {
  try {
    if (typeof window === 'undefined') return false;
    if (window.__gtagReady) {
      await Promise.race([window.__gtagReady, new Promise((_, rej) => setTimeout(() => rej(new Error('gtag timeout')), 5000))]);
    }
    if (typeof window.gtag === 'function') { window.gtag(...args); return true; }
  } catch { /* blocked or timed out — silent */ }
  return false;
}

export interface GoogleProductParams {
  slug: string; name: string; price: number; currency: string; transactionId?: string; newCustomer?: boolean;
}

export function useGoogleAds() {
  function trackViewContent({ slug, name, price, currency }: GoogleProductParams) {
    if (hasBought(slug)) { console.log('[GoogleAds] ⏭ view_item skipped — already purchased', slug); return; }
    safeGtag('event', 'view_item', {
      value: price, currency,
      items: [{ item_id: slug, item_name: name, price, quantity: 1, item_category: 'Ministry Digital Pack' }],
    }).then(ok => ok && console.log('[GoogleAds] ✅ view_item fired:', { slug, price }));
  }

  function trackPurchase({ slug, name, price, currency, transactionId, newCustomer }: GoogleProductParams) {
    const value = Number.isFinite(price) && price > 0 ? price : 0;
    safeGtag('event', 'conversion', {
      send_to: SEND_TO, value, currency, transaction_id: transactionId || '',
      ...(typeof newCustomer === 'boolean' ? { new_customer: newCustomer } : {}),
    }).then(ok => ok && console.log('[GoogleAds] ✅ conversion fired:', { slug, value, transactionId, newCustomer }));
    safeGtag('event', 'purchase', {
      transaction_id: transactionId || '', value, currency,
      items: [{ item_id: slug, item_name: name, price: value, quantity: 1 }],
    });
  }
  return { trackViewContent, trackPurchase };
}
