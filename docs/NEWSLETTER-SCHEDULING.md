# Newsletter Scheduling — Runbook

## TL;DR

You have a hybrid system. Two paths run in parallel:

1. **Resend pre-scheduled broadcasts** (next 28 days) — set via the `npm run schedule-broadcasts` script. Resend delivers them on the date with zero further code dependency.
2. **Vercel cron** (weeks 5+) — fires every Tuesday at 13:00 UTC (9am ET) and creates+sends that week's broadcast immediately. Picks up where the Resend pre-scheduling stops.

Why hybrid: Resend's Broadcasts API rejects `scheduled_at` beyond 30 days. So we pre-schedule what we can (next 4 Tuesdays) and let Vercel cron handle the rest by firing weekly.

## One-time setup

### 1. `.env.local` needs three env vars

```
RESEND_API_KEY=re_<your full-access key>
RESEND_AUDIENCE_ID=<your audience UUID>
CRON_SECRET=<any random string — set the same value in Vercel>
```

To find your audience ID:

```bash
npm run list-audiences
```

### 2. Set `CRON_SECRET` in Vercel

Vercel dashboard → your project → Settings → Environment Variables → Add:

- Name: `CRON_SECRET`
- Value: the same random string you put in `.env.local`
- Environment: Production (and Preview if you want)

This is what authorizes the cron route. Vercel passes it as a Bearer token automatically when the cron fires.

### 3. Verify cron is registered

After your next push, Vercel dashboard → your project → Cron Jobs tab should list `/api/cron/send-weekly-digest` with a "Next execution" time of the upcoming Tuesday 13:00 UTC.

If the tab is empty, the cron config didn't deploy — usually because the `crons` array in `vercel.json` was changed but no production deploy ran after.

## Day-to-day commands

### Schedule whatever's within the 28-day window

```bash
npm run schedule-broadcasts
```

Reads `emails/content/*.json`, filters to dates within the next 28 days, creates a broadcast in Resend for each, and schedules it with `scheduled_at`. Dates beyond 28 days are skipped with a notice — they'll get picked up either by the Vercel cron on their week, or by a future re-run of this script as the window slides forward.

### See what'd happen without sending

```bash
npm run schedule-broadcasts:dry
```

Prints the plan + which dates are in-window vs too-far-out. No API calls.

### List your Resend audiences

```bash
npm run list-audiences
```

Prints each audience name + UUID. Use this when setting `RESEND_AUDIENCE_ID` for the first time.

### Clean up orphan drafts

```bash
npm run cleanup-drafts
```

If a previous run created broadcasts but failed to schedule them (e.g. because the date was beyond Resend's 30-day window), they sit in Resend as `draft` status. This command lists every `draft` broadcast whose name starts with "Weekly digest · " and deletes them. Safe to re-run.

## Why this design

Three things broke or are at risk; here's how each is addressed:

| Issue | Mitigation |
| --- | --- |
| Resend rejects `scheduled_at` > 30 days | Script filters to 28 days. Vercel cron handles the rest. |
| Vercel cron might miss a fire | Resend pre-scheduling gives 4 weeks of safety buffer at any time. |
| Content file date might not match cron day | All content files are named for the Tuesday they send. Schedule is Tuesday 13:00 UTC. Match. |

If Vercel cron stops working at some point, you have 4 weeks of buffer (the Resend-pre-scheduled broadcasts) to notice and fix it. If Resend's API breaks, the Vercel cron is independent and keeps firing.

## Adding more content later

1. Drop a new `emails/content/YYYY-MM-DD.json` file (must be a Tuesday).
2. If the date is within 28 days: run `npm run schedule-broadcasts` to pre-schedule it now. Otherwise it'll auto-fire via the Vercel cron when its Tuesday arrives.

## Verifying delivery

After scheduling, Resend dashboard → Broadcasts shows each scheduled broadcast with status `Scheduled` + send date. After a cron fire, the broadcast moves to `Sent`.

## Common failure modes

- **"API key is invalid"** — wrong key in `.env.local`, or key doesn't have "Full Access" permission. Generate a new full-access key in Resend.
- **"scheduled_at must be within 30 days"** — the script now prevents this automatically by filtering to 28 days. If you see it manually, your re-run includes dates too far out.
- **Cron returns 401 in Vercel logs** — `CRON_SECRET` env var not set in Vercel (or different from what the route expects).
- **Cron returns `{ ok: true, skipped: true }`** — no content file matches that Tuesday's date. Add a `YYYY-MM-DD.json` file for that Tuesday.
