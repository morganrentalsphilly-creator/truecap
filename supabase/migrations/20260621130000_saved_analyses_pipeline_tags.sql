-- Pipeline stages + tags for saved deals.
--
-- pipeline_stage is the deal's position in the acquisition funnel and
-- becomes the single lifecycle dimension going forward:
--   researching → analyzing → offer → under_contract → closed → passed
-- The legacy is_completed / is_archived flags are kept as DERIVED mirrors
-- (the app syncs them on every stage change via lib/pipeline.flagsForStage)
-- so the stale-archive cron and any older readers keep working:
--   closed  ⇒ is_completed = true
--   passed  ⇒ is_archived  = true
--
-- tags is a free-form text[] for the investor's own labels (e.g. "BRRRR",
-- "out-of-state", "needs rehab"), filterable via a GIN index.
--
-- Pro-only at the app layer: the stage/tag server actions gate on the
-- 'pipeline' plan feature. RLS on saved_analyses already restricts rows
-- to the owner, so no new policies are needed.

alter table public.saved_analyses
  add column if not exists pipeline_stage text,
  add column if not exists tags text[] not null default '{}';

-- Constrain stage to the known funnel values (null allowed; the app
-- defaults to 'analyzing' and backfill below fills existing rows).
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'saved_analyses_pipeline_stage_check'
  ) then
    alter table public.saved_analyses
      add constraint saved_analyses_pipeline_stage_check
      check (
        pipeline_stage is null
        or pipeline_stage in ('researching', 'analyzing', 'offer', 'under_contract', 'closed', 'passed')
      );
  end if;
end $$;

-- Backfill from the existing lifecycle flags so current deals land in a
-- sensible stage immediately.
update public.saved_analyses
set pipeline_stage = case
  when is_completed then 'closed'
  when is_archived then 'passed'
  else 'analyzing'
end
where pipeline_stage is null;

-- Group/filter by stage; GIN for tag-containment filters.
create index if not exists saved_analyses_user_stage_idx
  on public.saved_analyses (user_id, pipeline_stage);
create index if not exists saved_analyses_tags_gin_idx
  on public.saved_analyses using gin (tags);

-- Keep stale-archive housekeeping consistent with the funnel: when a stale
-- ACTIVE deal is auto-archived, also move it to the 'passed' stage. Mirrors
-- the previous function (security definer + search_path) with the added
-- pipeline_stage write. (See 20260427173000 for the original.)
create or replace function public.archive_stale_saved_analyses()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  updated_count integer := 0;
begin
  update public.saved_analyses
     set is_archived = true,
         pipeline_stage = 'passed'
   where is_completed = false
     and is_archived = false
     and coalesce(last_activity_at, created_at) < now() - interval '60 days';

  get diagnostics updated_count = row_count;
  return updated_count;
end;
$$;

-- Enable pipeline + tags for Pro plans (data-driven entitlements;
-- see lib/entitlements.ts). Idempotent.
update public.plans
set entitlements = jsonb_set(
  entitlements,
  '{features}',
  (entitlements->'features') || jsonb_build_array('pipeline')
)
where slug in ('pro_monthly', 'pro_annual')
  and not (entitlements->'features' ? 'pipeline');
