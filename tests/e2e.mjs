// HTTP end-to-end test against `next start` (DEV_MEMORY_DB). Run: node tests/e2e.mjs
import fs from 'fs'; import path from 'path';
const B = process.env.BASE || 'http://localhost:3100';
let pass = 0, fail = 0;
const ok = (n, c, x = '') => { c ? pass++ : fail++; console.log(`${c ? '  ✓' : '  ✗ FAIL'} ${n}${x ? ' — ' + x : ''}`); };
class Jar { c = {}; set(res) { for (const s of res.headers.getSetCookie?.() || []) { const [kv] = s.split(';'); const i = kv.indexOf('='); const k = kv.slice(0, i), v = kv.slice(i + 1); if (/max-age=0/i.test(s) || v === '') delete this.c[k]; else this.c[k] = v; } } h() { return Object.entries(this.c).map(([k, v]) => `${k}=${v}`).join('; '); } }
async function req(jar, p, o = {}) { const r = await fetch(B + p, { redirect: 'manual', ...o, headers: { ...(o.headers || {}), cookie: jar.h() } }); jar.set(r); return r; }
const json = (jar, p, body, method = 'POST') => req(jar, p, { method, headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
const fx = f => fs.readFileSync(path.join('tests/fixtures', f));
async function upload(jar, slug, file) { const fd = new FormData(); fd.append('receipt', new Blob([fx(file)], { type: 'image/png' }), file); fd.append('productSlug', slug); const r = await req(jar, '/api/verify-receipt', { method: 'POST', body: fd }); return { r, d: await r.json() }; }

(async () => {
  console.log('\n[pages render + footer text]');
  const pages = { '/checkout': 'The Fundamentals', '/products/lifegroup': 'Lifegroup Essentials', '/products/pre-encounter': 'Pre-Encounter Journey', '/products/encounter': 'Encounter Journey', '/products/post-encounter': 'Post-Encounter', '/products/sol': 'SOL', '/products/bundle': 'Complete Ministry Bundle', '/login': 'Sign In', '/signup': 'Create Account' };
  for (const [p, name] of Object.entries(pages)) {
    const r = await fetch(B + p); const h = (await r.text()).replace(/<!-- -->/g, '');
    ok(`${p} → 200 + footer "${name}"`, r.status === 200 && h.includes(`Jherico Balasa Ministry. ${name}. All rights reserved. All Glory to God.`), r.status + '');
  }
  { const r = await fetch(B + '/products/sunyl', { redirect: 'manual' }); ok('/products/sunyl redirects to lifegroup', [301, 307, 308].includes(r.status) && r.headers.get('location')?.endsWith('/products/lifegroup'), r.headers.get('location') || r.status); }
  { const h = await (await fetch(B + '/products/lifegroup')).text(); ok('page includes Google tag AW-18516168856', h.includes('AW-18516168856')); ok('Meta pixel noscript fallback present (scripts inject client-side)', h.includes('facebook.com/tr?id=1024772523807392')); }
  for (const [p, price] of Object.entries({ '/products/lifegroup': '397', '/products/pre-encounter': '297', '/products/encounter': '997', '/products/post-encounter': '697', '/products/sol': '1,997', '/checkout': '597', '/products/bundle': '2,997' })) { const h = (await (await fetch(B + p)).text()).replace(/<!-- -->/g, ''); ok(`${p} shows catalog price ${price}`, h.includes(`PHP ${price}`)); }
  { const h = await (await fetch(B + '/products/bundle')).text(); ok('bundle page: limited-time badge + "Everything You Get"', h.includes('bundle-offer') && h.includes('Everything You Get')); }
  { const h = await (await fetch(B + '/products/lifegroup')).text(); ok('payment channels panel + bridge guide present (SSR shell)', h.includes('Accepted payment methods') || h.includes('payment-channels') || h.includes('bridge-guide')); }

  console.log('\n[login / dashboard flow — the v4 bug]');
  const anon = new Jar();
  { const r = await req(anon, '/dashboard'); ok('anon /dashboard → /login?next=/dashboard', r.status === 307 && /\/login\?next=%2Fdashboard/.test(r.headers.get('location')), r.headers.get('location')); }
  { const r = await req(anon, '/account'); ok('anon /account → /login?next=/account', r.status === 307 && /next=%2Faccount/.test(r.headers.get('location'))); }
  const cust = new Jar();
  { const r = await json(cust, '/api/auth/register', { name: 'Juan dela Cruz', email: 'Juan@Example.com', password: 'secret123' }); ok('register succeeds + session cookie', r.status === 200 && !!cust.c.cust_sess, r.status + ''); }
  { const r = await req(cust, '/account'); ok('customer can open /account after register', r.status === 200); }
  { const r = await req(cust, '/dashboard'); ok('customer opening /dashboard → /account (no login loop)', r.status === 307 && r.headers.get('location').endsWith('/account'), r.headers.get('location')); }
  { const d = await (await req(cust, '/api/auth/me')).json(); ok('/api/auth/me reports the customer', d.authenticated && d.role === 'customer' && d.customer?.name === 'Juan dela Cruz'); }
  const c2 = new Jar();
  { const r = await json(c2, '/api/auth/login', { email: ' JUAN@example.com ', password: 'secret123' }); const d = await r.json(); ok('login is case/space-insensitive on email', r.status === 200 && d.role === 'customer', JSON.stringify(d).slice(0, 80)); }
  { const r = await json(new Jar(), '/api/auth/login', { email: 'juan@example.com', password: 'wrong' }); ok('wrong password → 401', r.status === 401); }
  const adm = new Jar();
  { const r = await json(adm, '/api/auth/login', { email: 'ADMIN@test.local', password: 'pw-admin-123' }); const d = await r.json(); ok('admin login (case-insensitive) → admin', r.status === 200 && d.role === 'admin'); }
  { const r = await req(adm, '/dashboard'); ok('admin can open /dashboard', r.status === 200); }
  { const d = await (await req(adm, '/api/dashboard/stats')).json(); ok('stats keys match what the page reads (v4 mismatch fixed)', 'sales_last_7d' in d.stats && 'total_commissions_owed' in d.stats); }
  { const r = await req(cust, '/api/dashboard/ads'); ok('customer cannot read admin ad outcomes', r.status === 401); }

  console.log('\n[receipt upload over HTTP]');
  { const { r, d } = await upload(cust, 'lifegroup', 'maya_407_fee10.png');
    ok('Maya ₱407 (₱397 + ₱10 fee) unlocks Lifegroup ₱397', r.status === 200 && d.success && d.data.channel === 'maya', d.success ? `channel=${d.data.channel} fee=${d.data.transferFee} ref=${d.data.referenceNumber}` : d.error);
    ok('ad-pixel value = CATALOG price 397, new_customer=true', d.conversion?.value === 397 && d.conversion?.newCustomer === true, JSON.stringify(d.conversion));
    ok('purchase cookie + buyer flag set', !!cust.c.tf_purchase_lifegroup && !!cust.c.tf_buyer); }
  { const { r, d } = await upload(cust, 'lifegroup', 'maya_407_fee10.png'); ok('same file again → 422 "already submitted"', r.status === 422 && ['DUPLICATE_IMAGE', 'DUPLICATE_REFERENCE'].includes(d.errorDetail?.code), d.errorDetail?.title); }
  { const { r, d } = await upload(new Jar(), 'lifegroup', 'bdo_597.png'); ok('₱597 receipt on ₱397 page → AMOUNT_OVER + fix steps', r.status === 422 && d.errorDetail?.code === 'AMOUNT_OVER' && d.errorDetail.fixes.length > 0, d.errorDetail?.title); }
  { const { d } = await upload(new Jar(), 'encounter', 'bdo_597.png'); ok('₱597 on ₱997 page → AMOUNT_SHORT (not the old "cropped or edited")', d.errorDetail?.code === 'AMOUNT_SHORT' && !/crop/i.test(d.error), d.errorDetail?.title); }
  { const { r, d } = await upload(new Jar(), 'nonexistent', 'bdo_597.png'); ok('unknown product → 400', r.status === 400 && d.errorDetail?.code === 'UNKNOWN_PRODUCT'); }
  { const { r, d } = await upload(new Jar(), 'sunyl', 'maribank_400_roundup.png'); ok('legacy slug "sunyl" → Lifegroup (₱400 round-up accepted)', r.status === 200 && d.productSlug === 'lifegroup', d.success ? '' : d.error); }
  { const d = await (await req(cust, '/api/purchase-status?product=lifegroup')).json(); ok('purchase-status remembers the purchase', d.purchased === true); }
  { const d = await (await req(cust, '/api/purchase-status?product=encounter')).json(); ok('other products stay un-purchased', d.purchased === false); }
  { const d = await (await req(cust, '/api/account/purchases')).json(); ok("purchase appears in the customer's account panel", d.purchases?.some(p => p.slug === 'lifegroup'), JSON.stringify(d.purchases?.[0] || {}).slice(0, 100)); }

  console.log('\n[ad attribution → dashboard outcomes]');
  const g1 = new Jar(); g1.c.tf_attr = encodeURIComponent(JSON.stringify({ s: 'google', g: 'TESTGCLID', us: 'google', uc: 'oct-launch', at: Math.floor(Date.now() / 1000) }));
  const t1 = new Jar(); t1.c.tf_attr = encodeURIComponent(JSON.stringify({ s: 'tiktok', t: 'TESTTTCLID', at: Math.floor(Date.now() / 1000) }));
  for (const src of ['google', 'meta', 'tiktok']) await json(new Jar(), '/api/ads/touch', { source: src, sessionId: 's-' + src, path: '/products/lifegroup' });
  { const { d } = await upload(g1, 'fundamentals', 'gotyme_597_fee9.png'); ok('Google-attributed sale (GoTyme ₱597 + ₱9 fee)', d.success, d.success ? '' : d.error); }
  { const { d } = await upload(t1, 'fundamentals', 'bdo_597.png'); ok('TikTok-attributed sale (BDO ₱597)', d.success, d.success ? '' : d.error); }
  { const d = await (await req(adm, '/api/dashboard/ads?days=30')).json(); const o = Object.fromEntries(d.outcomes.map(x => [x.source, x]));
    ok('dashboard: Google = 1 sale / ₱597', o.google.sales === 1 && o.google.revenue === 597, JSON.stringify(o.google));
    ok('dashboard: TikTok = 1 sale / ₱597', o.tiktok.sales === 1 && o.tiktok.revenue === 597, JSON.stringify(o.tiktok));
    ok('dashboard: visitors counted per engine', o.google.visitors === 1 && o.meta.visitors === 1 && o.tiktok.visitors === 1);
    ok('dashboard: channels include maya, maribank, gotyme, bdo', ['maya', 'maribank', 'gotyme', 'bdo'].every(c => d.channels.some(x => x.channel === c)), d.channels.map(c => c.channel).join(',')); }

  console.log('\n[download token]');
  { const { d } = await upload(new Jar(), 'lifegroup', 'bpi_397_qr.png'); const r = await fetch(B + `/api/download-token?token=${encodeURIComponent(d.token || 'x')}&product=lifegroup`); const dd = await r.json(); ok('download-token answers (file URL or 503 "not configured")', [200, 503].includes(r.status), r.status + ' ' + (dd.error || 'ok')); }
  { const r = await fetch(B + '/api/download-token?token=bad&product=lifegroup'); ok('bad token → 401', r.status === 401); }

  console.log(`\n${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);
})();
