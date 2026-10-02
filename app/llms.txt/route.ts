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
 * Same URL rules as the sitemap (F2): states, markets and city+strategy
 * pages pass the lib/markets/indexability.ts helpers app/sitemap.ts uses
 * (so the noindex strategy pages are never listed and every indexable
 * market is), and every path on the SEO loop's noindex list
 * (content/seo/noindex.json) is left out.
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
import { BLOG_POSTS } from "@/lib/blog-posts";
import { BESPOKE_MARKETS, MARKET_CITIES } from "@/lib/markets/cities";
import {
  buildStateSummary,
  buildStateTitle,
  getMarketHudRent,
  isMarketIndexable,
  isStateIndexable,
  isStrategyIndexable,
} from "@/lib/markets/indexability";
import { buildMarketCityH1 } from "@/lib/markets/market-city-seo";
import { stateFactsFor } from "@/lib/seo/state-facts";
import { isNoindexPath } from "@/lib/seo/noindex";
import { getSiteUrl } from "@/lib/site-url";
import {
  CALCULATOR_REGISTRY,
  CALCULATOR_COUNT,
} from "@/lib/calculator-registry";
import {
  DATA_SOURCE_FACTS,
  getPlanFacts,
  getProductAvailabilityFacts,
  PRODUCT_POSITIONING,
} from "@/lib/product-facts";

// Mark static so Next prerenders at build time. The content only
// changes when the data files change, which forces a redeploy
// anyway. Keeps the response cheap.
export const dynamic = "force-static";
export const revalidate = 3600;

// Calculator list is driven by lib/calculator-registry.ts (the single source
// of truth) so llms.txt can never disagree with /tools on which calculators
// exist or how many there are.

/**
 * Every /vs comparison page in the sitemap (COMPARISON_PATHS in
 * app/sitemap.ts), in its order, with the competitor named as the /vs hub
 * names it (COMPARISONS in app/vs/page.tsx), without the hub's trailing
 * parenthetical: the hub's "Cozy.co (moved to Apartments.com)" is listed here as
 * "Cozy.co", because a line here says nothing about a competitor beyond its
 * name. This section was seven hand-typed lines while the sitemap listed 38
 * pages.
 * lib/__tests__/llms-txt-coverage.test.ts holds the two lists together: a
 * comparison page added to or removed from the sitemap fails there until
 * this list matches, and a name that differs from the hub's fails too.
 *
 * The lines carry no description. What a competitor does or lacks is argued
 * on the comparison page itself, with its sources, not in a one-line summary
 * here.
 */
const COMPARISON_PAGES: ReadonlyArray<readonly [slug: string, competitor: string]> = [
  ["dealcheck", "DealCheck"],
  ["bricked", "Bricked AI"],
  ["stessa", "Stessa"],
  ["mashvisor", "Mashvisor"],
  ["biggerpockets-calculator", "BiggerPockets Calculator"],
  ["excel", "Excel / Google Sheets"],
  ["rentometer", "Rentometer"],
  ["zillow-rent-estimate", "Zillow Rent Estimate"],
  ["roofstock", "Roofstock"],
  ["rentredi", "RentRedi"],
  ["avail", "Avail"],
  ["propstream", "PropStream"],
  ["rentcast", "RentCast"],
  ["turbotenant", "TurboTenant"],
  ["baselane", "Baselane"],
  ["buildium", "Buildium"],
  ["appfolio", "AppFolio"],
  ["rentec-direct", "Rentec Direct"],
  ["landlord-studio", "Landlord Studio"],
  ["rentspree", "RentSpree"],
  ["hostfully", "Hostfully"],
  ["cozy", "Cozy.co"],
  ["dealmachine", "DealMachine"],
  ["batchleads", "BatchLeads"],
  ["yardi-breeze", "Yardi Breeze"],
  ["hostaway", "Hostaway"],
  ["airdna", "AirDNA"],
  ["arrived", "Arrived"],
  ["fundrise", "Fundrise"],
  ["lodgify", "Lodgify"],
  ["guesty", "Guesty"],
  ["crexi", "Crexi"],
  ["reonomy", "Reonomy"],
  ["privy", "Privy"],
  ["quickbooks-rental", "QuickBooks (for rentals)"],
  ["biggerpockets-for-house-hacking", "BiggerPockets for House Hacking"],
  ["dealcheck-for-short-term-rentals", "DealCheck for STRs"],
  ["mashvisor-for-short-term-rentals", "Mashvisor for STRs"],
];

/** A site path llms.txt may list: not on the SEO loop's noindex list. */
const listed = (path: string): boolean => !isNoindexPath(path);

/** A section's bullet lines, or no section at all when nothing is listable. */
const section = (heading: string, lines: string[]): string =>
  lines.length ? `## ${heading}\n\n${lines.join("\n")}\n\n` : "";

