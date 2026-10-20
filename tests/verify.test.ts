// End-to-end receipt verification test against the 12 real receipts supplied
// for the v5 study (+ the native GCash sample) and a set of negative cases.
// Run:  npm run test:receipts
import './env';
import fs from 'fs';
import path from 'path';
import { verifyReceipt } from '../src/lib/receiptVerifier';
import { getPriceWindow, findPriceCollisions, nearestRound } from '../src/lib/priceThreshold';
import { PRODUCTS } from '../src/lib/products';

const dir = path.join(__dirname, 'fixtures');
let pass = 0, failN = 0;
const ok = (name: string, cond: boolean, extra = '') => { cond ? pass++ : failN++; console.log(`${cond ? '  ✓' : '  ✗ FAIL'} ${name}${extra ? '  — ' + extra : ''}`); };

// unit: threshold windows (the user's own examples)
console.log('\n[price thresholds]');
const expectRound: Record<number, number> = { 397: 400, 297: 300, 997: 1000, 697: 700, 597: 600, 1997: 2000, 2997: 3000 };
for (const [p, r] of Object.entries(expectRound)) ok(`nearestRound(${p}) = ${r}`, nearestRound(+p) === r);
const prices = PRODUCTS.map(p => ({ slug: p.slug, price: p.price }));
ok('no catalog window overlaps', findPriceCollisions(prices, 5).length === 0, findPriceCollisions(prices, 5).join('; '));
console.log('  windows:', PRODUCTS.map(p => `${p.slug} ${p.price}→[${getPriceWindow(p.price, 5).min}-${getPriceWindow(p.price, 5).max}]`).join('  '));

const cases: { file: string; slug: string; price: number; channel: string; paid: number }[] = [
  { file: 'maribank_297_to_gcash.png',   slug: 'pre-encounter', price: 297, channel: 'maribank', paid: 297 },
  { file: 'bpi_397_qr.png',              slug: 'lifegroup',     price: 397, channel: 'bpi',      paid: 397 },
  { file: 'maya_997_sent_via.png',       slug: 'encounter',     price: 997, channel: 'maya',     paid: 997 },
  { file: 'unionbank_397.png',           slug: 'lifegroup',     price: 397, channel: 'unionbank', paid: 397 },
  { file: 'securitybank_email_597.png',  slug: 'fundamentals',  price: 597, channel: 'security_bank', paid: 597 },
  { file: 'bdo_397.png',                 slug: 'lifegroup',     price: 397, channel: 'bdo',      paid: 397 },
  { file: 'bpi_397_number.png',          slug: 'lifegroup',     price: 397, channel: 'bpi',      paid: 397 },
  { file: 'gotyme_597_fee9.png',         slug: 'fundamentals',  price: 597, channel: 'gotyme',   paid: 597 },
  { file: 'bdo_597.png',                 slug: 'fundamentals',  price: 597, channel: 'bdo',      paid: 597 },
  { file: 'maribank_400_roundup.png',    slug: 'lifegroup',     price: 397, channel: 'maribank', paid: 400 },
  { file: 'instapay_metrobank_397.png',  slug: 'lifegroup',     price: 397, channel: 'instapay', paid: 397 },
  { file: 'maya_407_fee10.png',          slug: 'lifegroup',     price: 397, channel: 'maya',     paid: 407 },
];

const base = { testMode: false, priceTolerance: 5, maxAgeDays: 100000, persist: true, productName: 'Test' };

