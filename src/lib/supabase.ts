// src/lib/supabase.ts — v5 full data-access layer
// v5: multi-key anti-replay, payment-channel + ad-attribution recording,
//     ad outcome / channel analytics, and an OPT-IN in-memory dev store.
//
// DEV_MEMORY_DB=true  → every function below uses a process-local store instead
// of Supabase. For local testing ONLY. It is refused when NODE_ENV=production
// on Vercel (VERCEL_ENV=production) so it can never silently run live.
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const MEM_REQUESTED = process.env.DEV_MEMORY_DB === 'true';
const MEM = MEM_REQUESTED && process.env.VERCEL_ENV !== 'production';
export const usingMemoryDb = () => MEM;

interface MemStore {
  customers: any[]; used: any[]; keys: Map<string, number>; purchases: any[]; touches: any[]; seq: number;
}
const g = globalThis as unknown as { __memdb?: MemStore };
function mem(): MemStore {
  if (!g.__memdb) g.__memdb = { customers: [], used: [], keys: new Map(), purchases: [], touches: [], seq: 1 };
  return g.__memdb;
}

const SB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://gwrnbourweanhnktxjbw.supabase.co';
const SB_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

let _sb: SupabaseClient | null = null;
export function sb(): SupabaseClient {
  if (!_sb) {
    if (!SB_KEY) throw new Error('Supabase key not configured');
    _sb = createClient(SB_URL, SB_KEY, { auth: { persistSession: false } });
  }
  return _sb;
}

// ── CUSTOMERS ─────────────────────────────────────────────────────────────────

export interface Customer {
  id: string; name: string; email: string; referred_by_code?: string; created_at: string;
}

export async function createCustomer(name: string, email: string, passwordHash: string, referredByCode?: string): Promise<Customer> {
  if (MEM) {
    const c = { id: crypto.randomUUID(), name, email, password_hash: passwordHash, referred_by_code: referredByCode || undefined, created_at: new Date().toISOString() };
    mem().customers.push(c);
    const { password_hash: _p, ...pub } = c; return pub as Customer;
  }
  const { data, error } = await sb().from('customers').insert({
    name, email, password_hash: passwordHash, referred_by_code: referredByCode || null,
  }).select('id,name,email,referred_by_code,created_at').single();
  if (error) throw error;
  return data as Customer;
}

export async function getCustomerByEmail(email: string): Promise<(Customer & { password_hash: string }) | null> {
  if (MEM) return mem().customers.find(c => c.email === email.trim().toLowerCase()) || null;
  const { data, error } = await sb().from('customers').select('*').eq('email', email.trim().toLowerCase()).maybeSingle();
  if (error) throw error;
  return data as (Customer & { password_hash: string }) | null;
}

export async function getCustomerById(id: string): Promise<Customer | null> {
  if (MEM) { const c = mem().customers.find(x => x.id === id); if (!c) return null; const { password_hash: _p, ...pub } = c; return pub as Customer; }
  const { data } = await sb().from('customers').select('id,name,email,referred_by_code,created_at').eq('id', id).maybeSingle();
  return data as Customer | null;
}

export async function updateCustomerPassword(id: string, passwordHash: string): Promise<void> {
  if (MEM) { const c = mem().customers.find(x => x.id === id); if (c) c.password_hash = passwordHash; return; }
  const { error } = await sb().from('customers').update({ password_hash: passwordHash }).eq('id', id);
  if (error) throw error;
}

// ── ANTI-REPLAY / ANTI-EDITING ───────────────────────────────────────────────

export async function isRefUsed(ref: string): Promise<boolean> {
  if (MEM) return mem().used.some(u => u.reference_number === ref);
  const { data } = await sb().from('used_receipts').select('id').eq('reference_number', ref).maybeSingle();
  return !!data;
}

export async function isHashUsed(hash: string): Promise<boolean> {
  if (MEM) return mem().used.some(u => u.image_hash === hash);
  const { data } = await sb().from('used_receipts').select('id').eq('image_hash', hash).maybeSingle();
  return !!data;
}

export async function markReceiptUsed(ref: string, hash: string, amount?: number, dateStr?: string): Promise<void> {
  if (MEM) { if (!mem().used.some(u => u.reference_number === ref)) mem().used.push({ id: mem().seq++, reference_number: ref, image_hash: hash, amount, receipt_date: dateStr }); return; }
  const { error } = await sb().from('used_receipts').insert({
    reference_number: ref, image_hash: hash, amount: amount ?? null, receipt_date: dateStr ?? null,
  });
  if (error && error.code !== '23505') throw error;
}

