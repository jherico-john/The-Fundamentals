-- ══════════════════════════════════════════════════════════════════════════════
-- MINISTRY CHECKOUT v5 — Complete Supabase Schema (v4 → v5 safe upgrade)
-- Run in: Supabase Dashboard → SQL Editor → New Query → Paste → Run
-- Fully IDEMPOTENT: safe on a fresh project AND on an existing v4 database.
-- Existing rows are kept; v5 only ADDS columns/tables/views (section 10+).
-- ══════════════════════════════════════════════════════════════════════════════

-- ── 1. CUSTOMER ACCOUNTS ──────────────────────────────────────────────────────
-- Simple accounts: name, email, hashed password. No email confirmation.
-- Avatar is a letter-based initials component (no image uploads needed).
create table if not exists customers (
  id               uuid primary key default gen_random_uuid(),
  name             text not null,
  email            text not null unique,
  password_hash    text not null,
  referred_by_code text,              -- affiliate referral code that brought them here
  created_at       timestamptz not null default now()
);
create index if not exists idx_customers_email on customers(email);
comment on table customers is 'Customer accounts for affiliate participation. Simple login, no email verification.';


-- ── 2. USED RECEIPTS — Anti-Replay + Anti-Editing ─────────────────────────────
-- Every verified GCash reference number AND image hash is stored here.
-- SHA-256 image hash prevents re-submission of an edited screenshot.
create table if not exists used_receipts (
  id               bigint generated always as identity primary key,
  reference_number text    not null unique,
  image_hash       text    not null,   -- SHA-256 of raw uploaded image bytes
  amount           numeric(10,2),
  receipt_date     text,
  used_at          timestamptz not null default now()
);
create index if not exists idx_used_receipts_ref  on used_receipts(reference_number);
create index if not exists idx_used_receipts_hash on used_receipts(image_hash);
comment on table used_receipts is 'Anti-replay + anti-editing. One download per GCash receipt, checked by ref number AND image hash.';


-- ── 3. VERIFIED PURCHASES — Sales ledger ──────────────────────────────────────
create table if not exists verified_purchases (
  id               bigint generated always as identity primary key,
  reference_number text         not null unique references used_receipts(reference_number),
  customer_id      uuid         references customers(id) on delete set null,
  amount           numeric(10,2) not null,
  product_name     text         not null default 'The Fundamentals',
  affiliate_code   text,
  purchased_at     timestamptz  not null default now()
);
create index if not exists idx_purchases_affiliate on verified_purchases(affiliate_code);
create index if not exists idx_purchases_date      on verified_purchases(purchased_at);
create index if not exists idx_purchases_customer  on verified_purchases(customer_id);


-- ── 4. AFFILIATES — Multi-tier referral tree ───────────────────────────────────
create table if not exists affiliates (
  id               bigint generated always as identity primary key,
  customer_id      uuid         references customers(id) on delete set null,
  name             text         not null,
  mobile_number    text         not null,
  product_link     text         not null,
  referral_code    text         not null unique,
  referral_link    text         not null,
  tier             text         not null default 'primary'
                     check (tier in ('primary','secondary','tertiary','quaternary','quinary')),
  referred_by_code text         references affiliates(referral_code) on delete set null,
  root_code        text         not null,
  earnings         numeric(10,2) not null default 0,
  paid_earnings    numeric(10,2) not null default 0,
  click_count      integer      not null default 0,
  created_at       timestamptz  not null default now(),
  unique(mobile_number, product_link)
);
create index if not exists idx_affiliates_code    on affiliates(referral_code);
create index if not exists idx_affiliates_root    on affiliates(root_code);
create index if not exists idx_affiliates_parent  on affiliates(referred_by_code);
create index if not exists idx_affiliates_mobile  on affiliates(mobile_number);
create index if not exists idx_affiliates_custid  on affiliates(customer_id);


