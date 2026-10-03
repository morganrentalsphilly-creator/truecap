-- One send log for accounts AND memo leads (docs/funnel-leaks-plan.md Phase B).
--
-- lifecycle_email_log was keyed by user only. The memo-lead sequence
-- (L0..L4) needs the same at-most-once claim for recipients who have no
-- account, so a row now belongs to exactly one of user_id / lead_id.
--
-- Additive: existing rows all have user_id set and keep satisfying the
-- original unique (user_id, email_key) constraint, which is untouched.
-- Requires 20261003120000_memo_leads.sql.

alter table public.lifecycle_email_log
  add column if not exists lead_id uuid references public.memo_leads (id) on delete cascade;

alter table public.lifecycle_email_log
  alter column user_id drop not null;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'lifecycle_email_log_one_recipient'
      and conrelid = 'public.lifecycle_email_log'::regclass
  ) then
    alter table public.lifecycle_email_log
      add constraint lifecycle_email_log_one_recipient
      check (num_nonnulls(user_id, lead_id) = 1);
  end if;
end $$;

-- A sequence step is sent at most once per lead. (NULL user_id rows are
-- distinct under the original constraint, so leads need their own index.)
create unique index if not exists lifecycle_email_log_lead_key_unique
  on public.lifecycle_email_log (lead_id, email_key)
  where lead_id is not null;

-- Manual rollback (only while no lead rows exist):
--   drop index public.lifecycle_email_log_lead_key_unique;
--   alter table public.lifecycle_email_log drop constraint lifecycle_email_log_one_recipient;
--   alter table public.lifecycle_email_log alter column user_id set not null;
--   alter table public.lifecycle_email_log drop column lead_id;
