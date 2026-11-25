// v6 unit tests — video parsing, safe redirect URLs, rate limiter, price catalog,
// and "fail closed" secrets. Run: npm run test:v6
process.env.DEV_MEMORY_DB = 'true';
import { parseYouTubeId } from '../src/lib/video';
import { safeExternalUrl } from '../src/lib/safeUrl';
import { rateLimit } from '../src/lib/rateLimit';
import { PRODUCTS, getProductBySlug, getDownloadPageUrl, getFileUrl } from '../src/lib/products';
import { getPriceWindow, findPriceCollisions } from '../src/lib/priceThreshold';

let pass = 0, failN = 0;
const ok = (name: string, cond: boolean, extra = '') => { cond ? pass++ : failN++; console.log(`${cond ? '  ✓' : '  ✗ FAIL'} ${name}${extra ? '  — ' + extra : ''}`); };

console.log('\n[YouTube id parsing]');
const id = 'dQw4w9WgXcQ';
for (const u of [id, `https://www.youtube.com/watch?v=${id}`, `https://youtu.be/${id}?si=abc`, `https://m.youtube.com/watch?v=${id}&t=10`, `https://www.youtube.com/embed/${id}`, `https://www.youtube.com/shorts/${id}`, `https://www.youtube-nocookie.com/embed/${id}`])
  ok(`parses ${u}`, parseYouTubeId(u) === id);
for (const bad of ['', '   ', 'https://evil.example/watch?v=' + id, 'javascript:alert(1)', 'https://www.youtube.com/watch?v=short', '<script>alert(1)</script>', undefined as unknown as string])
  ok(`rejects ${JSON.stringify(bad)}`, parseYouTubeId(bad) === null);

console.log('\n[safe redirect URL]');
ok('https accepted', safeExternalUrl('https://jhericojohnbalasa.systeme.io/thanks') === 'https://jhericojohnbalasa.systeme.io/thanks');
for (const bad of ['javascript:alert(1)', 'data:text/html,hi', '//evil.example', '/relative', 'ftp://x.y', 'not a url', '', null, undefined])
  ok(`rejects ${JSON.stringify(bad)}`, safeExternalUrl(bad as string) === null);
ok('http only on localhost', safeExternalUrl('http://localhost:3000/x') !== null && safeExternalUrl('http://example.com/x') === null);

console.log('\n[rate limiter]');
{
  const key = 'test:' + Math.random();
  const res = Array.from({ length: 6 }, () => rateLimit(key, 5, 60));
  ok('first 5 allowed, 6th blocked', res.slice(0, 5).every(r => r.ok) && !res[5].ok && res[5].retryAfter > 0);
  ok('other keys unaffected', rateLimit('other:' + Math.random(), 5, 60).ok);
}

console.log('\n[v6 catalog]');
ok('Post-Encounter = ₱497', getProductBySlug('post-encounter')!.price === 497);
ok('SOL 1, 2 & 3 = ₱1,597', getProductBySlug('sol')!.price === 1597 && getProductBySlug('sol')!.name === 'SOL 1, 2 & 3');
ok('price windows still never overlap', findPriceCollisions(PRODUCTS.map(p => ({ slug: p.slug, price: p.price })), 5).length === 0);
const w = getPriceWindow(497, 5), w2 = getPriceWindow(1597, 5);
ok('497 accepts 492–525 · 1597 accepts 1592–1625', w.min === 492 && w.max === 525 && w2.min === 1592 && w2.max === 1625, `${w.min}-${w.max} / ${w2.min}-${w2.max}`);
ok('server-only DOWNLOAD_PAGE_URL_* wins over NEXT_PUBLIC_*', (() => {
  process.env.DOWNLOAD_PAGE_URL_SOL = 'https://thanks.example/server-only';
  process.env.NEXT_PUBLIC_DOWNLOAD_PAGE_URL_SOL = 'https://thanks.example/public';
  return getDownloadPageUrl('sol') === 'https://thanks.example/server-only';
})());
ok('commented-out MediaFire links are never read as a redirect (getFileUrl empty when unset)', (() => { delete process.env.PRODUCT_FILE_URL_SOL; return getFileUrl('sol') === ''; })());

console.log('\n[secrets fail closed in production]');
(async () => {
  const env = process.env as Record<string, string | undefined>;
  const saved = { n: env.NODE_ENV, a: env.ADMIN_SESSION_SECRET, d: env.DOWNLOAD_TOKEN_SECRET };
  const { signAdminSession, signCustomerSession } = await import('../src/lib/tokens');
  const { isAdminEdge } = await import('../src/lib/tokensEdge');
  env.NODE_ENV = 'production'; delete env.ADMIN_SESSION_SECRET; delete env.DOWNLOAD_TOKEN_SECRET;
  let threw = false; try { signAdminSession(); } catch { threw = true; }
  ok('missing ADMIN_SESSION_SECRET in production → refuses to sign', threw);
  threw = false; try { signCustomerSession('1', 'a@b.c'); } catch { threw = true; }
  ok('missing DOWNLOAD_TOKEN_SECRET in production → refuses to sign', threw);
  env.ADMIN_SESSION_SECRET = 'REPLACE_WITH_ANOTHER_DIFFERENT_32_BYTE_HEX';
  threw = false; try { signAdminSession(); } catch { threw = true; }
  ok('placeholder secret rejected in production', threw);
  // a cookie forged with the public dev default must NOT be accepted by the edge check in production
  env.NODE_ENV = 'development'; delete env.ADMIN_SESSION_SECRET;
  const forged = signAdminSession();
  env.NODE_ENV = 'production';
  ok('edge check rejects a cookie signed with the public dev secret', (await isAdminEdge(forged)) === false);
  env.ADMIN_SESSION_SECRET = 'a'.repeat(48); const real = signAdminSession();
  ok('edge check accepts a cookie signed with a real secret', (await isAdminEdge(real)) === true);
  env.NODE_ENV = saved.n; env.ADMIN_SESSION_SECRET = saved.a; env.DOWNLOAD_TOKEN_SECRET = saved.d;

  console.log(`\n${pass} passed, ${failN} failed`);
  process.exit(failN ? 1 : 0);
})();
