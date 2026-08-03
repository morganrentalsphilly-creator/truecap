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
