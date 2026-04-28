alter table public.saved_analyses
  add column if not exists pdf_url text,
  add column if not exists pdf_generated_at timestamptz,
  add column if not exists pdf_snapshot_version integer not null default 0;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'analysis-pdfs',
  'analysis-pdfs',
  true,
  10485760,
  array['application/pdf']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'analysis_pdfs_public_read'
  ) then
    execute $policy$
      create policy "analysis_pdfs_public_read"
      on storage.objects
      for select
      to public
      using (bucket_id = 'analysis-pdfs')
    $policy$;
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'analysis_pdfs_insert_own'
  ) then
    execute $policy$
      create policy "analysis_pdfs_insert_own"
      on storage.objects
      for insert
      to authenticated
      with check (
        bucket_id = 'analysis-pdfs'
        and (storage.foldername(name))[1] = auth.uid()::text
      )
    $policy$;
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'analysis_pdfs_update_own'
  ) then
    execute $policy$
      create policy "analysis_pdfs_update_own"
      on storage.objects
      for update
      to authenticated
      using (
        bucket_id = 'analysis-pdfs'
        and (storage.foldername(name))[1] = auth.uid()::text
      )
      with check (
        bucket_id = 'analysis-pdfs'
        and (storage.foldername(name))[1] = auth.uid()::text
      )
    $policy$;
  end if;
end
$$;
