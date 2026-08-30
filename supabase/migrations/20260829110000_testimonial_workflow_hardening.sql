-- Additive, permissioned customer-proof intake.
--
-- This migration deliberately does not alter the legacy
-- public.testimonial_submissions table or its constraints. The new workflow
-- has its own private table so an optional quote, explicit permission record,
-- review state, and withdrawal state can be introduced without rewriting old
-- rows or weakening a legacy invariant.

begin;

create table if not exists public.permissioned_testimonial_submissions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete set null,
  quote text,
  display_name text,
  preferred_display_name_format text not null default 'anonymous',
  role_segment text,
  consent_to_publish boolean not null default false,
  permission_granted_at timestamptz,
  source_event text not null,
  status text not null default 'new',
  verification_status text not null default 'unverified',
  publication_status text not null default 'private',
  approved_at timestamptz,
  administrative_notes text,
  withdrawn_at timestamptz,
  rate_limit_key text not null,
  created_at timestamptz not null default now(),
  reviewed_at timestamptz,
  constraint permissioned_testimonial_quote_length_check
    check (quote is null or char_length(quote) between 10 and 1000),
  constraint permissioned_testimonial_display_name_length_check
    check (display_name is null or char_length(display_name) <= 120),
  constraint permissioned_testimonial_display_format_check
    check (preferred_display_name_format in (
      'full_name', 'first_name_last_initial', 'initials', 'anonymous'
    )),
  constraint permissioned_testimonial_role_check
    check (
      role_segment is null
      or role_segment in ('investor', 'house_hacker', 'agent', 'other')
    ),
  constraint permissioned_testimonial_source_check
    check (source_event in ('pdf_export', 'third_save', 'manual')),
  constraint permissioned_testimonial_status_check
    check (status in ('new', 'reviewed', 'rejected')),
  constraint permissioned_testimonial_verification_status_check
    check (verification_status in ('unverified', 'pending', 'verified', 'rejected')),
  constraint permissioned_testimonial_publication_status_check
    check (publication_status in (
      'private', 'pending_approval', 'approved', 'rejected', 'revoked'
    )),
  constraint permissioned_testimonial_admin_notes_length_check
    check (
      administrative_notes is null
      or char_length(administrative_notes) <= 4000
    ),
  constraint permissioned_testimonial_rate_limit_key_check
    check (rate_limit_key ~ '^[a-f0-9]{64}$'),
  constraint permissioned_testimonial_permission_record_check
    check (
      (consent_to_publish = true and permission_granted_at is not null)
      or (consent_to_publish = false and permission_granted_at is null)
    ),
  constraint permissioned_testimonial_approval_gate_check
    check (
      publication_status <> 'approved'
      or (
        quote is not null
        and consent_to_publish = true
        and permission_granted_at is not null
        and verification_status = 'verified'
        and approved_at is not null
        and permission_granted_at <= approved_at
        and withdrawn_at is null
        and (
          preferred_display_name_format = 'anonymous'
          or nullif(trim(display_name), '') is not null
        )
      )
    ),
  constraint permissioned_testimonial_withdrawal_check
    check (
      (withdrawn_at is null and publication_status <> 'revoked')
      or (withdrawn_at is not null and publication_status = 'revoked')
    )
);

comment on table public.permissioned_testimonial_submissions is
  'Private, service-role-only customer-proof intake. Never a public rendering source.';

create index if not exists permissioned_testimonial_created_at_idx
  on public.permissioned_testimonial_submissions (created_at desc);
create index if not exists permissioned_testimonial_user_id_idx
  on public.permissioned_testimonial_submissions (user_id)
  where user_id is not null;
create index if not exists permissioned_testimonial_rate_limit_idx
  on public.permissioned_testimonial_submissions (rate_limit_key, created_at desc);