export async function recordPurchase(ref: string, amount: number, productName: string, affiliateCode?: string | null, customerId?: string | null): Promise<void> {
  if (MEM) { mem().purchases.push({ id: mem().seq++, reference_number: ref, amount, product_name: productName, affiliate_code: affiliateCode || null, customer_id: customerId || null, purchased_at: new Date().toISOString() }); return; }
  const { error } = await sb().from('verified_purchases').insert({
    reference_number: ref, amount, product_name: productName,
    affiliate_code: affiliateCode || null, customer_id: customerId || null,
  });
  if (error && error.code !== '23505') throw error;

  if (affiliateCode) {
    const pct = parseFloat(process.env.AFFILIATE_COMMISSION_PCT || '10');
    await sb().rpc('credit_affiliate_commission', { p_code: affiliateCode, p_sale_amt: amount, p_pct: pct })
      .then(({ error: e }) => { if (e) console.warn('[sb] commission RPC:', e.message); });
  }
}

// ── AFFILIATES ────────────────────────────────────────────────────────────────

export type Tier = 'primary' | 'secondary' | 'tertiary' | 'quaternary' | 'quinary';
export interface Affiliate {
  id: string; name: string; mobile_number: string; product_link: string;
  referral_code: string; referral_link: string; tier: Tier;
  referred_by_code: string | null; root_code: string;
  earnings: number; paid_earnings: number; click_count: number; created_at: string;
  customer_id?: string | null;
}

const TIERS: Tier[] = ['primary','secondary','tertiary','quaternary','quinary'];
function nextTier(t: Tier): Tier { return TIERS[Math.min(TIERS.indexOf(t)+1, TIERS.length-1)]; }
function genCode(): string { return Math.random().toString(36).slice(2,8)+Math.random().toString(36).slice(2,6); }

export async function registerAffiliate(p: {
  name: string; mobileNumber: string; productLink: string;
  referredByCode?: string | null; customerId?: string | null;
}): Promise<Affiliate> {
  if (MEM) throw new Error('Affiliates are not available in DEV_MEMORY_DB mode');
  // Idempotent: same mobile + product = same record
  const { data: existing } = await sb().from('affiliates').select('*')
    .eq('mobile_number', p.mobileNumber).eq('product_link', p.productLink).maybeSingle();
  if (existing) return existing as Affiliate;

  const code = genCode();
  let tier: Tier = 'primary';
  let rootCode = code;

  if (p.referredByCode) {
    const { data: ref } = await sb().from('affiliates').select('*').eq('referral_code', p.referredByCode).maybeSingle();
    if (ref) { tier = nextTier(ref.tier as Tier); rootCode = ref.root_code; }
  }

  const shortNum = p.mobileNumber.replace(/\D/g,'').slice(-6);
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://your-domain.vercel.app';
  const referralLink = `${siteUrl}/a/${code}?ref=${code}`;

  const { data, error } = await sb().from('affiliates').insert({
    name: p.name, mobile_number: p.mobileNumber, product_link: p.productLink,
    referral_code: code, referral_link: referralLink, tier,
    referred_by_code: p.referredByCode || null, root_code: rootCode,
    earnings: 0, paid_earnings: 0, click_count: 0, customer_id: p.customerId || null,
  }).select().single();
  if (error) throw error;
  return data as Affiliate;
}

export async function getAffiliateByCode(code: string): Promise<Affiliate | null> {
  if (MEM) return null;
  const { data } = await sb().from('affiliates').select('*').eq('referral_code', code).maybeSingle();
  return data as Affiliate | null;
}

export async function getReferralTree(rootCode: string): Promise<Affiliate[]> {
  if (MEM) return [];
  const { data } = await sb().from('affiliates').select('*').eq('root_code', rootCode)
    .order('tier').order('created_at');
  return (data || []) as Affiliate[];
}

export async function getAllAffiliates(): Promise<Affiliate[]> {
  if (MEM) return [];
  const { data } = await sb().from('affiliates').select('*').order('created_at', { ascending: false });
  return (data || []) as Affiliate[];
}

export async function recordClick(code: string): Promise<void> {
  if (MEM) return;
  await sb().rpc('increment_referral_click', { p_code: code })
    .then(({ error }) => { if (error) console.warn('[sb] click RPC:', error.message); });
}

// ── DASHBOARD STATS ───────────────────────────────────────────────────────────

export interface DashboardStats {
  total_sales: number; total_revenue: number; total_customers: number;
  total_affiliates: number; total_clicks: number;
  commissions_owed: number; commissions_paid: number;
  sales_7d: number; revenue_7d: number; sales_30d: number; revenue_30d: number;
}

