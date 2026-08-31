-- ============================================================
-- Fix: every browser upload STILL rejected — the insert-time
-- placeholder is now {} rather than NULL
--
-- 20260817210000 made truecap_storage_metadata_allowed() tolerate the
-- NULL metadata the storage API used to write when creating the object
-- row before the bytes land. The platform has since changed that
-- placeholder to an EMPTY OBJECT: '{}'::jsonb. '{}' skips the null
-- branch, jsonb_typeof = 'object' proceeds, size resolves to NULL, and
-- the function returns false — so the INSERT WITH CHECK fails and the
-- client sees "new row violates row-level security policy".
--
-- Proven live on 2026-08-31 against production:
--   * a text/plain upload by the deal's owner, fresh session, returned
--     {"statusCode":"403","message":"new row violates row-level
--     security policy"} with zero policy or privilege problems;
--   * truecap_storage_path_is_owned_deal(<real path>, true) = TRUE
--     under the caller's JWT claims;
--   * truecap_storage_metadata_allowed('{}'::jsonb, ...) = FALSE while
--     (NULL, ...) = TRUE — the exact gap;
--   * storage.objects holds 0 deal-documents rows EVER.
--
-- Fix: treat "no size recorded yet" as the insert-time placeholder in
-- BOTH shapes (NULL, or an object without a usable size), because the
-- bucket layer (file_size_limit + allowed_mime_types, both set on all
-- three buckets) enforces at the API layer that actually sees the
-- upload. When metadata DOES carry a size, the full size+mime check
-- runs exactly as before.
--
-- Idempotent: CREATE OR REPLACE, no schema changes. Safe to re-run.
-- ============================================================

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
  -- Insert-time placeholder, either shape. The storage API creates the
  -- row before it knows the file's size/mimetype; historically it wrote
  -- NULL here, and now writes '{}'. Rejecting either silently breaks
  -- every upload on every gated bucket, so pass and let the bucket's
  -- own file_size_limit + allowed_mime_types enforce.
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
  if size_bytes is null then
    -- Metadata object exists but carries no size yet: still the
    -- insert-time placeholder ('{}' or partial). Same reasoning as NULL.
    return true;
  end if;
  mime_type := lower(coalesce(
    nullif(p_metadata ->> 'mimetype', ''),
    nullif(p_metadata ->> 'contentType', ''),
    nullif(p_metadata ->> 'content-type', ''),
    ''
  ));
  return size_bytes >= 0
     and size_bytes <= p_max_bytes
     and mime_type = any(p_allowed_mime_types);
end;
$$;

-- Verification (read-only): every column must be TRUE.
select
  public.truecap_storage_metadata_allowed(null, 1000, array['application/pdf'])                 as null_passes,
  public.truecap_storage_metadata_allowed('{}'::jsonb, 1000, array['application/pdf'])          as empty_object_passes,
  not public.truecap_storage_metadata_allowed('{"size":"2000","mimetype":"application/pdf"}'::jsonb, 1000, array['application/pdf']) as oversized_rejected,
  not public.truecap_storage_metadata_allowed('{"size":"500","mimetype":"text/html"}'::jsonb, 1000, array['application/pdf'])        as wrong_mime_rejected,
  public.truecap_storage_metadata_allowed('{"size":"500","mimetype":"application/pdf"}'::jsonb, 1000, array['application/pdf'])      as good_passes;
