# TrueCap Content Strategy — Q3/Q4 2026

**Audience-first SEO + AI-visibility plan for usetruecap.com.**

This document is the plan, not the prompt. It assumes you already have:
22 blog posts · 14 tool pages · 10 `/vs/*` comparisons · 12 `/markets/*` city pages · 15 `/states/*` state pages · 34 glossary terms · 5 `/for-*` persona pages · the verdict engine methodology + the AI-visibility infrastructure (FAQPage schema, llms.txt, dynamic OG cards).

The job from here is to fill the gaps that will most reliably convert search demand into Pro signups.

---

## 1. Target Audience

### Primary
Solo and small-portfolio buy-and-hold real estate investors (1–10 doors). They are tech-comfortable, not Excel power-users. They want:
- A defensible cash-flow number to show a lender or a partner
- A second opinion before they sign an LOI
- To stop maintaining a brittle spreadsheet that breaks the moment a partner edits it
- Tax math they can hand to their CPA without doing the modeling themselves

Common context: they currently pay $30/mo for BiggerPockets Pro mostly for the calculator, or have a DealCheck subscription they're lukewarm on, or have a homegrown Excel sheet they don't fully trust.

### Secondary
- House-hackers underwriting owner-occupant duplexes / triplexes / fourplexes
- Real-estate agents who want to send a polished deal analysis to a client at the showing
- BRRRR investors modeling cash-out refi math
- Financial advisors / fee-only planners evaluating a client's real estate deal

### Buying-stage signals (what we want to capture)
| Stage | Search behavior | Our funnel target |
|---|---|---|
| Problem-aware | "is this rental a good deal" · "what is cap rate" · "what is a good DSCR" | Glossary + blog metric posts → free analyzer |
| Solution-aware | "rental property calculator" · "BRRRR calculator" · "DSCR calculator" | Tool pages → free analyzer |
| Vendor comparison | "DealCheck alternative" · "BiggerPockets vs X" · "Stessa pricing" | /vs pages → free analyzer → Pro upgrade |
| Decision | "TrueCap pricing" · "TrueCap login" | /pricing |

---

## 2. Topical Authority Map (current state)

```
TrueCap Topical Authority
│
├── Pillar 1: Rental Underwriting ★★★★★ (strong)
│   ├── Metrics: cap rate, CoC, DSCR, NOI, GRM, 1%, ROI, IRR ← 8 posts + 8 tools
│   ├── Process: 60-sec underwrite, pro forma, spot bad deal ← 4 posts
│   └── Decision: verdict engine, cash flow vs appreciation ← 2 posts
│
├── Pillar 2: Strategies + Property Types ★★★☆☆ (gappy)
│   ├── BRRRR ✓ (post + tool)
│   ├── Buy-and-hold ⚠ (landing only, no anchor post)
│   ├── Fix-and-flip ⚠ (tool + persona page, no blog)
│   ├── House hacking ✓
│   ├── SFH vs multifamily ✓
│   ├── Short-term / Airbnb ✗ MISSING — biggest gap
│   ├── Mid-term / Section 8 ✗ MISSING
│   ├── Turnkey investing ✗ MISSING (but Roofstock vs page covers part)
│   └── Out-of-state passive ✗ MISSING
│
├── Pillar 3: Financing ★★☆☆☆ (very gappy)
│   ├── DSCR loans ✓
│   ├── Refinance ✓
│   ├── Hard money / private money ✗ MISSING
│   ├── Conventional vs DSCR vs portfolio ✗ MISSING
│   ├── HELOC / cash-out refi for next deal ✗ MISSING
│   ├── Seller financing / subject-to ✗ MISSING
│   ├── FHA for house-hacks ✗ MISSING
│   └── Mortgage payment math (tool only) ⚠
│
├── Pillar 4: Tax + Legal ★★☆☆☆ (gappy)
│   ├── Schedule E deductions ✓
│   ├── 1031 exchange basics ✓
│   ├── Depreciation deep dive ✗ MISSING
│   ├── Bonus depreciation 2026 ✗ MISSING — timely
│   ├── Cost segregation for small landlords ✗ MISSING
│   ├── REPS (Real Estate Professional Status) ✗ MISSING
│   ├── STR tax loophole ✗ MISSING
│   ├── LLC vs Schedule E ✗ MISSING
│   └── Self-directed IRA real estate ✗ MISSING
│
├── Pillar 5: Operations (post-purchase) ★★★☆☆
│   ├── PM yes/no ✓
│   ├── Off-market sourcing ✓
│   ├── Rehab cost estimation ✓
│   ├── Vacancy ✓
│   ├── Tenant screening ✗ MISSING
│   ├── Lease agreements ✗ MISSING
│   ├── Eviction process by state ✗ MISSING
│   ├── Security deposits by state ✗ MISSING
│   └── Scaling from 1 → 5 units ✗ MISSING
│
├── Pillar 6: Geography ★★★★☆
│   ├── 12 city pages ✓
│   ├── 15 state pages ✓
│   ├── City + strategy combo pages ✓
│   ├── Best markets for X strategy ✗ MISSING (high-volume "best cash flow city" queries)
│   └── City vs city comparisons ✗ MISSING
│
└── Pillar 7: Competitive (commercial intent) ★★★★★ (strong)
    ├── 10 /vs pages ✓
    ├── DealCheck vs Stessa vs TrueCap ✓ (3-way)
    └── More 3-ways possible
```