export async function getDashboardStats(): Promise<DashboardStats> {
  if (MEM) {
    const now = Date.now(); const sum = (a: any[]) => a.reduce((t, r) => t + Number(r.amount), 0);
    const p = mem().purchases; const in7 = p.filter(r => now - Date.parse(r.purchased_at) < 7 * 864e5); const in30 = p.filter(r => now - Date.parse(r.purchased_at) < 30 * 864e5);
    return { total_sales: p.length, total_revenue: sum(p), total_customers: mem().customers.length, total_affiliates: 0, total_clicks: 0,
      commissions_owed: 0, commissions_paid: 0, sales_7d: in7.length, revenue_7d: sum(in7), sales_30d: in30.length, revenue_30d: sum(in30) };
  }
  const { data } = await sb().from('dashboard_summary').select('*').maybeSingle();
  return (data || {
    total_sales:0, total_revenue:0, total_customers:0, total_affiliates:0,
    total_clicks:0, commissions_owed:0, commissions_paid:0,
    sales_7d:0, revenue_7d:0, sales_30d:0, revenue_30d:0,
  }) as DashboardStats;
}

export async function getRecentPurchases(limit = 20) {
  if (MEM) return [...mem().purchases].reverse().slice(0, limit);
  const { data } = await sb().from('verified_purchases').select('*')
    .order('purchased_at', { ascending: false }).limit(limit);
  return data || [];
}

export async function getSalesByDay(days = 30) {
  if (MEM) {
    const map: Record<string, { date: string; sales: number; revenue: number }> = {};
    for (const r of mem().purchases) { const d = r.purchased_at.slice(0, 10); (map[d] ||= { date: d, sales: 0, revenue: 0 }); map[d].sales++; map[d].revenue += Number(r.amount); }
    return Object.values(map);
  }
  const since = new Date(Date.now() - days * 86400000).toISOString();
  const { data } = await sb().from('verified_purchases')
    .select('purchased_at,amount').gte('purchased_at', since)
    .order('purchased_at');
  // Group by date
  const map: Record<string, { date: string; sales: number; revenue: number }> = {};
  for (const row of (data || [])) {
    const d = row.purchased_at.slice(0,10);
    if (!map[d]) map[d] = { date: d, sales: 0, revenue: 0 };
    map[d].sales++;
    map[d].revenue += Number(row.amount);
  }
  return Object.values(map);
}

// ══════════════════════════════════════════════════════════════════════════════
// v5 ADDITIONS
// ══════════════════════════════════════════════════════════════════════════════

// ── Ad attribution ───────────────────────────────────────────────────────────
export type AdSource = 'google' | 'meta' | 'tiktok' | 'affiliate' | 'organic' | 'other';

export interface Attribution {
  adSource: AdSource;
  gclid?: string | null; fbclid?: string | null; ttclid?: string | null;
  utmSource?: string | null; utmMedium?: string | null; utmCampaign?: string | null;
  landingPath?: string | null; sessionId?: string | null;
}

export interface ReceiptRecord {
  /** Primary dedupe key stored in used_receipts.reference_number */
  referenceKey: string;
  /** Every dedupe key (reference id, InstaPay ref, trace id …) */
  keys: string[];
  imageHash: string;
  receiptDate: string | null;
  paymentChannel: string;
  route: string;
  productSlug: string;
  productName: string;
  expectedAmount: number;
  paidAmount: number | null;
  transferFee: number | null;
  totalAmount: number | null;
  accountType: string | null;
  accountNumber: string | null;
  accountName: string | null;
  referenceId: string | null;
  instapayRefNo: string | null;
  ocrConfidence: number;
  affiliateCode?: string | null;
  customerId?: string | null;
  isNewCustomer?: boolean;
  attribution?: Attribution | null;
}

/** Returns the first dedupe key that was already used, or null. */
export async function findUsedKey(keys: string[]): Promise<string | null> {
  if (!keys.length) return null;
  if (MEM) { for (const k of keys) if (mem().keys.has(k) || mem().used.some(u => u.reference_number === k)) return k; return null; }
  const { data, error } = await sb().from('receipt_keys').select('key').in('key', keys).limit(1);
  if (error) throw error;
  if (data && data.length) return data[0].key as string;
  const { data: d2, error: e2 } = await sb().from('used_receipts').select('reference_number').in('reference_number', keys).limit(1);
  if (e2) throw e2;
  return d2 && d2.length ? (d2[0].reference_number as string) : null;
}

/**
 * Atomically claim a receipt. Unique constraints make this race-safe: two
 * simultaneous uploads of the same receipt can never both succeed.
 */
