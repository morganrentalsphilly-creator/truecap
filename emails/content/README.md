# Weekly Digest Content Files

Each file in this directory is one week's email content. Filename must
be the **Tuesday** of the week (ISO date format: `YYYY-MM-DD.json`).

## How it works

The cron at `/api/cron/send-weekly-digest` fires every Tuesday at
13:00 UTC (9am ET) — schedule `0 13 * * 2` in `vercel.json`.
It looks for a file whose date matches the current Tuesday. If found,
it renders the email and sends to the audience. If no file exists for
this Tuesday, it silently skips — so missing a week is harmless.

## Filename rule

`YYYY-MM-DD.json` where the date is the **Tuesday** the email should go out.

Examples:
- `2026-06-02.json` — sends Tuesday June 2, 2026 at 9am ET
- `2026-06-09.json` — sends Tuesday June 9, 2026 at 9am ET

## Required fields

See `2026-06-02.json` for a full annotated example. Required:
- `subject` — inbox subject line (~50 chars optimal)
- `preheader` — preview text next to subject (~90 chars optimal)
- `publishedAt` — same as filename date
- `marketSnapshot.headline`, `.body`, `.stats[]`
- `dealSpotter[]` — at least 1, max 3

Optional:
- `weekLabel` — e.g. `"Week 23"`
- `blogFeature` — single post to link
- `qa` — reader question + answer
- `shipNote` — what shipped in TrueCap this week/month

## Authoring workflow

1. Copy the most recent file → rename to next Tuesday's date
2. Edit the content (subjects, snapshot, deals, blog, Q&A, ship note)
3. Save, commit, push to GitHub
4. Vercel auto-deploys
5. Preview at `/admin/email-preview?date=YYYY-MM-DD`
6. Test-send to yourself via `/admin/email-preview` "Send test" button
7. The cron sends automatically Tuesday at 9am ET

## Heads up — trust + CAN-SPAM

The signup form currently says "monthly" but the cron fires weekly.
This is a **trust issue** — subscribers will get more email than they
agreed to. Either:
- Change the form copy to "weekly" (recommended), or
- Skip weeks (only write content files for weeks you want to send)

The footer of every email already includes:
- Unsubscribe link (Resend auto-substitutes per recipient)
- Physical mailing address (`TrueCap · Philadelphia, PA` by default —
  override via `EMAIL_SENDER_ADDRESS` env var if you want a different
  street address)
- Privacy policy link
