/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ['jimp', 'qrcode-reader', 'tesseract.js'],
};
module.exports = nextConfig;
