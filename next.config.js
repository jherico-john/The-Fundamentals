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
const nextConfig = {
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
