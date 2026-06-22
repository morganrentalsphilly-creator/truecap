-- Optional investor-entered labels on a saved deal (Phase 2 #11).
--
-- nickname:     a short memorable name used as the deal's display label when
--               set (e.g. "The blue duplex"), falling back to address/title.
-- market:       the metro/market the deal is in (e.g. "Philadelphia").
-- neighborhood: finer-grained area (e.g. "Fishtown").
--
-- All three are FREE-TEXT, NULLABLE, and USER-ENTERED — no geocoding, no
-- required inputs, edited from the deal workspace. They power nickname-as-
-- label plus the optional Market / Neighborhood columns on My Deals.
--
-- Additive + safe: existing rows get NULLs (the app falls back to address/
-- title and renders "—"). RLS on saved_analyses already restricts rows to the
-- owner, so no new policies. The label server action is tolerant of these
-- columns being absent until this migration is applied (MIGRATION_PENDING).

alter table public.saved_analyses
  add column if not exists nickname text,
  add column if not exists market text,
  add column if not exists neighborhood text;

-- Gentle length caps so a stray paste can't bloat a row (app validates too).
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'saved_analyses_label_lengths_check'
  ) then
    alter table public.saved_analyses
      add constraint saved_analyses_label_lengths_check
      check (
        (nickname is null or char_length(nickname) <= 80)
        and (market is null or char_length(market) <= 80)
        and (neighborhood is null or char_length(neighborhood) <= 80)
      );
  end if;
end $$;
