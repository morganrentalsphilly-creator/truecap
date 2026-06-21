-- Immutable version history for calculation templates.
--
-- A snapshot row is written on every template create + edit + restore, so a
-- user can review prior versions and restore one. Snapshot is the full
-- template row (snake_case columns) captured at that moment.
--
-- created_by stores the owner so RLS is a simple owner check (the parent
-- analysis_templates already enforces ownership; duplicating the owner here
-- avoids a subquery in the policy). Versions are immutable: select + insert
-- only, no update/delete policies. Cascade from the parent template cleans
-- up history when a template is deleted.

create table if not exists public.analysis_template_versions (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null references public.analysis_templates(id) on delete cascade,
  created_by uuid not null references auth.users(id) on delete cascade,
  version integer not null,
  snapshot jsonb not null,
  created_at timestamptz not null default now(),
  constraint analysis_template_versions_template_version_unique unique (template_id, version)
);

create index if not exists analysis_template_versions_template_idx
  on public.analysis_template_versions (template_id, version desc);

alter table public.analysis_template_versions enable row level security;

drop policy if exists "analysis_template_versions_select_own" on public.analysis_template_versions;
create policy "analysis_template_versions_select_own"
  on public.analysis_template_versions
  for select
  using (auth.uid() = created_by);

drop policy if exists "analysis_template_versions_insert_own" on public.analysis_template_versions;
create policy "analysis_template_versions_insert_own"
  on public.analysis_template_versions
  for insert
  with check (auth.uid() = created_by);

-- No update/delete policies — versions are immutable.
