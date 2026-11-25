# Ministry Checkout — v5 → v6 (Checkout page update)

Status: **built, type-checked, production-built, tested. NOT packaged** (per project rules: say "release" to get the ZIP).

## Requirement → implementation map
| Spec item | Where |
|---|---|
| New products: Post-Encounter ₱497, SOL 1, 2 & 3 ₱1,597 | `src/lib/products.ts` (defaults + names), `src/app/products/{post-encounter,sol}`, `.env*.example` |
| A. Clean minimal Dark / Light themes, green removed, no emojis / clutter | `src/app/globals.css` (tokens), `tailwind.config.ts`, all pages/components restyled; Bebas font, glow, shimmer, float and fade animations removed |
| A. Strengthen cybersecurity / secure backend | see **Security** below |
| B. ONE redirect → funnel Thank You page only; MediaFire links commented out in .env | `ReceiptUploader.tsx`, `api/download-token`, `api/verify-receipt`, `.env*` (links commented) |
| C. Remove "What's Inside" and "What Leaders Are Saying" on all checkout pages | `checkout/page.tsx`, `ProductPageTemplate.tsx`, all `products/*` pages |
| C. New order: title → video → fixed nav button → tutorial → price & payment → having a problem | `src/components/CheckoutFlow.tsx` (shared by every checkout page) |
| C. Embedded YouTube tutorial | `TutorialVideo.tsx` — set `NEXT_PUBLIC_TUTORIAL_VIDEO_URL` (link or 11-char id) |
| C. Fixed button to Price & Payment | `JumpToPaymentButton.tsx` (hides itself while the payment section is on screen) |
| D. Clearer step-by-step tutorial | `PaymentTutorial.tsx` (all 7 steps visible, plain words, one action per step, larger text) |
| 3. Theme toggle right after "Join Free" | `NavBar.tsx` + `ThemeToggle.tsx` (saved choice → system preference → light; no flash) |
| 4. Keep Meta Pixel, TikTok Pixel, Google Ads, payment verification, integrations | untouched: `MetaPixel`, `TikTokPixel`, `GoogleTag`, `use*Pixel` hooks, `receiptVerifier/Parser/OCR`, Supabase. Purchase events still fire with the catalog price, now immediately before the single redirect |

## The single redirect
Receipt verified → purchase pixels fire → 3-second notice → **same-tab** redirect to the Thank You page. A large "Go to My Download Page" button is shown at the same time. The Thank You URL is validated (`https` only) before use. `/api/download-token` no longer returns any file URL.

## Security (please read)
* Rate limits: receipt verification, login (per IP and per email), register, change-password, download-token, ads-touch.
* Login: one generic error (no account enumeration), constant-time admin check, timing-equalised unknown-email path.
* Passwords: minimum 8 (max 72), bcrypt cost 12. Register no longer returns internal error text.
* Secrets fail closed in production (missing / short / placeholder = refuse to sign; the edge middleware treats nobody as signed in).
* Receipt upload: real image-signature check (PNG / JPEG / WEBP), not just the browser-reported type.
* `TEST_MODE` is ignored in production (override: `ALLOW_TEST_MODE_IN_PRODUCTION=true`).
* Legacy PayMongo / QRPh routes (not used by any page) now return 410 unless `LEGACY_PAYMONGO_ENABLED=true`; the webhook also fails closed without a secret.
* Headers: HSTS, nosniff, Referrer-Policy, Permissions-Policy, frame protection, `object-src 'none'`, `base-uri`, `form-action`, `no-store` on `/api`. No `script-src` on purpose, so the ad pixels cannot be broken.
* Purchase cookie is now `Secure` in production. Dead `downloadToken.ts` (hard-coded fallback secret) removed.
* Next.js upgraded 14.2.5 → 14.2.35 (patched). `pnpm-lock.yaml` was not regenerated; `package-lock.json` was.

## New / changed environment variables
`NEXT_PUBLIC_TUTORIAL_VIDEO_URL`, optional server-only `DOWNLOAD_PAGE_URL_<SLUG>`, `LEGACY_PAYMONGO_ENABLED`, `ALLOW_FRAME_ANCESTORS`, `ALLOW_TEST_MODE_IN_PRODUCTION`, `RATE_LIMIT_SCALE` (tests only). All `PRODUCT_FILE_URL_*` are commented out.

## Tests
`npm run test:receipts` (39) · `npm run test:v6` (38) · `node tests/e2e.mjs` against `next start` (116; run the server with `RECEIPT_MAX_AGE_DAYS=100000` and `RATE_LIMIT_SCALE=100` because the fixtures are old receipts).
