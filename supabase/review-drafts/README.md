# Supabase SQL review drafts

Files in this directory are design artifacts, not executable migration history.
Supabase CLI `db push` does not process this directory. Every draft must include
the exact marker `TRUECAP_DRAFT_SQL: DO_NOT_APPLY`.

Do not copy a draft into `supabase/migrations/` under its old timestamp. After
all product, security, data-retention, recovery, and operational gates are
approved, promote it as a newly reviewed migration with a fresh timestamp later
than the current production migration head. Apply only through the production
backup, dry-run, approval, and verification procedure.

Current drafts:

- `decision-pack-durable-fulfillment.sql`
- `public-share-retention-service-role.sql`
