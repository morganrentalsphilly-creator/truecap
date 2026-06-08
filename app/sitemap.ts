import type { MetadataRoute } from "next";
import { CITY_STRATEGY_COMBOS } from "@/lib/city-strategy-combos";
import { GLOSSARY } from "@/lib/glossary";
import { STATES } from "@/lib/states";
import { getSiteUrl } from "@/lib/site-url";

export default function sitemap(): MetadataRoute.Sitemap {
  const siteUrl = getSiteUrl();

  // Per-glossary-term pages — one URL per term in lib/glossary.ts.
  // 30+ pages ranking for "what is X" / "X definition" long-tail queries.
  const glossaryUrls: MetadataRoute.Sitemap = Object.values(GLOSSARY).map(
    (entry) => ({
      url: `${siteUrl}/glossary/${entry.slug}`,
      lastModified: new Date(),
      changeFrequency: "monthly" as const,
      priority: 0.6,
    })
  );

  // Per-state investing pages — 15 URLs ranking for "investing in [state]"
  // and related state-level queries.
  const stateUrls: MetadataRoute.Sitemap = Object.values(STATES).map((s) => ({
    url: `${siteUrl}/states/${s.slug}`,
    lastModified: new Date(),
    changeFrequency: "monthly" as const,
    priority: 0.7,
  }));

  // City + strategy combo pages — 12+ long-tail URLs ranking for
  // "BRRRR Philadelphia" / "cash flow Cleveland" / "Section 8 Memphis"
  // and similar high-intent niche queries.
  const cityStrategyUrls: MetadataRoute.Sitemap = CITY_STRATEGY_COMBOS.map(
    (c) => ({
      url: `${siteUrl}/markets/${c.citySlug}/${c.strategy}`,
      lastModified: new Date(),
      changeFrequency: "monthly" as const,
      priority: 0.7,
    })
  );

  return [
    ...glossaryUrls,
    ...stateUrls,
    ...cityStrategyUrls,
    {
      url: `${siteUrl}/states`,
      lastModified: new Date(),
      changeFrequency: "monthly" as const,
      priority: 0.7,
    },
    {
      url: `${siteUrl}/`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1,
    },
    {
      url: `${siteUrl}/pricing`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.9,
    },
    {
      url: `${siteUrl}/tools`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.7,
    },
    {
      url: `${siteUrl}/tools/cap-rate-calculator`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${siteUrl}/tools/cash-on-cash-calculator`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${siteUrl}/tools/brrrr-calculator`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${siteUrl}/tools/1-percent-rule-calculator`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${siteUrl}/tools/rehab-cost-estimator`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${siteUrl}/tools/dscr-calculator`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${siteUrl}/tools/noi-calculator`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${siteUrl}/tools/mortgage-payment-calculator`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${siteUrl}/tools/gross-rent-multiplier-calculator`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${siteUrl}/tools/break-even-calculator`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${siteUrl}/tools/roi-calculator`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${siteUrl}/tools/closing-cost-calculator`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${siteUrl}/tools/vacancy-rate-calculator`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${siteUrl}/tools/rental-property-tax-calculator`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${siteUrl}/privacy`,
      lastModified: new Date(),
      changeFrequency: "yearly",
      priority: 0.3,
    },
    {
      url: `${siteUrl}/terms`,
      lastModified: new Date(),
      changeFrequency: "yearly",
      priority: 0.3,
    },
    {
      url: `${siteUrl}/blog`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.7,
    },
    {
      url: `${siteUrl}/feed.xml`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.5,
    },
    {
      url: `${siteUrl}/llms.txt`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.5,
    },
    {
      url: `${siteUrl}/llms-full.txt`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.5,
    },
    {
      url: `${siteUrl}/embed`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.6,
    },
    {
      url: `${siteUrl}/blog/how-to-underwrite-a-rental-property-in-60-seconds`,
      lastModified: new Date("2026-05-24"),
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${siteUrl}/blog/cap-rate-vs-cash-on-cash-vs-dscr`,
      lastModified: new Date("2026-05-24"),
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${siteUrl}/blog/dscr-loans-explained`,
      lastModified: new Date("2026-05-24"),
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${siteUrl}/blog/what-is-a-good-cap-rate`,
      lastModified: new Date("2026-05-24"),
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${siteUrl}/blog/cash-flow-vs-appreciation`,
      lastModified: new Date("2026-05-24"),
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${siteUrl}/changelog`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.4,
    },
    {
      url: `${siteUrl}/glossary`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.6,
    },
    {
      url: `${siteUrl}/methodology`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.5,
    },
    {
      url: `${siteUrl}/for-agents`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.6,
    },
    {
      url: `${siteUrl}/for-flippers`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.6,
    },
    {
      url: `${siteUrl}/for-buy-and-hold`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${siteUrl}/for-house-hackers`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${siteUrl}/for-brrrr`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.7,
    },
    // /vs hub intentionally omitted — noindex (per user request to
    // hide the comparison hub from internal nav). Individual
    // /vs/<competitor> pages remain in the sitemap below.
    {
      url: `${siteUrl}/vs/dealcheck`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${siteUrl}/vs/stessa`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${siteUrl}/vs/mashvisor`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${siteUrl}/vs/biggerpockets-calculator`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${siteUrl}/vs/excel`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${siteUrl}/vs/rentometer`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${siteUrl}/vs/zillow-rent-estimate`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${siteUrl}/vs/roofstock`,
      lastModified: new Date("2026-06-07"),
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${siteUrl}/vs/rentredi`,
      lastModified: new Date("2026-06-07"),
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${siteUrl}/vs/avail`,
      lastModified: new Date("2026-06-07"),
      changeFrequency: "monthly",
      priority: 0.7,
    },
    // 11 new /vs library expansions (Jun 2026 batch).
    { url: `${siteUrl}/vs/propstream`,       lastModified: new Date("2026-06-07"), changeFrequency: "monthly", priority: 0.8 },
    { url: `${siteUrl}/vs/rentcast`,         lastModified: new Date("2026-06-07"), changeFrequency: "monthly", priority: 0.7 },
    { url: `${siteUrl}/vs/turbotenant`,      lastModified: new Date("2026-06-07"), changeFrequency: "monthly", priority: 0.8 },
    { url: `${siteUrl}/vs/baselane`,         lastModified: new Date("2026-06-07"), changeFrequency: "monthly", priority: 0.7 },
    { url: `${siteUrl}/vs/buildium`,         lastModified: new Date("2026-06-07"), changeFrequency: "monthly", priority: 0.7 },
    { url: `${siteUrl}/vs/appfolio`,         lastModified: new Date("2026-06-07"), changeFrequency: "monthly", priority: 0.7 },
    { url: `${siteUrl}/vs/rentec-direct`,    lastModified: new Date("2026-06-07"), changeFrequency: "monthly", priority: 0.6 },
    { url: `${siteUrl}/vs/landlord-studio`,  lastModified: new Date("2026-06-07"), changeFrequency: "monthly", priority: 0.6 },
    { url: `${siteUrl}/vs/rentspree`,        lastModified: new Date("2026-06-07"), changeFrequency: "monthly", priority: 0.6 },
    { url: `${siteUrl}/vs/hostfully`,        lastModified: new Date("2026-06-07"), changeFrequency: "monthly", priority: 0.6 },
    { url: `${siteUrl}/vs/cozy`,             lastModified: new Date("2026-06-07"), changeFrequency: "monthly", priority: 0.5 },
    // Round-3 /vs library expansion (Jun 2026).
    { url: `${siteUrl}/vs/dealmachine`,      lastModified: new Date("2026-06-07"), changeFrequency: "monthly", priority: 0.8 },
    { url: `${siteUrl}/vs/batchleads`,       lastModified: new Date("2026-06-07"), changeFrequency: "monthly", priority: 0.7 },
    { url: `${siteUrl}/vs/yardi-breeze`,     lastModified: new Date("2026-06-07"), changeFrequency: "monthly", priority: 0.6 },
    { url: `${siteUrl}/vs/hostaway`,         lastModified: new Date("2026-06-07"), changeFrequency: "monthly", priority: 0.7 },
    { url: `${siteUrl}/vs/airdna`,           lastModified: new Date("2026-06-07"), changeFrequency: "monthly", priority: 0.8 },
    { url: `${siteUrl}/vs/arrived`,          lastModified: new Date("2026-06-07"), changeFrequency: "monthly", priority: 0.7 },
    // Round-4 /vs library expansion (Jun 2026).
    { url: `${siteUrl}/vs/fundrise`,          lastModified: new Date("2026-06-07"), changeFrequency: "monthly", priority: 0.7 },
    { url: `${siteUrl}/vs/lodgify`,           lastModified: new Date("2026-06-07"), changeFrequency: "monthly", priority: 0.6 },
    { url: `${siteUrl}/vs/guesty`,            lastModified: new Date("2026-06-07"), changeFrequency: "monthly", priority: 0.6 },
    { url: `${siteUrl}/vs/crexi`,             lastModified: new Date("2026-06-07"), changeFrequency: "monthly", priority: 0.6 },
    { url: `${siteUrl}/vs/reonomy`,           lastModified: new Date("2026-06-07"), changeFrequency: "monthly", priority: 0.5 },
    { url: `${siteUrl}/vs/privy`,             lastModified: new Date("2026-06-07"), changeFrequency: "monthly", priority: 0.6 },
    { url: `${siteUrl}/vs/quickbooks-rental`, lastModified: new Date("2026-06-07"), changeFrequency: "monthly", priority: 0.6 },
    // Niche use-case /vs pages (long-tail audience slicing).
    { url: `${siteUrl}/vs/dealcheck-for-brrrr`,              lastModified: new Date("2026-06-07"), changeFrequency: "monthly", priority: 0.7 },
    { url: `${siteUrl}/vs/biggerpockets-for-house-hacking`,  lastModified: new Date("2026-06-07"), changeFrequency: "monthly", priority: 0.7 },
    { url: `${siteUrl}/vs/dealcheck-for-fix-and-flip`,         lastModified: new Date("2026-06-07"), changeFrequency: "monthly", priority: 0.7 },
    { url: `${siteUrl}/vs/dealcheck-for-short-term-rentals`,   lastModified: new Date("2026-06-07"), changeFrequency: "monthly", priority: 0.7 },
    { url: `${siteUrl}/vs/mashvisor-for-short-term-rentals`,   lastModified: new Date("2026-06-07"), changeFrequency: "monthly", priority: 0.7 },
    {
      url: `${siteUrl}/blog/rental-property-tax-deductions`,
      lastModified: new Date("2026-05-26"),
      changeFrequency: "monthly",
      priority: 0.9,
    },
    {
      url: `${siteUrl}/blog/how-to-find-off-market-rental-properties`,
      lastModified: new Date("2026-05-26"),
      changeFrequency: "monthly",
      priority: 0.9,
    },
    {
      url: `${siteUrl}/blog/rental-property-pro-forma-explained`,
      lastModified: new Date("2026-05-26"),
      changeFrequency: "monthly",
      priority: 0.9,
    },
    {
      url: `${siteUrl}/blog/how-to-refinance-a-rental-property`,
      lastModified: new Date("2026-05-26"),
      changeFrequency: "monthly",
      priority: 0.9,
    },
    {
      url: `${siteUrl}/blog/single-family-vs-multi-family-rental`,
      lastModified: new Date("2026-05-27"),
      changeFrequency: "monthly",
      priority: 0.9,
    },
    {
      url: `${siteUrl}/blog/how-to-estimate-rehab-costs`,
      lastModified: new Date("2026-05-27"),
      changeFrequency: "monthly",
      priority: 0.9,
    },
    {
      url: `${siteUrl}/markets/philadelphia`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${siteUrl}/markets/cleveland`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${siteUrl}/markets/atlanta`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${siteUrl}/markets/houston`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${siteUrl}/markets/tampa`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${siteUrl}/markets/charlotte`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${siteUrl}/markets/indianapolis`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${siteUrl}/markets/kansas-city`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${siteUrl}/markets/dallas`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${siteUrl}/markets/detroit`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${siteUrl}/markets/memphis`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${siteUrl}/markets/phoenix`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${siteUrl}/blog/house-hacking-explained`,
      lastModified: new Date("2026-05-25"),
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${siteUrl}/blog/best-states-for-rental-investors-2026`,
      lastModified: new Date("2026-05-25"),
      changeFrequency: "monthly",
      priority: 0.9,
    },
    {
      url: `${siteUrl}/blog/1031-exchange-basics`,
      lastModified: new Date("2026-05-25"),
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${siteUrl}/blog/50-percent-rule-rentals`,
      lastModified: new Date("2026-05-25"),
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${siteUrl}/blog/property-management-yes-or-no`,
      lastModified: new Date("2026-05-25"),
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${siteUrl}/blog/spot-bad-rental-in-60-seconds`,
      lastModified: new Date("2026-05-24"),
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${siteUrl}/blog/cash-on-cash-vs-irr`,
      lastModified: new Date("2026-05-24"),
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${siteUrl}/blog/dealcheck-vs-stessa-vs-truecap`,
      lastModified: new Date("2026-06-07"),
      changeFrequency: "monthly",
      priority: 0.9,
    },
    {
      url: `${siteUrl}/blog/how-truecap-verdict-engine-works`,
      lastModified: new Date("2026-06-07"),
      changeFrequency: "monthly",
      priority: 0.8,
    },
    // 3 three-way comparison blog posts (Jun 2026 batch).
    {
      url: `${siteUrl}/blog/dealcheck-vs-biggerpockets-vs-truecap`,
      lastModified: new Date("2026-06-07"),
      changeFrequency: "monthly",
      priority: 0.9,
    },
    {
      url: `${siteUrl}/blog/stessa-vs-avail-vs-baselane`,
      lastModified: new Date("2026-06-07"),
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${siteUrl}/blog/roofstock-vs-mashvisor-vs-propstream`,
      lastModified: new Date("2026-06-07"),
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${siteUrl}/blog/hostfully-vs-hostaway-vs-guesty`,
      lastModified: new Date("2026-06-07"),
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${siteUrl}/blog/best-rental-property-calculator-2026`,
      lastModified: new Date("2026-06-07"),
      changeFrequency: "monthly",
      priority: 0.9,
    },
  ];
}
