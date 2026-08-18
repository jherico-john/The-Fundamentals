'use client';
// src/components/MetaPixel.tsx — v4.2
// ─────────────────────────────────────────────────────────────────────────────
// Base Meta Pixel — loads fbq once globally, fires PageView.
//
// KEY DESIGN: We expose a global `window.__fbqReady` Promise that resolves
// when fbq is fully initialized. This lets Lead/Purchase events in child
// components AWAIT fbq being ready instead of racing against it.
//
// WHY THIS MATTERS:
// `strategy="afterInteractive"` and `useEffect` both fire after hydration,
// but "afterInteractive" is scheduled async by Next.js (via requestIdleCallback
// or setTimeout) while useEffect fires synchronously in the render commit phase.
// Result: useEffect always wins the race, fbq is still undefined, events drop.
//
// FIX: The script itself resolves window.__fbqReady when it finishes init.
// Every trackLead/trackPurchase call awaits that Promise before calling fbq.
// ─────────────────────────────────────────────────────────────────────────────

import Script from 'next/script';

const PIXEL_ID = '1024772523807392';

export default function MetaPixel() {
  return (
    <>
      <Script
        id="meta-pixel"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: `
            (function() {
              // Set up the ready Promise BEFORE the script tag executes
              // so window.__fbqReady is always available for awaiting.
              var resolve;
              window.__fbqReady = new Promise(function(res) { resolve = res; });

              !function(f,b,e,v,n,t,s)
              {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
              n.callMethod.apply(n,arguments):n.queue.push(arguments)};
              if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
              n.queue=[];t=b.createElement(e);t.async=!0;
              t.src=v;s=b.getElementsByTagName(e)[0];
              s.parentNode.insertBefore(t,s)}(window, document,'script',
              'https://connect.facebook.net/en_US/fbevents.js');

              fbq('init', '${PIXEL_ID}');
              fbq('track', 'PageView');

              // Resolve the Promise — fbq is now initialized and ready.
              resolve(window.fbq);
            })();
          `,
        }}
      />
      <noscript>
        <img
          height="1"
          width="1"
          style={{ display: 'none' }}
          src={`https://www.facebook.com/tr?id=${PIXEL_ID}&ev=PageView&noscript=1`}
          alt=""
        />
      </noscript>
    </>
  );
}