-- ── 5. REFERRAL CLICKS — Click analytics ──────────────────────────────────────
create table if not exists referral_clicks (
  id            bigint generated always as identity primary key,
  referral_code text references affiliates(referral_code) on delete cascade,
  clicked_at    timestamptz not null default now()
);
create index if not exists idx_clicks_code on referral_clicks(referral_code);
create index if not exists idx_clicks_date on referral_clicks(clicked_at);


-- ── 6. RPC: record click + bump counter ────────────────────────────────────────
create or replace function increment_referral_click(p_code text)
returns void language plpgsql as $$
begin
  update affiliates set click_count = click_count + 1 where referral_code = p_code;
  insert into referral_clicks(referral_code) values(p_code);
end;
$$;


-- ── 7. RPC: credit affiliate commissions on purchase ──────────────────────────
create or replace function credit_affiliate_commission(
  p_code       text,
  p_sale_amt   numeric,
  p_pct        numeric default 10
)
returns void language plpgsql as $$
declare
  v_parent text;
  v_direct numeric;
begin
  v_direct := p_sale_amt * (p_pct / 100.0);
  -- Direct referrer gets p_pct %
  update affiliates set earnings = earnings + v_direct where referral_code = p_code;
  -- Their referrer (one level up) gets 5%
  select referred_by_code into v_parent from affiliates where referral_code = p_code;
  if v_parent is not null then
    update affiliates set earnings = earnings + (p_sale_amt * 0.05) where referral_code = v_parent;
  end if;
end;
$$;


-- ── 8. DASHBOARD VIEW ─────────────────────────────────────────────────────────
create or replace view dashboard_summary as
select
  (select count(*)                        from verified_purchases)                    as total_sales,
  (select coalesce(sum(amount),0)         from verified_purchases)                    as total_revenue,
  (select count(*)                        from customers)                             as total_customers,
  (select count(*)                        from affiliates)                            as total_affiliates,
  (select coalesce(sum(click_count),0)    from affiliates)                            as total_clicks,
  (select coalesce(sum(earnings),0)       from affiliates)                            as commissions_owed,
  (select coalesce(sum(paid_earnings),0)  from affiliates)                            as commissions_paid,
  (select count(*)  from verified_purchases where purchased_at >= now()-'7 days'::interval) as sales_7d,
  (select coalesce(sum(amount),0) from verified_purchases where purchased_at >= now()-'7 days'::interval) as revenue_7d,
  (select count(*)  from verified_purchases where purchased_at >= now()-'30 days'::interval) as sales_30d,
  (select coalesce(sum(amount),0) from verified_purchases where purchased_at >= now()-'30 days'::interval) as revenue_30d;


-- ── 9. ROW LEVEL SECURITY ─────────────────────────────────────────────────────
-- All writes use service-role key (server-side only). RLS blocks direct browser access.
alter table customers          enable row level security;
alter table used_receipts      enable row level security;
alter table verified_purchases enable row level security;
alter table affiliates         enable row level security;
alter table referral_clicks    enable row level security;

-- v5 SECURITY FIX: v4 shipped `create policy "customers_own" on customers using (true)`.
-- That policy applied to the public (anon) role too, so anyone holding the anon key
-- could read every customer's password hash through the REST API. Drop it.
-- RLS stays ON with NO policies → anon/authenticated roles get zero access; the
-- server uses the service-role key, which bypasses RLS.
drop policy if exists "customers_own" on customers;


-- ══════════════════════════════════════════════════════════════════════════════
-- v5 ADDITIONS
-- ══════════════════════════════════════════════════════════════════════════════