export async function recordVerifiedReceipt(r: ReceiptRecord): Promise<{ ok: true } | { ok: false; duplicate: true }> {
  const a = r.attribution || null;
  if (MEM) {
    const m = mem();
    if (r.keys.some(k => m.keys.has(k)) || m.used.some(u => u.reference_number === r.referenceKey || u.image_hash === r.imageHash)) return { ok: false, duplicate: true };
    const id = m.seq++;
    m.used.push({ id, reference_number: r.referenceKey, image_hash: r.imageHash, payment_channel: r.paymentChannel });
    for (const k of r.keys) m.keys.set(k, id);
    m.purchases.push({
      id: m.seq++, reference_number: r.referenceKey, customer_id: r.customerId || null, amount: r.expectedAmount, product_name: r.productName,
      product_slug: r.productSlug, payment_channel: r.paymentChannel, route: r.route, paid_amount: r.paidAmount, transfer_fee: r.transferFee,
      affiliate_code: r.affiliateCode || null, ad_source: a?.adSource || 'organic', gclid: a?.gclid || null, fbclid: a?.fbclid || null, ttclid: a?.ttclid || null,
      is_new_customer: r.isNewCustomer ?? true, purchased_at: new Date().toISOString(),
    });
    return { ok: true };
  }

  const { data: ur, error: e1 } = await sb().from('used_receipts').insert({
    reference_number: r.referenceKey, image_hash: r.imageHash,
    amount: r.paidAmount, receipt_date: r.receiptDate,
    payment_channel: r.paymentChannel, route: r.route, product_slug: r.productSlug,
    account_type: r.accountType, account_number: r.accountNumber, account_name: r.accountName,
    transfer_fee: r.transferFee, total_amount: r.totalAmount,
    reference_id: r.referenceId, instapay_ref_no: r.instapayRefNo,
    expected_amount: r.expectedAmount, ocr_confidence: r.ocrConfidence,
  }).select('id').single();
  if (e1) { if (e1.code === '23505') return { ok: false, duplicate: true }; throw e1; }

  const receiptId = ur!.id as number;
  if (r.keys.length) {
    const { error: e2 } = await sb().from('receipt_keys').insert(r.keys.map(key => ({ key, receipt_id: receiptId })));
    if (e2) {
      await sb().from('used_receipts').delete().eq('id', receiptId);
      if (e2.code === '23505') return { ok: false, duplicate: true };
      throw e2;
    }
  }

  const { error: e3 } = await sb().from('verified_purchases').insert({
    reference_number: r.referenceKey, customer_id: r.customerId || null,
    amount: r.expectedAmount, product_name: r.productName, product_slug: r.productSlug,
    payment_channel: r.paymentChannel, route: r.route, paid_amount: r.paidAmount, transfer_fee: r.transferFee,
    affiliate_code: r.affiliateCode || null, is_new_customer: r.isNewCustomer ?? true,
    ad_source: a?.adSource || 'organic', gclid: a?.gclid || null, fbclid: a?.fbclid || null, ttclid: a?.ttclid || null,
    utm_source: a?.utmSource || null, utm_medium: a?.utmMedium || null, utm_campaign: a?.utmCampaign || null,
  });
  if (e3 && e3.code !== '23505') throw e3;

  if (r.affiliateCode) {
    const pct = parseFloat(process.env.AFFILIATE_COMMISSION_PCT || '10');
    await sb().rpc('credit_affiliate_commission', { p_code: r.affiliateCode, p_sale_amt: r.expectedAmount, p_pct: pct })
      .then(({ error }) => { if (error) console.warn('[sb] commission RPC:', error.message); });
  }
  return { ok: true };
}

export async function customerHasPurchases(customerId: string): Promise<boolean> {
  if (MEM) return mem().purchases.some(p => p.customer_id === customerId);
  const { count } = await sb().from('verified_purchases').select('id', { count: 'exact', head: true }).eq('customer_id', customerId);
  return (count || 0) > 0;
}

export async function getCustomerPurchases(customerId: string) {
  if (MEM) return mem().purchases.filter(p => p.customer_id === customerId).reverse();
  const { data } = await sb().from('verified_purchases')
    .select('id,reference_number,amount,product_name,product_slug,payment_channel,purchased_at')
    .eq('customer_id', customerId).order('purchased_at', { ascending: false });
  return data || [];
}

/** Attach a past (anonymous) purchase to a customer account, by reference key. */
export async function claimPurchaseForCustomer(referenceKey: string, customerId: string): Promise<void> {
  if (MEM) { const p = mem().purchases.find(x => x.reference_number === referenceKey && !x.customer_id); if (p) p.customer_id = customerId; return; }
  await sb().from('verified_purchases').update({ customer_id: customerId }).eq('reference_number', referenceKey).is('customer_id', null);
}

