# TrueCap — Google Ads launch playbook

Everything you need to launch profitable Google Ads on day 1. Read this
top-to-bottom once, then work through the **Setup checklist** at the
bottom step by step.

```
google-ads/
├── README.md                  ← this file
├── ad-copy.md                 ← paste-ready headlines + descriptions
└── creatives/                 ← display ad PNGs (1200×628 + 1200×1200)
```

## What "profitable" means here

For ads to keep running, the math has to be:

> **(Conversion rate × LTV) > Cost-per-click**

Concrete: if your Pro Monthly is $19/mo with average 6-month retention
(LTV ≈ $114), and your visit-to-paid conversion rate ends up at 3%, you
can pay up to **$3.42 per click** and break even at month 6.

The four levers we control:

1. **Conversion rate** ← the landing page work we just shipped
2. **LTV** ← push annual plan in the upsell flow (better cash + retention)
3. **CPC** ← keyword choice + Quality Score + bid strategy
4. **Click-through rate** ← ad copy + creative + match to search intent

We've shipped (1). Setting up (3) and (4) properly is what this guide is
about.

---

## STEP 1 · Google Ads account setup (10 min)

If you already have an account, skip ahead.

1. Sign up at https://ads.google.com with the same Google identity you
   want to manage from
2. Skip the "Smart Mode" / express setup — choose **Expert mode**
   (small link at the bottom). Smart mode hides the levers we need
3. Set your **time zone** (irreversible later — use your business zone)
   and **currency** (USD)
4. Add your **billing info** (no charges yet — campaigns are paused
   until you launch)

## STEP 2 · Conversion tracking (15 min — DO THIS BEFORE ANY CAMPAIGN)

Without conversion tracking, Google can't optimize and you'll burn
money. This is non-negotiable.

### 2a — Verify the global site tag is firing

The TrueCap site already loads `gtag.js` with `AW-18159235338` in
production (see `app/layout.tsx`). To confirm it's working:

1. Install **Tag Assistant Companion** (Chrome extension)
2. Visit `https://usetruecap.com` and open Tag Assistant
3. You should see `AW-18159235338` firing on page load

If you don't see it, deploy is broken — fix before continuing.

### 2b — Create the three conversion actions

In Google Ads → **Goals → Conversions → New conversion action → Website**:

| Action name        | Category   | Value          | Count       | Click-through window | Primary? |
|--------------------|------------|----------------|-------------|----------------------|----------|
| Paid subscription  | Purchase   | Use entered    | Every       | 30 days              | ★ YES    |
| Sign-up            | Sign-up    | Don't use      | One         | 30 days              | ★ YES    |
| Calc completed     | Lead       | Don't use      | One         | 7 days               | Secondary |
| PDF exported       | Lead       | Don't use      | One         | 7 days               | Secondary |
| Deal saved         | Lead       | Don't use      | One         | 7 days               | Secondary |

For each action, when Google asks "How do you want to track conversions?"
choose **Use Google tag** (not "scan website"). Google will give you a
**conversion label** — a 12-ish-character string like
`AbC_DeFgHi-jKlM_NoP`. **Copy each one.**

### 2c — Paste the labels into the code

Open `lib/analytics/track-conversion.ts`:

```ts
const LABELS: Record<ConversionKey, string | null> = {
  calc_completed:  null,    // ← paste label here
  signup:          null,    // ← paste label here
  paid_subscribed: null,    // ← paste label here
  pdf_exported:    null,    // ← paste label here
  deal_saved:      null,    // ← paste label here
};
```

Replace each `null` with the matching label (in quotes). Commit and
deploy. Until you do this, events go nowhere — campaigns will run blind.

### 2d — Test fire each conversion

Use Tag Assistant in Chrome:

1. Open Tag Assistant → "Enable" → visit `https://usetruecap.com`
2. Run a calculation → confirm `calc_completed` fires
3. Sign up with a throwaway email → confirm `signup` fires
4. (Optional) Complete a Stripe checkout in test mode → confirm
   `paid_subscribed` fires with the dollar value attached

In Google Ads, conversions take **up to 3 hours** to show up in the
dashboard for the first time. Don't panic if they don't appear instantly.

## STEP 3 · Campaign structure (30 min)

The single biggest mistake new advertisers make: one giant catch-all
campaign. The fix: **one campaign per intent type**, each with
ad-groups grouped by tight keyword themes.

### Recommended structure

