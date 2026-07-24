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
  experimental: {
    serverComponentsExternalPackages: [
      'jimp',
      'qrcode-reader',
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
