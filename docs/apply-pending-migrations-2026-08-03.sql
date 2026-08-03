-- ============================================================
-- TrueCap — pending migrations bundle, generated 2026-08-03
-- Paste ONCE into Supabase → SQL Editor → Run.
-- Every statement is idempotent; safe over a partially-applied state.
--
-- MOST URGENT: the analysis-pdfs policy. The bucket was flipped to
-- private already (anon download + signed-URL are now denied, verified),
-- but the old 'to public' SELECT policy still lets anyone LIST the
-- bucket and see folder names. This drops it.
-- ============================================================

-- ─────────── 20260706120000_weekly_summary.sql
-- Weekly summary email (G4) — consent column + idempotency log.
--
-- The send-weekly-summary cron (app/api/cron/send-weekly-summary) is a Pro
-- retention feature that ships DORMANT (WEEKLY_SUMMARY_MODE defaults off).
-- This migration is the other half of the double gate:
--
--  1. profiles.weekly_summary_emails — the user-facing consent toggle.
--     The weekly summary is a DIFFERENT consent surface than rate alerts
--     (a recurring digest vs an event-triggered alert), so it gets its own
--     column instead of reusing rate_alert_emails. Default false = nobody
--     gets an email until they opt in AND Morgan flips the mode to live.
--
--  2. weekly_summary_log — per-user per-ISO-week idempotency. The cron
--     CLAIMS a (user_id, iso_week) row before sending (the stripe-events
--     pattern); the unique constraint guarantees at most ONE summary per
--     user per ISO week across overlapping or retried runs.
--
-- Writes to the log happen only from the cron via the service-role client
-- (lib/supabase/admin.ts). RLS is enabled with an explicit deny-all policy
-- so the anon and authenticated keys can neither read nor write it; the
-- service role bypasses RLS.

-- 1. Consent toggle (additive + nullable-safe; owner-RLS on profiles
--    already lets a user update their own row via the Settings toggle).
alter table public.profiles
  add column if not exists weekly_summary_emails boolean not null default false;

comment on column public.profiles.weekly_summary_emails is
  'User opt-in for the weekly portfolio summary email. The send-weekly-summary cron only emails users with this true. Default false = explicit opt-in required (double-gated with WEEKLY_SUMMARY_MODE).';

-- 2. Idempotency log — one row per (user, ISO week) summary send.
create table if not exists public.weekly_summary_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  -- ISO-8601 week key, e.g. '2026-W28' (lib/weekly-summary.ts isoWeekKey).
  iso_week text not null,
  sent_at timestamptz not null default now(),
  resend_id text,
  constraint weekly_summary_log_user_week_unique unique (user_id, iso_week)
);

comment on table public.weekly_summary_log is
  'Idempotency log for the weekly summary email: at most one send per user per ISO week. Service-role only (deny-all RLS).';

create index if not exists weekly_summary_log_week_idx
  on public.weekly_summary_log (iso_week);

-- Service-role only: RLS on, with an explicit deny-all policy (documents
-- intent beyond "no policies"; the service role bypasses RLS either way).
alter table public.weekly_summary_log enable row level security;

drop policy if exists "weekly_summary_log_deny_all" on public.weekly_summary_log;
create policy "weekly_summary_log_deny_all"
  on public.weekly_summary_log
  for all
  using (false)
  with check (false);

