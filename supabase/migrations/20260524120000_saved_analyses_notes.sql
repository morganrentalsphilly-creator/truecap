-- Adds a free-text notes field to saved_analyses so the user can capture
-- non-structured context per deal — seller motivation, agent comments,
-- inspector findings, offer-strategy reasoning, anything that doesn't fit
-- into the structured form.
--
-- Nullable text, no length cap (Postgres text is unbounded). Frontend
-- enforces a soft cap (~10k chars) for UX reasons but the column is
-- intentionally permissive.
--
-- RLS: the existing saved_analyses owner-only policies already cover this
-- column. No additional policy is required because policies are
-- table-level, not column-level.
--
-- After applying this migration, the corresponding code wiring in
-- components/investcalc/saved-analyses-page-v2.tsx (planned, not yet
-- shipped) will start reading/writing this column.
alter table public.saved_analyses
  add column if not exists notes text null;

comment on column public.saved_analyses.notes is
  'User-authored free-text notes about the deal. Optional.';