-- Atomically rate-limit and insert. The application supplies only a keyed
-- HMAC bucket; raw IPs are never stored. SECURITY INVOKER plus FORCE RLS and
-- explicit grants keeps the function service-role-only.
create or replace function public.submit_permissioned_testimonial_submission(
  p_user_id uuid,
  p_rate_limit_key text,
  p_window_seconds integer,
  p_quote text,
  p_display_name text,
  p_display_name_format text,
  p_role_segment text,
  p_consent_to_publish boolean,
  p_source_event text
)
returns text
language plpgsql
security invoker
set search_path = public, pg_catalog
as $$
begin
  if p_rate_limit_key is null
     or length(p_rate_limit_key) <> 64
     or p_rate_limit_key !~ '^[a-f0-9]{64}$' then
    raise exception using errcode = '22023', message = 'invalid testimonial rate-limit key';
  end if;
  if p_window_seconds not between 3600 and 2592000 then
    raise exception using errcode = '22023', message = 'invalid testimonial rate-limit window';
  end if;
  if p_quote is not null and char_length(p_quote) not between 10 and 1000 then
    raise exception using errcode = '22023', message = 'invalid testimonial quote';
  end if;
  if p_display_name is not null and char_length(p_display_name) > 120 then
    raise exception using errcode = '22023', message = 'invalid testimonial display name';
  end if;
  if p_display_name_format not in (
    'full_name', 'first_name_last_initial', 'initials', 'anonymous'
  ) then
    raise exception using errcode = '22023', message = 'invalid testimonial display format';
  end if;
  if p_display_name_format <> 'anonymous'
     and coalesce(length(trim(p_display_name)), 0) = 0 then
    raise exception using errcode = '22023', message = 'display name required for selected format';
  end if;
  if p_role_segment is not null
     and p_role_segment not in ('investor', 'house_hacker', 'agent', 'other') then
    raise exception using errcode = '22023', message = 'invalid testimonial role';
  end if;
  if p_consent_to_publish is null then
    raise exception using errcode = '22023', message = 'publication permission choice required';
  end if;
  if p_source_event not in ('pdf_export', 'third_save', 'manual') then
    raise exception using errcode = '22023', message = 'invalid testimonial source';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(p_rate_limit_key, 0));
  if exists (
    select 1
    from public.permissioned_testimonial_submissions
    where rate_limit_key = p_rate_limit_key
      and created_at >= now() - make_interval(secs => p_window_seconds)
  ) then
    return 'rate_limited';
  end if;

  insert into public.permissioned_testimonial_submissions (
    user_id,
    quote,
    display_name,
    preferred_display_name_format,
    role_segment,
    consent_to_publish,
    permission_granted_at,
    source_event,
    status,
    verification_status,
    publication_status,
    approved_at,
    administrative_notes,
    withdrawn_at,
    rate_limit_key
  ) values (
    p_user_id,
    nullif(trim(p_quote), ''),
    case
      when p_display_name_format = 'anonymous' then null
      else nullif(trim(p_display_name), '')
    end,
    p_display_name_format,
    p_role_segment,
    p_consent_to_publish,
    case when p_consent_to_publish then now() else null end,
    p_source_event,
    'new',
    'unverified',
    'private',
    null,
    null,
    null,
    p_rate_limit_key
  );

  return 'created';
end;
$$;

alter table public.permissioned_testimonial_submissions enable row level security;
alter table public.permissioned_testimonial_submissions force row level security;
revoke all on table public.permissioned_testimonial_submissions
  from public, anon, authenticated;
grant select, insert, update on table public.permissioned_testimonial_submissions
  to service_role;

revoke all on function public.submit_permissioned_testimonial_submission(
  uuid, text, integer, text, text, text, text, boolean, text
) from public, anon, authenticated;
grant execute on function public.submit_permissioned_testimonial_submission(
  uuid, text, integer, text, text, text, text, boolean, text
) to service_role;

commit;

-- Operational rollback is immediate and data-preserving: keep
-- NEXT_PUBLIC_TRUECAP_TESTIMONIAL_COLLECTION=false. Optional schema removal is
-- safe only before intake is enabled or after exporting the new table:
--
-- begin;
-- drop function if exists public.submit_permissioned_testimonial_submission(
--   uuid, text, integer, text, text, text, text, boolean, text
-- );
-- drop table if exists public.permissioned_testimonial_submissions;
-- commit;