**Headline read:** Underwriting (Pillar 1) and Competitive (Pillar 7) are solid. Strategies (2), Financing (3), and Tax (4) are the biggest gaps and the most leverageable for Pro conversions because they map directly to features only Pro users get.

---

## 3. Content Gap Analysis (where to publish next)

Sorted by business-value × search demand × competitive winnability.

### Highest leverage — short-term rentals
STR queries have massive volume (Airbnb is a household name) and TrueCap has zero coverage today. Every adjacent tool (rent calculator, cash flow analyzer, projection) already supports STR analysis — we just don't talk about it.

### Highest leverage — financing diversity
Hard money, private money, seller financing, subject-to, FHA for house-hacks. Each query is high-intent (someone evaluating a deal) and we don't rank because we don't have content. Each post can naturally CTA into the calculator with the right financing assumptions.

### Highest leverage — tax depth
The basic tax post exists; depreciation + REPS + bonus depreciation + cost seg are missing and they're exactly the conversations that justify a Pro subscription (the tax-strategy modeling).

### Quick-win commercial
- "DealCheck vs BiggerPockets vs TrueCap" — already capture some of this with /vs pages, but a single 3-way comparison post will rank for the "X vs Y" stub that we don't.
- City-vs-city posts ("Cleveland vs Memphis for cash flow") — Pittsburgh, Indy, Birmingham, Tulsa style.

### Backfill
"How to calculate cap rate / CoC / DSCR" step-by-step posts pointing at our tools. Searchable, low-competition, and converts directly into tool usage.

---

## 4. Priority Content Queue (next 16 articles)

| # | Title | Keyword | Intent | Score | Words |
|---|---|---|---|---|---|
| 1 | How to Analyze a Short-Term Rental: The 2026 Underwriting Playbook | "how to analyze airbnb" | Info | Quick win | 2,500 |
| 2 | Hard Money vs Private Money vs DSCR: Investor Loan Comparison | "hard money vs dscr loan" | Comm | Quick win | 1,800 |
| 3 | How to Underwrite a House Hack (the owner-occupant math nobody explains) | "house hack underwriting" | Info | Quick win | 1,800 |
| 4 | Seller Financing for Rentals: A Buy-and-Hold Investor's Guide | "seller financing rentals" | Info | Quick win | 1,800 |
| 5 | Bonus Depreciation for Rentals in 2026: What's Left + Cost-Seg Math | "bonus depreciation rental 2026" | Info | Big bet | 2,200 |
| 6 | Cost Segregation for Small Landlords: When It's Worth $10k+ | "cost segregation small rental" | Info | Quick win | 2,000 |
| 7 | Real Estate Professional Status (REPS): How to Qualify and What It Saves | "real estate professional status" | Info | Quick win | 1,800 |
| 8 | LLC vs Schedule E: How Small Landlords Should Actually Hold Property | "llc rental property" | Info | Big bet | 2,200 |
| 9 | Best Cash-Flow Markets for Rentals in 2026 (10 Cities, Ranked) | "best cash flow markets 2026" | Comm | Big bet | 2,200 |
| 10 | Cleveland vs Memphis vs Detroit: Best Midwest Cash-Flow City | "best midwest rental city" | Comm | Quick win | 2,000 |
| 11 | DealCheck vs BiggerPockets vs TrueCap: 3-Way Calculator Comparison | "dealcheck vs biggerpockets" | Comm | Quick win | 2,000 |
| 12 | Tenant Screening Guide for Small Landlords (2026) | "tenant screening checklist landlord" | Info | Quick win | 1,800 |
| 13 | How to Calculate Cap Rate: Step-by-Step (with a Free Calculator) | "how to calculate cap rate" | Info | Big bet | 1,500 |
| 14 | How to Calculate Cash-on-Cash Return (with Examples) | "how to calculate cash on cash" | Info | Big bet | 1,500 |
| 15 | How to Calculate DSCR (Step-by-Step for Investment Loans) | "how to calculate dscr" | Info | Quick win | 1,500 |
| 16 | Subject-To Real Estate for Rental Investors (When It Actually Works) | "subject to real estate" | Info | Quick win | 1,800 |

**Why the queue order:** STR + house hack open Q3 because they cover audience segments we currently neglect entirely. Financing posts cluster after to capture the same audience as they decide how to fund. Tax posts run mid-quarter because that's the Pro-tier conversion lever. Commercial/geo posts close out Q3 because they're the slowest to write but highest-CTR once live.

---

## 5. 12-Week Publishing Calendar

### Month 1 — Strategy Gap-Fills
Goal: cover STR and house-hack audience segments + financing diversity. These open up new search-demand pools we currently don't serve.

