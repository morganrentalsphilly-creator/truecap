# TrueCap ad copy for Google search ads

Two search campaigns, four ad groups, one responsive search ad per ad group.
`README.md` in this folder has the structure, the keywords, the negative
keyword list and the tracking notes. This file is only the text to paste.

## Written from these values

Written on 2026-10-02 from the code at commit `176d52d`. An ad cannot read a
price from the catalog, so every number below was copied by hand from these
places:

| Fact in the ads | Value | Where it comes from |
| --- | --- | --- |
| Pro, monthly | $29.99 | `PUBLIC_PRO_MONTHLY_USD` in `lib/public-pricing.ts` |
| Pro, annual | $300 | `PUBLIC_PRO_ANNUAL_USD` in `lib/public-pricing.ts` |
| Agent Pro, monthly | $59.99 | `PUBLIC_AGENT_PRO_MONTHLY_USD` in `lib/public-pricing.ts` |
| Agent Pro, annual | $590 | `PUBLIC_AGENT_PRO_ANNUAL_USD` in `lib/public-pricing.ts` |
| Trial length | 21 days | `PRODUCT_EVALUATION_DAYS` in `lib/product-access.ts` |
| Trial allowance | 3 Pro analyses, 1 comparison | `PRODUCT_EVALUATION_DEAL_LIMIT`, `PRODUCT_EVALUATION_COMPARISON_LIMIT` in `lib/product-access.ts` |
| Trial needs a card | no | `PRODUCT_PLAN_FACTS.evaluation.cardRequired` in `lib/product-facts.ts` |
| Trial covers the roster or co-branding | no | `evaluationFeatures` in `lib/entitlements.ts`, and the trial answer in `lib/agent-faqs.ts` |
| Client roster | up to 100 clients | `MAX_CLIENTS` in `app/actions/agent-clients.ts` |
| Buy Boxes | up to 12 per account | `MAX_BUY_BOXES` in `app/actions/user-buy-boxes.ts` |
| Co-branding | Pro and Agent Pro | `custom_branding` in `lib/entitlements-catalog.ts` |
| Offer Ceiling on a first deal | exact, no account | `mao.anonymousLimit` in `lib/entitlements-catalog.ts` |
| Share links | open with no sign-in, read-only, can be revoked, address hidden unless included | the share-link answer in `lib/agent-faqs.ts` |

Re-read every line of this file whenever `lib/public-pricing.ts` changes, and
whenever one of the other files in the table changes a limit named here. Then
run `node google-ads/check-ad-copy.mjs`: it fails if a catalog price is missing
from the ad text, if a line is over length, or if a Final URL is not allowed.

## The one open switch: the word "free"

The negative keyword list in `README.md` contains `free`, so the ads do not
show for a search that contains the word. To match that, no headline,
description, sitelink or callout below uses it. This has not been
decided by the founder. The two positions:

- **Keep `free` as a negative (how this file is written).** Leave the copy as it is.
- **Remove `free` from the negatives.** Then these lines may be added, and each
  is true today: headlines `Analyze a deal free`, `First deal free, no account`
  and `Free trial, 3 Pro analyses`; callouts `First deal free` and
  `3 free Pro analyses`. Expect clicks from people who want a free tool only.

## Rules every line follows

- Sentence case. No exclamation marks.
- Headlines are 30 characters or fewer, descriptions 90 or fewer, display
  paths 15 or fewer, sitelink text 25 or fewer, sitelink description lines 35
  or fewer, callouts 25 or fewer. Counted by `check-ad-copy.mjs` on 2026-10-03,
  after the trial lines took the noun "Pro analyses".
- Google shows headlines in any order and any combination. Each line is true
  on its own, so a line that states the trial's length also states its
  allowance (3 Pro analyses).
- Final URLs carry no query string. Each campaign sets a Final URL suffix with
  `utm_medium=cpc` (`docs/analytics.md`, "Ad URLs"; the suffix is in
  `README.md`).

---

## Campaign: agents (search)

Every ad group in this campaign lands on `https://usetruecap.com/for-agents`.

Before enabling it, open that page and confirm it shows the Agent Pro prices.
When Agent Pro's Stripe prices are not configured, `/for-agents` permanently
redirects to `/pricing` (`app/for-agents/page.tsx`); then the agents campaign
must not run.

### Ad group A1: agents with investor clients

- Final URL: `https://usetruecap.com/for-agents`
- Display path: `for-agents`

Headlines

```text
Send deals that already pencil
Stop forwarding listings
Rental analysis for agents
Screen listings for clients
Fits the client's Buy Box?
The client's Offer Ceiling
Labeled, editable assumptions
Cap rate, CoC, DSCR, cash flow
A miss names the criterion
Co-branded memos on Agent Pro
Agent Pro: $59.99 a month
Agent Pro: $590 a year
Clients open it with no login
On your phone at the showing
First deal needs no account
```