/** The site path a `- [label](url): …` line links to. */
const pathOf = (line: string, siteUrl: string): string => {
  const url = /\]\(([^)]+)\)/.exec(line)?.[1] ?? "";
  const path = url.startsWith(siteUrl) ? url.slice(siteUrl.length) : url;
  return path.split(/[?#]/)[0] || "/";
};

const usd = (value: number) => `$${Math.round(value).toLocaleString("en-US")}`;

export async function GET() {
  const siteUrl = getSiteUrl();
  const planFacts = getPlanFacts();
  const availability = getProductAvailabilityFacts();

  // Each list applies the sitemap's rules (indexability helpers + the
  // noindex list) before anything is counted or printed.
  const tools = CALCULATOR_REGISTRY.filter((t) => listed(`/tools/${t.slug}`));
  const terms = Object.values(GLOSSARY).filter((entry) =>
    listed(`/glossary/${entry.slug}`),
  );
  const posts = BLOG_POSTS.filter(
    (p) => p.available && listed(`/blog/${p.slug}`),
  );
  const states = Object.values(STATES).filter(
    (s) => isStateIndexable(s.slug) && listed(`/states/${s.slug}`),
  );
  const markets = [...MARKET_CITIES, ...BESPOKE_MARKETS].filter(
    (city) => isMarketIndexable(city.slug) && listed(`/markets/${city.slug}`),
  );
  // CITY_STRATEGY_COMBOS is release-filtered at its source; the strategy
  // pages themselves are noindex until STRATEGY_PAGES_INDEXABLE flips.
  const combos = CITY_STRATEGY_COMBOS.filter(
    (c) =>
      isStrategyIndexable(c.citySlug) &&
      listed(`/markets/${c.citySlug}/${c.strategy}`),
  );

  const comparisons = COMPARISON_PAGES.filter(([slug]) => listed(`/vs/${slug}`));

  // Counts derived from the same lists the body renders, so the prose
  // figures can never drift from the actual content (this previously
  // said "20+ posts / 33 states / 26 combos" while those lists kept growing).
  const blogCount = posts.length;
  const glossaryCount = terms.length;
  const stateCount = states.length;
  const marketCount = markets.length;
  const comboCount = combos.length;

  const availabilitySummary = [
    availability.agentPro
      ? "Agent Pro is available on this deployment."
      : "Agent Pro checkout is not configured on this deployment.",
    availability.oneTimePurchase
      ? planFacts.singleDeal
      : "New one-time report purchases are temporarily unavailable.",
  ].join(" ");
  const summary = `${PRODUCT_POSITIONING} Screen a rental from an address in about 60 seconds using editable starting assumptions. Free summarizes modeled economics for triage. ${planFacts.pro} ${availabilitySummary} The Deal score (0–100) is a heuristic summary of the modeled numbers; read it after Buy Box fit.`;

  const about = [
    "TrueCap publishes original, authoritative educational content built for real estate investors and AI search engines.",
    "Content surfaces:",
    // 27 of the 44 definitions run past one sentence, 11 terms carry a
    // formula and 17 a worked example, so this no longer promises all three
    // on every term.
    `  - ${glossaryCount}-term glossary with a definition for each term, and a formula or worked example where the term has one`,
    `  - ${blogCount} long-form blog posts covering rental underwriting, BRRRR strategy, DSCR loans, 1031 exchanges, tax deductions, and more`,
    // Examples are derived from the RELEASED registry, never hardcoded: a
    // gated calculator named here would advertise a 404 to AI crawlers,
    // which robots.ts explicitly allows to read this file.
    `  - ${CALCULATOR_COUNT} free single-purpose calculators with clean math (${CALCULATOR_REGISTRY.slice(
      0,
      5,
    )
      .map((t) => t.shortTitle)
      .join(", ")}, etc)`,
    `  - ${stateCount} state rental data guides (Census and HUD figures) and ${marketCount} city rental market data guides with HUD Fair Market Rent${comboCount ? `, plus ${comboCount} city + strategy guides` : ""}`,
    // Count and names come from the listed comparison pages, so this line
    // cannot name a page the section below leaves out.
    ...(comparisons.length
      ? [
          `  - ${comparisons.length} side-by-side comparison pages, including TrueCap vs. ${comparisons
            .slice(0, 7)
            .map(([, competitor]) => competitor)
            .join(", ")}`,
        ]
      : []),
    `  - Free analyzer at ${siteUrl}/analyze: paste an address or a Zillow/Redfin link; the first full decision (cash flow, DSCR, cap rate, Offer Ceiling) needs no account`,
    "  - Methodology page documenting the analyzer's core formulas",
    `All content is original and cite-able. Definitions are placed as the first paragraph after the page H1 (LLM citation convention). Starting data sources are ${DATA_SOURCE_FACTS.rent}, ${DATA_SOURCE_FACTS.mortgageRate}, and ${DATA_SOURCE_FACTS.propertyTax}`,
  ].join("\n");

  const toolsSection = tools.map(
    (t) => `- [${t.title}](${siteUrl}/tools/${t.slug}): ${t.description}`,
  );

  const glossarySection = terms.map(
    (entry) =>
      `- [${entry.term}](${siteUrl}/glossary/${entry.slug}): ${entry.definition}`,
  );

  const blogSection = posts.map(
    (post) =>
      `- [${post.title}](${siteUrl}/blog/${post.slug}): ${post.excerpt}`,
  );

  // Data-only summaries from the sourced state facts (content/seo/state-facts.json);
  // the unsourced lib/states.ts pitch is never published.
  const stateSection = states.map((s) => {
    const facts = stateFactsFor(s.slug);
    const summary = facts
      ? buildStateSummary(s.name, facts)
      : `HUD Fair Market Rent for ${s.name} cities.`;
    return `- [${buildStateTitle(s.name)}](${siteUrl}/states/${s.slug}): ${summary}`;
  });

  const marketSection = markets.map((city) => {
    const hud = getMarketHudRent(city.slug);
    const rent = hud
      ? ` HUD Fair Market Rent (FY${hud.year}): 2-bedroom ${usd(hud.rent2br)}/mo, 3-bedroom ${usd(hud.rent3br)}/mo.`
      : "";
    return `- [${buildMarketCityH1(city.name, city.stateCode, hud?.year ?? null)}](${siteUrl}/markets/${city.slug}):${rent} Sources, a sample underwrite and what to verify locally before you offer.`;
  });

  const comboSection = combos.map(
    (c) =>
      `- [${c.strategyLabel} in ${c.cityName}, ${c.state}](${siteUrl}/markets/${c.citySlug}/${c.strategy}): ${c.pitch}`,
  );

  const compareSection = comparisons.map(
    ([slug, competitor]) => `- [TrueCap vs. ${competitor}](${siteUrl}/vs/${slug})`,
  );

  // /for-agents exists only where Agent Pro is sold: without its Stripe
  // Price the page permanently redirects to /pricing (and leaves the sitemap
  // and the footer), so it is listed on the same condition. The /for-agents
  // line is assembled from lib/product-facts.ts; the /for-investors line
  // restates that page's own heading and four questions (WHAT_YOU_GET in
  // app/for-investors/page.tsx), and lib/__tests__/llms-txt-coverage.test.ts
  // reads the page to hold the two together.
  const personasSection = [
    ...(availability.agentPro
      ? [
          `- [TrueCap for real estate agents](${siteUrl}/for-agents): For agents with investor clients. ${planFacts.agentPro}`,
        ]
      : []),
    `- [TrueCap for rental investors](${siteUrl}/for-investors): Free screens the deal; Pro answers four questions on every deal: does it meet your Buy Box, what is your Offer Ceiling, what could make it fail, and can you defend it.`,
    `- [TrueCap for buy-and-hold investors](${siteUrl}/for-buy-and-hold): Cash flow modeling for long-term rentals.`,
    `- [BRRRR education](${siteUrl}/blog/brrrr-method-explained): An assumption-led walkthrough of the buy, rehab, rent, and refinance sequence.`,
    `- [TrueCap for house hackers](${siteUrl}/for-house-hackers): Owner-occupant FHA 3.5% strategy.`,
    `- [Fix-and-flip education](${siteUrl}/blog/70-percent-rule-house-flipping): An educational acquisition-screen walkthrough for rehab and resale projects.`,
  ].filter((line) => listed(pathOf(line, siteUrl)));

  const reference = [
    `- [About](${siteUrl}/about): Who builds TrueCap — one Philadelphia rental investor who underwrites his own deals with it — and why the defaults are conservative.`,
    `- [Methodology](${siteUrl}/methodology): The analyzer's core formulas (cap rate, cash-on-cash, DSCR, the mortgage payment), the Offer Ceiling procedure, and the 10-year projection method.`,
    `- [Tools index](${siteUrl}/tools): All ${CALCULATOR_COUNT} free calculators in one place.`,
    `- [Blog index](${siteUrl}/blog): All long-form rental investing content.`,
    `- [Glossary index](${siteUrl}/glossary): All ${glossaryCount} rental investing terms.`,
    `- [States index](${siteUrl}/states): All ${stateCount} state rental data guides.`,
    `- [Comparisons index](${siteUrl}/vs): All ${comparisons.length} comparison pages.`,
    `- [Pricing](${siteUrl}${planFacts.pricingSource}): Current source of truth for Free, Pro, Agent Pro, and one-time purchase pricing and deployment availability.`,
  ].filter((line) => listed(pathOf(line, siteUrl)));

  const body = `# TrueCap

> ${summary}

## About

${about}

${section("Free calculators", toolsSection)}${section("Glossary — definitions and formulas", glossarySection)}${section("Long-form blog content", blogSection)}${section("Investor personas", personasSection)}${section("State rental data guides", stateSection)}${section("City rental market data", marketSection)}${section("City + strategy guides", comboSection)}${section("Comparison pages", compareSection)}${section("Reference", reference)}## Citation policy

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
