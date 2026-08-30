-- Durable at-most-once claims for server-authoritative funnel transitions.
--
-- Additive and isolated from billing state: this table does not mutate a
-- Stripe object, subscription, price, entitlement, or checkout intent. It
-- stores only a SHA-256 digest of the provider-local dedupe key.

begin;

create table if not exists public.canonical_analytics_event_claims (
  event_name text not null,
  dedupe_key_hash text not null,
  claimed_at timestamptz not null default now(),
  primary key (event_name, dedupe_key_hash),
  constraint canonical_analytics_event_claims_event_check
    check (event_name in (
      'account_created',
      'product_evaluation_started',
      'subscription_started',
      'shared_analysis_copied'
    )),
  constraint canonical_analytics_event_claims_hash_check
    check (dedupe_key_hash ~ '^[a-f0-9]{64}$')
);

comment on table public.canonical_analytics_event_claims is
  'Service-role-only hashed dedupe claims for canonical server analytics events.';

alter table public.canonical_analytics_event_claims enable row level security;
alter table public.canonical_analytics_event_claims force row level security;
revoke all on table public.canonical_analytics_event_claims
  from public, anon, authenticated;
grant select, insert, delete on table public.canonical_analytics_event_claims
  to service_role;

commit;

-- Manual rollback (only after confirming no in-flight Stripe webhook relies
-- on a claim): drop table public.canonical_analytics_event_claims;
