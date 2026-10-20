'use client';
// src/components/GoogleTag.tsx — v5
// Google tag (gtag.js) for Google Ads account AW-18516168856 — installed ONCE,
// globally from the root layout (Google: "don't add more than one Google tag
// per page"). Matches the snippet from Google Ads ("Google tag.md") and adds:
//   • Consent Mode v2 defaults — DENIED for EEA/UK/CH visitors (so ads
//     personalisation + measurement stay compliant), granted elsewhere.
//   • Buyer suppression — if this device already bought EVERYTHING, ad
//     personalisation signals are switched off so Google stops spending on them.
import Script from 'next/script';

export const GOOGLE_ADS_ID = process.env.NEXT_PUBLIC_GOOGLE_ADS_ID || 'AW-18516168856';

const EEA = ['AT','BE','BG','HR','CY','CZ','DK','EE','FI','FR','DE','GR','HU','IE','IT','LV','LT','LU','MT','NL','PL','PT','RO','SK','SI','ES','SE','IS','LI','NO','GB','CH'];

export default function GoogleTag() {
  const id = GOOGLE_ADS_ID;
  return (
    <>
      <Script id="gtag-src" strategy="afterInteractive" src={`https://www.googletagmanager.com/gtag/js?id=${id}`} />
      <Script id="google-tag" strategy="afterInteractive" dangerouslySetInnerHTML={{ __html: `
        window.dataLayer = window.dataLayer || [];
        function gtag(){dataLayer.push(arguments);}
        window.gtag = gtag;
        var __gready; window.__gtagReady = new Promise(function(r){ __gready = r; });
        gtag('consent', 'default', {
          ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied', analytics_storage: 'denied',
          region: ${JSON.stringify(EEA)}
        });
        gtag('js', new Date());
        // Past buyers of every product → no ad personalisation (reduces wasted spend)
        var cfg = {};
        try {
          var m = document.cookie.match(/(?:^|;\\s*)tf_buyer=([^;]+)/);
          if (m) {
            var b64 = decodeURIComponent(m[1]).split('.')[0].replace(/-/g,'+').replace(/_/g,'/');
            var s = JSON.parse(atob(b64 + '='.repeat((4 - b64.length % 4) % 4))).s || [];
            if (s.indexOf('bundle') > -1 || ['fundamentals','pre-encounter','lifegroup','encounter','post-encounter','sol'].every(function(x){return s.indexOf(x) > -1;})) {
              cfg.allow_ad_personalization_signals = false;
            }
          }
        } catch(e) {}
        gtag('config', '${id}', cfg);
        __gready(true);
      `}} />
    </>
  );
}
