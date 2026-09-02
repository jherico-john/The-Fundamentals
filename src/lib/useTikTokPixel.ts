// src/lib/useTikTokPixel.ts
// ─────────────────────────────────────────────────────────────────────────────
// TikTok Pixel event hook — mirrors useMetaPixel exactly.
//
// TikTok standard events used:
//   PageView      — automatic, fired by TikTokPixel.tsx base code
//   ViewContent   — product page is displayed (replaces Meta's Lead)
//   Purchase      — only after GCash receipt verified (ReceiptUploader)
//
// Why ViewContent instead of Lead for TikTok?
//   TikTok's standard event for "viewing a product page" is ViewContent.
//   Lead in TikTok means "form submitted". Since there's no form on the
//   product page, ViewContent is the semantically correct event here.
//
// Race condition prevention:
//   Same __ttqReady Promise pattern as Meta's __fbqReady. Every event call
//   awaits window.__ttqReady before calling ttq() so it never fires before
//   the TikTok script has finished loading — which was the original issue
//   with Meta (useEffect wins the race against afterInteractive scripts).
// ─────────────────────────────────────────────────────────────────────────────

'use client';

declare global {
  interface Window {
    ttq?: {
      track: (event: string, params?: Record<string, unknown>) => void;
      page: () => void;
      identify: (params: Record<string, unknown>) => void;
      [key: string]: unknown;
    };
    // Promise resolved by TikTokPixel.tsx when ttq is initialized
    __ttqReady?: Promise<unknown>;
  }
}

export interface TikTokProductParams {
  /** Product name shown in TikTok Events Manager */
  name: string;
  /** Price in PHP (integer pesos, not centavos) */
  price: number;
  /** Always 'PHP' for this app */
  currency: string;
  /** GCash reference number — used as order_id for deduplication */
  transactionId?: string;
  /** Product page slug — used as content_id */
  contentId?: string;
}

/**
 * Await ttq initialization then call it safely.
 * Times out after 5s so no event ever hangs the UI.
 * Silent no-op if TikTok pixel is blocked by an ad blocker.
 */
async function safeTtq(event: string, params?: Record<string, unknown>): Promise<void> {
  try {
    if (typeof window === 'undefined') return;

    if (window.__ttqReady) {
      await Promise.race([
        window.__ttqReady,
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('ttq timeout')), 5000)
        ),
      ]);
    }

    if (window.ttq?.track) {
      window.ttq.track(event, params);
    }
  } catch {
    // Ad blocker or timeout — silent no-op, never breaks the UI
  }
}

export function useTikTokPixel() {
  /**
   * ViewContent — fires when a product checkout page is displayed.
   *
   * TikTok definition: "Browsing a product page."
   * Correct for this app because the customer is viewing a specific product
   * with its name and price before deciding to pay.
   *
   * Called from: checkout/page.tsx and ProductPageTemplate useEffect
   */
  function trackViewContent({ name, price, currency, contentId }: TikTokProductParams) {
    safeTtq('ViewContent', {
      content_name: name,
      content_id: contentId || name.toLowerCase().replace(/\s+/g, '-'),
      content_type: 'product',
      value: price,
      currency,
    }).then(() => {
      console.log('[TikTokPixel] ✅ ViewContent fired:', { name, price, currency });
    });
  }

  /**
   * Purchase — fires ONLY after GCash receipt verification succeeds.
   *
   * TikTok definition: "Completing a purchase."
   * Fired inside ReceiptUploader.triggerDownload() after:
   *   1. /api/verify-receipt returned success: true
   *   2. /api/download-token returned valid: true
   *   3. File download <a> click triggered
   *
   * The GCash reference number is the order_id — TikTok uses this for
   * deduplication if the same Purchase event fires more than once.
   *
   * Called from: ReceiptUploader.tsx triggerDownload()
   */
  function trackPurchase({ name, price, currency, transactionId, contentId }: TikTokProductParams) {
    // TikTok requires value and currency for Purchase events
    const safePrice = Number.isFinite(price) && price > 0 ? price : 0;

    safeTtq('Purchase', {
      content_name: name,
      content_id: contentId || name.toLowerCase().replace(/\s+/g, '-'),
      content_type: 'product',
      value: safePrice,
      currency,
      quantity: 1,
      ...(transactionId ? { order_id: transactionId } : {}),
    }).then(() => {
      console.log('[TikTokPixel] ✅ Purchase fired:', { name, price: safePrice, currency, transactionId });
    });
  }

  return { trackViewContent, trackPurchase };
}
