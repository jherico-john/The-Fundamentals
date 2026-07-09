# Ministry Checkout v3 — GCash Receipt Verification System
## Full Setup & Deployment Guide

---

## Overview

This is a **zero-payment-gateway** checkout system. Customers pay directly via GCash to your personal GCash number, download their receipt, upload it to this site, and the system automatically verifies it and delivers the digital product.

```
Systeme.io Product Page
        ↓ (click "Get Access Now")
This Site /checkout
        ↓ (customer scans GCash QR / enters number)
Customer pays on GCash app
        ↓ (downloads GCash receipt screenshot)
Uploads receipt on /checkout
        ↓ (backend scans QR + OCR verifies amount/ref/date)
Receipt VERIFIED
        ↓ (simultaneously)
   File Download    +    Redirect to Systeme.io Download Page
```

**No PayMongo. No Xendit. No transaction fees. No BIR registration required.**

---

## How Verification Works (2-Layer System)

### Layer 1 — QR Code Scan (jimp + qrcode-reader)
Every GCash payment receipt contains an embedded QR code (EMVCo/QRPh standard).
The system scans this QR code to verify the image is a genuine GCash receipt — not a random screenshot.

### Layer 2 — OCR Text Extraction (Tesseract.js)
Reads the visible text from the receipt image to extract:
- **Reference Number** — unique per transaction, used for anti-replay protection
- **Amount** — checked against expected product price (with configurable tolerance)
- **Date** — ensures receipt is not older than 3 days
- **Mobile Number** — extracted for logging (not used for rejection)

### Anti-Replay Protection
Each reference number can only be used ONCE. A second upload with the same receipt is rejected.
In production, replace the in-memory Set with Redis or Supabase for persistence across restarts.

---

## 1. Local Development Setup

```bash
# 1. Install dependencies
cd ministry-checkout-v3
npm install

# 2. Copy env file
cp .env.local.example .env.local
# Edit .env.local — fill in your GCash number, name, etc.

# 3. IMPORTANT: Add your GCash QR code image
# Get it from GCash app: Profile → QR Code → Download/Share
# Save as: public/gcash/qr.png

# 4. Run dev server
npm run dev
# → http://localhost:3000

# 5. Test with TEST_MODE=true
# In .env.local: TEST_MODE=true
# This makes verification lenient — any receipt passes amount/date checks
# Still requires the image to be a valid receipt-looking image
```

---

## 2. Required: Add Your GCash QR Code

1. Open **GCash app** on your phone
2. Tap **Profile** (bottom right)
3. Tap **My QR Code**
4. Tap **Share / Download** to save it
5. Copy the image to: `public/gcash/qr.png`

In `src/components/ReceiptUploader.tsx`, find the comment `REPLACE THIS` and update:
```tsx
// Replace the placeholder div with:
<img src="/gcash/qr.png" alt="GCash QR Code" className="w-full h-full object-contain" />
```

---

## 3. Configure Your Product File

Set the direct download URL for your digital product:

```env
PRODUCT_FILE_URL=https://drive.google.com/uc?export=download&id=YOUR_GOOGLE_DRIVE_FILE_ID
```

### Getting a Google Drive direct download link:
1. Upload your file to Google Drive
2. Right-click → **Share** → set to "Anyone with the link"
3. Copy the file ID from the URL: `https://drive.google.com/file/d/FILE_ID_HERE/view`
4. Your download URL: `https://drive.google.com/uc?export=download&id=FILE_ID_HERE`

---

## 4. Environment Variables Reference

