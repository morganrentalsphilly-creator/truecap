-- Leads captured from co-branded shared deal pages (T6 — Agent Loop).
--
-- A VIEWER of a Pro user's branded /d/[encoded] share page submits their
-- contact; we store it for that owner (the agent). lead_email is PII, so this
-- is owner-only RLS. Inserts happen ONLY via the service-role action
-- (app/actions/capture-deal-lead.ts) — there is intentionally NO anon/auth
-- insert policy, so a public viewer can't write arbitrary rows directly.

create table if not exists public.deal_leads (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  lead_email text not null,
  lead_name text,
  message text,
  deal_address text,
  source text not null default 'shared_deal',
  created_at timestamptz not null default now()
);

create index if not exists deal_leads_owner_idx
  on public.deal_leads (owner_user_id, created_at desc);

comment on table public.deal_leads is
  'Leads captured from co-branded shared deal pages (/d/[encoded]). Owner-only read; inserts via the service-role action only.';

alter table public.deal_leads enable row level security;

-- Owner can read their own leads. No insert/update/delete policy by design →
-- only the service-role action (which bypasses RLS) writes, since the public
-- viewer who submits the form is anonymous.
drop policy if exists "Owners can view their leads" on public.deal_leads;
create policy "Owners can view their leads"
  on public.deal_leads for select
  using (auth.uid() = owner_user_id);