- **W1** — How to Analyze a Short-Term Rental (#1)
- **W2** — Hard Money vs Private Money vs DSCR (#2)
- **W3** — How to Underwrite a House Hack (#3)
- **W4** — Seller Financing for Rentals (#4)

### Month 2 — Tax Cluster
Goal: own the rental-tax queries that are right next to Pro feature value. Pro subscribers see these posts and the tax-strategy panel side-by-side.

- **W5** — Bonus Depreciation for Rentals 2026 (#5)
- **W6** — Cost Segregation for Small Landlords (#6)
- **W7** — Real Estate Professional Status (#7)
- **W8** — LLC vs Schedule E (#8)

### Month 3 — Geography + Commercial
Goal: capture comparison-shopper and "where should I invest" traffic. Higher-effort posts but they convert directly into free-tier signups.

- **W9** — Best Cash-Flow Markets for Rentals 2026 (#9)
- **W10** — Cleveland vs Memphis vs Detroit (#10)
- **W11** — DealCheck vs BiggerPockets vs TrueCap (#11)
- **W12** — Tenant Screening Guide for Small Landlords (#12)

### Months 4+ — Backfill + amplification
Articles 13–16 (the "how to calculate X" series) batch in Month 4. After that: city-vs-city series, state-specific landlord-law posts, and 3 long-form anchor pieces (Pillar 2 / 3 / 4 cornerstones).

---

## 6. Per-Article Internal Linking Plan

Every new post must include at minimum:

1. **1 link to the calculator tool that runs the metric in the post** — e.g. cap rate post → `/tools/cap-rate-calculator`. Tool links drive free-tier engagement, which is the leading indicator for Pro conversion.
2. **1 link to `/blog/how-to-underwrite-a-rental-property-in-60-seconds`** — the anchor educational post, builds topical authority cluster.
3. **1 link to `/blog/how-truecap-verdict-engine-works`** when the post touches "is this a good deal" — that's the methodology trust signal.
4. **2–3 contextual glossary links** — we have 34 glossary terms and they're underused as anchor text.
5. **1 link to `/pricing`** when the post touches a Pro-only feature (projection, tax strategy, sensitivity, deal score, share link, PDF export).
6. **1 link to `/vs/<competitor>`** if the post names a competitor.
7. **1 link to the relevant `/markets/<city>` page** if the post is location-specific.

This isn't bureaucracy — it's how Pillar 1's existing strength gets propagated to new posts. Topical authority compounds.

---

## 7. Schema Patterns to Use

Every new post ships with three JSON-LD blocks (already templated in recent posts — copy from `app/blog/how-truecap-verdict-engine-works/page.tsx`):

- `Article` (or `BlogPosting`) — `publisher` references `${siteUrl}/#organization` (site-wide Organization already defined in root layout)
- `BreadcrumbList` — Home → Blog → Post Title
- `FAQPage` — 4–6 questions per post

For tax/financing posts, add a `HowTo` schema where applicable (step-by-step content). For "X vs Y vs Z" 3-way posts, the `FAQPage` is the primary lever; consider adding `ItemList` for the ranked comparison.

---

## 8. Success Metrics

### Leading
- Organic clicks/mo on `/blog/*` — measure week 1 baseline, target 3× by week 12
- Average position for the 16 tracked target keywords — most should crack top 30 within 90 days, top 10 within 180
- Blog → free-tier analyzer signup rate — baseline at start of campaign, target 1.5%+
- Blog → `/pricing` CTR — target 2.5%+

### Lagging
- Free → Pro conversion rate on traffic that originated from blog — target 4% within Q4
- Branded search volume ("TrueCap", "TrueCap calculator", "TrueCap vs ...") — baseline + monthly delta
- Domain Rating / topical authority moving up via Ahrefs / SEMrush

### Production cadence
- 1 post/week minimum (the calendar above)
- 1.5 posts/week stretch target during Month 2 because the tax cluster is the conversion lever

---

## 9. Notes on Distribution

Each post should be distributed beyond organic:

- Added to the next Monday's weekly digest (`emails/content/YYYY-MM-DD.json`)
- Cross-linked in the day-NN.json drip campaigns where topically relevant
- Posted to Twitter/X with the dynamic OG card
- Shared in 1–2 high-relevance subreddits (r/realestateinvesting, r/landlord) with no link in the title — link in the comments per typical sub rules
- Cited from new /vs pages where the post adds a "here's the detailed argument" depth

---

## 10. Out of Scope (for this 12-week plan, revisit later)

- YouTube content / video
- Podcast appearances
- Original-research data studies (would earn backlinks but slow to produce)
- Translated content (no international SEO strategy yet)
- Paid distribution (ads, sponsorships)
- Influencer/affiliate partnerships

These are real levers but not in the next 12 weeks. The Q1 2027 plan should incorporate at least one original data study (e.g., "We analyzed 10,000 anonymized TrueCap underwrites — here's what investors expect for cap rate by state") because it'd be the strongest backlink-bait we have access to.

---

*Drafted with full TrueCap codebase context. Aligns with existing AI-visibility infrastructure (FAQPage schema, llms.txt, dynamic OG cards) and the Pro feature lineup as of June 2026.*
