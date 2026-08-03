-- SECURITY FIX — `analysis-pdfs` was a PUBLIC bucket with a blanket
-- public-read policy. Every Pro user's exported underwrite was
-- downloadable by anyone on the internet, with zero credentials.
--
-- EXPOSURE (verified live against production, read-only, 2026-08-02):
--   1. 20260426203000_saved_analysis_pdf_exports.sql:6-18 creates the bucket
--      with `public = true` — and its `on conflict do update set public =
--      excluded.public` re-asserts that on every re-run, so a dashboard
--      toggle alone is NOT enough; it takes a later migration (this one).
--   2. The same migration (:29-35) creates `analysis_pdfs_public_read` as
--      `for select to public using (bucket_id = 'analysis-pdfs')` — no
--      owner-folder predicate, unlike its sibling insert/update policies.
--      `public` includes `anon`, and the anon key ships in the client
--      bundle, so `POST /storage/v1/object/list/analysis-pdfs` returned
--      HTTP 200 with every tenant folder (raw auth.users UUIDs), then every
--      analysis id, then the leaf `investment-analysis-v<N>.pdf`.
--   3. Because the BUCKET row is public, each enumerated object was then
--      fetchable at `/storage/v1/object/public/analysis-pdfs/<path>` with
--      no apikey, no Authorization header and no cookie: HTTP 200/206,
--      `application/pdf`, real `%PDF` bytes.
--
--   Net: enumerate every tenant -> enumerate every deal -> download every
--   PDF, unauthenticated. Each PDF is the complete underwrite (property
--   street address, purchase price, rents, financing terms, cash flow, tax
--   strategy, exit scenarios) plus, on branded exports, the owner's company
--   name and contact email/phone. 15 objects across 2 users at time of
--   discovery; it grew with every Pro export.
--
-- THE FIX (both halves are required — either alone leaves a hole):
--   (a) flip the bucket private, so `/object/public/...` stops serving
--       bytes to unauthenticated callers, AND
--   (b) replace the blanket SELECT policy with the owner-scoped shape
--       already used by `deal-documents` (20260621200000:40-48), so the
--       storage LIST/SELECT API returns nothing across tenants.
--
-- CODE SIDE (already shipped alongside this migration): the app no longer
-- builds or persists a permanent public URL. `saved_analyses.pdf_url` now
-- holds the OBJECT PATH, and reads mint a short-lived owner-scoped signed
-- URL via `createSignedUrl` (app/actions/saved-analyses.ts). Legacy rows
-- that still hold a full public URL are parsed back to a path and re-signed,
-- so applying this migration does not break existing cached exports.
--
-- OPERATIONAL NOTE FOR MORGAN: every public URL minted before this
-- migration is applied should be treated as already disclosed — those
-- objects were anonymously readable for the whole window. Applying this
-- migration makes them private going forward; it cannot un-disclose what
-- was already fetchable. If you want to re-key rather than just close the
-- door, delete the existing objects under `analysis-pdfs` after applying
-- (the app regenerates a fresh PDF on the next export).

-- (a) Bucket is no longer public. Downloads go through signed URLs.
update storage.buckets
set public = false
where id = 'analysis-pdfs';

-- (b) Blanket public-read -> owner-scoped read.
drop policy if exists "analysis_pdfs_public_read" on storage.objects;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'analysis_pdfs_select_own'
  ) then
    execute $policy$
      create policy "analysis_pdfs_select_own"
      on storage.objects
      for select
      to authenticated
      using (
        bucket_id = 'analysis-pdfs'
        and (storage.foldername(name))[1] = auth.uid()::text
      )
    $policy$;
  end if;
end
$$;

-- ---------------------------------------------------------------------------
-- NOT PART OF THIS MIGRATION — surfaced for Morgan's decision.
--
-- `profile-avatars` and `branding-logos` are also `public = true` AND carry
-- blanket public-read policies (20260414133000:30-37 and
-- 20260606120000:106-108). Serving those OBJECTS publicly is intentional and
-- correct — the /d share page renders `agent.logoUrl` as a plain <img src>
-- (app/d/[encoded]/page.tsx:108-110) and avatars render the same way — so
-- this migration deliberately leaves both buckets public.
--
-- The blanket SELECT POLICIES, however, buy nothing: on a public bucket the
-- `/object/public/...` read path bypasses RLS entirely (verified: a GET with
-- no apikey at all returns 200 image/jpeg). All the policies add is
-- anonymous LIST access, which enumerates the raw auth.users UUID of every
-- user who has uploaded, plus their upload timestamps (`avatar-<epoch>.webp`).
-- Low severity — only uploaders appear (1-2 UUIDs today, not the roster), a
-- UUID is not a credential anywhere in this codebase, and the branding UUID
-- is already public by design in the /d URL. But it is free to close:
--
--   drop policy if exists "profile_avatars_public_read" on storage.objects;
--   drop policy if exists "Anyone can read branding logos" on storage.objects;
--
-- Left commented out because it touches surfaces outside this fix; uncomment
-- (or run separately) if you want the enumeration closed too. Note this is
-- NOT expressible as "allow object read, deny list" — storage list and object
-- read evaluate the same SELECT policy — which is why the fix is a drop, not
-- a narrowed predicate.
-- ---------------------------------------------------------------------------
