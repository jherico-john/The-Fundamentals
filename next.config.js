/** @type {import('next').NextConfig} */
// ─────────────────────────────────────────────────────────────────────────────
// FIX 1 (next.config.js):
//
// In Next.js 14.x, the correct key is `experimental.serverComponentsExternalPackages`.
// `serverExternalPackages` (no `experimental`) is a Next 15+ top-level key.
// Using the wrong key silently no-ops → webpack BUNDLES these packages into
// .next/server/chunks/ → tesseract's worker_thread can't find its script there.
//
// FIX 2 (webpack externals):
// Belt-and-suspenders: explicitly mark jimp, tesseract.js, qrcode-reader, and
// the language data package as external so webpack never touches them.
// ─────────────────────────────────────────────────────────────────────────────
// v6 security headers. Deliberately NO script-src / default-src: Meta Pixel, TikTok
// Pixel and the Google tag inject scripts from several domains and a strict CSP
// would silently break conversion tracking. The directives below close the
// remaining holes (plugins, <base> hijack, form hijack, clickjacking) without
// touching the pixels. Set ALLOW_FRAME_ANCESTORS to a space-separated list of
// origins only if the checkout must be embedded in another site.
const frameAncestors = (process.env.ALLOW_FRAME_ANCESTORS || '').trim();
const securityHeaders = [
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=(), usb=()' },
  { key: 'X-DNS-Prefetch-Control', value: 'on' },
  ...(frameAncestors ? [] : [{ key: 'X-Frame-Options', value: 'SAMEORIGIN' }]),
  { key: 'Content-Security-Policy', value: `object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors ${frameAncestors ? "'self' " + frameAncestors : "'self'"}` },
];

const nextConfig = {
  poweredByHeader: false,
  reactStrictMode: true,
  async headers() {
    return [
      { source: '/:path*', headers: securityHeaders },
      // Verification / auth responses must never be cached by browsers or CDNs.
      { source: '/api/:path*', headers: [{ key: 'Cache-Control', value: 'no-store' }] },
    ];
  },
  // v5: SUNYL is the same product as Lifegroup Essentials — keep old links/ads alive.
  async redirects() {
    return [{ source: '/products/sunyl', destination: '/products/lifegroup', permanent: true }];
  },
  experimental: {
    // v5: make sure the OCR engine + BOTH language models are shipped inside the
    // serverless function on Vercel (they are read from disk at runtime, so
    // Next's static file tracing would otherwise miss them).
    outputFileTracingIncludes: {
      '/api/verify-receipt': [
        './node_modules/tesseract.js/**/*',
        './node_modules/tesseract.js-core/**/*',
        './node_modules/@tesseract.js-data/eng/4.0.0_best_int/**/*',
        './node_modules/@tesseract.js-data/eng/4.0.0/**/*',
        './node_modules/sharp/**/*',
        './node_modules/@img/**/*',
      ],
    },
    serverComponentsExternalPackages: [
      'jimp',
      'qrcode-reader',
      'sharp',
      'tesseract.js',
      '@tesseract.js-data/eng',
      '@jimp/core',
      '@jimp/types',
    ],
  },
  webpack: (config, { isServer }) => {
    if (isServer) {
      const existing = Array.isArray(config.externals)
        ? config.externals
        : config.externals ? [config.externals] : [];
      config.externals = [
        ...existing,
        'tesseract.js',
        'sharp',
        'jimp',
        'qrcode-reader',
        '@tesseract.js-data/eng',
        'bcryptjs',
      ];
    }
    return config;
  },
};

module.exports = nextConfig;
