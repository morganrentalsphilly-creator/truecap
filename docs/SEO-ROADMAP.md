# TrueCap — SEO Roadmap (90-day organic traffic plan)

This is your living roadmap for compounding organic traffic. Built around what's already shipped and what moves the needle next.

---

## ALREADY SHIPPED (current SEO foundation)

| Asset | Count | Status |
|---|---|---|
| Blog posts (long-form) | 13 | Indexed, ranking |
| Tool / calculator pages | 9 (`/tools/*`) | Indexed, ranking |
| Market pages (city) | 12 (`/markets/*`) | Indexed, ranking |
| Persona pages | 5 (`/for-*`) | Indexed |
| Competitor comparison pages | 3 (`/vs/*`) | Indexed |
| **Glossary per-term pages** | **30+ (`/glossary/[slug]`)** | **NEW — just shipped** |
| Schema.org markup | Org / Website / SoftwareApp / BlogPosting / FAQPage / DefinedTerm / BreadcrumbList / ItemList / Place | Active |
| Sitemap | 70+ URLs | Auto-updated |
| robots.ts | Configured | Disallows auth/api/dashboard |
| Methodology page | 1 | Indexed |
| OG images | Per-tool + per-deal dynamic | Active |

**Total ranking pages: ~80 URLs.** That's a real moat already.

---

## THE NEXT 90 DAYS — PRIORITIZED

### TIER 1 — Highest ROI (do these first)

#### 1. **Long-tail city + strategy combo pages** (~30 new pages, massive traffic)

Combine each market with each strategy → URL like `/markets/philadelphia/brrrr` or `/markets/cleveland/cash-flow`. Search volume is real but competition is low because most competitors don't bother.

Suggested combinations (~20-30 pages):
- `/markets/philadelphia/brrrr` — high search for "BRRRR philadelphia"
- `/markets/cleveland/cash-flow` — "cash flow rentals cleveland"
- `/markets/indianapolis/section-8` — "section 8 indianapolis investing"
- `/markets/memphis/turnkey` — "turnkey memphis"
- `/markets/atlanta/short-term-rental` — STR-allowed metros
- `/markets/kansas-city/first-time-investor`
- `/markets/detroit/under-100k` — price-band targeting
- ...

Build a single template (`app/markets/[city]/[strategy]/page.tsx`) → drives off a data file → 30 pages from one template.

**Estimated impact:** +500-1,500 monthly organic visitors over 3-6 months.

#### 2. **State-level investing pages** (15-20 new pages)

You have city pages but no state-level overview pages. Search volume for "investing in [state]" is significant and the page is easy to write (overview + which cities + tax structure + landlord laws + market summary).

Targets: TX, FL, OH, PA, GA, NC, TN, IN, MO, MI, AZ, NV, IL, SC, AL.

**Estimated impact:** +800-2,000 monthly organic visitors.

#### 3. **HowTo schema on existing tutorial blog posts** (~30 min of work)

Google can show HowTo cards (step-by-step) in SERPs for queries like "how to underwrite a rental property." You have a post that's perfectly structured for this — just add the schema.

Add HowTo schema to:
- `/blog/how-to-underwrite-a-rental-property-in-60-seconds` (perfect fit)
- `/blog/house-hacking-explained`
- `/blog/spot-bad-rental-in-60-seconds`

**Estimated impact:** +200-500 monthly visitors via richer SERP presentation.

#### 4. **More blog posts targeting high-intent queries** (1-2/week, evergreen)

Highest-impact topics not yet covered (based on search volume + intent):
- "How to find off-market rental properties" (high volume, high intent)
- "Rental property tax deductions explained" (massive volume)
- "How to read a rental property pro forma" (intent-rich)
- "How much down payment for a rental property" (huge volume)
- "Best states for landlord-friendly laws"
- "How to scale to 10 rental properties" (aspirational, high intent)
- "Rental property partnership agreements explained"
- "How to refinance a rental property"
- "Mortgage points on rental property: when worth it?"
- "Real estate professional status — when to qualify"

Goal: ship 1-2 posts per week for 12 weeks = 12-24 new blog posts. Each ranks for 5-15 queries on average.

**Estimated impact:** +1,500-4,000 monthly organic visitors over 6 months.

---

### TIER 2 — Medium ROI (do after Tier 1)

#### 5. **Aggregate review schema on key pages** (when you have testimonials)

Once you have 10+ real testimonials, add AggregateRating schema to:
- Homepage
- `/pricing`
- Each `/vs/*` comparison page

This shows star ratings in SERPs (e.g., ★★★★☆ 4.7/5 from 47 reviews). Huge CTR boost.

#### 6. **More /tools calculator pages**

Search volume for specific calculators that you don't have yet:
- `/tools/break-even-calculator`
- `/tools/rental-property-roi-calculator`
- `/tools/rental-property-tax-calculator`
- `/tools/property-management-cost-calculator`
- `/tools/closing-cost-calculator`

Each follows your existing /tools template. Each ranks for a specific calculator query.

#### 7. **"vs" pages for other competitors**

