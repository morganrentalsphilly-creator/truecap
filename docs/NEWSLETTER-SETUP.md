# Newsletter Setup — Resend Integration

The code-side wiring is already done. To go live, you need a Resend account + two env vars in Vercel. Total time: ~15-20 minutes including DNS verification.

---

## What's already in the code

- `app/actions/newsletter.ts` — server action that validates the email + POSTs to Resend's Audiences API. Handles duplicates, timeouts, validation errors gracefully.
- `components/marketing/newsletter-signup.tsx` — the signup form. Two variants:
  - **Compact** — slotted into the site footer (every page)
  - **Expanded** — slotted at the bottom of every blog post (12 posts)
- Both wrap the same server action. Both have loading + success + error states.
- The form will currently render but show a "Newsletter signup is temporarily unavailable" error on submit, because the env vars aren't set yet. That's the expected pre-setup state.

---

## Step 1 — Create the Resend account (3 min)

1. Open https://resend.com and click **Sign up**
2. Sign in with your Google account (`morganrentalsphilly@gmail.com`)
3. Pick **Hobby plan** (free — 3k emails/month, 100/day). More than enough to start.

---

## Step 2 — Add + verify your domain (5-10 min)

You'll send from `hello@usetruecap.com` (or similar) which requires Resend to verify ownership of `usetruecap.com`.

1. In Resend dashboard → **Domains** → **Add Domain**
2. Enter `usetruecap.com`
3. Resend shows you 3-5 DNS records to add (SPF, DKIM, sometimes DMARC). They look like:
   - `TXT` record at root: `v=spf1 include:amazonses.com ~all`
   - `TXT` records at `resend._domainkey.usetruecap.com` and a couple of other subdomains
4. Add these records in your DNS provider (likely Cloudflare or whoever hosts your domain — same place you set up Vercel's nameservers originally)
5. Back in Resend, click **Verify Domain**. Verification can take 5-30 minutes depending on DNS propagation
6. Wait until all records show green checkmarks

**Why this matters:** without domain verification, you can only send from Resend's onboarding domain (`onboarding@resend.dev`), which looks like spam and lands in junk folders. With verified `usetruecap.com`, your newsletter sends look professional and have good deliverability.

---

## Step 3 — Create the audience (1 min)

1. Resend dashboard → **Audiences** → **Create Audience**
2. Name: `TrueCap Newsletter`
3. Click **Create**
4. On the next screen, copy the **Audience ID** — it looks like a UUID (`78261eea-8f8b-4381-83cb-ba4e0fbf24a6`). You'll paste this into Vercel in Step 5.

---

## Step 4 — Get your API key (1 min)

1. Resend dashboard → **API Keys** → **Create API Key**
2. Name it `truecap-prod`
3. Permission: **Full access**
4. Domain: select `usetruecap.com` (once verified)
5. Copy the key — it looks like `re_abc123def456...`. You can only see it once; if you lose it, you have to create a new one.

---

## Step 5 — Add env vars to Vercel (2 min)

1. Open https://vercel.com/dashboard → click your TrueCap project
2. **Settings → Environment Variables**
3. Add these two:

| Name | Value | Environments |
|---|---|---|
| `RESEND_API_KEY` | (paste the `re_...` key from Step 4) | Production, Preview |
| `RESEND_AUDIENCE_ID` | (paste the audience UUID from Step 3) | Production, Preview |

4. Click **Save** after each

You don't need to add them to "Development" unless you want to test locally — for production-only use, Production + Preview is enough.

---

## Step 6 — Redeploy to pick up the env vars (1 min)

Either:
- Push any new commit (the simplest path), OR
- Vercel → Deployments → click the latest → **... menu → Redeploy**

After deploy completes (~2 min), the newsletter signup form will be fully live.

---

## Step 7 — Test it (1 min)

1. Open https://usetruecap.com
2. Scroll to the footer
3. Enter your own email in the newsletter signup
4. Click **Subscribe**
5. You should see a green success state: "You're in. Check your inbox for a welcome."
6. Open Resend dashboard → **Audiences → TrueCap Newsletter → Contacts**. You should see your email listed.

If you don't see it after 30 seconds:
- Check Vercel deploy logs for errors
- Double-check both env vars are set in Vercel
- Check that the domain shows verified in Resend

---

## Sending the actual monthly newsletter

Once the audience has subscribers, you have two paths to send:

### Path A — Resend dashboard (manual, no code)

1. Resend dashboard → **Broadcasts → Create Broadcast**
2. Select the `TrueCap Newsletter` audience
3. Write the email (subject line, plain text or HTML)
4. Send a test to yourself first
5. Click **Send to audience**

This is the simplest monthly cadence. Write the email once, send to all subscribers, done. Resend's editor is decent (Markdown-style with limited rich formatting).

### Path B — React Email templates (later, when you want consistent branding)

Resend supports React Email templates — JSX components that render to email HTML. When you want a consistent monthly template (header + 3-4 sections + footer), I can build this for you. ~1 hour of code. For now, Path A is fine.

---

## What goes in the monthly newsletter (suggested format)

Copy the structure from `docs/MARKETING-PLAYBOOK.md` Loop 3:

```
Subject: This month in rental investing — [Month] 2026

1. Market snapshot — where rates / rents moved (1 paragraph)
2. 3 deal-spotter notes from covered markets (3 short bullets)
3. The new blog post or video this month (1 paragraph + link)
4. One reader question answered (anonymized, 1-2 paragraphs)
5. P.S. — what we shipped in TrueCap this month (1 bullet list)
```

Aim for 400-700 words total. Subscribers prefer "short + valuable" over "long + comprehensive."

---

## Cost expectations

- Resend Hobby plan: free, 3k emails/month
- With 500 subscribers + monthly send: 500 emails/month — well under limit
- With 2k subscribers + monthly send + occasional broadcast: 2k-4k emails/month — may need to upgrade to **Pro** plan ($20/mo for 50k emails/month)
- Domain verification + API access: free at all tiers

You can run this on free Hobby until you have ~2.5k subscribers, which is great economic positioning.

---

## Once you've done all 7 steps

Tell me you're done and I'll smoke-test the integration alongside you. After that, you have a working email infrastructure for the rest of the business's life. No additional code changes needed unless you want fancier templates or automation.
