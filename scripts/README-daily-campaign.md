# Daily campaign scheduler

One-shot TypeScript script that schedules 30 daily marketing emails as Resend broadcasts. Each broadcast renders from a JSON content file and is scheduled at 13:00 UTC (9am EDT) on its `send_date`.

## What it does

For each of `emails/daily-campaign-content/day-01.json` through `day-30.json`:

1. Reads the JSON content file.
2. Renders a clean, mobile-responsive HTML email with inline styles (no `<style>` blocks — many email clients strip them).
3. Renders a plain-text alternative (spam-score friendly, accessible).
4. Computes `scheduled_at` = `${send_date}T13:00:00Z` (9am ET in DST — the peak B2B open window).
5. Checks Resend for an existing broadcast named `Daily campaign · Day N · YYYY-MM-DD`. If found, skips it (idempotent — re-runs are safe).
6. Otherwise creates the broadcast via `POST /broadcasts` with `scheduled_at` in the body. Resend handles delivery.

Sequential, not parallel. 250ms gap between requests. ~7s total for all 30.

## Required env vars

Loaded from `.env.local` first, then `.env` (same loader as `schedule-all-broadcasts.ts`).

```
RESEND_API_KEY=re_...                          # required
RESEND_AUDIENCE_ID=2ea9dd69-...                # required
EMAIL_FROM="TrueCap <hello@usetruecap.com>"    # optional, has default
EMAIL_REPLY_TO=hello@usetruecap.com            # optional, has default
```

If `RESEND_API_KEY` or `RESEND_AUDIENCE_ID` is missing, the script fails fast with a clear error (skipped in `--dry-run` mode).

## Dry run first

Always preview before scheduling. Dry-run renders all 30 in memory and logs subjects + dates, but makes zero API calls.

```bash
npm run schedule-daily-campaign:dry
```

Sample output:

```
Daily campaign · schedule plan
──────────────────────────────
Range:   day 1 → day 30
Mode:    DRY RUN (no API calls)
From:    TrueCap <hello@usetruecap.com>
ReplyTo: hello@usetruecap.com

[day 01] [dry] scheduled_at=2026-06-01T13:00:00Z  subj="30 days of real numbers"  html_bytes=3812 text_bytes=1284
[day 02] [dry] scheduled_at=2026-06-02T13:00:00Z  subj="the 60-second underwrite" ...
...
```

## Schedule all 30 for real

```bash
npm run schedule-daily-campaign
```

The script will:

- List existing Resend broadcasts up front (idempotency check).
- Create + schedule each missing broadcast sequentially.
- Print a summary at the end (scheduled / skipped / failed).

## Partial scheduling

If you only want a subset of days — useful if you've already scheduled some manually or want to test with a single broadcast first:

```bash
# Just day 1 (as a smoke test)
npm run schedule-daily-campaign -- --start-day=1 --end-day=1

# Days 15-30 only
npm run schedule-daily-campaign -- --start-day=15 --end-day=30
```

Note the extra `--` so npm forwards args to the script.

## Idempotency: safe to re-run

Each broadcast name is unique and deterministic: `Daily campaign · Day N · YYYY-MM-DD`. The script checks Resend for that exact name before creating — so re-running won't create duplicates. If you cancel one broadcast in the Resend dashboard and re-run the script, it'll re-create just that one.

## The 30-day Resend cap (READ THIS)

**Resend's Broadcasts API rejects `scheduled_at` more than 30 days from creation time.**

This campaign runs **June 1 → June 30** (30 sends). The math:

- Run on **May 31** → June 30 is exactly 30 days out → all 30 fit (just barely).
- Run on **June 1** → June 30 is 29 days out, June 1 is "now" → day 1 may fail as past-dated, day 30 still fits.
- Run on **June 2 or later** → day 1 (and possibly day 2) are in the past → those will fail; later days fit.

If any broadcasts fail because they're outside the window, the script **logs each failure and continues** — it never crashes the whole batch. Re-run a day or two later and the missing ones (which by then will be inside the 30-day window) will be created.

## How to cancel

This script does **not** include a cancel command. Cancel scheduled broadcasts manually in the Resend dashboard:

1. Go to https://resend.com/broadcasts.
2. Find the broadcast (search for "Daily campaign · Day N").
3. Click the broadcast, then "Cancel send" (only available before its scheduled time).

If you need to bulk-cancel, the existing `cleanup-drafts` script targets weekly-digest drafts only — it would need a small edit to target `Daily campaign · ` instead.

## File layout

```
scripts/
  schedule-daily-campaign.ts        ← this script
  schedule-all-broadcasts.ts        ← sibling (weekly digest)
  README-daily-campaign.md          ← this file

emails/
  daily-campaign-content/
    day-01.json
    day-02.json
    ...
    day-30.json
```

## Content file schema

```json
{
  "day": 1,
  "send_date": "2026-06-01",
  "subject": "string (email subject line)",
  "preheader": "string (preview text in Gmail/Apple Mail)",
  "headline": "string (big H1 at top of body)",
  "body": ["paragraph 1", "paragraph 2", "..."],
  "cta_text": "string (button label)",
  "cta_url": "https://...",
  "signature_note": "string or null (optional PS line under CTA)"
}
```