You have DealCheck, Stessa, Mashvisor. Add:
- `/vs/biggerpockets-calculator` (massive search volume)
- `/vs/rentometer` (rent estimation comparison)
- `/vs/excel` ("rental property excel template" volume is huge — you're better than Excel)
- `/vs/zillow-rent-estimate` (high intent for rental analysis)

#### 8. **Internal linking audit + improvement**

Every blog post should link to:
- At least 3 glossary terms
- At least 1 market page
- At least 1 tool page
- At least 2 related blog posts

Google rewards densely-linked content clusters. Right now your blog posts link mostly to tools but not enough to each other or to glossary. A 2-hour internal-linking audit could lift rankings 10-30% across the board.

---

### TIER 3 — Long-term moats (do in months 4-6)

#### 9. **Reddit / Twitter SEO**

Real estate Reddit (r/realestateinvesting, r/realestateagents) ranks highly for many queries. Building authority through helpful comments (not promotion) can drive significant referral traffic. Same for real estate Twitter.

Goal: 5-10 substantive comments per week on relevant threads. Link to your blog/glossary only when genuinely helpful (1 in 5 comments max).

#### 10. **Backlink outreach to industry sites**

Send a personal email to:
- BiggerPockets — "I have a free tool your audience would find useful"
- Local real estate associations
- Real estate education sites
- Mortgage broker / lender blogs

Pitch: free tool / data / guest post in exchange for a contextual link. Each domain-authority backlink is worth 100x a random social mention for SEO.

#### 11. **Featured snippet optimization**

Google's "position zero" featured snippets drive massive CTR. Optimize 5-10 of your top-ranking pages to win them:

- For "what is X" queries: ensure first paragraph IS the definition in 40-60 words
- For "how to" queries: add numbered step lists
- For comparison queries: add tables
- For data queries: add stats with sources

#### 12. **Core Web Vitals optimization**

Google ranks fast sites higher. Optimize:
- LCP (Largest Contentful Paint) — keep under 2.5s
- INP (Interaction to Next Paint) — keep under 200ms
- CLS (Cumulative Layout Shift) — keep under 0.1

You're already preconnect-warming the gtag CDN, lazy-loading images, and converting MarketingHero to server component for LCP. Next moves: audit Lighthouse scores monthly, optimize images further, defer non-critical scripts.

---

## METRICS — what to track + targets

### Track in Google Search Console (free)

| Metric | 30 days | 90 days | 180 days |
|---|---|---|---|
| Indexed pages | 70+ | 110+ | 200+ |
| Total impressions/mo | 5k | 25k | 100k |
| Total clicks/mo | 200 | 1,500 | 8,000 |
| Avg position | 35 | 25 | 15 |
| Top 10 ranking queries | 5 | 30 | 150 |

### Track in Vercel Analytics (you just enabled)

| Metric | What it tells you |
|---|---|
| Organic referrals from `google.com` | Direct SEO success |
| Top landing pages | Which pages convert organic traffic |
| Bounce rate on organic | If high, the page promised more than it delivered |

---

## ONGOING CADENCE (after the Tier 1 push)

| Frequency | What to do |
|---|---|
| **Weekly** | 1 new blog post (1,500+ words) + internal linking |
| **Bi-weekly** | 1 new glossary term OR 1 new /tools page OR 1 new /vs page |
| **Monthly** | Internal linking audit + Search Console review |
| **Quarterly** | Refresh top-traffic blog posts (update stats, add new sections, re-publish) |
| **Annually** | Full site audit + competitor SEO research |

---

## WHAT NOT TO DO (waste of SEO time)

- ❌ **Buying backlinks** — Google detects and penalizes
- ❌ **Keyword stuffing** — looks spammy, doesn't help rankings
- ❌ **Duplicate content** — same article republished on multiple URLs
- ❌ **Thin content** — pages under 500 words rarely rank
- ❌ **Generic blog posts everyone writes** — "5 tips for real estate investing" — too crowded
- ❌ **Targeting only high-volume keywords** — high volume = high competition. Long-tail wins.
- ❌ **Aggregator listings** (Yelp, Mapquest, etc.) — don't move the needle for SaaS

---

## THE 90-DAY EXECUTION ROADMAP

### Month 1 — content + glossary expansion

- Week 1: 30 glossary pages shipped ✓ (just done) + add HowTo schema to underwriting post
- Week 2: 4 new blog posts targeting Tier 1 queries
- Week 3: 4 more blog posts + 10 state-level pages
- Week 4: Internal linking audit + refresh

### Month 2 — long-tail expansion

- Week 5-6: City+strategy combo pages (build template + first 10)
- Week 7-8: Remaining 10-15 city+strategy combos
- Ongoing: 1-2 new blog posts per week

### Month 3 — authority + optimization

- Week 9-10: More /vs/ pages + featured snippet optimization
- Week 11-12: Backlink outreach + Reddit / Twitter engagement
- Ongoing: Track Search Console weekly, refresh top posts

---

## IF YOU ONLY DO 3 THINGS THIS MONTH

1. **Push the glossary expansion** (just shipped — 30 new ranking pages) — `git push origin main`
2. **Add HowTo schema** to the underwriting blog post (30 min)
3. **Write 4 new blog posts** from the Tier 1 list above (4 hours each = 1 day)

That's 30+10 (from blog post URL variants) = 40+ new indexable URLs in 30 days. Each one is a small recurring traffic stream that compounds.

---

## THE COMPOUND MATH

Single blog post: ~50-200 organic visitors/mo at 6 months
40 blog posts: 2,000-8,000 organic visitors/mo at 6 months
30 glossary pages: ~10-30 visitors each = 300-900/mo
30 city+strategy combo pages: ~30-80 each = 900-2,400/mo
12 state pages: ~60-200 each = 720-2,400/mo

**Total at 6 months from this roadmap:** 3,900-13,700 monthly organic visitors.

At a 1-2% conversion to signup (industry average for tool sites), that's 40-275 new signups per month from organic alone. At a 10% paid-conversion rate, 4-28 new paying customers per month from SEO.

The math compounds because SEO is the only marketing channel that gets BETTER over time (links accumulate, content ages into authority). Worth the investment.
