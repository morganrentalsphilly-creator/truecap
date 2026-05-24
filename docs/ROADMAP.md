# TrueCap Roadmap

Strategic plan. Honest about diminishing returns. Prioritized by
expected impact on paid-traffic conversion and organic SEO.

Last updated: May 24, 2026 (after the 36-commit autonomous sprint).

---

## TL;DR — read this first

After 36 commits across one extended session, the site has comprehensive
infrastructure: 5 blog posts, /glossary, /methodology, 9 free /tools
calculators, Google OAuth, cookie consent, form auto-save, signup
prompts, ROI calculator on /pricing, full schema graph, per-tool OG
images, mobile UX pass, and a server-component hero.

**The next 5x unlock is not from me writing more code. It's from:**

1. Pushing what's already shipped and letting Google index it.
2. Doing the 4 manual setup tasks below — each multiplies the value of
   code already in production.
3. Measuring real paid-traffic data for 5-7 days before optimizing further.

If you skip those and instead ask for more code, you'll get diminishing
returns. The site is comprehensive enough that further optimization
without signal is guessing.

---

## Stage 1 — Post-deploy manual actions (only you can do these)

These are dependencies. Each one unlocks a real chunk of value that's
already built but not yet activated.

### 1.1. Push and deploy
```
git push origin main
```
36 commits queued. Vercel auto-deploys on push.

### 1.2. Wire conversion labels in Google Ads → Tools → Conversions
**File:** `lib/analytics/track-conversion.ts` line 33
**Time:** 10 minutes

Two conversion events are firing to `window.dataLayer` but NOT to
Google Ads yet — `pdf_exported` and `deal_saved`. Until you paste
the conversion labels into the `LABELS` map, the bidding algorithm
can't see them.

