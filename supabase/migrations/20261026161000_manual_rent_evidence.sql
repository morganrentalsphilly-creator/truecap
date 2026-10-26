-- User-entered comparable evidence. No provider calls or automated rent claims.
begin;
create table if not exists public.deal_rent_evidence (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  saved_analysis_id uuid not null,
  address text not null check (char_length(address) between 1 and 300),
  source_label text not null check (char_length(source_label) between 1 and 200),
  source_url text check (source_url is null or (source_url ~ '^https?://' and char_length(source_url)<=2000)),
  observed_on date not null,
  monthly_rent numeric not null check(monthly_rent > 0 and monthly_rent <= 1000000),
  bedrooms numeric check(bedrooms between 0 and 100),
  bathrooms numeric check(bathrooms between 0 and 100),
  sqft numeric check(sqft > 0 and sqft <= 1000000),
  monthly_adjustment numeric not null default 0 check(monthly_adjustment between -1000000 and 1000000),
  adjustment_notes text not null default '' check(char_length(adjustment_notes)<=2000),
  is_archived boolean not null default false,
  created_at timestamptz not null default now(),
  constraint deal_rent_evidence_positive_adjusted check(monthly_rent + monthly_adjustment > 0),
  constraint deal_rent_evidence_explained_adjustment check(monthly_adjustment=0 or char_length(btrim(adjustment_notes))>0),
  constraint deal_rent_evidence_owned_deal foreign key(saved_analysis_id,user_id) references public.saved_analyses(id,user_id) on delete cascade
);
create index if not exists deal_rent_evidence_owner_deal on public.deal_rent_evidence(user_id,saved_analysis_id,is_archived,created_at desc);
alter table public.deal_rent_evidence enable row level security;
do $$ begin
 create policy deal_rent_evidence_select_own on public.deal_rent_evidence for select to authenticated using (auth.uid()=user_id);
exception when duplicate_object then null; end $$;
do $$ begin
 create policy deal_rent_evidence_insert_own on public.deal_rent_evidence for insert to authenticated with check (auth.uid()=user_id);
exception when duplicate_object then null; end $$;
do $$ begin
 create policy deal_rent_evidence_update_own on public.deal_rent_evidence for update to authenticated using (auth.uid()=user_id) with check(auth.uid()=user_id);
exception when duplicate_object then null; end $$;
revoke all on public.deal_rent_evidence from public, anon, authenticated;
grant select,insert,update on public.deal_rent_evidence to authenticated;
grant all on public.deal_rent_evidence to service_role;
comment on table public.deal_rent_evidence is 'Private owner-entered comparable references and explicit adjustments. Neither licensed provider data nor verified rent estimates. Archive preserves the evidence record.';
notify pgrst, 'reload schema';
commit;