-- ─────────── 20260713120000_webhook_claim_lock.sql
-- Webhook claim lease: closes the concurrent-delivery race in the Stripe
-- webhook idempotency contract (app/api/stripe/webhooks/route.ts).
--
-- Problem: the 23505 -> "processed_at IS NULL" retry branch was
-- select-then-fallthrough, so a Stripe retry of a still-in-flight first
-- attempt processed the same event twice in parallel (duplicate
-- abandoned-cart emails, double PostHog funnel events).
--
-- Fix: `claimed_at` is a short-lived processing lease. The route claims the
-- retry atomically with a compare-and-swap UPDATE:
--
--   update stripe_webhook_events set claimed_at = now()
--    where stripe_event_id = $1
--      and processed_at is null
--      and (claimed_at is null or claimed_at < now() - interval '60 seconds')
--    returning stripe_event_id;
--
-- and only reprocesses when a row comes back. A lease older than 60s is
-- treated as a dead attempt and can be stolen.
--
-- `default now()` is deliberate: the initial INSERT is itself the first
-- claim, so new rows self-claim at insert time — without it, a retry
-- arriving while the very first attempt is still running would see
-- claimed_at NULL and win the lease anyway. Backfilling existing rows with
-- the migration timestamp is harmless: any stuck lease is stealable 60s
-- after this migration runs.
--
-- The route code is tolerant of this column NOT existing yet (42703 /
-- PGRST204 fallback to the old select-then-fallthrough), so code can deploy
-- before this migration is applied.

alter table public.stripe_webhook_events
  add column if not exists claimed_at timestamptz null default now();

comment on column public.stripe_webhook_events.claimed_at is
  'Processing lease for the webhook route: set on insert (default) and re-set via atomic compare-and-swap when a Stripe retry re-claims an unprocessed event. A lease older than 60s is considered dead and stealable. NULL only on rows created before this column existed.';

-- ─────────── 20260802120000_analysis_pdfs_private_bucket.sql
-- SECURITY FIX — `analysis-pdfs` was a PUBLIC bucket with a blanket
-- public-read policy. Every Pro user's exported underwrite was
-- downloadable by anyone on the internet, with zero credentials.
--
-- EXPOSURE (verified live against production, read-only, 2026-08-02):
--   1. 20260426203000_saved_analysis_pdf_exports.sql:6-18 creates the bucket
--      with `public = true` — and its `on conflict do update set public =
--      excluded.public` re-asserts that on every re-run, so a dashboard
--      toggle alone is NOT enough; it takes a later migration (this one).
--   2. The same migration (:29-35) creates `analysis_pdfs_public_read` as
--      `for select to public using (bucket_id = 'analysis-pdfs')` — no
--      owner-folder predicate, unlike its sibling insert/update policies.
--      `public` includes `anon`, and the anon key ships in the client
--      bundle, so `POST /storage/v1/object/list/analysis-pdfs` returned
--      HTTP 200 with every tenant folder (raw auth.users UUIDs), then every
--      analysis id, then the leaf `investment-analysis-v<N>.pdf`.
--   3. Because the BUCKET row is public, each enumerated object was then
--      fetchable at `/storage/v1/object/public/analysis-pdfs/<path>` with
--      no apikey, no Authorization header and no cookie: HTTP 200/206,
--      `application/pdf`, real `%PDF` bytes.
--
--   Net: enumerate every tenant -> enumerate every deal -> download every
--   PDF, unauthenticated. Each PDF is the complete underwrite (property
--   street address, purchase price, rents, financing terms, cash flow, tax
--   strategy, exit scenarios) plus, on branded exports, the owner's company
--   name and contact email/phone. 15 objects across 2 users at time of
--   discovery; it grew with every Pro export.
--
-- THE FIX (both halves are required — either alone leaves a hole):
--   (a) flip the bucket private, so `/object/public/...` stops serving
--       bytes to unauthenticated callers, AND
--   (b) replace the blanket SELECT policy with the owner-scoped shape
--       already used by `deal-documents` (20260621200000:40-48), so the
--       storage LIST/SELECT API returns nothing across tenants.
--
-- CODE SIDE (already shipped alongside this migration): the app no longer
-- builds or persists a permanent public URL. `saved_analyses.pdf_url` now
-- holds the OBJECT PATH, and reads mint a short-lived owner-scoped signed
-- URL via `createSignedUrl` (app/actions/saved-analyses.ts). Legacy rows
-- that still hold a full public URL are parsed back to a path and re-signed,
-- so applying this migration does not break existing cached exports.
--
-- OPERATIONAL NOTE FOR MORGAN: every public URL minted before this
-- migration is applied should be treated as already disclosed — those
-- objects were anonymously readable for the whole window. Applying this
-- migration makes them private going forward; it cannot un-disclose what
-- was already fetchable. If you want to re-key rather than just close the
-- door, delete the existing objects under `analysis-pdfs` after applying
-- (the app regenerates a fresh PDF on the next export).

