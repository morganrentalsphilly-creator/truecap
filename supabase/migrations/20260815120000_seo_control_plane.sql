-- ============================================================
-- TrueCap SEO control plane
--
-- Normalized, service-role-only storage for Search Console, source
-- dependencies, crawl/link health, opportunities, experiments, organic
-- conversion, embed referrals, job observability, and reversible mutations.
-- No public policies are created. The admin dashboard uses the existing
-- server-only service-role client after checkAdmin().
-- ============================================================

create table if not exists public.seo_pages (
  path text primary key check (path like '/%'),
  canonical text not null,
  page_type text not null check (page_type in ('product','calculator','article','topic-hub','glossary','market','state','comparison','persona','methodology','author','landing-page')),
  topic_cluster text not null,
  search_intent text not null,
  primary_query text,
  secondary_queries jsonb not null default '[]'::jsonb,
  business_relevance numeric(4,3) not null default 0.5 check (business_relevance between 0 and 1),
  author text,
  reviewer_name text,
  reviewer_credentials text,
  reviewed_at timestamptz,
  created_at timestamptz,
  modified_at timestamptz,
  last_factual_review_at timestamptz,
  freshness_class text not null check (freshness_class in ('competitor','rates','tax-law','market-data','annual-data','year-specific','evergreen-formula')),
  risk_class text not null check (risk_class in ('low','medium','high')),
  indexable boolean not null default true,
  in_sitemap boolean not null default true,
  status text not null default 'ACTIVE' check (status in ('ACTIVE','STALE_REVIEW_REQUIRED','DRAFT','MERGE_CANDIDATE','RETIRED')),
  metadata jsonb not null default '{}'::jsonb,
  recorded_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.seo_sources (
  source_id text primary key,
  authoritative_url text not null,
  source_organization text not null,
  source_category text not null check (source_category in ('TAX','LENDING','RATES','HUD','STATE_LAW','PROPERTY_TAX','COMPETITOR','TRUECAP_PRODUCT','MARKET_DATA')),
  fetched_at timestamptz,
  content_hash text,
  previous_content_hash text,
  refresh_interval_days integer not null check (refresh_interval_days between 1 and 730),
  authority_level text not null check (authority_level in ('PRIMARY','OFFICIAL','SECONDARY')),
  affected_content jsonb not null default '[]'::jsonb,
  extracted_facts jsonb not null default '[]'::jsonb,
  source_status text not null default 'PENDING' check (source_status in ('PENDING','HEALTHY','CHANGED','FAILED','STALE')),
  last_http_status integer,
  last_error text,
  change_summary text,
  updated_at timestamptz not null default now()
);

create table if not exists public.seo_page_source_dependencies (
  page_path text not null references public.seo_pages(path) on delete cascade,
  source_id text not null references public.seo_sources(source_id) on delete cascade,
  claim_key text not null,
  claim_text text not null,
  source_date date,
  retrieved_at timestamptz,
  confidence numeric(4,3) not null default 1 check (confidence between 0 and 1),
  is_primary_source boolean not null default false,
  contradiction_checked boolean not null default false,
  primary key (page_path, source_id, claim_key)
);

create table if not exists public.seo_gsc_daily (
  date date not null,
  query text not null,
  page text not null,
  device text not null default 'unknown',
  country text not null default 'unknown',
  clicks integer not null default 0 check (clicks >= 0),
  impressions integer not null default 0 check (impressions >= 0),
  ctr numeric(12,9) not null default 0 check (ctr between 0 and 1),
  position numeric(10,4),
  ingestion_run_id uuid,
  ingested_at timestamptz not null default now(),
  primary key (date, query, page, device, country)
);

create index if not exists seo_gsc_daily_page_date_idx on public.seo_gsc_daily(page, date desc);
create index if not exists seo_gsc_daily_query_date_idx on public.seo_gsc_daily(query, date desc);

create table if not exists public.seo_page_metrics (
  snapshot_date date not null,
  page text not null,
  window_days integer not null check (window_days in (1,7,28,90,365)),
  clicks integer not null default 0,
  impressions integer not null default 0,
  ctr numeric(12,9) not null default 0,
  position numeric(10,4),
  nonbrand_clicks integer not null default 0,
  analyzer_starts integer not null default 0,
  signups integer not null default 0,
  paid_conversions integer not null default 0,
  primary key (snapshot_date, page, window_days)
);

create table if not exists public.seo_query_metrics (
  snapshot_date date not null,
  query text not null,
  query_class text not null default 'unclassified',
  window_days integer not null check (window_days in (1,7,28,90,365)),
  clicks integer not null default 0,
  impressions integer not null default 0,
  ctr numeric(12,9) not null default 0,
  position numeric(10,4),
  pages jsonb not null default '[]'::jsonb,
  primary key (snapshot_date, query, window_days)
);

create table if not exists public.seo_opportunities (
  opportunity_id uuid primary key default gen_random_uuid(),
  opportunity_key text not null unique,
  opportunity_type text not null check (opportunity_type in ('STRIKING_DISTANCE','HIGH_IMPRESSION_LOW_CTR','QUERY_GAP','CONTENT_DECAY','CANNIBALIZATION','ORPHAN_OR_WEAKLY_LINKED','CONVERSION_OPPORTUNITY','LINK_ASSET_OPPORTUNITY')),
  page text,
  query text,
  score numeric(6,2) not null check (score between 0 and 100),
  risk_class text not null check (risk_class in ('low','medium','high')),
  evidence jsonb not null default '{}'::jsonb,
  recommended_action text not null,
  status text not null default 'OPEN' check (status in ('OPEN','PLANNED','RUNNING','WON','LOST','DISMISSED')),
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  resolved_at timestamptz
);

create index if not exists seo_opportunities_status_score_idx on public.seo_opportunities(status, score desc);

create table if not exists public.seo_experiments (
  experiment_id uuid primary key default gen_random_uuid(),
  page text not null,
  experiment_type text not null,
  query_group text,
  old_value text not null,
  new_value text not null,
  started_at timestamptz not null,
  ended_at timestamptz,
  baseline jsonb not null default '{}'::jsonb,
  result jsonb not null default '{}'::jsonb,
  status text not null default 'RUNNING' check (status in ('PLANNED','RUNNING','WON','LOST','INCONCLUSIVE','ROLLED_BACK')),
  check (ended_at is null or ended_at >= started_at)
);

create table if not exists public.seo_refresh_jobs (
  refresh_id uuid primary key default gen_random_uuid(),
  page text not null,
  reason text not null,
  risk_class text not null check (risk_class in ('low','medium','high')),
  evidence jsonb not null default '{}'::jsonb,
  status text not null default 'QUEUED' check (status in ('QUEUED','BLOCKED','RUNNING','QA_FAILED','READY_FOR_REVIEW','PUBLISHED','ROLLED_BACK')),
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create table if not exists public.seo_internal_links (
  snapshot_date date not null,
  source text not null,
  target text not null,
  anchor text not null,
  source_page_type text,
  placement text not null check (placement in ('contextual','navigation','footer')),
  depth_from_home integer,
  target_http_status integer,
  primary key (snapshot_date, source, target, anchor, placement)
);

create index if not exists seo_internal_links_target_idx on public.seo_internal_links(snapshot_date desc, target);

create table if not exists public.seo_crawl_results (
  crawled_at timestamptz not null,
  url text not null,
  http_status integer,
  redirect_chain jsonb not null default '[]'::jsonb,
  canonical text,
  noindex boolean,
  in_sitemap boolean,
  title text,
  h1 text,
  schema_types jsonb not null default '[]'::jsonb,
  broken_internal_links jsonb not null default '[]'::jsonb,
  broken_external_links jsonb not null default '[]'::jsonb,
  crawl_depth integer,
  issues jsonb not null default '[]'::jsonb,
  primary key (crawled_at, url)
);

create table if not exists public.seo_conversions_daily (
  date date not null,
  landing_page text not null,
  page_type text not null default 'unknown',
  topic_cluster text not null default 'unknown',
  event_name text not null check (event_name in ('organic_landing','calculator_started','calculator_completed','analyzer_started','report_viewed','signup_started','signup_completed','trial_started','paid_conversion')),
  conversions integer not null default 0 check (conversions >= 0),
  primary key (date, landing_page, event_name)
);

create table if not exists public.seo_embed_referrals (
  domain text not null,
  calculator text not null,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  sessions integer not null default 0,
  clicks_back integer not null default 0,
  analyzer_starts integer not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  primary key (domain, calculator)
);

create table if not exists public.seo_original_datasets (
  dataset_id text primary key,
  title text not null,
  methodology_url text,
  minimum_cohort_size integer not null default 50 check (minimum_cohort_size >= 25),
  privacy_reviewed boolean not null default false,
  source_window_start date,
  source_window_end date,
  published_at timestamptz,
  updated_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb
);

create table if not exists public.seo_job_runs (
  run_id uuid primary key default gen_random_uuid(),
  job_name text not null,
  cadence text not null check (cadence in ('daily','weekly','monthly','quarterly','manual')),
  mode text not null check (mode in ('observe','recommend','auto')),
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  status text not null default 'RUNNING' check (status in ('RUNNING','SUCCEEDED','DEGRADED','FAILED','DISABLED')),
  found jsonb not null default '{}'::jsonb,
  changed jsonb not null default '{}'::jsonb,
  evidence jsonb not null default '{}'::jsonb,
  tests jsonb not null default '[]'::jsonb,
  error text,
  idempotency_key text not null unique
);

create table if not exists public.seo_mutations (
  mutation_id uuid primary key default gen_random_uuid(),
  run_id uuid references public.seo_job_runs(run_id) on delete set null,
  opportunity_id uuid references public.seo_opportunities(opportunity_id) on delete set null,
  occurred_at timestamptz not null default now(),
  reason text not null,
  risk_class text not null check (risk_class in ('low','medium','high')),
  target text not null,
  before_state jsonb not null,
  after_state jsonb not null,
  source_ids jsonb not null default '[]'::jsonb,
  tests jsonb not null default '[]'::jsonb,
  git_commit text,
  rollback_instructions text not null
);

create table if not exists public.seo_settings (
  setting_key text primary key,
  setting_value jsonb not null,
  updated_at timestamptz not null default now()
);

insert into public.seo_settings(setting_key, setting_value)
values
  ('autopilot_mode', '"observe"'::jsonb),
  ('autopublish_enabled', 'false'::jsonb),
  ('daily_mutation_cap', '3'::jsonb),
  ('weekly_publication_cap', '1'::jsonb),
  ('minimum_original_data_cohort', '50'::jsonb)
on conflict (setting_key) do nothing;

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'seo_pages','seo_sources','seo_page_source_dependencies','seo_gsc_daily',
    'seo_page_metrics','seo_query_metrics','seo_opportunities','seo_experiments',
    'seo_refresh_jobs','seo_internal_links','seo_crawl_results','seo_conversions_daily',
    'seo_embed_referrals','seo_original_datasets','seo_job_runs','seo_mutations','seo_settings'
  ]
  loop
    execute format('alter table public.%I enable row level security', table_name);
    execute format('revoke all on table public.%I from anon, authenticated', table_name);
  end loop;
end $$;
