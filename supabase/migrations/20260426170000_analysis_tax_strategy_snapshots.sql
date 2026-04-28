create table if not exists public.analysis_tax_strategy_snapshots (
  id uuid primary key default gen_random_uuid(),
  analysis_id uuid not null references public.saved_analyses (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  version integer not null,
  input_hash text not null,
  tax_strategy_years jsonb not null,
  generated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists analysis_tax_strategy_snapshots_analysis_id_uidx
  on public.analysis_tax_strategy_snapshots (analysis_id);

create index if not exists analysis_tax_strategy_snapshots_user_idx
  on public.analysis_tax_strategy_snapshots (user_id, generated_at desc);

drop trigger if exists analysis_tax_strategy_snapshots_set_updated_at
  on public.analysis_tax_strategy_snapshots;

create trigger analysis_tax_strategy_snapshots_set_updated_at
  before update on public.analysis_tax_strategy_snapshots
  for each row execute function public.set_updated_at();

alter table public.analysis_tax_strategy_snapshots enable row level security;

create policy "analysis_tax_strategy_snapshots_select_own"
  on public.analysis_tax_strategy_snapshots
  for select
  using (auth.uid() = user_id);

create policy "analysis_tax_strategy_snapshots_insert_own"
  on public.analysis_tax_strategy_snapshots
  for insert
  with check (auth.uid() = user_id);

create policy "analysis_tax_strategy_snapshots_update_own"
  on public.analysis_tax_strategy_snapshots
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "analysis_tax_strategy_snapshots_delete_own"
  on public.analysis_tax_strategy_snapshots
  for delete
  using (auth.uid() = user_id);