(async () => {
  console.log('\n[12 real receipts — must PASS for the right product]');
  const bufs: Record<string, Buffer> = {};
  for (const c of cases) {
    const buf = fs.readFileSync(path.join(dir, c.file)); bufs[c.file] = buf;
    const r = await verifyReceipt(buf, { ...base, productSlug: c.slug, expectedAmount: c.price });
    const good = r.valid && r.data.channel === c.channel && Math.abs(r.data.amount - c.paid) < 0.01;
    ok(`${c.file.padEnd(30)} → ${c.slug} ₱${c.price}`, good,
      r.valid ? `channel=${r.data.channel} route=${r.data.route} paid=${r.data.amount} fee=${r.data.transferFee} ref=${r.data.referenceNumber}` : `${r.error.code}: ${r.error.message}`);
  }

  console.log('\n[native GCash sample]');
  {
    process.env.PAYMENT_DEST_TOKENS = '9050372330,4PDO';
    const r = await verifyReceipt(fs.readFileSync(path.join(dir, 'gcash_native_sample.png')), { ...base, productSlug: 'lifegroup', expectedAmount: 1 });
    ok('GCash native receipt verifies (price 1)', r.valid && r.data.channel === 'gcash' && r.data.route === 'direct_gcash',
      r.valid ? `ref=${r.data.referenceNumber}` : r.error.code);
    process.env.PAYMENT_DEST_TOKENS = '4PDO,JH****O JO*N B.,09977963079,J. Balasa';
  }

  console.log('\n[anti-replay: same receipts again must say "already submitted"]');
  for (const c of cases.slice(0, 4)) {
    const r = await verifyReceipt(bufs[c.file], { ...base, productSlug: c.slug, expectedAmount: c.price });
    ok(`${c.file} replay`, !r.valid && (r.error.code === 'DUPLICATE_IMAGE' || r.error.code === 'DUPLICATE_REFERENCE'), r.valid ? 'ACCEPTED (bad)' : r.error.code);
  }

  // re-encoded copy of a used receipt: different bytes (hash) but same refs → still blocked
  {
    const sharp = (await import('sharp')).default;
    const re = await sharp(bufs['bdo_397.png']).jpeg({ quality: 82 }).toBuffer();
    const r = await verifyReceipt(re, { ...base, productSlug: 'lifegroup', expectedAmount: 397 });
    ok('re-saved JPEG copy of a used receipt is blocked by reference keys', !r.valid && r.error.code === 'DUPLICATE_REFERENCE', r.valid ? 'ACCEPTED (bad)' : r.error.code);
  }

  console.log('\n[amount rules — fresh DB state needed, use persist:false]');
  const np = { ...base, persist: false };
  const fresh = async (file: string, slug: string, price: number) => verifyReceipt(fs.readFileSync(path.join(dir, file)), { ...np, productSlug: slug, expectedAmount: price });
  // Use a different image set that hasn't been persisted: re-run with a modified hash by tiny crop is NOT allowed — so test amount logic via a product with different price on an unused receipt.
  // maya_407 was already used above → use DEV memory reset through globalThis
  (globalThis as any).__memdb = undefined;
  let r = await fresh('maya_407_fee10.png', 'pre-encounter', 297);
  ok('₱407 receipt vs ₱297 product → AMOUNT_OVER', !r.valid && r.error.code === 'AMOUNT_OVER', r.valid ? 'ACCEPTED (bad)' : r.error.code);
  r = await fresh('maribank_297_to_gcash.png', 'lifegroup', 397);
  ok('₱297 receipt vs ₱397 product → AMOUNT_SHORT', !r.valid && r.error.code === 'AMOUNT_SHORT', r.valid ? 'ACCEPTED (bad)' : r.error.code);
  r = await fresh('maya_997_sent_via.png', 'sol', 1997);
  ok('₱997 receipt vs SOL ₱1997 → AMOUNT_SHORT', !r.valid && r.error.code === 'AMOUNT_SHORT', r.valid ? 'ACCEPTED (bad)' : r.error.code);
  r = await fresh('maribank_400_roundup.png', 'lifegroup', 397);
  ok('₱400 receipt vs ₱397 product → accepted (round-up)', r.valid);
  r = await fresh('gotyme_597_fee9.png', 'fundamentals', 597);
  ok('GoTyme ₱597 + ₱9 fee → accepted for ₱597', r.valid);

  console.log('\n[recipient check]');
  process.env.PAYMENT_DEST_TOKENS = '8888,SOMEONEELSE,09170000000';
  r = await fresh('bdo_397.png', 'lifegroup', 397);
  ok('receipt paid to a different account → WRONG_RECIPIENT', !r.valid && r.error.code === 'WRONG_RECIPIENT', r.valid ? 'ACCEPTED (bad)' : r.error.code);
  process.env.PAYMENT_DEST_TOKENS = '4PDO,JH****O JO*N B.,09977963079,J. Balasa';

  console.log('\n[freshness]');
  r = await verifyReceipt(fs.readFileSync(path.join(dir, 'bdo_397.png')), { ...np, maxAgeDays: 3, productSlug: 'lifegroup', expectedAmount: 397, now: new Date('2026-10-19T00:00:00Z') });
  ok('Sep-2026 receipt on 19 Oct 2026 with 3-day window → RECEIPT_TOO_OLD', !r.valid && r.error.code === 'RECEIPT_TOO_OLD', r.valid ? 'ACCEPTED (bad)' : r.error.code);
  r = await verifyReceipt(fs.readFileSync(path.join(dir, 'bdo_397.png')), { ...np, maxAgeDays: 3, productSlug: 'lifegroup', expectedAmount: 397, now: new Date('2026-09-02T08:00:00Z') });
  ok('same receipt 1h after it was made → accepted', r.valid, r.valid ? '' : r.error.code);

  console.log('\n[anti-editing signature]');
  {
    const edited = Buffer.concat([fs.readFileSync(path.join(dir, 'bdo_397.png')), Buffer.from('Adobe Photoshop 25.0')]);
    r = await verifyReceipt(edited, { ...np, productSlug: 'lifegroup', expectedAmount: 397 });
    ok('file carrying an "Adobe Photoshop" marker → EDITED_IMAGE', !r.valid && r.error.code === 'EDITED_IMAGE', r.valid ? 'ACCEPTED (bad)' : r.error.code);
  }

  console.log('\n[not a receipt / garbage]');
  {
    const sharp = (await import('sharp')).default;
    const blank = await sharp({ create: { width: 600, height: 900, channels: 3, background: '#ffffff' } }).png().toBuffer();
    r = await verifyReceipt(blank, { ...np, productSlug: 'lifegroup', expectedAmount: 397 });
    ok('blank image rejected', !r.valid, r.valid ? 'ACCEPTED (bad)' : r.error.code);
    r = await verifyReceipt(Buffer.from('not an image'), { ...np, productSlug: 'lifegroup', expectedAmount: 397 });
    ok('non-image bytes → UNREADABLE_IMAGE', !r.valid && r.error.code === 'UNREADABLE_IMAGE', r.valid ? 'ACCEPTED (bad)' : r.error.code);
  }

  console.log(`\n${pass} passed, ${failN} failed`);
  process.exit(failN ? 1 : 0);
})();
