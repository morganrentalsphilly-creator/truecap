-- ============================================================
-- Opaque, revocable public shares (Fable 5 brief, Phase 1.1)
--
-- SURFACED FOR REVIEW — do not let tooling auto-apply. Idempotent;
-- safe to run over a partially-applied state.
--
-- Why: the legacy /d/[encoded] share URL carries the ENTIRE analysis
-- (address, rent, price, assumptions) base64-encoded in the path — deal
-- data in referrer logs, chat previews, and anywhere the URL lands.
-- This table backs the replacement /s/[token] route: a random token in
-- the URL, everything else server-side.
--
-- Design:
--   - token_hash: sha256 hex of the raw token. The raw token appears
--     only in the minted URL; a DB leak alone can't reconstruct links.
--   - snapshot: immutable jsonb {values, meta:{title}} captured at mint;
--     calc_version pins the engine version for honest re-rendering.
--   - owner_id nullable: anonymous analyzer users can share too (they
--     have no account to revoke from; their shares simply expire).
--   - expires_at defaults to 180 days; NULL means never (explicit).
--   - RLS: owners manage their own rows. NO public policies — the
--     public viewer resolves tokens through the service-role server
--     route, which returns only the snapshot.
-- ============================================================

create table if not exists public.public_shares (
  id uuid primary key default gen_random_uuid(),
  token_hash text not null unique,
  owner_id uuid references auth.users(id) on delete cascade,
  deal_id uuid references public.saved_analyses(id) on delete set null,
  snapshot jsonb not null,
  calc_version int not null,
  label text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  expires_at timestamptz default (now() + interval '180 days'),
  revoked_at timestamptz,
  last_viewed_at timestamptz
);

create index if not exists public_shares_owner_idx
  on public.public_shares (owner_id, created_at desc)
  where owner_id is not null;

alter table public.public_shares enable row level security;

do $$ begin
  create policy "public_shares_owner_select" on public.public_shares
    for select using (auth.uid() = owner_id);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "public_shares_owner_insert" on public.public_shares
    for insert with check (auth.uid() = owner_id);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "public_shares_owner_update" on public.public_shares
    for update using (auth.uid() = owner_id);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "public_shares_owner_delete" on public.public_shares
    for delete using (auth.uid() = owner_id);
exception when duplicate_object then null; end $$;

-- Verification: expect the table with RLS enabled and 4 policies.
select
  (select count(*) from pg_policies where tablename = 'public_shares') as policies,
  (select relrowsecurity from pg_class where relname = 'public_shares') as rls_enabled;