// ── Ad touches (landings) ────────────────────────────────────────────────────
export async function recordAdTouch(t: Attribution & { productSlug?: string | null }): Promise<void> {
  if (MEM) { mem().touches.push({ ad_source: t.adSource, session_id: t.sessionId || null, created_at: new Date().toISOString() }); return; }
  const { error } = await sb().from('ad_touches').insert({
    ad_source: t.adSource, session_id: t.sessionId || null,
    gclid: t.gclid || null, fbclid: t.fbclid || null, ttclid: t.ttclid || null,
    utm_source: t.utmSource || null, utm_medium: t.utmMedium || null, utm_campaign: t.utmCampaign || null,
    landing_path: t.landingPath || null, product_slug: t.productSlug || null,
  });
  if (error) console.warn('[sb] ad touch:', error.message);
}

export interface AdOutcomeRow {
  source: AdSource; visitors: number; sales: number; revenue: number; conversionPct: number; newCustomers: number;
}

/** Outcomes of the three ad engines (Google / Meta / TikTok) + others. */
export async function getAdOutcomes(days = 30): Promise<AdOutcomeRow[]> {
  const since = new Date(Date.now() - days * 864e5).toISOString();
  let touches: any[] = []; let purchases: any[] = [];
  if (MEM) {
    touches = mem().touches.filter(t => t.created_at >= since);
    purchases = mem().purchases.filter(p => p.purchased_at >= since);
  } else {
    const [t, p] = await Promise.all([
      sb().from('ad_touches').select('ad_source,session_id').gte('created_at', since).limit(50000),
      sb().from('verified_purchases').select('ad_source,amount,is_new_customer').gte('purchased_at', since).limit(50000),
    ]);
    touches = t.data || []; purchases = p.data || [];
  }
  const order: AdSource[] = ['google', 'meta', 'tiktok', 'affiliate', 'organic', 'other'];
  return order.map(source => {
    const tt = touches.filter(x => (x.ad_source || 'organic') === source);
    const visitors = new Set(tt.map(x => x.session_id || Math.random())).size;
    const pp = purchases.filter(x => (x.ad_source || 'organic') === source);
    const revenue = pp.reduce((a, r) => a + Number(r.amount || 0), 0);
    return { source, visitors, sales: pp.length, revenue, newCustomers: pp.filter(x => x.is_new_customer).length,
      conversionPct: visitors ? Math.round((pp.length / visitors) * 1000) / 10 : 0 };
  });
}

export interface ChannelRow { channel: string; sales: number; revenue: number; avgFee: number }
export async function getChannelBreakdown(days = 90): Promise<ChannelRow[]> {
  const since = new Date(Date.now() - days * 864e5).toISOString();
  let rows: any[];
  if (MEM) rows = mem().purchases.filter(p => p.purchased_at >= since);
  else rows = (await sb().from('verified_purchases').select('payment_channel,amount,transfer_fee').gte('purchased_at', since).limit(50000)).data || [];
  const map: Record<string, { sales: number; revenue: number; fee: number }> = {};
  for (const r of rows) {
    const k = r.payment_channel || 'gcash';
    (map[k] ||= { sales: 0, revenue: 0, fee: 0 });
    map[k].sales++; map[k].revenue += Number(r.amount || 0); map[k].fee += Number(r.transfer_fee || 0);
  }
  return Object.entries(map).map(([channel, v]) => ({ channel, sales: v.sales, revenue: v.revenue, avgFee: v.sales ? v.fee / v.sales : 0 }))
    .sort((a, b) => b.sales - a.sales);
}

export interface ProductRow { slug: string; name: string; sales: number; revenue: number }
export async function getProductBreakdown(days = 90): Promise<ProductRow[]> {
  const since = new Date(Date.now() - days * 864e5).toISOString();
  let rows: any[];
  if (MEM) rows = mem().purchases.filter(p => p.purchased_at >= since);
  else rows = (await sb().from('verified_purchases').select('product_slug,product_name,amount').gte('purchased_at', since).limit(50000)).data || [];
  const map: Record<string, ProductRow> = {};
  for (const r of rows) {
    const k = r.product_slug || r.product_name;
    (map[k] ||= { slug: k, name: r.product_name, sales: 0, revenue: 0 });
    map[k].sales++; map[k].revenue += Number(r.amount || 0);
  }
  return Object.values(map).sort((a, b) => b.revenue - a.revenue);
}