-- (a) Bucket is no longer public. Downloads go through signed URLs.
update storage.buckets
set public = false
where id = 'analysis-pdfs';

-- (b) Blanket public-read -> owner-scoped read.
drop policy if exists "analysis_pdfs_public_read" on storage.objects;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'analysis_pdfs_select_own'
  ) then
    execute $policy$
      create policy "analysis_pdfs_select_own"
      on storage.objects
      for select
      to authenticated
      using (
        bucket_id = 'analysis-pdfs'
        and (storage.foldername(name))[1] = auth.uid()::text
      )
    $policy$;
  end if;
end
$$;

-- ---------------------------------------------------------------------------
-- NOT PART OF THIS MIGRATION — surfaced for Morgan's decision.
--
-- `profile-avatars` and `branding-logos` are also `public = true` AND carry
-- blanket public-read policies (20260414133000:30-37 and
-- 20260606120000:106-108). Serving those OBJECTS publicly is intentional and
-- correct — the /d share page renders `agent.logoUrl` as a plain <img src>
-- (app/d/[encoded]/page.tsx:108-110) and avatars render the same way — so
-- this migration deliberately leaves both buckets public.
--
-- The blanket SELECT POLICIES, however, buy nothing: on a public bucket the
-- `/object/public/...` read path bypasses RLS entirely (verified: a GET with
-- no apikey at all returns 200 image/jpeg). All the policies add is
-- anonymous LIST access, which enumerates the raw auth.users UUID of every
-- user who has uploaded, plus their upload timestamps (`avatar-<epoch>.webp`).
-- Low severity — only uploaders appear (1-2 UUIDs today, not the roster), a
-- UUID is not a credential anywhere in this codebase, and the branding UUID
-- is already public by design in the /d URL. But it is free to close:
--
--   drop policy if exists "profile_avatars_public_read" on storage.objects;
--   drop policy if exists "Anyone can read branding logos" on storage.objects;
--
-- Left commented out because it touches surfaces outside this fix; uncomment
-- (or run separately) if you want the enumeration closed too. Note this is
-- NOT expressible as "allow object read, deny list" — storage list and object
-- read evaluate the same SELECT policy — which is why the fix is a drop, not
-- a narrowed predicate.
-- ---------------------------------------------------------------------------

