-- Testimonials pipeline tables are service-role only (docs/site-overhaul.md
-- Phase 5). Additive and idempotent.
--
-- 20260906180000_testimonials_pipeline.sql originally created a public read
-- policy (testimonials_public_read: anon + authenticated may select rows with
-- status = 'published'). Because Supabase's default privileges grant SELECT
-- on every public table to anon/authenticated, that policy let the public
-- anon key read unpublish_token (the founder's veto capability) and user_id
-- off every published row. The site never used it: every read goes through
-- createAdminSupabaseClient (lib/testimonials/store.ts).
--
-- That migration has been amended in place; this file applies the same
-- statements for any database where the original version already ran. Safe
-- to run on a database where 20260906180000 has not run yet (each block is
-- skipped when its table is absent) and safe to run twice.

do $$
declare
  t text;
begin
  foreach t in array array[
    'testimonials',
    'testimonial_prompt_events',
    'demo_accounts',
    'feedback_email_sends'
  ] loop
    if to_regclass('public.' || t) is null then
      continue;
    end if;
    execute format('alter table public.%I enable row level security', t);
    execute format('alter table public.%I force row level security', t);
    execute format('revoke all on table public.%I from public, anon, authenticated', t);
    execute format('grant select, insert, update on table public.%I to service_role', t);
  end loop;

  if to_regclass('public.testimonials') is not null then
    execute 'drop policy if exists testimonials_public_read on public.testimonials';
    execute $c$comment on table public.testimonials is
      'Consented customer quotes from the in-product prompt. Auto-published by the publish-testimonials cron when every eligibility rule holds. Service-role only: the site reads published rows server-side; the row carries the unpublish capability token, so no client role may select it. Never deleted — unpublish sets status + unpublished_at.'$c$;
  end if;
end
$$;
