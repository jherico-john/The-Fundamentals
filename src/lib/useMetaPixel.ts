// src/lib/useMetaPixel.ts
// ─────────────────────────────────────────────────────────────────────────────
// Tiny wrapper around window.fbq so every caller gets:
//  - TypeScript safety (no `any` spread everywhere)
//  - A single place to update if the Pixel ID or event schema ever changes
//  - Safe no-op when fbq hasn't loaded yet (SSR, blockers, slow connections)
//
// USAGE:
//   const pixel = useMetaPixel();
//
//   // On checkout page mount → Lead
//   pixel.trackLead({ name: 'The Fundamentals', price: 497, currency: 'PHP' });
//
//   // After receipt verified → Purchase
//   pixel.trackPurchase({ name: 'The Fundamentals', price: 497, currency: 'PHP', transactionId: '9043210498208' });
// ─────────────────────────────────────────────────────────────────────────────

'use client';

// Extend Window to include fbq without a full @types/facebook-pixel dep
declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
  }
}

function fbq(...args: unknown[]) {
  if (typeof window !== 'undefined' && typeof window.fbq === 'function') {
    window.fbq(...args);
  }
}

export interface PixelProductParams {
  /** Product name — e.g. "The Fundamentals" */
  name: string;
  /** Price in local currency (no centavos, just the peso value) */
  price: number;
  /** ISO 4217 currency code — always 'PHP' for this app */
  currency: string;
  /** GCash reference number — used as transaction_id in Purchase events */
  transactionId?: string;
}

export function useMetaPixel() {
  /**
   * Fire a Lead event when the checkout page is displayed.
   *
   * Meta definition: "A submission of information by a customer with the
   * understanding that they may be contacted at a later date."
   *
   * In this app's context: the customer has landed on a specific product's
   * checkout page — they're clearly interested and one step from buying.
   * This is the correct moment for Lead: page is shown, product is known,
   * price is visible, no form submission is needed.
   */
  function trackLead({ name, price, currency }: PixelProductParams) {
    fbq('track', 'Lead', {
      content_name: name,
      content_category: 'Ministry Digital Pack',
      value: price,
      currency,
    });
    console.debug('[MetaPixel] Lead fired:', { name, price, currency });
  }

  /**
   * Fire a Purchase event ONLY after payment verification succeeds.
   *
   * Meta definition: "The completion of a purchase, usually signified by
   * receiving order or purchase confirmation, or a transaction receipt."
   *
   * Fired inside ReceiptUploader.triggerDownload() — after the API confirms
   * the receipt is valid AND the file download is triggered. This means Meta
   * only records a Purchase when a real, verified GCash payment happened.
   *
   * The GCash reference number is used as transaction_id for deduplication
   * — Meta uses this to avoid counting the same purchase twice if the pixel
   * fires more than once (e.g. page refresh after cookie restore).
   */
  function trackPurchase({ name, price, currency, transactionId }: PixelProductParams) {
    fbq('track', 'Purchase', {
      content_name: name,
      content_category: 'Ministry Digital Pack',
      value: price,
      currency,
      ...(transactionId ? { transaction_id: transactionId } : {}),
    });
    console.debug('[MetaPixel] Purchase fired:', { name, price, currency, transactionId });
  }

  return { trackLead, trackPurchase };
}
