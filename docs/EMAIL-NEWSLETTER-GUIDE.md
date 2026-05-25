# Weekly Email Newsletter — Full Workflow Guide

The newsletter system is fully built and scheduled. You write one
content file per week, commit + push, and Vercel Cron sends it
Monday at 9am ET automatically.

This doc covers the weekly workflow, the one-time setup (env vars),
and the failure modes you might hit.

---

## One-time setup (do this once)

You've already done Steps 1-5. The remaining steps to go live:

### Step 6 — Add `CRON_SECRET` to Vercel

This protects the cron endpoint from public/internet triggers. Without
it, anyone who finds the URL could fire your weekly send.

1. Generate a random string. From your Mac terminal:

   ```bash
   openssl rand -hex 32
   ```

   That spits out a 64-char hex string like `a1b2c3...`. Copy it.

2. Vercel dashboard → TrueCap project → Settings → Environment
   Variables → Add New:
   - Name: `CRON_SECRET`
   - Value: (paste the random string from step 1)
   - Environments: Production + Preview both checked
   - Save

3. Vercel auto-passes `Authorization: Bearer <CRON_SECRET>` to scheduled
   cron requests — no code change needed.

### Step 7 — Optional: Override the physical mailing address

CAN-SPAM requires every marketing email to include a physical mailing
address. The default shown in every email is:

```
TrueCap · Philadelphia, PA
```

If you want a more specific address (recommended for stronger trust
signals + legal cover):

1. Vercel → Environment Variables → Add New:
   - Name: `EMAIL_SENDER_ADDRESS`
   - Value: `TrueCap · 123 Main St, Philadelphia, PA 19102` (or a PO
     Box, or a virtual mailbox service like iPostal1 / Earth Class Mail
     if you don't want to publish your home address)
   - Save

2. The next email auto-picks it up — no code change.

### Step 8 — Optional: From / Reply-To overrides

Defaults:
- From: `TrueCap <hello@usetruecap.com>`
- Reply-To: `hello@usetruecap.com`

Override with `EMAIL_FROM` and `EMAIL_REPLY_TO` env vars if you want
different addresses. Make sure the `@usetruecap.com` domain you send
from is the verified one in Resend.

### Step 9 — Sanity-check the cron schedule

In `vercel.json`:

```json
"crons": [
  { "path": "/api/cron/send-weekly-digest", "schedule": "0 13 * * 1" }
]
```

`0 13 * * 1` = "0 minutes, 13:00 UTC, every Monday." Translates to:
- **9:00 AM EDT** (most of the year, March–November)
- **8:00 AM EST** (winter, November–March)

If you want a different time, replace the cron expression. Cheat
sheet:

| Cron        | Translates to                        |
|-------------|---------------------------------------|
| `0 13 * * 1` | Mondays 9am ET (currently set)        |
| `0 14 * * 1` | Mondays 10am ET                       |
| `0 13 * * 2` | Tuesdays 9am ET                       |
| `30 12 * * 1` | Mondays 8:30am ET                     |

---

## Weekly workflow (~20 min Sunday night or Monday early morning)

### 1. Create the content file

In your repo at `/emails/content/`, create a new file named for the
upcoming Monday — e.g. `2026-06-08.json` for the week of June 8.

Easiest path: copy the most recent file in `/emails/content/`, rename
it to the new Monday's date, and replace the content.

### 2. Fill in the content

See `/emails/content/README.md` for the full schema. The key sections:

- **subject** — inbox subject line (~50 chars)
- **preheader** — preview text shown next to subject (~90 chars)
- **publishedAt** — same date as the filename
- **marketSnapshot** — headline + body + 3 stat tiles
- **dealSpotter** — 3 mini deals you underwrote (address + headline
  number + verdict + body)
- **blogFeature** — optional, link to your newest blog post
- **qa** — optional, reader question + answer
- **shipNote** — optional, what you shipped this week

### 3. Preview it

Push the file to GitHub. Wait ~2 min for Vercel to deploy. Then:

1. Go to https://usetruecap.com/admin/email-preview (you must be
   signed in as `morganrentalsphilly@gmail.com`)
2. The newest content file shows by default. Use the week dropdown
   to view others.
3. The email renders in an iframe exactly as it will appear in inboxes.

### 4. Send a test to yourself

On the preview page, click **Send test to me**. Within 5 seconds you
should get an email at `morganrentalsphilly@gmail.com` with subject
prefix `[TEST]`. Open it in Gmail (or wherever you read email) and
check:

