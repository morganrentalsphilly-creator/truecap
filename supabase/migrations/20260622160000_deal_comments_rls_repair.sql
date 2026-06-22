-- Repair: re-assert the deal_comments owner-only RLS policies.
--
-- The 20260622150000_deal_comments migration enabled RLS on deal_comments, but
-- its policies did not take effect on the deployed database — inserts failed
-- with "new row violates row-level security policy for table deal_comments".
-- The app was switched to write/read deal_comments via the service-role client
-- with in-action ownership checks (owns-deal + user_id/analysis_id scoping), so
-- there is no security gap today.
--
-- This migration restores the intended row-level security as DEFENSE IN DEPTH:
-- direct (non-service-role) access stays owner-scoped, and a future switch back
-- to the user-session client would just work. It is idempotent (drop-if-exists
-- + create) and safe to run repeatedly.

alter table public.deal_comments enable row level security;

drop policy if exists "deal_comments_select_own" on public.deal_comments;
create policy "deal_comments_select_own"
  on public.deal_comments for select
  using (auth.uid() = user_id);

drop policy if exists "deal_comments_insert_own" on public.deal_comments;
create policy "deal_comments_insert_own"
  on public.deal_comments for insert
  with check (auth.uid() = user_id);

drop policy if exists "deal_comments_delete_own" on public.deal_comments;
create policy "deal_comments_delete_own"
  on public.deal_comments for delete
  using (auth.uid() = user_id);

-- No update policy — comment entries are immutable.