-- ── 10. PAYMENT CHANNELS (reference list) ─────────────────────────────────────
-- Which gateway/app a customer paid through. GCash is primary; the others pay the
-- same GCash account via InstaPay ("bridge"), or inside their own network
-- ("standalone", only when enabled in env). Rotate by is_active / sort_order.
create table if not exists payment_channels (
  id                    text primary key,          -- matches src/lib/paymentChannels.ts
  label                 text    not null,
  kind                  text    not null check (kind in ('ewallet','bank','network')),
  is_primary            boolean not null default false,
  supports_bridge       boolean not null default true,   -- → G-Xchange/GCash via InstaPay
  supports_standalone   boolean not null default false,  -- direct inside own network
  is_active             boolean not null default true,
  sort_order            integer not null default 100,
  created_at            timestamptz not null default now()
);
insert into payment_channels (id,label,kind,is_primary,supports_bridge,supports_standalone,sort_order) values
  ('gcash',         'GCash',               'ewallet', true,  false, true,  1),
  ('maya',          'Maya',                'ewallet', false, true,  false, 2),
  ('instapay',      'InstaPay (any bank)', 'network', false, true,  false, 3),
  ('security_bank', 'Security Bank',       'bank',    false, true,  false, 4),
  ('maribank',      'MariBank',            'bank',    false, true,  false, 5),
  ('bpi',           'BPI',                 'bank',    false, true,  false, 6),
  ('gotyme',        'GoTyme Bank',         'bank',    false, true,  false, 7),
  ('bdo',           'BDO',                 'bank',    false, true,  false, 8),
  ('unionbank',     'UnionBank (UD)',      'bank',    false, true,  false, 9)
on conflict (id) do update set label = excluded.label, kind = excluded.kind,
  is_primary = excluded.is_primary, supports_bridge = excluded.supports_bridge, sort_order = excluded.sort_order;


-- ── 11. USED_RECEIPTS — payment details scanned from the receipt ──────────────
-- Existing rows are UPDATED IN PLACE (new columns added, old rows default to GCash).
alter table used_receipts add column if not exists payment_channel  text not null default 'gcash';
alter table used_receipts add column if not exists route            text not null default 'direct_gcash'
  check (route in ('direct_gcash','bridge_instapay_gcash','standalone','unknown'));
alter table used_receipts add column if not exists product_slug     text;
alter table used_receipts add column if not exists account_type     text;      -- e.g. "G-Xchange Inc. / GCash"
alter table used_receipts add column if not exists account_number   text;      -- receiving account as shown (masked/QR)
alter table used_receipts add column if not exists account_name     text;      -- receiving name as shown (masked)
alter table used_receipts add column if not exists transfer_fee     numeric(10,2);
alter table used_receipts add column if not exists total_amount     numeric(10,2);
alter table used_receipts add column if not exists reference_id     text;      -- bank / wallet reference
alter table used_receipts add column if not exists instapay_ref_no  text;      -- InstaPay-level reference / trace
alter table used_receipts add column if not exists expected_amount  numeric(10,2); -- CATALOG price
alter table used_receipts add column if not exists ocr_confidence   integer;   -- 0-100 completeness of the scan
create index if not exists idx_used_receipts_channel on used_receipts(payment_channel);
create index if not exists idx_used_receipts_instapay on used_receipts(instapay_ref_no);
comment on column used_receipts.amount is 'Amount that reached us as read from the receipt (may include a bridge fee / round-up).';
comment on column used_receipts.expected_amount is 'Catalog price of the product (what the UI showed). The price threshold is applied in code only.';


-- ── 12. RECEIPT_KEYS — every reference on a receipt, for anti-replay ───────────
-- One receipt can carry several references (bank ref, InstaPay ref, trace id …).
-- Each is stored as a UNIQUE key, so re-submitting the same payment — even as a
-- re-saved / re-compressed image, or read slightly differently by OCR — is caught
-- ("already submitted"). Weak 6-digit refs are keyed with channel + amount.
create table if not exists receipt_keys (
  key         text primary key,
  receipt_id  bigint not null references used_receipts(id) on delete cascade,
  created_at  timestamptz not null default now()
);
create index if not exists idx_receipt_keys_receipt on receipt_keys(receipt_id);


-- ── 13. VERIFIED_PURCHASES — channel + product + ad attribution ───────────────
alter table verified_purchases add column if not exists product_slug    text;
alter table verified_purchases add column if not exists payment_channel text not null default 'gcash';
alter table verified_purchases add column if not exists route           text not null default 'direct_gcash';
alter table verified_purchases add column if not exists paid_amount     numeric(10,2);   -- what the receipt showed
alter table verified_purchases add column if not exists transfer_fee    numeric(10,2);
alter table verified_purchases add column if not exists is_new_customer boolean not null default true;
alter table verified_purchases add column if not exists ad_source       text not null default 'organic'
  check (ad_source in ('google','meta','tiktok','affiliate','organic','other'));