Descriptions

```text
Add the address, price and rent. See the client's Buy Box fit and the Offer Ceiling.
With Agent Pro, send a co-branded share link or PDF. The link lets the client rerun it.
Agent Pro is $59.99 a month or $590 a year. Cancel anytime from your profile.
The first full decision needs no account or card. Every assumption is labeled.
```

### Ad group A2: client roster and Buy Box screening

- Final URL: `https://usetruecap.com/for-agents`
- Display path: `for-agents`

Headlines

```text
A roster of investor clients
Agent Pro: up to 100 clients
Assign a Buy Box to a client
Screened to a client's targets
Co-branded share page and PDF
Your logo, your brand color
Co-branded, not white-label
Share links you can revoke
Address hidden by default
Up to 12 Buy Boxes per account
Agent Pro: $59.99 a month
Agent Pro: $590 a year
Cancel anytime
The math is published
TrueCap for real estate agents
```

Descriptions

```text
Agent Pro keeps a roster of up to 100 clients and up to 12 Buy Boxes per account.
Assign a saved deal to a client. It is screened against that client's Buy Box.
The share page carries your logo and brand color. TrueCap stays named as the method.
The 21-day no-card trial covers 3 Pro analyses and 1 comparison, not roster or branding.
```

---

## Campaign: investors (search)

Every ad group in this campaign lands on `https://usetruecap.com/for-investors`.
No investor ad lands on the homepage: its headline speaks to agents.

### Ad group I1: rental property analysis

- Final URL: `https://usetruecap.com/for-investors`
- Display path: `for-investors`

Headlines

```text
Rental property analyzer
Know your Offer Ceiling
Your inputs, published math
Does it meet your Buy Box?
Cap rate, CoC, DSCR, cash flow
Deal score from 0 to 100
Every assumption is editable
Each input shows its source
See what could break the deal
What to verify before offering
First deal needs no account
Trial: 3 Pro analyses, 21 days
Pro is $29.99 a month
Pro is $300 a year
The math is published
```

Descriptions

```text
Enter the address, price and rent. See cash flow, cap rate, CoC, DSCR and a Deal score.
The Offer Ceiling is the highest price that still meets your targets.
Rent starts from a HUD figure, the rate from FRED. Replace both with your own.
First decision needs no account. A new account adds 3 Pro analyses in 21 days, no card.
```

### Ad group I2: what to offer on a rental

- Final URL: `https://usetruecap.com/for-investors`
- Display path: `for-investors`

Headlines

```text
Know your Offer Ceiling
What price meets your targets?
Before you write the offer
Asking price vs. your ceiling
Your Buy Box, your targets
Offer Ceiling for a rental
See the gap to asking price
Every assumption is editable
Each input shows its source
Your inputs, published math
First deal needs no account
Trial: 3 Pro analyses, 21 days
Pro is $29.99 a month
Pro is $300 a year
The math is published
```

Descriptions

```text
The Offer Ceiling is the highest price that still meets your targets.
Your first deal shows the exact Offer Ceiling with no account. Pro keeps it on every deal.
On Pro, save a Buy Box with your cash flow, DSCR and price targets.
Pro is $29.99 a month or $300 a year. The no-card trial is 3 Pro analyses in 21 days.
```

---

## Assets for both campaigns

### Sitelinks

| Sitelink text | Description line 1 | Description line 2 | Final URL |
| --- | --- | --- | --- |
| Analyze a deal | Paste the listing address | First decision needs no account | `https://usetruecap.com/analyze` |
| Pricing | Pro $29.99/mo or $300/yr | Agent Pro $59.99/mo or $590/yr | `https://usetruecap.com/pricing` |
| Sample decision memo | Computed from a sample deal | Not a customer result | `https://usetruecap.com/sample-decision-memo` |
| Methodology | The core formulas, shown | How each number is calculated | `https://usetruecap.com/methodology` |

### Callouts

```text
First deal, no account
No card for the trial
Editable assumptions
Labeled sources
Published methodology
Offer Ceiling
Buy Box screening
Cancel anytime
```

Agents campaign only:

```text
Co-branded on Pro plans
Roster: up to 100 clients
```

## Pinning

Pin at most one headline per ad group, to position 1, and leave the rest
unpinned so Google can rotate them:

| Ad group | Position 1 |
| --- | --- |
| A1 | Send deals that already pencil |
| A2 | A roster of investor clients |
| I1 | Rental property analyzer |
| I2 | Know your Offer Ceiling |
