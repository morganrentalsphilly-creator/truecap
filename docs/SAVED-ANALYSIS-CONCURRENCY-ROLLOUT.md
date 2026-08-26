# Saved-analysis concurrency rollout

The application now rejects stale full-underwriting and deal-note writes instead
of allowing the last browser tab to overwrite another tab or device.

## Required deployment order

1. Apply `supabase/migrations/20260825210000_saved_analysis_concurrency_revisions.sql`.
2. Verify both revision columns and the database-owned trigger exist:

   ```sql
   select underwriting_revision, notes_revision
   from public.saved_analyses
   limit 1;

   select tgname
   from pg_trigger
   where tgrelid = 'public.saved_analyses'::regclass
     and tgname = 'saved_analyses_80_bump_content_revisions';
   ```

3. Deploy the application code only after those checks pass.

The migration is additive and forward-only. It does not rewrite underwriting
inputs, results, notes, subscriptions, or Stripe data. Existing rows start at
revision `1`. The trigger advances underwriting and notes independently, so a
pipeline-stage change does not create a false editor conflict.

## Release verification

- Open the same saved deal in two authenticated tabs.
- Change and save the underwriting in tab A; an attempted save in tab B must
  show **This underwriting changed elsewhere** and offer **Reload latest** or
  **Save edits as new scenario**.
- Edit notes in both tabs. After tab A saves, tab B must preserve its typed text,
  show the latest saved note, and require **Load latest** or **Save my version**.
- Confirm loading a saved deal and a note succeeds normally after either write.

If the migration is absent, the new read/write paths fail closed with a
`MIGRATION_PENDING` state. They never fall back to unconditional updates.