alter table verified_purchases add column if not exists gclid           text;
alter table verified_purchases add column if not exists fbclid          text;
alter table verified_purchases add column if not exists ttclid          text;
alter table verified_purchases add column if not exists utm_source      text;
alter table verified_purchases add column if not exists utm_medium      text;
alter table verified_purchases add column if not exists utm_campaign    text;
-- `amount` stays the CATALOG price so revenue reports match the product list.
create index if not exists idx_purchases_channel on verified_purchases(payment_channel);
create index if not exists idx_purchases_adsrc   on verified_purchases(ad_source);
create index if not exists idx_purchases_product on verified_purchases(product_slug);

-- Back-fill product_slug for v4 rows from the product name
update verified_purchases set product_slug = case
    when product_name ilike '%fundamentals%' and product_name not ilike '%lifegroup%' then 'fundamentals'
    when product_name ilike '%pre-encounter%' or product_name ilike '%pre encounter%' then 'pre-encounter'
    when product_name ilike '%post-encounter%' or product_name ilike '%post encounter%' then 'post-encounter'
    when product_name ilike '%encounter%' then 'encounter'
    when product_name ilike '%lifegroup%' or product_name ilike '%sunyl%' then 'lifegroup'
    when product_name ilike '%sol%' then 'sol'
    else product_slug end
  where product_slug is null;


-- ── 14. AD TOUCHES — landings from Google / Meta / TikTok ─────────────────────
create table if not exists ad_touches (
  id            bigint generated always as identity primary key,
  ad_source     text not null default 'organic'
                  check (ad_source in ('google','meta','tiktok','affiliate','organic','other')),
  session_id    text,
  gclid         text,
  fbclid        text,
  ttclid        text,
  utm_source    text,
  utm_medium    text,
  utm_campaign  text,
  landing_path  text,
  product_slug  text,
  created_at    timestamptz not null default now()
);
create index if not exists idx_ad_touches_src  on ad_touches(ad_source);
create index if not exists idx_ad_touches_date on ad_touches(created_at);


-- ── 15. ANALYTICS VIEWS (query them in the SQL editor any time) ───────────────
create or replace view ad_outcomes_30d as
select s.ad_source,
       coalesce(t.visitors,0)                        as visitors,
       coalesce(p.sales,0)                           as sales,
       coalesce(p.revenue,0)                         as revenue,
       coalesce(p.new_customers,0)                   as new_customers,
       case when coalesce(t.visitors,0) > 0
            then round(100.0 * coalesce(p.sales,0) / t.visitors, 1) else 0 end as conversion_pct
from (values ('google'),('meta'),('tiktok'),('affiliate'),('organic'),('other')) as s(ad_source)
left join (select ad_source, count(distinct coalesce(session_id, id::text)) as visitors
             from ad_touches where created_at >= now() - interval '30 days' group by 1) t using (ad_source)
left join (select ad_source, count(*) as sales, sum(amount) as revenue,
                  count(*) filter (where is_new_customer) as new_customers
             from verified_purchases where purchased_at >= now() - interval '30 days' group by 1) p using (ad_source);

create or replace view payment_channel_summary as
select payment_channel, count(*) as sales, sum(amount) as revenue,
       round(avg(coalesce(transfer_fee,0)),2) as avg_fee,
       round(avg(paid_amount - amount),2)     as avg_overpay
from verified_purchases group by payment_channel order by sales desc;

create or replace view product_sales_summary as
select coalesce(product_slug, product_name) as product, count(*) as sales, sum(amount) as revenue
from verified_purchases group by 1 order by revenue desc;


-- ── 16. ROW LEVEL SECURITY for the new tables ─────────────────────────────────
alter table payment_channels enable row level security;
alter table receipt_keys     enable row level security;
alter table ad_touches       enable row level security;
-- (no policies on purpose: only the server's service-role key may touch these)
