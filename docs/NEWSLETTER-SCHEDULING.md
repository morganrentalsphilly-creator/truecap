# Newsletter Scheduling — Diagnosis + Bulletproof Path

## TL;DR

Stop depending on Vercel cron. Pre-schedule all 21 broadcasts in Resend
itself with one command. From then on, Resend sends them on their
dates with no further dependency on your code, your cron, or your
infrastructure.

```bash
# Dry run first — verify what will be scheduled, no API calls.
npm run schedule-broadcasts:dry

# Then actually schedule them in Resend.
RESEND_API_KEY=re_xxx RESEND_AUDIENCE_ID=2ea9dd69-... npm run schedule-broadcasts
```

That's it. Walk away for 4.5 months.

---

## Why the cron probably wasn't firing (or firing into a void)

There are three likely root causes — listed in order of probability:

### 1. Date mismatch on the launch file

The cron schedule in `vercel.json` is `0 11 * * 2` (Tuesday 11 UTC).
The launch file is `emails/content/2026-05-25.json` — but May 25, 2026
is a **Monday**, not Tuesday. Every other content file (2026-06-02
onward) is correctly named for a Tuesday.

What happens: today (Tuesday May 26) the cron fires, calls
`currentSendDate()` which returns `2026-05-26`, looks for
`2026-05-26.json`, doesn't find it, and returns `{ ok: true, skipped: true }`.
No email goes out. No alert in Sentry (skip-no-content is intentionally
treated as success — designed for off-weeks).

From `2026-06-02` onward, content files line up with the cron day and
the cron would actually send them — IF the other two issues below
aren't blocking it.

### 2. `CRON_SECRET` env var not set in Vercel

Look at `app/api/cron/send-weekly-digest/route.ts` lines 52-65:

```typescript
const cronSecret = process.env.CRON_SECRET;
if (!cronSecret) {
  // 500 + Sentry alert
}
if (auth !== `Bearer ${cronSecret}`) {
  // 401
}
```

If `CRON_SECRET` isn't set in your Vercel production env vars, every
cron hit returns 500. Vercel cron requires you to set this yourself —
it doesn't auto-generate one. Verify in Vercel dashboard → Settings
→ Environment Variables that `CRON_SECRET` exists for Production.

### 3. Cron not deployed because crons need fresh deploys

If `vercel.json`'s `crons` array was added or changed after a previous
deployment, the cron only activates on the next Production deploy.
Vercel doesn't pick up cron changes from `vercel.json` until a new
prod build runs.

Verify: Vercel dashboard → your project → Cron Jobs tab. Does it list
`/api/cron/send-weekly-digest`? Does it show a "Next execution" time?
If the tab is empty, the cron config isn't deployed.

---

## The actually-sustainable fix

Pre-schedule every broadcast in Resend with a single script run.

### What this does

1. Reads every `emails/content/YYYY-MM-DD.json` file.
2. For each one, creates a draft broadcast in Resend.
3. Calls Resend's `/broadcasts/:id/send` with `scheduled_at` set to
   the date in the filename at 13:00 UTC (9am ET).
4. Resend takes over — your code is no longer involved in delivery.

### Why this is dramatically better

| Vercel-cron approach | Pre-scheduled approach |
| --- | --- |
| 3 failure points every send: Vercel cron fires, your code runs, Resend API responds | 0 failure points after script run — Resend owns the schedule |
| Bug discovered Tuesday at 9am = email skipped that week | If a broadcast is broken, you see it in Resend dashboard immediately and fix once |
| Requires CRON_SECRET, vercel.json, route handler, deploy | Requires nothing in production |
| You need to deploy to ship content changes | Edit the broadcast directly in Resend UI |

### Running it

```bash
# 1) Verify dry-run first
npm run schedule-broadcasts:dry
```

Expected output:

```
Schedule plan
─────────────
Content files found:      21
After --from filter:      21
Future-dated (will send): 20
Past-dated (skipped):     1
Mode:                     DRY RUN

[dry] 2026-06-02  scheduled_at=2026-06-02T13:00:00Z  subj="..."
[dry] 2026-06-09  scheduled_at=2026-06-09T13:00:00Z  subj="..."
...
```

```bash
# 2) Live run with the real env vars
RESEND_API_KEY=re_xxx \
RESEND_AUDIENCE_ID=2ea9dd69-b80d-4dbc-959d-780e9ea08f41 \
npm run schedule-broadcasts
```

Expected output:

```
[ok] 2026-06-02  id=abc123  scheduled_at=2026-06-02T13:00:00Z
[ok] 2026-06-09  id=def456  scheduled_at=2026-06-09T13:00:00Z
...
Done. Succeeded: 20. Failed: 0.
```

### Optional flags

- `--dry-run` — print plan, no API calls
- `--from=YYYY-MM-DD` — only schedule broadcasts on or after this date.
  Use if some weeks were already manually sent or scheduled.

### What about the launch email (`2026-05-25.json`)?

It's a past date. The script will skip it automatically. You can either:
- Send it manually via the Resend UI as a one-off (recommended), or
- Leave it — it was a launch email; the value has decayed.

---

## After running the script

### Verifying in Resend

1. Resend dashboard → Broadcasts → you'll see 20 scheduled broadcasts.
2. Each shows the scheduled date + audience size.
3. You can edit subject lines or content directly in the Resend UI if
   you want to tweak something before it goes out.

### What to do with the cron route + vercel.json

You can leave the cron route in place — it still works as a fallback
if you ever need to fire something ad-hoc. But you should:

- **Remove the `crons` array from `vercel.json`** so Vercel stops
  trying to fire something you've already scheduled elsewhere.
- Or keep it — the cron will just return `skipped: true` for every
  date you've pre-scheduled (because Resend already sent that day's
  broadcast, and your code does another lookup for that date and
  finds the content file already accounted for). Slightly wasteful
  but not harmful.

Recommended: comment out the `crons` array so future-you doesn't get
confused. Easy to re-enable later.

### Adding more content later

Drop a new `YYYY-MM-DD.json` file in `emails/content/` and re-run
`npm run schedule-broadcasts -- --from=YYYY-MM-DD` to schedule just
the new dates without re-creating the already-scheduled ones.

---

## Truly low-touch from here

Once this script runs:

1. **You have 20 weeks of newsletter content pre-scheduled in Resend.**
2. **Resend sends them automatically.** Doesn't depend on your code.
3. **You can ignore the cron entirely.**
4. **Walk away for 4.5 months.** Content goes out without your involvement.

If you want to extend to 8 months later, write more content files,
run the script again with `--from`, done.
