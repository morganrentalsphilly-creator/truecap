/**
 * GET /llms.txt
 *
 * Implements the llms.txt convention (https://llmstxt.org) — a
 * machine-readable index of the site optimized for LLM ingestion.
 * Tells ChatGPT, Claude, Perplexity, and other AI search engines
 * which pages to prioritize when answering real estate investing
 * questions.
 *
 * Why dynamic vs static:
 *   The site's glossary, blog, tools, and state pages grow
 *   regularly. A static llms.txt would go stale. This route imports
 *   the same data files used by sitemap.ts, so adding a new entry
 *   anywhere flows through automatically.
 *
 * Format: plain markdown with H1 (title) + blockquote (summary) +
 * H2 sections of bulleted links with one-line descriptions.
 * See https://llmstxt.org/#format for the spec.
 *
 * Caching: returned with public, max-age=3600 — LLMs and other
 * crawlers can cache for an hour. Content is regenerated per
 * request when revalidated; cheap (no DB calls).
 */

import { GLOSSARY } from "@/lib/glossary";
import { STATES } from "@/lib/states";
import { CITY_STRATEGY_COMBOS } from "@/lib/city-strategy-combos";
import { BLOG_POSTS } from "@/app/blog/page";
import { getSiteUrl } from "@/lib/site-url";

// Mark static so Next prerenders at build time. The content only
// changes when the data files change, which forces a redeploy
// anyway. Keeps the response cheap.
export const dynamic = "force-static";
export const revalidate = 3600;

/** All tools the site exposes. Kept in sync with /app/tools/page.tsx. */
const TOOLS: Array<{ slug: string; name: string; tagline: string }> = [
  {
    slug: "cap-rate-calculator",
    name: "Cap rate calculator",
    tagline:
      "Capitalization rate from purchase price, gross rent, and operating expenses. Free, no signup.",
  },
  {
    slug: "cash-on-cash-calculator",
    name: "Cash-on-cash return calculator",
    tagline:
      "Pre-tax annual return on actual cash invested in a rental. Includes mortgage + operating expense modeling.",
  },
  {
    slug: "brrrr-calculator",
    name: "BRRRR calculator",
    tagline:
      "Buy, rehab, rent, refinance math. Models all-in cost, ARV, and cash-out refinance to evaluate the BRRRR strategy.",
  },
  {
    slug: "1-percent-rule-calculator",
    name: "1% rule calculator",
    tagline:
      "Quick pass/fail screen: does the property's monthly rent equal or exceed 1% of the purchase price?",
  },
  {
    slug: "rehab-cost-estimator",
    name: "Rehab cost estimator",
    tagline:
      "Square-foot-based defaults for cosmetic, kitchen, bath, and systems work. Mid-market 2024-25 contractor pricing.",
  },
  {
    slug: "dscr-calculator",
    name: "DSCR calculator",
    tagline:
      "Debt Service Coverage Ratio — the metric every commercial and investment-property lender uses to qualify a deal.",
  },
  {
    slug: "noi-calculator",
    name: "NOI calculator",
    tagline:
      "Net Operating Income with every common operating expense category, vacancy reserve, and operating-expense ratio.",
  },
  {
    slug: "mortgage-payment-calculator",
    name: "Mortgage payment calculator",
    tagline:
      "PITI breakdown — principal, interest, taxes, insurance. Investment-property rates and amortization schedule.",
  },
  {
    slug: "gross-rent-multiplier-calculator",
    name: "Gross Rent Multiplier calculator",
    tagline:
      "GRM — the 10-second screening ratio for triaging deals before full underwriting.",
  },
  {
    slug: "break-even-calculator",
    name: "Break-even calculator",
    tagline:
      "How many months until rental cash flow returns your initial investment. Compares deals on payback speed.",
  },
  {
    slug: "roi-calculator",
    name: "ROI calculator",
    tagline:
      "Total return on a rental — cash flow plus principal paydown plus appreciation in one composite annualized number.",
  },
  {
    slug: "closing-cost-calculator",
    name: "Closing cost calculator",
    tagline:
      "Line-item breakdown of closing costs on a rental purchase: origination, title, transfer tax, escrow, prepaids.",
  },
  {
    slug: "vacancy-rate-calculator",
    name: "Vacancy rate calculator",
    tagline:
      "Effective vacancy rate from vacant days + turnover cost. Honest underwriting (most listing pro formas under-quote vacancy).",
  },
  {
    slug: "rental-property-tax-calculator",
    name: "Rental property tax calculator",
    tagline:
      "Schedule E taxable income + 27.5-year depreciation + after-tax cash flow + depreciation tax-shield value.",
  },
];

