-- -------------------------------------------------------------------------
-- Storage upload runtime repair
--
-- Supabase Storage authorizes the storage.objects INSERT before object
-- metadata has reached its durable, fully populated shape. Depending on the
-- Storage release, that transient value can be NULL or an incomplete JSON
-- object. It is therefore not a valid INSERT-policy enforcement boundary.
--
-- The preceding workspace reconciliation accidentally restored a metadata
-- predicate on all three upload INSERT policies. A real authenticated upload
-- then failed with an RLS violation even though its owner/deal path, size, and
-- MIME type were valid. Keep every authorization and filename guard here, but
-- leave byte size and MIME enforcement to storage.buckets, where the Storage
-- API evaluates the actual upload before it creates or replaces the object.
--
-- The same rule applies to UPDATE authorization used by upserts: current
-- Storage probes may omit metadata or provide a transient shape that has
-- contentLength rather than the durable size field. Final object metadata is
-- written by the Storage service after authorization. This migration is
-- forward-only because 20260830130000 is already applied and hash-recorded.
-- -------------------------------------------------------------------------

-- Reassert the API-layer limits before replacing any upload policy. These
-- upserts are idempotent and also converge a clean replay with production.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'analysis-pdfs', 'analysis-pdfs', false, 10485760,
  array['application/pdf']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'deal-documents', 'deal-documents', false, 10485760,
  array[
    'application/pdf',
    'image/jpeg', 'image/png', 'image/webp', 'image/heic',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/csv', 'text/plain'
  ]
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'branding-logos', 'branding-logos', true, 1048576,
  array['image/png', 'image/jpeg']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "analysis_pdfs_insert_own" on storage.objects;
create policy "analysis_pdfs_insert_own" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'analysis-pdfs'
    and public.truecap_storage_path_is_owned_deal(name, true)
    and public.truecap_current_user_has_feature('pdf_export')
    and split_part(name, '/', 3)
      ~ '^investment-analysis-v[0-9]+-[a-f0-9]{32}-[a-f0-9]{64}[.]pdf$'
  );

drop policy if exists "analysis_pdfs_update_own" on storage.objects;
create policy "analysis_pdfs_update_own" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'analysis-pdfs'
    and public.truecap_storage_path_is_owned_deal(name, true)
    and public.truecap_current_user_has_feature('pdf_export')
  )
  with check (
    bucket_id = 'analysis-pdfs'
    and public.truecap_storage_path_is_owned_deal(name, true)
    and public.truecap_current_user_has_feature('pdf_export')
    and split_part(name, '/', 3)
      ~ '^investment-analysis-v[0-9]+-[a-f0-9]{32}-[a-f0-9]{64}[.]pdf$'
  );

drop policy if exists "deal_documents_insert_own" on storage.objects;
create policy "deal_documents_insert_own" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'deal-documents'
    and public.truecap_storage_path_is_owned_deal(name, true)
    and char_length(split_part(name, '/', 3)) between 1 and 160
  );

drop policy if exists "deal_documents_update_own" on storage.objects;
create policy "deal_documents_update_own" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'deal-documents'
    and public.truecap_storage_path_is_owned_deal(name, true)
  )
  with check (
    bucket_id = 'deal-documents'
    and public.truecap_storage_path_is_owned_deal(name, true)
    and char_length(split_part(name, '/', 3)) between 1 and 160
  );

drop policy if exists "Users can upload own logo" on storage.objects;
create policy "Users can upload own logo" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'branding-logos'
    and cardinality(string_to_array(name, '/')) = 2
    and split_part(name, '/', 1) = auth.uid()::text
    and split_part(name, '/', 2) <> ''
    and public.truecap_current_user_has_feature('custom_branding')
  );

drop policy if exists "Users can update own logo" on storage.objects;
create policy "Users can update own logo" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'branding-logos'
    and cardinality(string_to_array(name, '/')) = 2
    and split_part(name, '/', 1) = auth.uid()::text
    and split_part(name, '/', 2) <> ''
    and public.truecap_current_user_has_feature('custom_branding')
  )
  with check (
    bucket_id = 'branding-logos'
    and cardinality(string_to_array(name, '/')) = 2
    and split_part(name, '/', 1) = auth.uid()::text
    and split_part(name, '/', 2) <> ''
    and public.truecap_current_user_has_feature('custom_branding')
  );

