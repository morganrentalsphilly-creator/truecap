-- Unsubscribe for the anonymous drip sequences (post-analysis checklist and
-- First Offer Playbook). Additive and idempotent.
--
--   email_drip_schedules  one row per accepted Resend message, keyed by a namespaced
--                         sha256 of the recipient address, so the one-click
--                         unsubscribe (app/email/unsubscribe) can cancel what
--                         is still queued. Day-0 sends have a null scheduled_at;
--                         they leave immediately and cannot be cancelled.
--   email_suppressions    hashed addresses that unsubscribed. Every anonymous
--                         capture checks this before it schedules anything.
--
-- Both tables are service-role only (lib/email-drip-unsubscribe.ts through
-- createAdminSupabaseClient). Only a one-way hash of the address is stored;
-- it is still personal data for retention and deletion purposes.

create extension if not exists pgcrypto;

create table if not exists public.email_drip_schedules (
  id uuid primary key default gen_random_uuid(),
  email_hash text not null check (email_hash ~ '^[0-9a-f]{64}$'),
  surface text not null check (surface in ('post-analysis', 'lead-magnet')),
  resend_id text not null unique,
  scheduled_at timestamptz,
  created_at timestamptz not null default now(),
  cancelled_at timestamptz
);

create index if not exists email_drip_schedules_pending_idx
  on public.email_drip_schedules (email_hash)
  where cancelled_at is null;

alter table public.email_drip_schedules enable row level security;
alter table public.email_drip_schedules force row level security;
-- No policies: service role only. The explicit revoke closes the default
-- anon/authenticated SELECT grant independently of RLS (house pattern from
-- 20260906180000).
revoke all on table public.email_drip_schedules from public, anon, authenticated;
grant select, insert, update on table public.email_drip_schedules to service_role;

comment on table public.email_drip_schedules is
  'Resend message ids for anonymous drip sends, keyed by a namespaced sha256 of the address, so the one-click unsubscribe can cancel them. Service-role only.';

create table if not exists public.email_suppressions (
  email_hash text primary key check (email_hash ~ '^[0-9a-f]{64}$'),
  source text not null default 'unsubscribe-link',
  created_at timestamptz not null default now()
);

alter table public.email_suppressions enable row level security;
alter table public.email_suppressions force row level security;
revoke all on table public.email_suppressions from public, anon, authenticated;
grant select, insert, update on table public.email_suppressions to service_role;

comment on table public.email_suppressions is
  'Hashed addresses that unsubscribed from the anonymous drip sequences. Checked by every anonymous email capture before scheduling. Service-role only.';
