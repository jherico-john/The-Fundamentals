import type { Metadata } from 'next';
import { Suspense } from 'react';
import './globals.css';
import AffiliateTracker from '@/components/AffiliateTracker';

export const metadata: Metadata = {
  title: 'Ministry Pack — The Fundamentals',
  description: 'Pay via GCash and get instant access to The Fundamentals digital ministry pack.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
      </head>
      <body>
        <Suspense fallback={null}><AffiliateTracker /></Suspense>
        {children}
      </body>
    </html>
  );
}
