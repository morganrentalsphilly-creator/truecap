-- ============================================================
-- Fix: every storage upload rejected since the 2026-08-03 hardening
--
-- SURFACED FOR REVIEW — do not let tooling auto-apply. Idempotent.
--
-- truecap_storage_metadata_allowed() is called by the INSERT policies on
-- deal-documents, analysis-pdfs, and branding-logos. But Supabase's storage
-- API creates the storage.objects ROW FIRST and populates `metadata`
-- (size/mimetype) only after the bytes land — so at INSERT-policy time the
-- metadata is NULL, the function returned false, and EVERY upload on all
-- three buckets failed with an RLS violation:
--   deal-documents: 0 objects ever · analysis-pdfs: none since 2026-06-22
--   · branding-logos: none since the hardening.
--
-- Fix, in two mutually-reinforcing halves:
--   1. Enforce mime allowlists at the BUCKET level (storage.buckets
--      .allowed_mime_types) where they were missing. The storage API checks
--      these BEFORE creating the row — the layer that actually sees the
--      upload's content type. deal-documents already had its list;
--      analysis-pdfs and branding-logos get theirs now. file_size_limit is
--      already set on all three.
--   2. Make the function tolerate the insert-time NULL: metadata absent →
--      pass (the bucket layer above is enforcing), metadata present → the
--      full size+mime check as before. The policy keeps rejecting oversized
--      or mistyped metadata whenever storage DOES supply it.
-- ============================================================

-- 1) Bucket-level enforcement (the layer that runs before row creation).
update storage.buckets
   set allowed_mime_types = array['application/pdf']
 where id = 'analysis-pdfs'
   and (allowed_mime_types is null or allowed_mime_types = '{}');

update storage.buckets
   set allowed_mime_types = array['image/png', 'image/jpeg']
 where id = 'branding-logos'
   and (allowed_mime_types is null or allowed_mime_types = '{}');

-- 2) NULL-tolerant metadata gate.
create or replace function public.truecap_storage_metadata_allowed(
  p_metadata jsonb,
  p_max_bytes bigint,
  p_allowed_mime_types text[]
) returns boolean
language plpgsql
stable
as $$
declare
  size_bytes numeric;
  mime_type text;
begin
  -- INSERT-time state: the storage API creates the row before it knows the
  -- file's size/mimetype, so metadata is NULL here. The bucket's own
  -- allowed_mime_types + file_size_limit enforce at the API layer, which is
  -- the only layer that actually sees the upload at this point. Rejecting
  -- NULL here is what silently broke every upload on three buckets.
  if p_metadata is null then
    return true;
  end if;
  if jsonb_typeof(p_metadata) <> 'object' or p_max_bytes < 0 then
    return false;
  end if;
  begin
    size_bytes := nullif(p_metadata ->> 'size', '')::numeric;
  exception when others then
    return false;
  end;
  mime_type := lower(coalesce(
    nullif(p_metadata ->> 'mimetype', ''),
    nullif(p_metadata ->> 'contentType', ''),
    nullif(p_metadata ->> 'content-type', ''),
    ''
  ));
  return size_bytes is not null
     and size_bytes >= 0
     and size_bytes <= p_max_bytes
     and mime_type = any(p_allowed_mime_types);
end;
$$;

-- Verification: expect null_passes = true (insert-time state now allowed),
-- oversized = false, wrong_mime = false, good = true, and both buckets listed
-- with their allowlists.
select
  public.truecap_storage_metadata_allowed(null, 1000, array['application/pdf']) as null_passes,
  public.truecap_storage_metadata_allowed('{"size": "2000", "mimetype": "application/pdf"}'::jsonb, 1000, array['application/pdf']) as oversized,
  public.truecap_storage_metadata_allowed('{"size": "500", "mimetype": "text/html"}'::jsonb, 1000, array['application/pdf']) as wrong_mime,
  public.truecap_storage_metadata_allowed('{"size": "500", "mimetype": "application/pdf"}'::jsonb, 1000, array['application/pdf']) as good,
  (select json_agg(json_build_object('id', id, 'mimes', allowed_mime_types))
     from storage.buckets where id in ('analysis-pdfs', 'branding-logos', 'deal-documents')) as bucket_allowlists;
