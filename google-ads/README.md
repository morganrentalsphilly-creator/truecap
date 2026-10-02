# TrueCap Google Ads kit

What is in this folder:

```
google-ads/
├── README.md            this file: structure, landing pages, negatives, tracking
├── ad-copy.md           the ad text to paste: two campaigns, four ad groups
├── check-ad-copy.mjs    checks ad-copy.md against the code (lengths, prices, URLs)
├── generate_ads.py      draws the display images in creatives/
└── creatives/           one display image and two logo files
```

## Read this first

- This kit was rewritten on 2026-10-02 from the code at commit `176d52d`. The
  kit it replaces was written in May 2026 for a different price and for
  features TrueCap does not offer. Do not paste anything from the earlier
  version in git history, and do not re-enable a campaign that was built
  from it.
- Nothing in this repository starts, pauses or removes an ad. Whether a
  campaign is running, and which assets it still holds, can only be seen in
  the Google Ads account.
- An ad cannot read a price from the catalog. `ad-copy.md` lists every value
  it was written from. Re-read it whenever `lib/public-pricing.ts` changes,
  then run `node google-ads/check-ad-copy.mjs`.

## What the ads say, and what they do not

The copy says only what the code does today:

- The first complete decision needs no account and no card. A new account
  adds a 21-day trial with 3 Pro deals and 1 comparison, still no card
  (`lib/product-access.ts`, `lib/product-facts.ts`).
- Pro is $29.99 a month or $300 a year. Agent Pro is $59.99 a month or $590 a
  year (`lib/public-pricing.ts`).
- The Offer Ceiling is the highest price that still meets your targets. The
  Buy Box is the set of targets. Cash flow, cap rate, cash-on-cash, DSCR and a
  0 to 100 Deal score come with every analysis (`lib/entitlements-catalog.ts`).
- Agent Pro keeps a roster of up to 100 clients and up to 12 Buy Boxes per
  account. Pro and Agent Pro put the agent's logo and brand color on the share
  page and a "Prepared by" block in the PDF (`lib/agent-faqs.ts`).

The copy leaves these out, each for a reason in the code:

| Not in the ads | Why |
| --- | --- |
| A refund or a guarantee | `app/terms/page.tsx` says subscription charges are non-refundable except where the law requires. |
| Tax or exit scenarios | `tax_strategy` and `exit_scenarios` are `shipped: false` in `lib/entitlements-catalog.ts`. |
| The refinance and resale strategy models | `strategies` is `shipped: false`, and both model flags default to off in `lib/feature-flags.ts`. |
| A report described as ready for a lender | TrueCap is "not an appraisal, a lender decision, or investment advice" (`docs/voice.md`, the disclaimer). |
| Property tax filled in for you | `PROPERTY_TAX_FACTS.notAutoFilled` in `lib/product-facts.ts`: property tax is the user's own input. |
| A client portal or white-label output | `agent_portal` and `embed_whitelabel` are `shipped: false`; the output is co-branded, and TrueCap's name stays on it. |
| A trial of the roster or of co-branding | The trial is Pro deal analyses and a comparison only (`evaluationFeatures` in `lib/entitlements.ts`). |
| A count of users or deals, a rating, a quote | There is no verified testimonial or rating, and the deals-analyzed counter was removed (`PRODUCT.md`, "Evidence on Hand"). |
| A buy or avoid recommendation | The result is a screening result, not advice (`lib/verdict-display.ts`). |
| Superlatives | `docs/voice.md`. |
| The word "free" | The one open switch, below. |

## Structure

Two search campaigns, so that each audience gets its own landing page, its own
copy and its own landing section in the first-touch record.

```
TrueCap: agents (search)            lands on /for-agents
├── A1  agents with investor clients
└── A2  client roster and Buy Box screening

TrueCap: investors (search)         lands on /for-investors
├── I1  rental property analysis
└── I2  what to offer on a rental
```

### Keywords

Phrase match to start. These are suggestions to test, not a record of what
converts: no search-term data is in this repository.

**A1, agents with investor clients**
```
"real estate agent investor clients"
"working with investor clients"
"investment property analysis for agents"
"rental property analysis for agents"
"deal analysis for real estate agents"
```

**A2, client roster and Buy Box screening**
```
"investor client buy box"
"buy box real estate"
"send deals to investor clients"
"rental property report for clients"
"co-branded real estate report"
```

**I1, rental property analysis**
```
"rental property analyzer"
"rental property analysis"
"rental property analysis tool"
"rental property calculator"
"investment property analyzer"
"real estate deal analyzer"
"investment property deal analyzer"
```

**I2, what to offer on a rental**
```
"how much to offer on a rental property"
"rental property offer price"
"max offer rental property"
"rental property purchase price calculator"
"what to pay for a rental property"
```

### Ad groups the earlier kit had and this one does not