| Variable | Description | Example |
|---|---|---|
| `NEXT_PUBLIC_GCASH_NUMBER` | Your GCash number (shown on checkout) | `0917 123 4567` |
| `NEXT_PUBLIC_GCASH_NAME` | Your GCash display name | `J. Balasa` |
| `NEXT_PUBLIC_PRODUCT_PRICE` | Product price in PHP (integer) | `497` |
| `PRICE_TOLERANCE` | Accepted price variance ±PHP | `5` |
| `TEST_MODE` | `true` = lenient verification (dev only!) | `false` |
| `PRODUCT_FILE_URL` | Direct download URL for your file | Google Drive link |
| `DOWNLOAD_TOKEN_SECRET` | 32-byte hex to sign download tokens | `openssl rand -hex 32` |
| `DOWNLOAD_TOKEN_EXPIRY_SEC` | Token validity in seconds | `600` (10 min) |
| `NEXT_PUBLIC_DOWNLOAD_PAGE_URL` | Systeme.io download/thank-you page | your systeme.io link |
| `NEXT_PUBLIC_SUPPORT_EMAIL` | Your support email | your@gmail.com |

---

## 5. Deploy to Vercel

```bash
# 1. Push to GitHub
git init && git add . && git commit -m "v3 initial"
git remote add origin https://github.com/YOUR_USERNAME/ministry-checkout-v3.git
git push -u origin main

# 2. Import to Vercel: https://vercel.com/new

# 3. Set Environment Variables in Vercel Dashboard:
#    Project → Settings → Environment Variables
#    Add all variables from .env.production.example
#    CRITICAL: Set TEST_MODE=false for production!

# 4. The verify-receipt function needs 1GB memory + 60s timeout
#    (already configured in vercel.json)

# 5. Set region to sin1 (Singapore) for fastest Philippines response
```

---

## 6. Verifying a Receipt — What to Tell Customers

**Tell customers to:**
1. Send the **exact amount** (₱497) — not ₱496 or ₱498
2. After GCash shows success, tap **"Download"** at the bottom to save the receipt
3. Do NOT crop, edit, or screenshot the receipt again — upload the original save
4. The receipt must be from within **3 days** (configurable in `maxAgeDays`)

**Common customer mistakes:**
- Taking a photo of their phone screen instead of using GCash's built-in download
- Cropping the receipt so the reference number is cut off
- Sending the wrong amount

---

## 7. Production Checklist

- [ ] `TEST_MODE=false` in Vercel production env
- [ ] Real GCash QR code image at `public/gcash/qr.png`
- [ ] `NEXT_PUBLIC_GCASH_NUMBER` set to your actual number
- [ ] `PRODUCT_FILE_URL` points to your actual downloadable file
- [ ] `DOWNLOAD_TOKEN_SECRET` is a strong random hex (not the example value)
- [ ] `NEXT_PUBLIC_DOWNLOAD_PAGE_URL` set to your Systeme.io page
- [ ] `NEXT_PUBLIC_SUPPORT_EMAIL` set to your email
- [ ] Test full flow in production with a ₱1 test payment (set `TEST_MODE=false`, `PRODUCT_PRICE=1`)

---

## 8. Anti-Fraud Notes

- Reference numbers are stored in memory per serverless instance. On Vercel, instances restart frequently. For persistent anti-replay, integrate Redis (Upstash is free) or Supabase.
- Receipt images are processed in memory and never stored to disk.
- Download tokens expire after 10 minutes (configurable).
- Each verified reference number is marked "used" — cannot be reused within the same server instance.

---

## 9. File Structure

```
ministry-checkout-v3/
├── public/
│   ├── gcash/
│   │   ├── qr.png              ← ADD YOUR GCASH QR HERE
│   │   └── sample-receipt.jpg  ← sample for reference
│   └── tutorial/               ← tutorial step images
├── src/
│   ├── app/
│   │   ├── checkout/page.tsx   ← main checkout page
│   │   ├── success/page.tsx    ← post-payment redirect
│   │   └── api/
│   │       ├── verify-receipt/ ← QR scan + OCR verification
│   │       └── download-token/ ← token validation + file URL
│   ├── components/
│   │   ├── ReceiptUploader.tsx ← GCash QR display + upload UI
│   │   ├── PaymentTutorial.tsx ← step-by-step guide
│   │   └── SupportSection.tsx  ← FAQ + contact form
│   └── lib/
│       ├── receiptVerifier.ts  ← core verification engine
│       └── downloadToken.ts    ← HMAC token signing
├── .env.local.example
├── .env.production.example
└── vercel.json
```
