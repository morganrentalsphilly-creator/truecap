# Quality / Infrastructure — Free-Tier Next Steps

Three items that move real metrics (uptime, Google Ads Quality Score, accessibility / SEO trust) without ongoing cost. Each one needs a setup step from you (Morgan) — none can be done from code alone.

---

## 1. Sentry — Free production error monitoring

**Why:** Right now, when a user hits a runtime error in production, you find out by them telling you (or never). Sentry catches client + server errors, groups them, and emails you when something new pops up. Free tier covers 5k errors/mo which is more than enough at current traffic.

**Setup (~15 minutes):**

1. Sign up at https://sentry.io with your Google account.
2. Create a new project: **Next.js**, name it "truecap-prod".
3. Sentry will give you a DSN (looks like `https://abc123@o12345.ingest.sentry.io/67890`).
4. In the terminal at the repo root:
   ```
   cd ~/Downloads/final_source_code
   npx @sentry/wizard@latest -i nextjs
   ```
   The wizard auto-generates `sentry.client.config.ts`, `sentry.server.config.ts`, `sentry.edge.config.ts`, and patches `next.config.js`. Paste your DSN when prompted.
5. The wizard also asks "create a sample exception?" — say yes; it'll add a `/sentry-example-page` you can delete after testing.
6. In Vercel → Project Settings → Environment Variables, add:
   - `NEXT_PUBLIC_SENTRY_DSN` = (your DSN)
   - `SENTRY_AUTH_TOKEN` = (Sentry will guide you through creating this for source-map uploads)
7. Redeploy. The first error you trigger will land in your Sentry inbox within seconds.

**What you'll get:** every uncaught error in production gets logged with full stack trace, browser, user session replay (optional), and a grouping that prevents inbox spam from one bug firing 500 times. Email alerts on new-error-types only — no noise.

**Bonus:** Sentry's free tier includes 50 session replays/mo, which lets you literally watch what a user did before they crashed. Worth it for the hardest-to-reproduce bugs.

---

## 2. Lighthouse + Core Web Vitals audit

**Why:** Google Ads bidding factors landing-page experience into your Quality Score, which directly affects your CPC. A site that scores 90+ on Lighthouse pays meaningfully less per click than one scoring 65. Plus organic SEO ranking has Core Web Vitals as a confirmed input.

**Setup (~30 minutes for first run):**

1. Open https://pagespeed.web.dev/
2. Test each of these pages (paste the URL, click Analyze, wait):
   - `https://usetruecap.com/` (the homepage — most-trafficked)
   - `https://usetruecap.com/pricing`
   - `https://usetruecap.com/tools/cap-rate-calculator`
   - `https://usetruecap.com/blog/cash-flow-vs-appreciation`
   - `https://usetruecap.com/markets/philadelphia`
3. For each page, screenshot the Mobile score (the column that matters for Google Ads).
4. Send me the screenshots in this thread.

**What I'll do with them:** identify the bottom 3-5 fixable issues (typical wins: image optimization, unused JS, render-blocking CSS, missing fetchpriority on the hero image, font preload hints). Each fix is usually one or two file changes. We've already done the obvious wins (preconnect hints, removed artificial delay, server-component hero) so the remaining items will be more surgical.

**Free tooling beyond PageSpeed:** Chrome DevTools → Lighthouse tab runs the same audit locally, plus Vercel Analytics (Free tier) gives you real-user Core Web Vitals from actual visitors — useful for spotting regressions over time. Both are already-on for you; nothing to install.

---

## 3. WCAG AA accessibility pass

**Why:** Accessibility is legally required (ADA Title III), SEO-positive (Google rewards accessible markup), and a moral baseline. The good news: TrueCap has been built with a11y mostly in mind (skip-to-content link, ARIA labels, semantic HTML, focus states). The audit is to catch what we missed.

**Setup (~20 minutes for first audit):**

1. Install the **axe DevTools** Chrome extension (free): https://chrome.google.com/webstore/detail/axe-devtools-web-accessib/lhdoppojpmngadmnindnejefpokejbdd
2. Open https://usetruecap.com/ in Chrome.
3. Open DevTools → axe DevTools tab → Click "Scan ALL of my page."
4. axe will list any violations grouped by severity (Critical / Serious / Moderate / Minor).
5. Repeat on `/pricing`, `/blog`, `/tools/cap-rate-calculator`, and `/dashboard/saved-analyses` (sign in first).
6. Screenshot the violation list for each page and send me.

**What I'll do with them:** axe almost always finds: missing alt text on a few images, color contrast issues on muted text, form labels not programmatically associated, missing landmark roles. All quick fixes (one line each typically). The pass usually takes a single batch of edits.

**Bonus tooling (also free):**
- **WAVE** browser extension — similar to axe but with a different presentation, useful for double-checking
- Lighthouse already runs an accessibility audit as part of its score — that's your zero-effort baseline

---

## Order of operations I'd recommend

1. **Sentry first** — it's the highest-leverage one (catches issues we don't know exist yet) and the easiest to set up. Do this today.
2. **Lighthouse second** — measure where you are before you optimize. Send screenshots; I'll iterate.
3. **WCAG third** — once we're stable on the first two, an accessibility pass is a one-time deep clean that compounds.

None of these are urgent on their own. All three together meaningfully reduce risk (production bugs) and improve unit economics (lower CPC, better SEO).
