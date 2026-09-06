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

export async function GET() {
  const siteUrl = getSiteUrl();
  const planFacts = getPlanFacts();
  const availability = getProductAvailabilityFacts();

  // Counts derived from the same registries the body renders from, so the
  // prose figures can never drift from the actual content (this previously
  // said "20+ posts / 33 states / 26 combos" while those lists kept growing).
  const blogCount = BLOG_POSTS.filter((p) => p.available).length;
  const glossaryCount = Object.values(GLOSSARY).length;
  const stateCount = Object.values(STATES).length;
  const comboCount = CITY_STRATEGY_COMBOS.length;

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
    `  - ${glossaryCount}-term glossary with one-sentence definitions, formulas, and worked examples`,
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
    `  - ${stateCount} state-level investment guides and ${comboCount} city + strategy combo guides`,
    "  - Side-by-side comparison pages vs. DealCheck, Stessa, Mashvisor, BiggerPockets, Excel, Rentometer, Zillow rent estimate",
    "  - Methodology page documenting the exact math the analyzer uses",
    `All content is original and cite-able. Definitions are placed as the first paragraph after the page H1 (LLM citation convention). Starting data sources are ${DATA_SOURCE_FACTS.rent}, ${DATA_SOURCE_FACTS.mortgageRate}, and ${DATA_SOURCE_FACTS.propertyTax}`,
  ].join("\n");

  const toolsSection = CALCULATOR_REGISTRY.map(
    (t) => `- [${t.title}](${siteUrl}/tools/${t.slug}): ${t.description}`,
  ).join("\n");

  const glossarySection = Object.values(GLOSSARY)
    .map(
      (entry) =>
        `- [${entry.term}](${siteUrl}/glossary/${entry.slug}): ${entry.definition}`,
    )
    .join("\n");

  const blogSection = BLOG_POSTS.filter((p) => p.available)
    .map(
      (post) =>
        `- [${post.title}](${siteUrl}/blog/${post.slug}): ${post.excerpt}`,
    )
    .join("\n");

  const stateSection = Object.values(STATES)
    .map(
      (s) =>
        `- [Investing in ${s.name}](${siteUrl}/states/${s.slug}): ${s.pitch}`,
    )
    .join("\n");

  // CITY_STRATEGY_COMBOS is release-filtered at its source. This prevents a
  // dark specialist city guide from being advertised to model crawlers.
  const comboSection = CITY_STRATEGY_COMBOS.map(
    (c) =>
      `- [${c.strategyLabel} in ${c.cityName}, ${c.state}](${siteUrl}/markets/${c.citySlug}/${c.strategy}): ${c.pitch}`,
  ).join("\n");

  const compareSection = [
    `- [TrueCap vs. DealCheck](${siteUrl}/vs/dealcheck): Fair workflow comparison with links to DealCheck's official product documentation.`,
    `- [TrueCap vs. Stessa](${siteUrl}/vs/stessa): How the two compare for active-investor underwriting vs. landlord accounting.`,
    `- [TrueCap vs. Mashvisor](${siteUrl}/vs/mashvisor): When each platform's data sources and strengths fit best.`,
    `- [TrueCap vs. BiggerPockets calculator](${siteUrl}/vs/biggerpockets-calculator): Address-to-decision workflow vs. a detailed calculator inside a community ecosystem.`,
    `- [TrueCap vs. Excel](${siteUrl}/vs/excel): Why spreadsheet underwriting is fragile.`,
    `- [TrueCap vs. Rentometer](${siteUrl}/vs/rentometer): Rent estimation vs. full underwriting.`,
    `- [TrueCap vs. Zillow rent estimate](${siteUrl}/vs/zillow-rent-estimate): When Zillow's number is misleading.`,
  ].join("\n");

  const personasSection = [
    `- [TrueCap for buy-and-hold investors](${siteUrl}/for-buy-and-hold): Cash flow modeling for long-term rentals.`,
    `- [BRRRR education](${siteUrl}/blog/brrrr-method-explained): An assumption-led walkthrough of the buy, rehab, rent, and refinance sequence.`,
    `- [TrueCap for house hackers](${siteUrl}/for-house-hackers): Owner-occupant FHA 3.5% strategy.`,
    `- [Fix-and-flip education](${siteUrl}/blog/70-percent-rule-house-flipping): An educational acquisition-screen walkthrough for rehab and resale projects.`,
  ].join("\n");

  const reference = [
    `- [About](${siteUrl}/about): Who builds TrueCap — Morgan Page, a Philadelphia rental investor who underwrites his own deals with it — and why the defaults are conservative.`,
    `- [Methodology](${siteUrl}/methodology): The exact math the analyzer uses, including cap rate, cash-on-cash, DSCR, and projection formulas.`,
    `- [Tools index](${siteUrl}/tools): All ${CALCULATOR_COUNT} free calculators in one place.`,
    `- [Blog index](${siteUrl}/blog): All long-form rental investing content.`,
    `- [Glossary index](${siteUrl}/glossary): All ${glossaryCount} rental investing terms.`,
    `- [States index](${siteUrl}/states): All ${stateCount} state-level investing guides.`,
    `- [Pricing](${siteUrl}${planFacts.pricingSource}): Current source of truth for Free, Investor Pro, Agent Pro, and one-time purchase pricing and deployment availability.`,
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