-- ─────────── 20260802120500_email_capture_guard.sql
-- Durable rate-limit + dedup buckets for the anonymous post-analysis email
-- capture action (app/actions/post-analysis-email-capture.ts).
--
-- Why a table and not the existing in-memory bucket pattern
-- (capture-deal-lead.ts): that map lives in one lambda's heap, so it is
-- defeated by autoscaling — N concurrent instances give an attacker N times
-- the quota, and a cold start resets it. The capture action fires FIVE Resend
-- sends per call to a fully caller-supplied recipient, so the limit has to be
-- shared across instances or it isn't a limit.
--
-- Design notes:
--   * `bucket_key` is an opaque, already-hashed identifier — we never store a
--     raw email address or IP here (see lib/email-capture-guard.ts). The table
--     is a counter ledger, not a contact list.
--   * TWO independent controls keep this off the anonymous PostgREST surface.
--     Neither is credited with the other's work, because each one alone has a
--     known failure mode:
--       1. GRANTS. All FOUR functions (bump_capture_bucket,
--          capture_bucket_at_limit, claim_email_capture,
--          release_capture_bucket) have EXECUTE revoked from `public`, `anon`
--          AND `authenticated`, and granted to `service_role` only. All three
--          revokes are required: revoking from `public` alone does NOT strip
--          the anon/authenticated EXECUTE that Supabase's `alter default
--          privileges … grant all on functions to anon, authenticated,
--          service_role` bootstrap installs at creation time, so a
--          public-only revoke leaves every function callable at
--          POST /rest/v1/rpc/<fn> with the anon key that ships in the public
--          JS bundle. (Same three-line pattern as
--          20260802140000_revoke_archive_stale_saved_analyses_from_public.sql.)
--       2. RLS. The table has RLS enabled with NO policies, and every function
--          below is SECURITY INVOKER (the default), so the RLS check runs as
--          the *caller*. Even if a grant is ever restored by hand or by a
--          future default-privileges sweep, an anon caller reads nothing,
--          writes nothing, and cannot move a counter — bump raises an RLS
--          violation, release updates 0 rows, at_limit returns false.
--     Only the service-role client (which bypasses RLS) actually touches this.
--
--   * ⚠️ DO NOT "fix" RLS errors in the logs by making these SECURITY DEFINER.
--     Control 2 is load-bearing precisely because it does not depend on the
--     grants staying correct, and SECURITY DEFINER would delete it. The blast
--     radius is concrete: the global bucket key is the ONE key that is not
--     hashed — `pae:global:<UTC hour>`, e.g. `pae:global:2026-08-02T10` (see
--     buildGlobalBucketKey in lib/email-capture-guard.ts), i.e. fully
--     derivable from the clock by
--     anyone. Under SECURITY DEFINER, an anonymous caller who also regained a
--     grant could POST /rest/v1/rpc/release_capture_bucket with that key on a
--     loop and walk the site-wide hourly send budget back to zero on demand,
--     turning the abuse cap into a free send quota. If these ever need to run
--     as owner, add an explicit policy or a caller check first — don't just
--     flip the security label.
--   * Fixed-window counters, not a sliding window: cheap, single-row-per-bump,
--     and precise enough for an abuse cap.

create table if not exists public.email_capture_guard (
  bucket_key text primary key,
  count integer not null default 0,
  window_start timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.email_capture_guard is
  'Fixed-window abuse counters for the anonymous post-analysis email capture. Keys are salted hashes of email/IP — no raw PII. Service-role only.';

alter table public.email_capture_guard enable row level security;
-- Intentionally no policies. Service role bypasses RLS; everyone else gets nothing.

create index if not exists email_capture_guard_updated_at_idx
  on public.email_capture_guard (updated_at);

-- Bump one fixed-window bucket atomically. Returns true when the bump stayed
-- within `p_max` for the current window, false when it went over. The row is
-- always written, so an over-limit caller keeps its window alive (an attacker
-- hammering the endpoint cannot roll their own window forward early).
create or replace function public.bump_capture_bucket(
  p_key text,
  p_max integer,
  p_window_seconds integer
)
returns boolean
language plpgsql
set search_path = public, pg_catalog
as $$
declare
  v_count integer;
begin
  insert into public.email_capture_guard as g (bucket_key, count, window_start, updated_at)
  values (p_key, 1, now(), now())
  on conflict (bucket_key) do update
    set count = case
          when now() - g.window_start > make_interval(secs => p_window_seconds) then 1
          else g.count + 1
        end,
        window_start = case
          when now() - g.window_start > make_interval(secs => p_window_seconds) then now()
          else g.window_start
        end,
        updated_at = now()
  returning g.count into v_count;

  return v_count <= p_max;
end;
$$;

-- Read-only bucket probe: is this key already at/over its cap for the current
-- window? Used as a cheap pre-filter so a request that is certain to be
-- rejected never creates a row (and never spends another axis' budget).
-- It does NOT enforce the cap — the atomic bump does that. Under concurrency
-- a few callers can pass this check and still be rejected by their bump.
create or replace function public.capture_bucket_at_limit(
  p_key text,
  p_max integer,
  p_window_seconds integer
)
returns boolean
language sql
stable
set search_path = public, pg_catalog
as $$
  select coalesce(
    (
      select g.count >= p_max
      from public.email_capture_guard g
      where g.bucket_key = p_key
        -- Same window arithmetic as bump_capture_bucket: a window that has
        -- expired resets on the next bump, so its stale count doesn't block.
        and now() - g.window_start <= make_interval(secs => p_window_seconds)
    ),
    false
  );
$$;

-- Refund a single bump. Used for the EMAIL bucket only, and only when zero
-- emails actually went out (Resend down / misconfigured, or the site budget
-- was taken by a concurrent claim), so a legitimate user can retry. The global
-- and IP buckets are never refunded — that's what keeps this from becoming a
-- quota-bypass path (cf. the RentCast refund hole).
-- Defined before claim_email_capture because that function calls it.
create or replace function public.release_capture_bucket(p_key text)
returns void
language sql
set search_path = public, pg_catalog
as $$
  update public.email_capture_guard
  set count = greatest(0, count - 1), updated_at = now()
  where bucket_key = p_key;
$$;

-- Claim one capture slot. Order matters, and it is NOT the order the axes are
-- listed in. Two properties have to hold at once:
--
--   (A) Availability — a rejected request must not spend site-wide budget.
--       The global bucket is the whole site's hourly send budget. If it were
--       bumped on every request, one curl loop from a single IP (which can
--       only ever send ip_max times) would burn all of it and every later
--       legitimate visitor would get 'global_limited'. So global is CHECKED
--       first (read-only) and BUMPED last, only for claims that actually send.
--
--   (B) Bounded row growth — a rotating attacker must not be able to grow
--       this table. Since global now only counts successful claims, it can no
--       longer be the row-growth bound on its own: a single-IP flood never
--       reaches it. So the per-IP axis is ALSO checked read-only before the
--       email bucket is created. Once an IP is over its cap, its requests
--       create nothing at all.
--
-- Sequence:
--   1. global (read-only)  → 'global_limited' before any row is written.
--   2. ip     (read-only)  → 'ip_limited' before an email row is written.
--   3. email  (bump)       → 'duplicate'. The dedup axis: caps how many times
--                            ONE address can be enrolled, so the 5-email
--                            sequence can't be re-triggered at a victim.
--   4. ip     (bump)       → 'ip_limited'. Atomic enforcement of the per-source
--                            cap (step 2 is only a pre-filter).
--   5. global (bump)       → charged only now, i.e. only when mail goes out.
--
-- Combined bound on rows per global window: ~2 * global_max + 1 (one email +
-- one IP row per successful claim, plus the single global row) — the same
-- bound the original ordering gave, without the availability hole.
-- Returns 'ok' | 'global_limited' | 'duplicate' | 'ip_limited'.
create or replace function public.claim_email_capture(
  p_global_key text,
  p_email_key text,
  p_ip_key text,
  p_global_max integer,
  p_global_window_seconds integer,
  p_email_max integer,
  p_email_window_seconds integer,
  p_ip_max integer,
  p_ip_window_seconds integer
)
returns text
language plpgsql
set search_path = public, pg_catalog
as $$
begin
  -- Opportunistic housekeeping (~1% of calls) so expired buckets don't
  -- accumulate forever. No cron needed.
  if random() < 0.01 then
    delete from public.email_capture_guard
    where updated_at < now() - interval '60 days';
  end if;

  -- 1. Global, READ-ONLY. Returns before anything is written, so a rotating
  --    attacker who exhausts the site budget still can't grow the table.
  if public.capture_bucket_at_limit(p_global_key, p_global_max, p_global_window_seconds) then
    return 'global_limited';
  end if;

  -- 2. Per-IP, READ-ONLY. A flooding source stops creating email rows the
  --    moment it is over its cap — and stops burning a victim address'
  --    dedup slots on requests that were never going to send.
  if public.capture_bucket_at_limit(p_ip_key, p_ip_max, p_ip_window_seconds) then
    return 'ip_limited';
  end if;

  -- 3. Email (dedup axis).
  if not public.bump_capture_bucket(p_email_key, p_email_max, p_email_window_seconds) then
    return 'duplicate';
  end if;

  -- 4. Per-IP, atomic enforcement.
  if not public.bump_capture_bucket(p_ip_key, p_ip_max, p_ip_window_seconds) then
    return 'ip_limited';
  end if;

  -- 5. Both axes passed, so this claim will send: charge the site budget now.
  --    Losing the concurrency race here is rare; refund the email slot so a
  --    legitimate user isn't dedup-locked for a claim that never sent. The IP
  --    bump is deliberately NOT refunded (it's the attacker-controlled axis).
  if not public.bump_capture_bucket(p_global_key, p_global_max, p_global_window_seconds) then
    perform public.release_capture_bucket(p_email_key);
    return 'global_limited';
  end if;

  return 'ok';
end;
$$;

-- Revoke from public AND anon AND authenticated. `from public` alone is not
-- enough on Supabase: the default-privileges bootstrap grants EXECUTE to anon
-- and authenticated directly at creation time, and a revoke from PUBLIC does
-- not touch a direct grant. Omitting either of the last two lines leaves the
-- function live at POST /rest/v1/rpc/<fn> for anyone holding the anon key.
revoke all on function public.bump_capture_bucket(text, integer, integer) from public;
revoke all on function public.bump_capture_bucket(text, integer, integer) from anon;
revoke all on function public.bump_capture_bucket(text, integer, integer) from authenticated;

revoke all on function public.capture_bucket_at_limit(text, integer, integer) from public;
revoke all on function public.capture_bucket_at_limit(text, integer, integer) from anon;
revoke all on function public.capture_bucket_at_limit(text, integer, integer) from authenticated;

revoke all on function public.claim_email_capture(text, text, text, integer, integer, integer, integer, integer, integer) from public;
revoke all on function public.claim_email_capture(text, text, text, integer, integer, integer, integer, integer, integer) from anon;
revoke all on function public.claim_email_capture(text, text, text, integer, integer, integer, integer, integer, integer) from authenticated;

revoke all on function public.release_capture_bucket(text) from public;
revoke all on function public.release_capture_bucket(text) from anon;
revoke all on function public.release_capture_bucket(text) from authenticated;

grant execute on function public.bump_capture_bucket(text, integer, integer) to service_role;
grant execute on function public.capture_bucket_at_limit(text, integer, integer) to service_role;
grant execute on function public.claim_email_capture(text, text, text, integer, integer, integer, integer, integer, integer) to service_role;
grant execute on function public.release_capture_bucket(text) to service_role;

-- ─────────── 20260802130000_profiles_lock_comps_free_used.sql
-- Lock profiles.comps_free_used against JWT-authenticated writes.
--
-- SECURITY FIX. comps_free_used is the ONLY gate on a free user's single
-- lifetime RentCast comps lookup, and it lived on a row the user can write:
-- the profiles_update_own RLS policy is whole-row (using/with check
-- auth.uid() = id) with no column list, and `authenticated` holds table-wide
-- UPDATE. A signed-in free user could therefore
--   PATCH /rest/v1/profiles?id=eq.<own uid>  {"comps_free_used": false}
-- after every lookup and mint unlimited "one lifetime" comps pulls — each one
-- a real, billed RentCast call that also decrements the SHARED monthly
-- enrichment budget (RENTCAST_MONTHLY_ENRICHMENT_CAP), which the rent-alert
-- cron and every paying Pro user draw from. i.e. a paid-feature denial of
-- service funded from a free account.
--
-- Fix mirrors the existing stripe_customer_id treatment: the column is pinned
-- to its previous value whenever the writer is the `authenticated` role, so
-- only the service-role path (app/actions/property-comps.ts, which now claims
-- and refunds the freebie with createAdminSupabaseClient()) can move it.
-- Service role and postgres are unaffected (auth.role() is not 'authenticated').
--
-- Extends public.profiles_lock_stripe_customer_id_for_users() rather than
-- adding a second trigger, so the ordering of BEFORE UPDATE triggers on
-- profiles stays unchanged. The existing trigger
-- (profiles_preserve_stripe_customer_id) keeps pointing at it — no trigger
-- DDL required.

create or replace function public.profiles_lock_stripe_customer_id_for_users()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'UPDATE' and coalesce(auth.role(), '') = 'authenticated' then
    -- Billing identity: service-role / webhooks only.
    new.stripe_customer_id := old.stripe_customer_id;
    -- Entitlement ledger: the free-comps freebie is spent and refunded by the
    -- server action under the service role, never by the account holder.
    new.comps_free_used := old.comps_free_used;
  end if;
  return new;
end;
$$;

comment on function public.profiles_lock_stripe_customer_id_for_users() is
  'BEFORE UPDATE guard on public.profiles: pins the columns a JWT-authenticated user must not set themselves (stripe_customer_id, comps_free_used) to their previous values. Service-role writes pass through.';

-- ─────────── 20260802140000_revoke_archive_stale_saved_analyses_from_public.sql
-- Revoke the default PUBLIC execute grant on archive_stale_saved_analyses().
--
-- SECURITY FIX. public.archive_stale_saved_analyses() is SECURITY DEFINER
-- (owned by postgres) and was created without a revoke, so it kept Postgres's
-- default `EXECUTE TO PUBLIC` grant. PostgREST therefore exposes it at
--   POST /rest/v1/rpc/archive_stale_saved_analyses
-- to the anon role — and the anon key ships in the public JS bundle. Because
-- the function runs as its owner and saved_analyses is not FORCE ROW LEVEL
-- SECURITY, the UPDATE inside it is unfiltered by user_id: any unauthenticated
-- caller could archive (is_archived = true, pipeline_stage = 'passed') every
-- user's deals older than 60 days, across every account. Confirmed reachable
-- in production: a GET to that RPC with the public anon key returns
-- 25006 "cannot execute UPDATE in a read-only transaction" — the body had
-- already started executing; a POST would have committed.
--
-- The function is cron-only by design
-- (cron.schedule('archive-stale-saved-analyses-daily', '0 2 * * *', ...)), so
-- service_role is the only role that needs it. This matches the pattern the
-- sibling counters already use — see 20260620120000_analysis_run_counter.sql
-- and 20260621220000_increment_app_counter.sql.
--
-- Note the un-archive path is user-facing, so the damage would be mostly
-- reversible, EXCEPT that the BEFORE UPDATE trigger
-- set_saved_analysis_last_activity_at rewrites last_activity_at = now() on
-- every touched row — those timestamps cannot be restored.
--
-- Verify after applying (should return 404 / PGRST202 instead of 25006):
--   curl -s -H "apikey: $ANON" -H "Authorization: Bearer $ANON" \
--     "$SUPABASE_URL/rest/v1/rpc/archive_stale_saved_analyses"

revoke all on function public.archive_stale_saved_analyses() from public;
revoke all on function public.archive_stale_saved_analyses() from anon;
revoke all on function public.archive_stale_saved_analyses() from authenticated;
grant execute on function public.archive_stale_saved_analyses() to service_role;

comment on function public.archive_stale_saved_analyses() is
  'Cron-only housekeeping: archives saved deals with no activity for 60 days. SECURITY DEFINER and RLS-bypassing, so EXECUTE is service_role only — do not re-grant to anon/authenticated.';

-- ─────────── verification (all should succeed / return rows)
select public from storage.buckets where id = 'analysis-pdfs';  -- expect: false
select policyname from pg_policies where tablename='objects' and policyname like '%analysis_pdfs%';
select claimed_at from public.stripe_webhook_events limit 1;
select comps_free_used, weekly_summary_emails from public.profiles limit 1;
