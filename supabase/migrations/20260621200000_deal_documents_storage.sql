-- Private storage bucket for per-deal due-diligence documents
-- (inspection reports, leases, photos, estoppels, etc.).
--
-- Objects are stored at  {user_id}/{analysis_id}/{filename}  so RLS is a
-- simple first-folder-segment owner check — the same pattern as the
-- profile-avatars bucket (20260414133000), but PRIVATE: there is no
-- public-read policy. Downloads go through short-lived signed URLs the
-- owner mints client-side. 10 MB cap; common document/image MIME types.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'deal-documents',
  'deal-documents',
  false,
  10485760,
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
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects'
      and policyname = 'deal_documents_select_own'
  ) then
    execute $policy$
      create policy "deal_documents_select_own"
      on storage.objects
      for select
      to authenticated
      using (
        bucket_id = 'deal-documents'
        and (storage.foldername(name))[1] = auth.uid()::text
      )
    $policy$;
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects'
      and policyname = 'deal_documents_insert_own'
  ) then
    execute $policy$
      create policy "deal_documents_insert_own"
      on storage.objects
      for insert
      to authenticated
      with check (
        bucket_id = 'deal-documents'
        and (storage.foldername(name))[1] = auth.uid()::text
      )
    $policy$;
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects'
      and policyname = 'deal_documents_delete_own'
  ) then
    execute $policy$
      create policy "deal_documents_delete_own"
      on storage.objects
      for delete
      to authenticated
      using (
        bucket_id = 'deal-documents'
        and (storage.foldername(name))[1] = auth.uid()::text
      )
    $policy$;
  end if;
end
$$;
