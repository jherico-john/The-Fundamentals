'use client';
// src/components/TikTokPixel.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Base TikTok Pixel — mirrors the MetaPixel architecture exactly.
//
// TikTok Pixel ID: DAB7HIJC77U4RNF8IKGG
//
// DESIGN: Same __ttqReady Promise pattern as MetaPixel's __fbqReady.
// The script resolves window.__ttqReady when ttq is initialized so that
// useTikTokPixel's trackViewContent/trackPurchase calls await it before firing.
// This prevents the race condition where useEffect fires before the script loads.
//
// Event architecture:
//   Every page        → PageView  (fired here, automatically)
//   Product page load → ViewContent (fired from checkout/page.tsx + ProductPageTemplate)
//   Receipt verified  → Purchase  (fired from ReceiptUploader.triggerDownload only)
//
// Testing:
//   TikTok Ads Manager → Assets → Events → your Pixel → Test Events
//   Also: install "TikTok Pixel Helper" Chrome extension
// ─────────────────────────────────────────────────────────────────────────────

import Script from 'next/script';

const PIXEL_ID = 'DAB7HIJC77U4RNF8IKGG';

export default function TikTokPixel() {
  return (
    <>
      <Script
        id="tiktok-pixel"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: `
            (function() {
              // Create the ready Promise BEFORE ttq loads so any waiting
              // callers can always find window.__ttqReady to await.
              var resolve;
              window.__ttqReady = new Promise(function(res) { resolve = res; });

              !function (w, d, t) {
                w.TiktokAnalyticsObject = t;
                var ttq = w[t] = w[t] || [];
                ttq.methods = ["page","track","identify","instances","debug","on","off",
                  "once","ready","alias","group","enableCookie","disableCookie",
                  "holdConsent","revokeConsent","grantConsent"];
                ttq.setAndDefer = function(t, e) {
                  t[e] = function() { t.push([e].concat(Array.prototype.slice.call(arguments, 0))); };
                };
                for (var i = 0; i < ttq.methods.length; i++) ttq.setAndDefer(ttq, ttq.methods[i]);
                ttq.instance = function(t) {
                  for (var e = ttq._i[t] || [], n = 0; n < ttq.methods.length; n++)
                    ttq.setAndDefer(e, ttq.methods[n]);
                  return e;
                };
                ttq.load = function(e, n) {
                  var r = "https://analytics.tiktok.com/i18n/pixel/events.js",
                      o = n && n.partner;
                  ttq._i = ttq._i || {};
                  ttq._i[e] = [];
                  ttq._i[e]._u = r;
                  ttq._t = ttq._t || {};
                  ttq._t[e] = +new Date;
                  ttq._o = ttq._o || {};
                  ttq._o[e] = n || {};
                  n = document.createElement("script");
                  n.type = "text/javascript";
                  n.async = !0;
                  n.src = r + "?sdkid=" + e + "&lib=" + t;
                  e = document.getElementsByTagName("script")[0];
                  e.parentNode.insertBefore(n, e);
                };

                ttq.load('${PIXEL_ID}');
                ttq.page();
              }(window, document, 'ttq');

              // ttq is now initialized — resolve the Promise so
              // useTikTokPixel callers can proceed safely.
              resolve(window.ttq);
            })();
          `,
        }}
      />
    </>
  );
}