Steps in Google Ads:
1. Tools → Conversions → New conversion action → Website
2. Create `pdf_exported` (Category: Lead, Value: don't set)
3. Create `deal_saved` (Category: Lead, Value: don't set)
4. Copy the conversion label from each (the part after `/` in `send_to`)
5. Paste both into `LABELS` in `lib/analytics/track-conversion.ts`
6. Push the one-line change

**Why this matters:** Google's bidding algorithm optimizes against the
conversions it can see. Right now it only sees `signup` and
`paid_subscribed`, which are sparse for a new account. Adding two
high-intent micro-conversions (PDF export, first deal save) gives the
algorithm 5-10x more signal to learn from, materially improving CPC.

### 1.3. Submit URLs to Google Search Console
**Time:** 15 minutes (one-time, then automatic via sitemap)

Without manual submission, Google takes days to discover new pages.
With submission, new content is typically indexed within hours.

Submit at minimum:
- `https://usetruecap.com/`
- `https://usetruecap.com/blog`
- All 5 blog posts: `/blog/how-to-underwrite-...`, `/blog/cap-rate-vs-cash-on-cash-vs-dscr`, `/blog/dscr-loans-explained`, `/blog/what-is-a-good-cap-rate`, `/blog/cash-flow-vs-appreciation`
- `/glossary`
- `/methodology`
- `/changelog`
- The 2 newest /tools: `/tools/mortgage-payment-calculator`, `/tools/gross-rent-multiplier-calculator`

Use the URL Inspection tool → Request Indexing for each.

### 1.4. Submit Google OAuth for verification
**Time:** 20 minutes to submit, 4-7 days for Google to approve
**Unblocked:** /privacy + /terms are now live

Until verified, paid traffic clicking "Sign up with Google" sees an
"unverified app" warning. That warning kills conversion at scale —
maybe 30-50% of users abandon the flow when they see it.

Steps:
1. Google Cloud Console → OAuth consent screen → Publish App
2. Click "Prepare for verification"
3. Paste:
   - Privacy URL: `https://usetruecap.com/privacy`
   - Terms URL: `https://usetruecap.com/terms`
   - App logo: 120x120 PNG (you'll need to make one; we have the icon assets)
4. Submit. Google will email you when verified.

While waiting: the warning still shows to non-test-user accounts,
which is most paid traffic. So this is real priority.

### 1.5. Visual smoke test on your phone
**Time:** 10 minutes

The mobile UX pass touched a lot of surfaces. Visual confirmation on
real hardware beats any audit agent. Specifically check:

- Homepage hero — eyebrow chip, headline, CTAs all look intentional
- Calculator form — tap a financial input, confirm the **numeric
  keypad** pops up (not QWERTY)
- /pricing — ROI calculator inputs are easy to tap
- /pricing comparison table — scrolls horizontally without clipping
- /blog/dscr-loans-explained — DSCR comparison table scrolls
- Cookie banner appears on first incognito visit
- Welcome-back banner appears if you refresh after partially filling the form

---

## Stage 2 — Ship next solo (if you want more code)

In rough priority order. Each is genuinely high-leverage but real
ROI ranking depends on what the paid-traffic data shows after 5-7 days.

### 2.1. Real Supabase trust ticker — "X deals analyzed this week"
**Effort:** 1 hour
**Impact:** Medium-high. Social proof.

Server-side query `count(*)` from `saved_analyses` where
`created_at > now() - interval '7 days'`. Cache 60 seconds. Render in
the hero trust strip when the count exceeds a threshold (say 25)
so we never show "3 deals this week" which would be anti-social-proof.

### 2.2. Welcome email on signup
**Effort:** 30 min code + 30 min Supabase setup
**Impact:** Medium. Activation lift.

Supabase Auth has a built-in welcome email template. Customize it
with a 1-paragraph "here's what to do next" message. We already have
branded email templates from earlier work — just need to wire the
welcome email through Supabase's email-template settings.

### 2.3. Onboarding tour for first-time signups
**Effort:** 2-3 hours
**Impact:** Medium. Activation lift.

After Google OAuth signup, detect first-visit-post-signup and show
a 3-step "Try a sample → Run the analysis → Save it to your dashboard"
floating tour. Builds activation rate.

### 2.4. "Recently analyzed" surface on /dashboard for active users
**Effort:** 1-2 hours
**Impact:** Medium. Retention.

Show last-5 deals with a "resume editing" button on the dashboard.
Pairs with the form auto-save we shipped — closes the loop on
"return → easily continue".

### 2.5. Local SEO landing pages (/markets/philadelphia, /markets/cleveland, etc.)
**Effort:** 30 min per market for a basic shell, hours for substantive content
**Impact:** High organic potential, but only if content is actually
useful.

Each city gets a market-specific page with cap rate benchmarks,
property tax rate, common ARV/rent ranges, and a TrueCap calculator
embed. Big SEO play but real work to do well. Start with Philadelphia
(your market) as the prototype.

### 2.6. A /for-agents and /for-flippers positioning landing pages
**Effort:** 1 hour each
**Impact:** Medium for paid traffic targeting.

Segment-specific value props. Useful as paid-ad landing pages — you can
run different ad copy to different audiences and land them on a page
tailored to their use case.

### 2.7. A 6th-Nth blog post on specific high-volume topics
**Effort:** 1-2 hours each
**Impact:** Diminishing returns now (you already have 5 posts forming
a tight cluster). High-volume candidate topics:
- "How to find rental properties in 2026 (5 sources beyond MLS)"
- "1031 exchange explained"
- "Section 8 rentals — pros, cons, and the real numbers"
- "Short-term rental vs long-term — when each wins"

---

## Stage 3 — Needs external services

### 3.1. Email onboarding sequence (Resend or Loops)
**Effort:** Half-day code + onboarding to Resend/Loops
**Impact:** High for activation + retention.

3-5 email sequence over 7-14 days: welcome, "did you save your first
deal?", Pro feature spotlight, expert tip, social proof. Standard
SaaS-onboarding pattern, materially lifts free-to-paid conversion.

Requires picking + setting up an email provider. Resend is cheapest
and developer-friendly; Loops is more product-y with built-in template
editor.

### 3.2. Exit-intent email capture for cold paid traffic
**Effort:** 2 hours + email backend
**Impact:** High for paid traffic that's leaking today.

Catch visitors about to leave with a soft "get this deal as a PDF +
weekly underwriting tips" capture. Even 1-2% capture rate on cold
paid traffic builds a remarketing list that's worth dramatically
more than the cost.

Needs the same email infra as 3.1.

### 3.3. Add Stripe Tax for sales tax compliance
**Effort:** 30 min config + accountant review
**Impact:** Avoids audit risk as you scale.

Stripe has built-in sales tax (Stripe Tax) that handles US state-by-
state nexus + EU VAT. Currently your Stripe subscriptions don't
collect sales tax, which is OK at low volume but becomes a real
liability past ~$100k revenue.

---

## Stage 4 — Measure first, then ship based on data

Don't preemptively build these. Wait for 5-7 days of paid-traffic
data, then decide which is worth pursuing.

### 4.1. A/B test the homepage hero copy
"Stop losing deals to bad math" vs alternatives. Easy to set up via
GrowthBook or even URL-parameter splits.

### 4.2. A/B test the SignupPromptCard
Different headlines, different benefit bullets, with vs without Google
button. Find what converts best.

### 4.3. Test pricing levels
Run a price test where some visitors see $29/mo Pro, others see $39 or
$49. Find the sweet spot. Annual price test too.

### 4.4. Test the moment-of-value upsell timing
Currently appears immediately after a free analysis. Test: appear after
2nd analysis, or after 30 seconds, or after PDF view.

### 4.5. Test removing Try Sample on second visit
If a returning visitor already has a draft restored, hiding Try Sample
might push them to use the actual analyzer faster.

**For all of these:** instrument first, A/B test second. Don't ship a
change blind.

---

## Stage 5 — Parking lot (worth doing eventually)

- Cookie consent: regional auto-show (EU users only see banner; US users
  see it less prominently since CCPA is more permissive)
- Dark mode toggle
- "Save deals to PDF without an account" — gate on email capture
- Public roadmap page (like /roadmap that visitors can vote on)
- Comparison feature for free users (currently Pro-only)
- A real `/search` page that searches across blog + glossary + /tools
- Spanish translation of the homepage + calculator
- Print-friendly CSS for the PDF report
- WebAuthn / passkeys for auth
- Stripe customer portal embed (currently routes to Stripe-hosted page)
- "Refer a friend" → 1 month Pro free for both sides
- Integration with Zillow / Redfin API for property data autofill
  beyond just rent (square footage, year built, current rent if known)
- A `/methodology/changelog` to track formula updates separately from
  product changelog

---

## Stage 6 — Definitely don't do (yet)

These look tempting but the ROI doesn't pencil at TrueCap's stage:

- **Native mobile app.** PWA + the responsive web app cover 95% of
  the use case for free. Native is 6 months of work for marginal lift.
- **Multi-currency / multi-country.** US-only is more focused. Wait
  until you've saturated US paid traffic.
- **Team accounts / multi-seat pricing.** Agents-as-power-users is the
  natural progression but only if data shows agent traction.
- **AI-generated deal insights.** LLMs hallucinate financial advice.
  Until there's a clean way to confine them to the deal's numbers
  without inventing market context, the legal risk outweighs the value.

---

## What to measure first (after 5-7 days of paid-traffic data)

In Google Ads + Vercel Analytics + Search Console:

1. **Bounce rate on /** — should drop materially since the hero
   ships zero JS now. If it doesn't, LCP isn't the bottleneck.
2. **Signup conversion rate** — Google OAuth + SignupPromptCard
   should lift this materially. Track week-over-week.
3. **`scroll_depth_50` event rate** — proxy for engagement. Should
   be 30-50% of sessions on /. Lower means the hero copy isn't
   landing.
4. **`pdf_exported` + `deal_saved` event volume** — once you wire
   the labels in 1.2 above, watch these in Google Ads → Conversions.
5. **Organic impressions on the 4 new /tools and 5 blog posts** —
   in Search Console. Should ramp over 30-60 days as Google
   crawls + ranks the content.
6. **Pro signup attribution** — which source/medium drives Pro
   subscriptions. Cold paid? Organic blog? Direct? Each tells you
   where to invest more.

After those 6 numbers tell you something, come back and we'll pick
the next big move from data, not intuition.

---

## Honest TL;DR for the impatient

If you do nothing else from this roadmap, do these three things this week:

1. **Push** (`git push origin main`)
2. **Wire the 2 conversion labels** in Google Ads (10 min)
3. **Submit Google OAuth verification** (20 min)

That's the highest-leverage 30 minutes of work available to you right
now. Everything else is a distant second.