```
TrueCap — Search                              ← campaign
├── Generic rental property analysis          ← ad group
├── BRRRR calculator                          ← ad group
├── Cap rate calculator                       ← ad group
├── Cash-on-cash calculator                   ← ad group
├── 1% rule calculator                        ← ad group
└── Rehab cost estimator                      ← ad group

TrueCap — Performance Max (turn on later)     ← campaign
└── (uses creatives + headlines as 'assets')
```

Start with **Search only**. Add Performance Max in week 3 once Search
has 30+ conversions for the algorithm to learn from.

### Keywords per ad group

Use **Phrase match** for everything to start (broad match burns money on
new accounts; exact match is too narrow until you have data). Add the
generic negatives at the bottom right away.

**Generic rental property analysis**
```
"rental property analyzer"
"rental property analysis"
"rental property analysis tool"
"investment property analyzer"
"real estate underwriting tool"
"real estate deal analyzer"
"investment property deal analyzer"
```

**BRRRR calculator** → landing URL `/tools/brrrr-calculator`
```
"brrrr calculator"
"brrrr analysis calculator"
"brrrr method calculator"
"buy rehab rent refinance calculator"
"brrrr deal calculator"
```

**Cap rate calculator** → landing URL `/tools/cap-rate-calculator`
```
"cap rate calculator"
"capitalization rate calculator"
"rental cap rate calculator"
"real estate cap rate calculator"
"property cap rate calculator"
```

**Cash-on-cash calculator** → landing URL `/tools/cash-on-cash-calculator`
```
"cash on cash calculator"
"cash on cash return calculator"
"coc return calculator"
"rental property cash on cash"
```

**1% rule calculator** → landing URL `/tools/1-percent-rule-calculator`
```
"1 percent rule calculator"
"one percent rule calculator"
"1% rule real estate calculator"
```

**Rehab cost estimator** → landing URL `/tools/rehab-cost-estimator`
```
"rehab cost calculator"
"flip rehab estimator"
"rental rehab budget calculator"
"renovation cost calculator"
```

### Negative keywords (campaign-wide)

Paste this list into the **Negative keywords** section at the campaign
level on day 1 — it will save you serious money:

```
free
freeware
download
template
excel
spreadsheet template
software download
job
jobs
career
salary
course
class
training
youtube
tutorial how to manual
script
github
open source
example
sample
ai
chatgpt
mortgage refinance
mortgage rates
zillow
redfin
realtor
school
university
```

## STEP 4 · Bidding + budget (10 min)

### Bid strategy

- **Week 1-2**: `Maximize Conversions` with a **Max CPC cap of $3.50**.
  This caps your downside while Google learns. Without the cap, Google
  will bid $15+ on real-estate keywords and burn through your budget
  before you have data.
- **Week 3-4** (after 15+ conversions): switch to `Maximize Conversions`
  **without** a CPC cap — Google now has data
- **Week 5+** (after 30+ paid conversions): switch to **Target CPA**
  with target = your acceptable cost-per-paid-subscription (likely
  $30-80 depending on which plan converts)
- **Month 3+** (50+ paid conversions): test **Target ROAS** if revenue
  per click stabilizes

### Daily budget

Start at **$20/day** ($600/mo total). That's enough to get ~150
clicks per week if your CPC averages ~$1, and 150 clicks × 2-3%
conversion = 3-5 conversions/week — the floor for the algorithm to
optimize. Less than that and you're starving the data.

## STEP 5 · Ads (use ad-copy.md)

For each ad group, create **one Responsive Search Ad** with:

- **15 headlines** (30 char max each) — Google rotates and picks the
  best ones. The more variants, the better Google can optimize.
- **4 descriptions** (90 char max each)
- **Final URL** = the matching `/tools/*` page (or `/` for generic)
- **Display path** = leave as `usetruecap.com/[tools]`

Open `ad-copy.md` in this folder — every ad group has a ready-to-paste
set.

### Ad assets to add (campaign-level)

These are **free** and 2-3x your CTR. Add all of them on day 1:

- **Sitelinks** (4 minimum, 6 max): Free Calculator · Pricing · Cap Rate Tool · BRRRR Tool · Cash-on-Cash Tool · How It Works
- **Callouts** (6 min): `Free to start` · `No card required` · `60-second setup` · `Auto-fill from address` · `14-day money-back` · `Lender-ready PDFs`
- **Structured snippets** (Featured: types of investment): SFR · Multi-family · BRRRR · Fix-and-flip · House-hacking
- **Call extension**: skip unless you actually answer calls
- **Lead form**: skip for now — direct-to-website converts better at our price point

## STEP 6 · Audiences + targeting

