import type { MetadataRoute } from "next";

import { BLOG_POSTS } from "@/app/blog/page";
import { BLOG_TOPICS } from "@/lib/blog-topics";
import { CALCULATOR_REGISTRY } from "@/lib/calculator-registry";
import { CITY_STRATEGY_COMBOS } from "@/lib/city-strategy-combos";
import { GLOSSARY } from "@/lib/glossary";
import { getMarketingOfferConfig } from "@/lib/marketing-offer-config";
import { BESPOKE_MARKETS, MARKET_CITIES } from "@/lib/markets/cities";
import { CANONICAL_SITE_URL } from "@/lib/site-url";
import { STATES } from "@/lib/states";
import { isAgentProConfigured } from "@/lib/stripe/plan-prices";

/**
 * Sitemap policy
 *
 * - Only indexable, canonical HTML pages belong here.
 * - A last-modified value is emitted only for a reviewed content date we can
 *   defend. Never stamp deployment time onto evergreen pages.
 * - Search engines ignore priority/changefreq hints, so neither is emitted.
 * - Released registries drive generated families; gated and retired routes
 *   therefore cannot leak into discovery surfaces.
 */

const CORE_PATHS = [
  "/",
  "/pricing",
  "/sample-decision-memo",
  "/tools",
  "/about",
  "/privacy",
  "/terms",
  "/blog",
  "/embed",
  "/glossary",
  "/methodology",
  "/why-truecap",
  "/reviews",
  "/playbook",
  "/for-buy-and-hold",
  "/for-house-hackers",
  "/markets",
  "/states",
  "/vs",
] as const;

/** Comparison pages without a defensible per-page review date. */
const COMPARISON_PATHS = [
  "/vs/dealcheck",
  "/vs/bricked",
  "/vs/stessa",
  "/vs/mashvisor",
  "/vs/biggerpockets-calculator",
  "/vs/excel",
  "/vs/rentometer",
  "/vs/zillow-rent-estimate",
] as const;

/** Pages released/reviewed in the documented June 2026 comparison batches. */
const JUNE_2026_COMPARISON_PATHS = [
  "/vs/roofstock",
  "/vs/rentredi",
  "/vs/avail",
  "/vs/propstream",
  "/vs/rentcast",
  "/vs/turbotenant",
  "/vs/baselane",
  "/vs/buildium",
  "/vs/appfolio",
  "/vs/rentec-direct",
  "/vs/landlord-studio",
  "/vs/rentspree",
  "/vs/hostfully",
  "/vs/cozy",
  "/vs/dealmachine",
  "/vs/batchleads",
  "/vs/yardi-breeze",
  "/vs/hostaway",
  "/vs/airdna",
  "/vs/arrived",
  "/vs/fundrise",
  "/vs/lodgify",
  "/vs/guesty",
  "/vs/crexi",
  "/vs/reonomy",
  "/vs/privy",
  "/vs/quickbooks-rental",
  "/vs/biggerpockets-for-house-hacking",
  "/vs/dealcheck-for-short-term-rentals",
  "/vs/mashvisor-for-short-term-rentals",
] as const;

function sitemapEntry(
  siteUrl: string,
  path: string,
  lastModified?: Date,
): MetadataRoute.Sitemap[number] {
  return {
    url: path === "/" ? `${siteUrl}/` : `${siteUrl}${path}`,
    ...(lastModified ? { lastModified } : {}),
  };
}

export default function sitemap(): MetadataRoute.Sitemap {
  // Search discovery must never inherit a localhost, preview, or plaintext
  // origin from email/development configuration.
  const siteUrl = CANONICAL_SITE_URL;
  const { guaranteeEnabled } = getMarketingOfferConfig();

  const toolUrls = CALCULATOR_REGISTRY.map((calculator) =>
    sitemapEntry(siteUrl, `/tools/${calculator.slug}`),
  );
  const glossaryUrls = Object.values(GLOSSARY).map((entry) =>
    sitemapEntry(siteUrl, `/glossary/${entry.slug}`),
  );
  const stateUrls = Object.values(STATES).map((state) =>
    sitemapEntry(siteUrl, `/states/${state.slug}`),
  );
  const cityStrategyUrls = CITY_STRATEGY_COMBOS.map((combo) =>
    sitemapEntry(siteUrl, `/markets/${combo.citySlug}/${combo.strategy}`),
  );
  const marketCityUrls = MARKET_CITIES.map((city) =>
    sitemapEntry(siteUrl, `/markets/${city.slug}`),
  );
  const bespokeMarketUrls = BESPOKE_MARKETS.map((city) =>
    sitemapEntry(siteUrl, `/markets/${city.slug}`),
  );
  const topicUrls = [
    sitemapEntry(siteUrl, "/blog/topics"),
    ...BLOG_TOPICS.map((topic) =>
      sitemapEntry(siteUrl, `/blog/topics/${topic.slug}`),
    ),
  ];
  const blogUrls = BLOG_POSTS.filter((post) => post.available).map((post) =>
    sitemapEntry(
      siteUrl,
      `/blog/${post.slug}`,
      new Date(post.modifiedAt ?? post.publishedAt),
    ),
  );
  const comparisonUrls = [
    ...COMPARISON_PATHS.map((path) => sitemapEntry(siteUrl, path)),
    ...JUNE_2026_COMPARISON_PATHS.map((path) =>
      sitemapEntry(siteUrl, path, new Date("2026-06-07")),
    ),
  ];

  return [
    ...CORE_PATHS.map((path) => sitemapEntry(siteUrl, path)),
    sitemapEntry(
      siteUrl,
      "/tools/rental-property-spreadsheet",
      new Date("2026-07-14"),
    ),
    ...toolUrls,
    ...glossaryUrls,
    ...stateUrls,
    ...cityStrategyUrls,
    ...marketCityUrls,
    ...bespokeMarketUrls,
    ...topicUrls,
    ...blogUrls,
    ...comparisonUrls,
    ...(guaranteeEnabled ? [sitemapEntry(siteUrl, "/guarantee")] : []),
    ...(isAgentProConfigured() ? [sitemapEntry(siteUrl, "/for-agents")] : []),
  ];
}
