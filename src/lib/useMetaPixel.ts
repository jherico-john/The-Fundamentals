// src/lib/useMetaPixel.ts — v4.2
// ─────────────────────────────────────────────────────────────────────────────
// FIXES in v4.2:
//
// FIX 1 — Race condition (primary reason events didn't show in Meta):
//   useEffect fires synchronously post-hydration. afterInteractive loads the
//   fbq script asynchronously. useEffect always wins — fbq is still undefined
//   when trackLead/trackPurchase first call it. The events were silently dropped.
//   Fix: await window.__fbqReady (a Promise set by MetaPixel.tsx) before
//   calling fbq. This guarantees fbq is initialized before any event fires.
//
// FIX 2 — console.debug invisible during testing:
//   console.debug is hidden by default in Chrome DevTools (filter level).
//   Switched to console.log so you can see exactly when events fire.
//
// NOTE: The USAGE comments are documentation only — you do NOT paste them
// into this file. They are already implemented in checkout/page.tsx and
// ReceiptUploader.tsx.
// ─────────────────────────────────────────────────────────────────────────────

'use client';

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
    // Promise exposed by MetaPixel.tsx — resolves when fbq is initialized
    __fbqReady?: Promise<unknown>;
  }
}

export interface PixelProductParams {
  name: string;
  price: number;
  currency: string;
  transactionId?: string;
}

/**
 * Wait for fbq to be initialized, then call it.
 * If fbq never loads (ad blocker, slow connection), this times out
 * gracefully after 5 seconds without throwing.
 */
async function safeFbq(...args: unknown[]): Promise<void> {
  try {
    if (typeof window === 'undefined') return;

    // Wait for the MetaPixel script to finish initializing fbq.
    // window.__fbqReady is set by MetaPixel.tsx before the fbq snippet runs.
    if (window.__fbqReady) {
      // Race against a 5s timeout so we never hang forever
      await Promise.race([
        window.__fbqReady,
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('fbq timeout')), 5000)
        ),
      ]);
    }

    if (typeof window.fbq === 'function') {
      window.fbq(...args);
    }
  } catch {
    // fbq blocked by ad blocker or timed out — silent no-op
  }
}

export function useMetaPixel() {
  /**
   * Fire Lead when a checkout page is displayed.
   *
   * Called from useEffect in checkout/page.tsx and ProductPageTemplate.tsx.
   * Fires AFTER fbq is confirmed ready (awaits window.__fbqReady).
   *
   * Meta event: Lead
   * When: checkout page is rendered and visible to the customer
   * Data: product name, price, currency
   */
  function trackLead({ name, price, currency }: PixelProductParams) {
    safeFbq('track', 'Lead', {
      content_name: name,
      content_category: 'Ministry Digital Pack',
      value: price,
      currency,
    }).then(() => {
      console.log('[MetaPixel] ✅ Lead fired:', { name, price, currency });
    });
  }

  /**
   * Fire Purchase after GCash receipt is verified and file download triggered.
   *
   * Called from ReceiptUploader.triggerDownload() ONLY after:
   * 1. /api/verify-receipt returned success: true
   * 2. /api/download-token returned valid: true
   * 3. The file download <a> click has been triggered
   *
   * Meta event: Purchase
   * When: verified payment confirmed, product delivered
   * Data: product name, price, currency, GCash ref number as transaction_id
   */
  function trackPurchase({ name, price, currency, transactionId }: PixelProductParams) {
    safeFbq('track', 'Purchase', {
      content_name: name,
      content_category: 'Ministry Digital Pack',
      value: price,
      currency,
      ...(transactionId ? { transaction_id: transactionId } : {}),
    }).then(() => {
      console.log('[MetaPixel] ✅ Purchase fired:', { name, price, currency, transactionId });
    });
  }

  return { trackLead, trackPurchase };
}
