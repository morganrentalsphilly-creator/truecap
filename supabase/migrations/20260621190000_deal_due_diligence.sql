-- Per-deal due-diligence checklist.
--
-- One row per saved deal (analysis_id PK). `items` is a jsonb array of
-- { id, label, done, note? } so the checklist can grow custom items
-- without further migrations — the app seeds a default checklist when a
-- deal has none. A free per-deal annotation, like Deal Notes (no
-- entitlement gate). RLS is owner-only.
--
-- Document uploads (Supabase Storage) are a separate follow-up; this
-- migration is the checklist only.

create table if not exists public.deal_due_diligence (
  analysis_id uuid primary key references public.saved_analyses(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  items jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.deal_due_diligence is
  'Per-saved-deal due-diligence checklist (jsonb items). Free per-deal annotation, owner-only RLS.';

create index if not exists deal_due_diligence_user_idx
  on public.deal_due_diligence (user_id);

-- Auto-touch updated_at on any update.
create or replace function public.set_deal_due_diligence_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_deal_due_diligence_updated_at on public.deal_due_diligence;
create trigger trg_deal_due_diligence_updated_at
before update on public.deal_due_diligence
for each row
execute function public.set_deal_due_diligence_updated_at();

-- RLS: owner-only.
alter table public.deal_due_diligence enable row level security;

drop policy if exists "deal_due_diligence_select_own" on public.deal_due_diligence;
create policy "deal_due_diligence_select_own"
  on public.deal_due_diligence for select using (auth.uid() = user_id);

drop policy if exists "deal_due_diligence_insert_own" on public.deal_due_diligence;
create policy "deal_due_diligence_insert_own"
  on public.deal_due_diligence for insert with check (auth.uid() = user_id);

drop policy if exists "deal_due_diligence_update_own" on public.deal_due_diligence;
create policy "deal_due_diligence_update_own"
  on public.deal_due_diligence for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "deal_due_diligence_delete_own" on public.deal_due_diligence;
create policy "deal_due_diligence_delete_own"
  on public.deal_due_diligence for delete using (auth.uid() = user_id);
