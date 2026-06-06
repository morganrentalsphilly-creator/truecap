-- Custom branding for PDF exports. Pro-tier feature.
--
-- Each user has zero or one branding row (1:1 with auth.users).
-- All fields nullable so users can configure partial branding (logo only,
-- or color only, etc.) without the form forcing all-or-nothing.
--
-- Free users can't reach the settings page or the branding fetch (gated
-- via the `custom_branding` entitlement check), but the row schema
-- doesn't enforce subscription state — the entitlement check does. This
-- way a user who downgrades doesn't lose their saved branding; it
-- silently stops applying until they upgrade again.

create table public.branding (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  logo_url text,
  company_name text,
  tagline text,
  primary_color_hex text check (
    primary_color_hex is null
    or primary_color_hex ~ '^#[0-9A-Fa-f]{6}$'
  ),
  contact_name text,
  contact_email text,
  contact_phone text,
  contact_website text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index branding_user_id_idx on public.branding(user_id);

comment on table public.branding is
  'Per-user branding config applied to PDF exports for Pro+ users.';

-- Owner-only RLS
alter table public.branding enable row level security;

create policy "Users can view own branding"
  on public.branding for select
  using (auth.uid() = user_id);

create policy "Users can insert own branding"
  on public.branding for insert
  with check (auth.uid() = user_id);

create policy "Users can update own branding"
  on public.branding for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete own branding"
  on public.branding for delete
  using (auth.uid() = user_id);

-- updated_at trigger
create or replace function public.handle_branding_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger branding_updated_at
  before update on public.branding
  for each row
  execute procedure public.handle_branding_updated_at();

-- Add custom_branding to Pro plan entitlements.
-- Idempotent — re-running won't double-add. Mirrors the pattern from
-- 20260506123000_add_dashboard_insights_entitlement.sql.
update public.plans
set entitlements = jsonb_set(
  entitlements,
  '{features}',
  case
    when coalesce(entitlements->'features', '[]'::jsonb) ? 'custom_branding'
      then coalesce(entitlements->'features', '[]'::jsonb)
    else coalesce(entitlements->'features', '[]'::jsonb) || jsonb_build_array('custom_branding')
  end
)
where slug in ('pro_monthly', 'pro_annual');

-- Storage bucket for logos.
-- Public read so the PDF generator can fetch logos by URL during export
-- without needing a signed URL flow. Brand logos are typically already
-- public on company websites; the marginal exposure risk is acceptable
-- for V1.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'branding-logos',
  'branding-logos',
  true,
  1048576,  -- 1 MB
  array['image/png', 'image/jpeg']
)
on conflict (id) do nothing;

-- Storage RLS — owner-only writes, public reads.
-- File path convention: <user_id>/<filename>. The first folder segment
-- is the user_id, which storage.foldername extracts. This is how we
-- match auth.uid() to the file path for the owner-only write policies.
create policy "Anyone can read branding logos"
  on storage.objects for select
  using (bucket_id = 'branding-logos');

create policy "Users can upload own logo"
  on storage.objects for insert
  with check (
    bucket_id = 'branding-logos'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "Users can update own logo"
  on storage.objects for update
  using (
    bucket_id = 'branding-logos'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "Users can delete own logo"
  on storage.objects for delete
  using (
    bucket_id = 'branding-logos'
    and auth.uid()::text = (storage.foldername(name))[1]
  );
