-- Real social proof, automated end to end (docs/site-overhaul.md Phase 5).
-- Additive and idempotent. Nothing here is ever deleted; unpublishing is a
-- status change with a timestamp.
--
--   testimonials              consented quotes from the in-product prompt;
--                             auto-published by /api/cron/publish-testimonials
--                             once every rule holds; public reads ONLY of
--                             status = 'published'.
--   testimonial_prompt_events one row per user: the prompt fires once, ever.
--   demo_accounts             users excluded from every count and every email.
--   feedback_email_sends      one row per user: the guarded feedback email can
--                             never be sent twice.
--   profiles.marketing_opt_out honored by every future marketing send.

create extension if not exists pgcrypto;

create table if not exists public.testimonials (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete set null,
  quote text not null check (char_length(quote) between 40 and 280),
  first_name text check (first_name is null or char_length(first_name) <= 60),
  role text check (role is null or role in ('investor', 'house_hacker', 'agent', 'other')),
  market text check (market is null or char_length(market) <= 80),
  consent boolean not null default false,
  created_at timestamptz not null default now(),
  publish_after timestamptz not null default (now() + interval '24 hours'),
  status text not null default 'pending' check (status in ('pending', 'published', 'unpublished')),
  published_at timestamptz,
  unpublish_token text not null default encode(gen_random_bytes(24), 'hex'),
  unpublished_at timestamptz,
  unpublish_reason text check (unpublish_reason is null or char_length(unpublish_reason) <= 400),
  skip_reason text check (skip_reason is null or char_length(skip_reason) <= 200)
);

create unique index if not exists testimonials_one_per_user_idx
  on public.testimonials (user_id)
  where user_id is not null;

create index if not exists testimonials_published_idx
  on public.testimonials (published_at desc)
  where status = 'published';

create unique index if not exists testimonials_unpublish_token_idx
  on public.testimonials (unpublish_token);

alter table public.testimonials enable row level security;

-- Public reads of PUBLISHED rows only (anon + signed-in). Writes go through
-- the service role (server actions + cron); there is no client insert path.
drop policy if exists testimonials_public_read on public.testimonials;
create policy testimonials_public_read
  on public.testimonials
  for select
  to anon, authenticated
  using (status = 'published');

comment on table public.testimonials is
  'Consented customer quotes from the in-product prompt. Auto-published by the publish-testimonials cron when every eligibility rule holds; public reads only of status = published. Never deleted — unpublish sets status + unpublished_at.';

create table if not exists public.testimonial_prompt_events (
  user_id uuid primary key references auth.users (id) on delete cascade,
  trigger text not null check (trigger in ('pdf_export', 'third_save', 'email_link')),
  shown_at timestamptz not null default now(),
  dismissed_forever_at timestamptz,
  submitted_at timestamptz
);
alter table public.testimonial_prompt_events enable row level security;
-- No policies: service role only.

create table if not exists public.demo_accounts (
  user_id uuid primary key references auth.users (id) on delete cascade,
  note text,
  created_at timestamptz not null default now()
);
alter table public.demo_accounts enable row level security;
-- No policies: service role only.
comment on table public.demo_accounts is
  'Accounts excluded from every public count, every testimonial, and every email (screenshot/demo users).';

create table if not exists public.feedback_email_sends (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users (id) on delete cascade,
  sent_at timestamptz not null default now(),
  provider_message_id text,
  form_token text not null default encode(gen_random_bytes(24), 'hex')
);
alter table public.feedback_email_sends enable row level security;
-- No policies: service role only.

alter table public.profiles
  add column if not exists marketing_opt_out boolean not null default false;

comment on column public.profiles.marketing_opt_out is
  'Set by the one-click unsubscribe link in any marketing send; honored by every future marketing send.';