### Locations
- Start with **United States only** (HUD data is US-only)
- Exclude any country you don't want to spend on
- Use the **Presence: People IN your targeted locations** option
  (not "interest in") — saves money on lookers

### Devices
- Don't exclude any device, but in the **Devices** column of the
  campaign view, **reduce mobile bid by -10% for week 1**. Mobile
  converts but the form is denser. You can lift it back to 0% in
  week 3 once you have data.

### Audiences (signals)
Add these as **observation** (not targeting) so you can see how
they perform without restricting reach:

- In-market audiences → Real Estate → **Residential Properties for Sale**
- In-market audiences → Real Estate → **Mortgages**
- Affinity → **Real Estate Enthusiasts**
- Custom segment based on these URLs: `biggerpockets.com`, `dealcheck.io`, `mashvisor.com`, `stessa.com`

After 2 weeks check the **Audiences** report — if one audience is
converting 2× the baseline, add a +25% bid adjustment.

## STEP 7 · Launch checklist (final 5 min)

Before clicking "Launch":

- [ ] Conversion actions created in Google Ads (Step 2b)
- [ ] Conversion labels pasted into `track-conversion.ts` AND deployed
- [ ] Verified tracking fires via Tag Assistant (Step 2d)
- [ ] Negative keywords added at campaign level (Step 3)
- [ ] Daily budget set to $20 (Step 4)
- [ ] Max CPC cap set to $3.50 (Step 4)
- [ ] Min 5 headlines + 2 descriptions per ad group (Step 5)
- [ ] 6 callouts + 4 sitelinks added (Step 5)
- [ ] Targeting: USA only, presence-based (Step 6)
- [ ] Email yourself the campaign URL so you can check it Monday morning

Now click Enable. Don't touch anything for 72 hours.

## STEP 8 · Week-1 optimization rules

Do these once per day for the first 7 days:

1. **Check the Search Terms report** (Keywords → Search terms). Anything
   that's burning >$5 with zero conversions → add as a **negative
   keyword**. Anything converting → add as an **exact match** keyword.
2. **Quality Score** (Keywords → Quality Score column — enable in
   columns). If any keyword is <5, your ad copy or landing page doesn't
   match the intent. Pause and rework.
3. **Don't pause low-CTR keywords yet.** Need at least 100 impressions
   before any decision.

After 14 days, the algorithm has enough data. At that point:

- Pause anything with >$20 spent and 0 conversions
- Increase bid adjustment on anything converting at >3× baseline
- Add 5 more negatives based on the search terms report
- Consider switching bid strategy (see Step 4)

## STEP 9 · The break-even spreadsheet (track this weekly)

Open Google Sheets, name it "TrueCap Ads — week N". Track:

| Metric                          | Source                       |
|---------------------------------|------------------------------|
| Spend                           | Google Ads                   |
| Clicks                          | Google Ads                   |
| Sign-ups                        | Conversions / Stripe         |
| Paid subscriptions              | Stripe                       |
| Revenue (this month)            | Stripe                       |
| Cost per sign-up                | Spend ÷ Sign-ups             |
| Cost per paid                   | Spend ÷ Paid subscriptions   |
| LTV estimate (Pro monthly × 6)  | $19 × 6 = $114               |
| ROAS                            | Revenue ÷ Spend              |
| Payback months                  | Cost per paid ÷ Monthly ARPU |

If **Cost per paid > LTV** after week 4, the unit economics don't
work — either the conversion rate has to improve (LP work) or the LTV
has to (push annual harder, retention work) or the CPC has to come
down (better Quality Score, narrower keywords).

If **Cost per paid is < LTV by month 2**, scale: double the daily
budget every 2 weeks while CPA holds.

## Common mistakes to avoid

- ❌ **Broad match keywords on day 1** — burns budget on irrelevant queries
- ❌ **Sending all traffic to `/`** — Quality Score punishes generic LPs.
  Send tool-specific ads to the matching `/tools/*` page
- ❌ **Skipping conversion tracking** — Google can't optimize without it
- ❌ **Pausing too early** — give every keyword 100 impressions before judging
- ❌ **Daily budget too low** — under $15/day starves the algorithm
- ❌ **Using only 1-2 ad headlines** — fewer variants = Google can't optimize
- ❌ **Not adding negatives** — week 1 search term reports always have surprises

## When to come back to me

- After 7 days of data: I'll help interpret the search terms report and decide what to pause/keep
- After 30 days: I'll help diagnose whether the unit economics work and what to invest in next (LP changes, new ad copy, expanded keywords)
- Anytime CPC spikes >2× baseline: usually a Quality Score issue I can help diagnose
