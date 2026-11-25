import type { Metadata } from 'next';
import { Suspense } from 'react';
import './globals.css';
import AffiliateTracker from '@/components/AffiliateTracker';
import MetaPixel from '@/components/MetaPixel';
import TikTokPixel from '@/components/TikTokPixel';
import GoogleTag from '@/components/GoogleTag';
import AdAttributionTracker from '@/components/AdAttributionTracker';

const THEME_INIT = `(function(){try{var s=localStorage.getItem('tf-theme');var t=(s==='dark'||s==='light')?s:(window.matchMedia&&window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light');document.documentElement.setAttribute('data-theme',t);}catch(e){document.documentElement.setAttribute('data-theme','light');}})();`;

export const metadata: Metadata = {
  title: 'Jherico Balasa Ministry — Digital Ministry Packs',
  description: 'Pay via GCash or any bank / e-wallet and get instant access to ready-to-teach digital ministry packs.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
        {/* Apply the saved / system theme before first paint (no flash). Static string, no user input. */}
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT }} />
      </head>
      <body>
        {/* Meta Pixel — base code + PageView on every page */}
        <MetaPixel />
        {/* TikTok Pixel — base code + PageView on every page */}
        <TikTokPixel />
        {/* Google tag (Google Ads AW-18516168856) — once per page, consent-mode aware */}
        <GoogleTag />
        {/* Ad attribution (gclid / fbclid / ttclid / UTM) → Google · Meta · TikTok outcomes */}
        <Suspense fallback={null}><AdAttributionTracker /></Suspense>
        {/* Affiliate ref cookie tracker */}
        <Suspense fallback={null}><AffiliateTracker /></Suspense>
        {children}
      </body>
    </html>
  );
}
