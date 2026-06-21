-- Global cache for third-party property enrichment (RentCast).
--
-- Property facts + sale/rent comps for an address are expensive (paid API
-- calls) and change slowly, so we cache the assembled payload keyed by a
-- normalized address and serve it for a TTL (the app enforces freshness).
-- The cache is GLOBAL — not user-specific — so it's read/written only by
-- the service-role client from app/actions/property-comps.ts. RLS is
-- enabled with NO policies, so the anon + authenticated keys can neither
-- read nor write it; the service role bypasses RLS (same pattern as
-- stripe_webhook_events / lifecycle_email_log).

create table if not exists public.property_enrichment_cache (
  address_key text primary key,
  payload jsonb not null,
  fetched_at timestamptz not null default now()
);

comment on table public.property_enrichment_cache is
  'Global cache of third-party property enrichment (facts + comps) keyed by normalized address. Service-role only.';

alter table public.property_enrichment_cache enable row level security;
