-- Public-share attribution is an authorization boundary.
--
-- Owners may revoke or relabel their links, but must not be able to rewrite
-- the captured analysis, token, owner, deal attribution, or formula version.
-- The public resolver additionally reads owner_id/deal_id from these typed row
-- columns and never trusts the mutable JSON snapshot for attribution.

revoke update on table public.public_shares from anon;
revoke update on table public.public_shares from authenticated;

grant update (label, expires_at, revoked_at, updated_at)
  on table public.public_shares
  to authenticated;

drop policy if exists "public_shares_owner_update" on public.public_shares;

create policy "public_shares_owner_update" on public.public_shares
  for update
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

comment on column public.public_shares.snapshot is
  'Immutable analysis snapshot. Public authorization and attribution must use owner_id/deal_id, never JSON metadata.';