-- Fail the migration if its effective INSERT policies or API-layer limits do
-- not match the intended boundary. This catches drift during both clean replay
-- and production application.
do $$
declare
  policy_definition text;
begin
  select with_check
    into policy_definition
    from pg_policies
   where schemaname = 'storage'
     and tablename = 'objects'
     and policyname = 'analysis_pdfs_insert_own';
  if policy_definition is null
     or position('truecap_storage_metadata_allowed' in policy_definition) > 0
     or position('truecap_storage_path_is_owned_deal' in policy_definition) = 0
     or position('truecap_current_user_has_feature' in policy_definition) = 0
     or position('pdf_export' in policy_definition) = 0 then
    raise exception 'analysis-pdfs INSERT policy did not converge';
  end if;

  select with_check
    into policy_definition
    from pg_policies
   where schemaname = 'storage'
     and tablename = 'objects'
     and policyname = 'analysis_pdfs_update_own';
  if policy_definition is null
     or position('truecap_storage_metadata_allowed' in policy_definition) > 0
     or position('truecap_storage_path_is_owned_deal' in policy_definition) = 0
     or position('truecap_current_user_has_feature' in policy_definition) = 0
     or position('pdf_export' in policy_definition) = 0 then
    raise exception 'analysis-pdfs UPDATE policy did not converge';
  end if;

  select with_check
    into policy_definition
    from pg_policies
   where schemaname = 'storage'
     and tablename = 'objects'
     and policyname = 'deal_documents_insert_own';
  if policy_definition is null
     or position('truecap_storage_metadata_allowed' in policy_definition) > 0
     or position('truecap_storage_path_is_owned_deal' in policy_definition) = 0
     or position('char_length(split_part' in policy_definition) = 0 then
    raise exception 'deal-documents INSERT policy did not converge';
  end if;

  select with_check
    into policy_definition
    from pg_policies
   where schemaname = 'storage'
     and tablename = 'objects'
     and policyname = 'deal_documents_update_own';
  if policy_definition is null
     or position('truecap_storage_metadata_allowed' in policy_definition) > 0
     or position('truecap_storage_path_is_owned_deal' in policy_definition) = 0
     or position('char_length(split_part' in policy_definition) = 0 then
    raise exception 'deal-documents UPDATE policy did not converge';
  end if;

  select with_check
    into policy_definition
    from pg_policies
   where schemaname = 'storage'
     and tablename = 'objects'
     and policyname = 'Users can upload own logo';
  if policy_definition is null
     or position('truecap_storage_metadata_allowed' in policy_definition) > 0
     or position('truecap_current_user_has_feature' in policy_definition) = 0
     or position('custom_branding' in policy_definition) = 0
     or position('auth.uid' in policy_definition) = 0 then
    raise exception 'branding-logo INSERT policy did not converge';
  end if;

  select with_check
    into policy_definition
    from pg_policies
   where schemaname = 'storage'
     and tablename = 'objects'
     and policyname = 'Users can update own logo';
  if policy_definition is null
     or position('truecap_storage_metadata_allowed' in policy_definition) > 0
     or position('truecap_current_user_has_feature' in policy_definition) = 0
     or position('custom_branding' in policy_definition) = 0
     or position('auth.uid' in policy_definition) = 0 then
    raise exception 'branding-logo UPDATE policy did not converge';
  end if;

  if not exists (
    select 1
      from storage.buckets
     where id = 'analysis-pdfs'
       and public = false
       and file_size_limit = 10485760
       and allowed_mime_types = array['application/pdf']
  ) then
    raise exception 'analysis-pdfs bucket limits did not converge';
  end if;

  if not exists (
    select 1
      from storage.buckets
     where id = 'deal-documents'
       and public = false
       and file_size_limit = 10485760
       and allowed_mime_types = array[
         'application/pdf',
         'image/jpeg', 'image/png', 'image/webp', 'image/heic',
         'application/msword',
         'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
         'application/vnd.ms-excel',
         'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
         'text/csv', 'text/plain'
       ]
  ) then
    raise exception 'deal-documents bucket limits did not converge';
  end if;

  if not exists (
    select 1
      from storage.buckets
     where id = 'branding-logos'
       and public = true
       and file_size_limit = 1048576
       and allowed_mime_types = array['image/png', 'image/jpeg']
  ) then
    raise exception 'branding-logos bucket limits did not converge';
  end if;
end;
$$;
