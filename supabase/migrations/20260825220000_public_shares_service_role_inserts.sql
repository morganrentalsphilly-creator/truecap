-- New public-share creation is a server authorization boundary. The server
-- action authenticates the owner, validates/recomputes the snapshot, applies
-- the IP brake, and mints a high-entropy token through the service-role client.
--
-- The original owner INSERT policy still let an authenticated browser bypass
-- all of those checks with direct PostgREST writes. Existing rows and public
-- capability-token reads are unchanged; only creation is restricted here.

begin;

do $$
begin
  if to_regclass('public.public_shares') is null then
    raise exception using
      errcode = '55000',
      message = 'public share creation hardening requires public.public_shares';
  end if;
end;
$$;

alter table public.public_shares enable row level security;
alter table public.public_shares force row level security;

drop policy if exists "public_shares_owner_insert" on public.public_shares;

-- A policy is not a grant. Remove both so a future broad default privilege or
-- an accidentally recreated owner policy cannot independently reopen direct
-- browser minting.
revoke insert on table public.public_shares from public, anon, authenticated;
grant insert on table public.public_shares to service_role;

comment on table public.public_shares is
  'Opaque revocable analysis shares. Owners may list/revoke their rows; only authenticated server code using service_role may mint a new row.';

commit;
