-- SURFACED FOR REVIEW — do not let tooling auto-apply.
-- Idempotent; safe to run over a partially-applied state.
--
-- WHY: the Grand Slam Offer rollout (2026-08-17) adds an in-product
-- testimonial prompt after high-signal moments (PDF export, third saved
-- deal). Submissions land here as RAW, UNPUBLISHED input for Morgan's
-- review. Publication still happens ONLY by promoting a reviewed quote into
-- lib/proof-records.ts with verification + customer approval — this table
-- can never render on a public surface directly, so an unreviewed draft can
-- never become a live revenue claim.
--
-- RLS: enabled with NO policies (service-role only), same posture as
-- email_capture_guard — submissions contain free text from possibly-anonymous
-- visitors and are written/read exclusively by server actions + the
-- admin-guarded review page.

create table if not exists public.testimonial_submissions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete set null,
  quote text not null check (char_length(quote) between 10 and 1000),
  display_name text check (char_length(display_name) <= 120),
  role_segment text check (role_segment in ('investor', 'house_hacker', 'agent', 'other')),
  consent_to_publish boolean not null default false,
  source_event text not null check (source_event in ('pdf_export', 'third_save', 'manual')),
  status text not null default 'new' check (status in ('new', 'reviewed', 'published', 'rejected')),
  created_at timestamptz not null default now(),
  reviewed_at timestamptz
);

create index if not exists testimonial_submissions_created_at_idx
  on public.testimonial_submissions (created_at desc);
create index if not exists testimonial_submissions_user_id_idx
  on public.testimonial_submissions (user_id)
  where user_id is not null;

alter table public.testimonial_submissions enable row level security;
-- Deliberately NO policies: anon/authenticated roles get nothing; all access
-- flows through the service-role client in server actions.

comment on table public.testimonial_submissions is
  'Raw in-product testimonial submissions awaiting founder review (2026-08-17 offer rollout). Publication only via lib/proof-records.ts.';

-- Verification: expect RLS enabled (t) and 0 policies.
select relrowsecurity as rls_enabled,
       (select count(*) from pg_policies where tablename = 'testimonial_submissions') as policy_count
from pg_class
where relname = 'testimonial_submissions';
