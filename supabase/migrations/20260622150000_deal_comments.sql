-- Per-deal comment log (Phase 3 #15) — an append-only, timestamped journal on
-- a saved deal: seller updates, agent commentary, your own evolving reasoning.
--
-- Distinct from Deal Notes (a single free-text blob on saved_analyses): this
-- is a dated sequence of entries, so you can see the deal's story over time.
-- "author_name" is denormalized at write time (the user's display name) so the
-- log reads nicely without a join; it's the owner's own log (single-user),
-- owner-only RLS.
--
-- Entries are immutable: select + insert + delete (own) only, no update — edit
-- by deleting + re-adding. Cascades from the parent deal on delete.
--
-- Additive + safe: the comments action/UI ship tolerant of this table being
-- absent until applied (MIGRATION_PENDING), exactly like deal_due_diligence.

create table if not exists public.deal_comments (
  id uuid primary key default gen_random_uuid(),
  analysis_id uuid not null references public.saved_analyses(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  body text not null,
  author_name text,
  created_at timestamptz not null default now()
);

create index if not exists deal_comments_analysis_idx
  on public.deal_comments (analysis_id, created_at desc);

alter table public.deal_comments enable row level security;

drop policy if exists "deal_comments_select_own" on public.deal_comments;
create policy "deal_comments_select_own"
  on public.deal_comments for select using (auth.uid() = user_id);

drop policy if exists "deal_comments_insert_own" on public.deal_comments;
create policy "deal_comments_insert_own"
  on public.deal_comments for insert with check (auth.uid() = user_id);

drop policy if exists "deal_comments_delete_own" on public.deal_comments;
create policy "deal_comments_delete_own"
  on public.deal_comments for delete using (auth.uid() = user_id);

-- No update policy — entries are immutable.
