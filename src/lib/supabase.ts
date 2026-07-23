// src/lib/supabase.ts — v4 full data-access layer
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

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
  const { data, error } = await sb().from('customers').insert({
    name, email, password_hash: passwordHash, referred_by_code: referredByCode || null,
  }).select('id,name,email,referred_by_code,created_at').single();
  if (error) throw error;
  return data as Customer;
}

export async function getCustomerByEmail(email: string): Promise<(Customer & { password_hash: string }) | null> {
  const { data, error } = await sb().from('customers').select('*').eq('email', email.toLowerCase()).maybeSingle();
  if (error) throw error;
  return data as (Customer & { password_hash: string }) | null;
}

export async function getCustomerById(id: string): Promise<Customer | null> {
  const { data } = await sb().from('customers').select('id,name,email,referred_by_code,created_at').eq('id', id).maybeSingle();
  return data as Customer | null;
}

export async function updateCustomerPassword(id: string, passwordHash: string): Promise<void> {
  const { error } = await sb().from('customers').update({ password_hash: passwordHash }).eq('id', id);
  if (error) throw error;
}

// ── ANTI-REPLAY / ANTI-EDITING ───────────────────────────────────────────────

export async function isRefUsed(ref: string): Promise<boolean> {
  const { data } = await sb().from('used_receipts').select('id').eq('reference_number', ref).maybeSingle();
  return !!data;
}

export async function isHashUsed(hash: string): Promise<boolean> {
  const { data } = await sb().from('used_receipts').select('id').eq('image_hash', hash).maybeSingle();
  return !!data;
}

export async function markReceiptUsed(ref: string, hash: string, amount?: number, dateStr?: string): Promise<void> {
  const { error } = await sb().from('used_receipts').insert({
    reference_number: ref, image_hash: hash, amount: amount ?? null, receipt_date: dateStr ?? null,
  });
  if (error && error.code !== '23505') throw error;
}

export async function recordPurchase(ref: string, amount: number, productName: string, affiliateCode?: string | null, customerId?: string | null): Promise<void> {
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
  const { data } = await sb().from('affiliates').select('*').eq('referral_code', code).maybeSingle();
  return data as Affiliate | null;
}

export async function getReferralTree(rootCode: string): Promise<Affiliate[]> {
  const { data } = await sb().from('affiliates').select('*').eq('root_code', rootCode)
    .order('tier').order('created_at');
  return (data || []) as Affiliate[];
}

export async function getAllAffiliates(): Promise<Affiliate[]> {
  const { data } = await sb().from('affiliates').select('*').order('created_at', { ascending: false });
  return (data || []) as Affiliate[];
}

export async function recordClick(code: string): Promise<void> {
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
  const { data } = await sb().from('dashboard_summary').select('*').maybeSingle();
  return (data || {
    total_sales:0, total_revenue:0, total_customers:0, total_affiliates:0,
    total_clicks:0, commissions_owed:0, commissions_paid:0,
    sales_7d:0, revenue_7d:0, sales_30d:0, revenue_30d:0,
  }) as DashboardStats;
}

export async function getRecentPurchases(limit = 20) {
  const { data } = await sb().from('verified_purchases').select('*')
    .order('purchased_at', { ascending: false }).limit(limit);
  return data || [];
}

export async function getSalesByDay(days = 30) {
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