- Subject + preheader make sense as inbox previews
- All links work
- All deal-spotter numbers are correct
- The unsubscribe link in the footer is visible (it's a placeholder in
  the test send, so don't worry that it goes to a non-functional URL)

If anything looks wrong, edit the content file, push again, wait for
deploy, re-test.

### 5. Wait for Monday 9am ET

The cron at `/api/cron/send-weekly-digest` fires automatically every
Monday at 13:00 UTC. It looks up the content file matching that
Monday's date, renders the email, and POSTs a Broadcast to Resend
targeting your TrueCap audience.

Resend then fans out one personalized email per subscriber (with
their unique unsubscribe link).

### 6. Verify the send

After the cron fires:

1. Resend dashboard → **Broadcasts** → you'll see "Weekly digest ·
   YYYY-MM-DD" with status `sent`
2. Click in to see open rates + click rates (~24h later)
3. Reply-to inbox: any subscriber replies route to
   `hello@usetruecap.com` (or `EMAIL_REPLY_TO` env var). Skim
   replies for feedback worth incorporating into next week.

---

## Skipping a week

Don't write a content file for that Monday. The cron will look, find
nothing, log "No content for YYYY-MM-DD — skipping send", and exit
quietly. No broken-empty email goes out.

Recommended: if you're going to skip more than 2 weeks, send a "back
in N weeks" email so subscribers don't forget you exist. Long silent
periods kill open rates when you eventually return.

---

## Manually triggering the cron (test in production)

If you want to verify the cron actually works end-to-end without
waiting for Monday morning:

```bash
curl -X GET 'https://usetruecap.com/api/cron/send-weekly-digest' \
  -H 'Authorization: Bearer YOUR_CRON_SECRET'
```

Replace `YOUR_CRON_SECRET` with the value of the `CRON_SECRET` env
var in Vercel. This **will send a real email to your full audience**
if a content file exists for today's Monday. Use carefully.

For safer end-to-end testing, use the **Send test to me** button on
the preview page — that hits `/api/email/send-test` instead, which
sends to a single recipient (you).

---

## Failure modes + how they show up

| Symptom | What's wrong | Fix |
|---|---|---|
| Cron fires, no email sent, log says "No content for YYYY-MM-DD" | Missing content file | Create the file before next Monday |
| Cron returns 401 | `CRON_SECRET` not set or wrong | Add/verify env var in Vercel |
| Cron returns 500 "Resend not configured" | `RESEND_API_KEY` or `RESEND_AUDIENCE_ID` missing | Add to Vercel env vars |
| Cron returns 502 from Resend | Resend API outage or rate limit | Check status.resend.com, retry |
| Test send works but cron-sent email lands in spam | New sender, low warm-up | Reduce send frequency early; ask subscribers to reply / move-to-inbox first 1-2 sends |
| Broadcasts dashboard shows "0 sent" | Audience is empty | Subscribers haven't joined yet |

---

## CAN-SPAM compliance checklist

The template already includes everything legally required:

- ✅ Honest "From" name (`TrueCap <hello@usetruecap.com>`)
- ✅ Non-deceptive subject line (you control this per send)
- ✅ Physical mailing address in footer (env var, defaults to "TrueCap · Philadelphia, PA")
- ✅ Visible unsubscribe link in footer (Resend auto-substitutes per recipient)
- ✅ One-click unsubscribe via `list-unsubscribe` headers (Resend adds these automatically)
- ✅ Unsubscribe processed within 10 days (Resend handles this — typically instant)

What you need to do:
- Don't lie in the subject line
- Don't ignore replies asking to be removed (Resend's unsubscribe
  flow handles this for you, but if someone emails you directly, add
  them to your audience's blocklist in Resend)

---

## Deliverability tips for the first 4-8 weeks

A brand-new sending domain has zero reputation with Gmail / Outlook /
Yahoo. Your first emails are on probation. To stay out of spam folders:

1. **Send to engaged subscribers first.** If you have a beta list of
   people who explicitly asked to be on the list, send to them before
   buying ads or running anything that brings cold subscribers.

2. **Ask people to reply or move-to-inbox.** Genuine inbox engagement
   in the first week tells Gmail "this sender is wanted." Consider a
   subject line like *"Welcome — reply if you'd like a sample
   underwrite"* on the first send.

3. **Don't send to spam-trap-y emails.** Resend's API validates email
   format, but if a subscriber typoed their address into your form,
   that bounce hurts your reputation.

4. **Send consistently.** Weekly = consistent = good. Skipping 3 weeks
   then sending one massive send = looks like reactivation spam.

5. **Monitor open rates.** Resend's dashboard shows them. Aim for
   30%+ open rate in the first 4 weeks. Under 20% sustained = the
   list isn't engaged enough and you're hurting future deliverability.

6. **Honor unsubscribes immediately.** Resend does this automatically.

---

## What this system DOES NOT do (yet)

- **No CMS for content authoring** — you write JSON files by hand.
  Adding an admin form that writes to Supabase = ~2-3 hours of work
  if you want it later.
- **No A/B subject line testing** — Resend supports it via their UI
  manually, but our cron just sends the one subject you wrote.
- **No segmentation** — every send goes to every subscriber. If you
  ever have segments (Pro vs free, Philly vs out-of-state), we'd need
  to expand the cron to send N broadcasts.
- **No drip campaign for new subscribers** — a new subscriber who
  joins on Wednesday waits until the next Monday to hear from you.
  Adding a welcome email = ~30 min of code, just say the word.

---

## Trust note

Heads up — the signup form was updated to say "Weekly investor digest"
to match the actual cadence. If you ever want to dial back to monthly,
update the form copy back AND update the cron schedule from `* * * 1`
(every Monday) to the equivalent monthly expression (e.g. `0 13 1 * *`
for the 1st of every month).

Mismatched signup cadence + actual send cadence = trust erosion,
unsubscribes, and over time, deliverability damage.
