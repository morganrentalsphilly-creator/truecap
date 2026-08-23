-- Bind each one-time Deal Decision Pack claim to the exact Offer Ceiling
-- target + target provenance purchased with the report. Existing claims are
-- migrated lazily: the first successful consumption (or, for a claim already
-- consumed before this migration, its first bounded recovery export) may set
-- the fingerprint exactly once. It is immutable thereafter.

alter table public.one_time_pdf_purchase_claims
  add column if not exists report_fingerprint text;

alter table public.one_time_pdf_purchase_claims
  drop constraint if exists one_time_pdf_report_fingerprint_check;
alter table public.one_time_pdf_purchase_claims
  add constraint one_time_pdf_report_fingerprint_check
  check (
    report_fingerprint is null
    or report_fingerprint ~ '^[0-9a-f]{64}$'
  );

comment on column public.one_time_pdf_purchase_claims.report_fingerprint is
  'Immutable HMAC-SHA-256 binding of canonical form inputs, Offer Ceiling target, and target source, keyed by the browser-only claim secret.';

create or replace function public.enforce_one_time_pdf_report_binding()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if old.report_fingerprint is not null
     and new.report_fingerprint is distinct from old.report_fingerprint then
    raise exception using
      errcode = '23514',
      message = 'one-time PDF report binding is immutable';
  end if;

  if old.report_fingerprint is null
     and new.report_fingerprint is not null
     and not (
       -- Legacy unconsumed row: bind it atomically with first consumption.
       (old.consumed_at is null and new.consumed_at is not null)
       or
       -- Legacy already-consumed row: allow its first recovery render only
       -- inside the same 24-hour window enforced by the server action.
       (
         old.consumed_at is not null
         and clock_timestamp() <= least(
           old.expires_at,
           old.consumed_at + interval '24 hours'
         )
       )
     ) then
    raise exception using
      errcode = '23514',
      message = 'one-time PDF report binding may only be set at consumption or bounded recovery';
  end if;

  return new;
end;
$$;

drop trigger if exists one_time_pdf_purchase_claims_05_bind_report
  on public.one_time_pdf_purchase_claims;
create trigger one_time_pdf_purchase_claims_05_bind_report
  before update on public.one_time_pdf_purchase_claims
  for each row execute function public.enforce_one_time_pdf_report_binding();