- Single-metric calculator groups (cap rate, cash-on-cash and the refinance
  strategy calculator). Those `/tools` pages are retired and answer with a
  permanent redirect to an article, so an ad for a calculator would land on a
  page with no calculator.
- The 1% rule and rehab estimator groups. Their pages are still live at
  `/tools/1-percent-rule-calculator` and `/tools/rehab-cost-estimator`, but the
  old copy for them leaned on the word "free", on a refund promise and on
  strategy models that are not offered. They can come back as their own ad
  groups with new copy.

## Landing pages and URLs

- Agent ad groups use `https://usetruecap.com/for-agents`. Investor ad groups
  use `https://usetruecap.com/for-investors`. No investor ad lands on the
  homepage, whose headline speaks to agents.
- Never use one of the ten retired `/tools` paths as a Final URL or a
  sitelink. They are the keys of `HISTORICAL_TOOL_REDIRECTS` in
  `lib/historical-tool-redirects.ts`, mirrored by `RETIRED_TOOL_REDIRECTS` in
  `next.config.mjs`. `check-ad-copy.mjs` reads that list and fails on a match.
- Final URLs carry no query string and no UTM parameters. With auto-tagging
  on, Google adds its click id, and `lib/first-touch.ts` counts a landing that
  carries a click id (`gclid`, `gbraid`, `wbraid`, `dclid`, `msclkid`) as paid
  search. It also counts `utm_medium=cpc` as paid search. If you add UTM
  parameters, put them in the campaign's Final URL suffix and leave the Final
  URLs as they are:
  `utm_source=google&utm_medium=cpc&utm_campaign=agents_search` for the agents
  campaign, `...&utm_campaign=investors_search` for the investors campaign.
- The same module records the landing section, `for_agents` or
  `for_investors`, in the first-touch cookie once the visitor has accepted
  cookies, and the server copies it to the account at sign-up. That is how a
  sign-up from an agent ad can be told from one from an investor ad.

## Negative keywords

Add this list at the campaign level in both campaigns. It is the earlier
kit's list, unchanged.

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

### The one open switch: `free`

`free` is on the list, so the ads never show for a search that contains the
word. The copy in `ad-copy.md` is written to match: no headline, description,
sitelink or callout uses it. The founder has not decided this. To flip it,
remove `free` from the list and add the lines that `ad-copy.md` holds ready
under "The one open switch". Run the check with
`node google-ads/check-ad-copy.mjs --allow-free` after that.

### A note on `realtor`

Google says negative keywords do not match close variants (Google Ads Help,
"About negative keywords"), so `realtor` blocks a search that contains that
exact word and not the plural. It stays on the list as it was. For that
reason no keyword in this kit contains it, and the ad text says "agents".
Narrowing it to `realtor.com` would let agent searches through; that is not
decided.

## Tracking, as the code does it today

- The site loads the Google Ads tag `AW-8236119484` and its Tag Manager
  container only in production, only after the visitor accepts cookies, and
  never on a route whose path holds an encoded analysis or a bearer token
  (`components/analytics/google-measurement.tsx`). The earlier version of this
  file named another ID; the code does not load it.
- One conversion reaches Google Ads: a paid subscription, `paid_subscribed` in
  `lib/analytics/track-conversion.ts`. `signup`, `calc_completed`,
  `pdf_exported` and `deal_saved` have no conversion label, so Google Ads
  receives nothing for them; they are pushed to the data layer as
  `tc_<name>` events.
- To report another conversion, create the conversion action in Google Ads
  and put its label in the `LABELS` map in that file.

## Before a campaign is enabled

These are the founder's steps in the Google Ads account.

- [ ] The headlines, descriptions, images and video from the earlier kit are
      removed from the account's assets. Pausing leaves them reusable.
- [ ] Each ad group holds only the text in `ad-copy.md`.
- [ ] `node google-ads/check-ad-copy.mjs` passes on the day of launch.
- [ ] `/for-agents` shows the Agent Pro prices, not a waitlist, before the
      agents campaign runs.
- [ ] The negative keyword list is added to both campaigns, and the copy
      matches the position of the `free` switch.
- [ ] Auto-tagging is on.
- [ ] Budget, bids and bid strategy are set. This kit sets none of them: the
      repository holds no conversion-rate, retention or cost-per-click data to
      set them from. The break-even rule is the usual one: a click is worth
      paying for while conversion rate times revenue per customer is higher
      than the cost per click.

## Display images

`creatives/` holds one display image, `02_60_second_speed_landscape_1200x628.png`,
and two logo files. Nine other images were removed on 2026-10-02 because each
stated something that is not true today, and `generate_ads.py` no longer draws
them.

The image that is left was drawn in May 2026. Its metric tiles are sample
figures, it uses the earlier brand colors, and its button reads "Try the free
calculator", so it does not match the `free` switch as it stands. Check it
against the current product before using it.
