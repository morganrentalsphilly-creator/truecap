-- Memo leads: anonymous visitors who asked for their free decision memo by
-- email (app/actions/memo-lead-capture.ts, docs/funnel-leaks-plan.md Phase A).
--
-- Unlike the hashed-only anonymous drip tables (20260907130000), this table
-- stores the RAW address and the deal's input snapshot: the memo email, its
-- read-only /memo/[token] page, and the follow-up sequence all need them.
-- Retention: unconverted leads are deleted 180 days after their last memo
-- request by the lifecycle cron (founder decision 2026-10-03).
--
-- Additive and idempotent. Service-role only: RLS is on with NO policies and
-- the default anon/authenticated grants are revoked (house pattern from
-- 20260906180000), so the table never reaches the public PostgREST surface.

create table if not exists public.memo_leads (
  id uuid primary key default gen_random_uuid(),
  -- As typed (a local-part is case-sensitive in principle); sends use this.
  email text not null check (length(email) between 3 and 254),
  -- lower(trim(email)) — the dedupe key and the join to auth.users at signup.
  email_normalized text not null check (email_normalized = lower(btrim(email_normalized))),
  -- hashDripEmail(email) — the join to email_suppressions for unsubscribe.
  email_hash text not null check (email_hash ~ '^[0-9a-f]{64}$'),
  -- { values, maoTarget, schemaVersion } — released analyzer inputs, validated
  -- server-side before insert. Outputs are always recomputed, never stored.
  snapshot jsonb not null,
  intent text not null default 'investor' check (intent in ('investor', 'agent')),
  source_page text check (source_page is null or length(source_page) <= 200),
  utm_source text check (utm_source is null or length(utm_source) <= 120),
  utm_medium text check (utm_medium is null or length(utm_medium) <= 120),
  utm_campaign text check (utm_campaign is null or length(utm_campaign) <= 120),
  utm_term text check (utm_term is null or length(utm_term) <= 120),
  utm_content text check (utm_content is null or length(utm_content) <= 120),
  referrer text check (referrer is null or length(referrer) <= 300),
  consent_text_version text not null check (length(consent_text_version) between 1 and 40),
  created_at timestamptz not null default now(),
  -- Latest memo request; the 180-day link expiry and retention key on this.
  memo_requested_at timestamptz not null default now(),
  unsubscribed_at timestamptz,
  converted_user_id uuid references auth.users (id) on delete set null,
  converted_at timestamptz
);

create unique index if not exists memo_leads_email_normalized_unique
  on public.memo_leads (email_normalized);

-- The lifecycle cron reads only leads still in the sequence.
create index if not exists memo_leads_active_idx
  on public.memo_leads (created_at)
  where unsubscribed_at is null and converted_user_id is null;

alter table public.memo_leads enable row level security;
alter table public.memo_leads force row level security;
revoke all on table public.memo_leads from public, anon, authenticated;
grant select, insert, update, delete on table public.memo_leads to service_role;

comment on table public.memo_leads is
  'Anonymous decision-memo email leads with their input snapshot. Raw email is personal data; unconverted rows are deleted after 180 days. Service-role only.';

-- Manual rollback: drop table public.memo_leads;
-- (drop 20261003121000 first — lifecycle_email_log.lead_id references it).
