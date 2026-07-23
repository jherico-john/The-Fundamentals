/** @type {import('next').NextConfig} */
// ─────────────────────────────────────────────────────────────────────────────
// BUG FIX: "Cannot find module .next/worker-script/node/index.js"
//
// Root cause: `serverExternalPackages` is a Next.js 15+ TOP-LEVEL key.
// In Next 14.x, using it silently no-ops → webpack bundles tesseract.js
// INTO .next/, but tesseract spawns a worker_thread that resolves its script
// relative to __dirname inside .next/ → the file doesn't exist there → crash.
//
// Fix: Use the CORRECT Next 14 key: experimental.serverComponentsExternalPackages
// AND add explicit webpack externals so webpack never touches these modules.
// ─────────────────────────────────────────────────────────────────────────────
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: [
      'jimp',
      'qrcode-reader',
      'tesseract.js',
      '@jimp/core',
      '@jimp/types',
    ],
  },
  webpack: (config, { isServer }) => {
    if (isServer) {
      // Prevent webpack from bundling these — Node will require() from node_modules.
      const existing = Array.isArray(config.externals)
        ? config.externals
        : config.externals ? [config.externals] : [];
      config.externals = [
        ...existing,
        'tesseract.js',
        'jimp',
        'qrcode-reader',
        'bcryptjs',
      ];
    }
    return config;
  },
};

module.exports = nextConfig;
