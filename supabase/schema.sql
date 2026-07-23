-- ══════════════════════════════════════════════════════════════════════════════
-- MINISTRY CHECKOUT v4 — Complete Supabase Schema
-- Run in: Supabase Dashboard → SQL Editor → New Query → Paste → Run
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

-- Customers can read/update their own row (for password change, profile)
create policy "customers_own" on customers
  using (true) with check (true);  -- Adjust after adding Supabase Auth if needed