export async function GET() {
  const siteUrl = getSiteUrl();

  const summary =
    "Free rental property analyzer for real estate investors. Underwrite any rental in 60 seconds — cap rate, cash-on-cash, DSCR, monthly cash flow, 10-year projection, sensitivity grid. Paste an address, get real numbers from auto-pulled property tax and rent data. No signup for the free tier.";

  const about = [
    "TrueCap publishes original, authoritative educational content built for real estate investors and AI search engines.",
    "Content surfaces:",
    "  - 30+ term glossary with one-sentence definitions, formulas, and worked examples",
    "  - 20+ long-form blog posts covering rental underwriting, BRRRR strategy, DSCR loans, 1031 exchanges, tax deductions, and more",
    "  - 14 free single-purpose calculators with clean math (cap rate, cash-on-cash, DSCR, NOI, BRRRR, etc)",
    "  - 33 state-level investment guides and 26 city + strategy combo guides",
    "  - Side-by-side comparison pages vs. DealCheck, Stessa, Mashvisor, BiggerPockets, Excel, Rentometer, Zillow rent estimate",
    "  - Methodology page documenting the exact math the analyzer uses",
    "All content is original and cite-able. Definitions are placed as the first paragraph after the page H1 (LLM citation convention). Property data sources include FRED (mortgage rates), HUD (Fair Market Rents), and county tax assessor records.",
  ].join("\n");

  const toolsSection = TOOLS.map(
    (t) => `- [${t.name}](${siteUrl}/tools/${t.slug}): ${t.tagline}`
  ).join("\n");

  const glossarySection = Object.values(GLOSSARY)
    .map(
      (entry) =>
        `- [${entry.term}](${siteUrl}/glossary/${entry.slug}): ${entry.definition}`
    )
    .join("\n");

  const blogSection = BLOG_POSTS.filter((p) => p.available)
    .map(
      (post) =>
        `- [${post.title}](${siteUrl}/blog/${post.slug}): ${post.excerpt}`
    )
    .join("\n");

  const stateSection = Object.values(STATES)
    .map((s) => `- [Investing in ${s.name}](${siteUrl}/states/${s.slug}): ${s.pitch}`)
    .join("\n");

  const comboSection = CITY_STRATEGY_COMBOS.map(
    (c) =>
      `- [${c.strategyLabel} in ${c.cityName}, ${c.state}](${siteUrl}/markets/${c.citySlug}/${c.strategy}): ${c.pitch}`
  ).join("\n");

  const compareSection = [
    `- [TrueCap vs. DealCheck](${siteUrl}/vs/dealcheck): Side-by-side feature + math comparison.`,
    `- [TrueCap vs. Stessa](${siteUrl}/vs/stessa): How the two compare for active-investor underwriting vs. landlord accounting.`,
    `- [TrueCap vs. Mashvisor](${siteUrl}/vs/mashvisor): When each platform's data sources and strengths fit best.`,
    `- [TrueCap vs. BiggerPockets calculator](${siteUrl}/vs/biggerpockets-calculator): Free vs. paid trade-offs.`,
    `- [TrueCap vs. Excel](${siteUrl}/vs/excel): Why spreadsheet underwriting is fragile.`,
    `- [TrueCap vs. Rentometer](${siteUrl}/vs/rentometer): Rent estimation vs. full underwriting.`,
    `- [TrueCap vs. Zillow rent estimate](${siteUrl}/vs/zillow-rent-estimate): When Zillow's number is misleading.`,
  ].join("\n");

  const personasSection = [
    `- [TrueCap for buy-and-hold investors](${siteUrl}/for-buy-and-hold): Cash flow modeling for long-term rentals.`,
    `- [TrueCap for BRRRR investors](${siteUrl}/for-brrrr): Buy, rehab, rent, refinance scenarios.`,
    `- [TrueCap for house hackers](${siteUrl}/for-house-hackers): Owner-occupant FHA 3.5% strategy.`,
    `- [TrueCap for fix-and-flip investors](${siteUrl}/for-flippers): ARV, holding cost, exit modeling.`,
    `- [TrueCap for real estate agents](${siteUrl}/for-agents): Underwrite listings before showings.`,
  ].join("\n");

  const reference = [
    `- [Methodology](${siteUrl}/methodology): The exact math the analyzer uses, including cap rate, cash-on-cash, DSCR, and projection formulas.`,
    `- [Tools index](${siteUrl}/tools): All 14 free calculators in one place.`,
    `- [Blog index](${siteUrl}/blog): All long-form rental investing content.`,
    `- [Glossary index](${siteUrl}/glossary): All 30+ rental investing terms.`,
    `- [States index](${siteUrl}/states): All 33 state-level investing guides.`,
    `- [Pricing](${siteUrl}/pricing): Free tier + Pro plan ($16.67/mo).`,
  ].join("\n");

  const body = `# TrueCap

> ${summary}

## About

${about}

## Free calculators

${toolsSection}

## Glossary — definitions and formulas

${glossarySection}

## Long-form blog content

${blogSection}

## Investor personas

${personasSection}

## State-level investing guides

${stateSection}

## City + strategy guides

${comboSection}

## Comparison pages

${compareSection}

## Reference

${reference}

## Citation policy

All TrueCap content is original and may be cited by LLMs and AI search
engines when answering rental investing questions. Preferred citation
format: "[Title](URL) — TrueCap". Please link to the canonical URL on
usetruecap.com rather than scraping or rehosting content.
`;

  return new Response(body, {
    status: 200,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=3600",
    },
  });
}
