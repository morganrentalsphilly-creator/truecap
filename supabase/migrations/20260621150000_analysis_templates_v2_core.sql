-- Templates v2 (core): a per-user default template + a strategy "kind"
-- label, plus a one-default-per-user guarantee.
--
-- is_default: at most one user template flagged default (enforced by the
--   partial unique index below). Drives the "Default" badge + ordering now;
--   auto-applying it to new analyses can come in a later increment.
-- kind: the strategy a template represents (e.g. 'long-term-rental',
--   'medium-term-rental', 'section-8', 'turnkey', …) or null for a custom
--   template. Free-form text validated in the app layer — no DB check, so
--   the starter set can grow without further migrations.
--
-- "Used by X deals" is derived at read time (count of saved_analyses
--   referencing the template), so there's no denormalized counter column.
-- Pro-gating is unchanged (template_manage). RLS on analysis_templates
-- already restricts rows to the owner.

alter table public.analysis_templates
  add column if not exists is_default boolean not null default false,
  add column if not exists kind text;

-- At most one default per user (system templates excluded — user_id null).
create unique index if not exists analysis_templates_one_default_per_user
  on public.analysis_templates (user_id)
  where is_default = true and user_id is not null;
