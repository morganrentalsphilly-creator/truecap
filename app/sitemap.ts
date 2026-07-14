import type { MetadataRoute } from "next";
import { CITY_STRATEGY_COMBOS } from "@/lib/city-strategy-combos";
import { MARKET_CITIES } from "@/lib/markets/cities";
import { GLOSSARY } from "@/lib/glossary";
import { STATES } from "@/lib/states";
import { getSiteUrl } from "@/lib/site-url";
import { CALCULATOR_REGISTRY } from "@/lib/calculator-registry";
import { BLOG_TOPICS } from "@/lib/blog-topics";
import { BLOG_POSTS } from "@/app/blog/page";

export default function sitemap(): MetadataRoute.Sitemap {
  const siteUrl = getSiteUrl();

  // lastModified policy: only emit a date we can stand behind — a blog
  // post's publishedAt or a hand-stamped content-release date. The evergreen
  // pages (tools, glossary, states, markets, hubs, static marketing pages)
  // used to stamp `lastModified: new Date()`, which re-declared ~250
  // unchanged URLs as "modified today" on EVERY deploy; once lastmod is
  // provably wrong, Google ignores it site-wide, devaluing the honest blog
  // dates on a site whose bottleneck is indexing coverage. Omitting
  // lastModified is valid per the sitemap spec and more truthful than
  // inventing dates — do not reintroduce build-time stamps here.

  // Calculator tool pages — derived from lib/calculator-registry.ts (the single
  // source of truth) so the sitemap can never drift from /tools again.
  const toolUrls: MetadataRoute.Sitemap = CALCULATOR_REGISTRY.map((c) => ({
    url: `${siteUrl}/tools/${c.slug}`,
    changeFrequency: "monthly" as const,
    priority: 0.8,
  }));

  // Per-glossary-term pages — one URL per term in lib/glossary.ts.
  // 30+ pages ranking for "what is X" / "X definition" long-tail queries.
  const glossaryUrls: MetadataRoute.Sitemap = Object.values(GLOSSARY).map(
    (entry) => ({
      url: `${siteUrl}/glossary/${entry.slug}`,
      changeFrequency: "monthly" as const,
      priority: 0.6,
    })
  );

  // Per-state investing pages — 15 URLs ranking for "investing in [state]"
  // and related state-level queries.
  const stateUrls: MetadataRoute.Sitemap = Object.values(STATES).map((s) => ({
    url: `${siteUrl}/states/${s.slug}`,
    changeFrequency: "monthly" as const,
    priority: 0.7,
  }));

  // City + strategy combo pages — 12+ long-tail URLs ranking for
  // "BRRRR Philadelphia" / "cash flow Cleveland" / "Section 8 Memphis"
  // and similar high-intent niche queries.
  const cityStrategyUrls: MetadataRoute.Sitemap = CITY_STRATEGY_COMBOS.map(
    (c) => ({
      url: `${siteUrl}/markets/${c.citySlug}/${c.strategy}`,
      changeFrequency: "monthly" as const,
      priority: 0.7,
    })
  );

  // Programmatic city market pages — data-driven /markets/[city] pages
  // from lib/markets/cities.ts (excludes the bespoke static market pages,
  // which are listed separately below).
  const marketCityUrls: MetadataRoute.Sitemap = MARKET_CITIES.map((c) => ({
    url: `${siteUrl}/markets/${c.slug}`,
    changeFrequency: "monthly" as const,
    priority: 0.7,
  }));

  // Blog topic hubs (P2-4) — the /blog/topics index + one hub per topic.
  const topicHubUrls: MetadataRoute.Sitemap = [
    {
      url: `${siteUrl}/blog/topics`,
      changeFrequency: "monthly" as const,
      priority: 0.6,
    },
    ...BLOG_TOPICS.map((t) => ({
      url: `${siteUrl}/blog/topics/${t.slug}`,
      changeFrequency: "monthly" as const,
      priority: 0.7,
    })),
  ];

  // Blog posts — derived from BLOG_POSTS (app/blog/page.tsx), the single
  // source of truth that /blog and llms.txt already render from. Deriving
  // here (not a hardcoded list) means new posts appear in the sitemap
  // automatically; the two can never drift again. publishedAt → lastModified
  // (Google ignores sitemap priority/changefreq).
  const blogUrls: MetadataRoute.Sitemap = BLOG_POSTS.filter(
    (p) => p.available
  ).map((p) => ({
    url: `${siteUrl}/blog/${p.slug}`,
    lastModified: new Date(p.publishedAt),
    changeFrequency: "monthly" as const,
    priority: 0.8,
  }));

  const entries: MetadataRoute.Sitemap = [
    ...glossaryUrls,
    ...stateUrls,
    ...cityStrategyUrls,
    ...marketCityUrls,
    ...topicHubUrls,
    ...blogUrls,
    {
      url: `${siteUrl}/markets`,
      changeFrequency: "weekly" as const,
      priority: 0.8,
    },
    {
      url: `${siteUrl}/states`,
      changeFrequency: "monthly" as const,
      priority: 0.7,
    },
    {
      url: `${siteUrl}/`,
      changeFrequency: "daily",
      priority: 1,
    },
    {
      url: `${siteUrl}/pricing`,
      changeFrequency: "monthly",
      priority: 0.9,
    },
    {
      url: `${siteUrl}/tools`,
      changeFrequency: "weekly",
      priority: 0.7,
    },
    ...toolUrls,
    {
      // /about — E-E-A-T founder page; anchors the Person @id that blog
      // Article schema references.
      url: `${siteUrl}/about`,
      changeFrequency: "yearly",
      priority: 0.5,
    },
    {
      url: `${siteUrl}/privacy`,
      changeFrequency: "yearly",
      priority: 0.3,
    },
    {
      url: `${siteUrl}/terms`,
      changeFrequency: "yearly",
      priority: 0.3,
    },
    {
      url: `${siteUrl}/blog`,
      changeFrequency: "weekly",
      priority: 0.7,
    },
    // NOTE deliberately absent: /feed.xml, /llms.txt, /llms-full.txt.
    // A sitemap urlset is for INDEXABLE HTML pages — feeds and llms.txt
    // are non-HTML resources that show up in GSC as "indexed, though
    // blocked"-style noise and dilute crawl signals on a young domain.
    // AI crawlers discover llms.txt by convention + the robots Allow.
    {
      url: `${siteUrl}/embed`,
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
      changeFrequency: "weekly",
      priority: 0.4,
    },
    {
      url: `${siteUrl}/glossary`,
      changeFrequency: "monthly",
      priority: 0.6,
    },
    {
      url: `${siteUrl}/methodology`,
      changeFrequency: "monthly",
      priority: 0.5,
    },
    {
      url: `${siteUrl}/why-truecap`,
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${siteUrl}/for-agents`,
      changeFrequency: "monthly",
      priority: 0.6,
    },
    {
      url: `${siteUrl}/for-flippers`,
      changeFrequency: "monthly",
      priority: 0.6,
    },
    {
      url: `${siteUrl}/for-buy-and-hold`,
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${siteUrl}/for-house-hackers`,
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${siteUrl}/for-brrrr`,
      changeFrequency: "monthly",
      priority: 0.7,
    },
    // /vs hub intentionally omitted — noindex (per user request to
    // hide the comparison hub from internal nav). Individual
    // /vs/<competitor> pages remain in the sitemap below.
    {
      url: `${siteUrl}/vs/dealcheck`,
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${siteUrl}/vs/bricked`,
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${siteUrl}/vs/stessa`,
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${siteUrl}/vs/mashvisor`,
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${siteUrl}/vs/biggerpockets-calculator`,
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${siteUrl}/vs/excel`,
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${siteUrl}/vs/rentometer`,
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${siteUrl}/vs/zillow-rent-estimate`,
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
    // Backfill — two older posts that never made it into the sitemap.
    {
      url: `${siteUrl}/blog/brrrr-method-explained`,
      lastModified: new Date("2026-05-26"),
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${siteUrl}/blog/vacancy-rate-rental-property`,
      lastModified: new Date("2026-05-26"),
      changeFrequency: "monthly",
      priority: 0.7,
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
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${siteUrl}/markets/cleveland`,
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${siteUrl}/markets/atlanta`,
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${siteUrl}/markets/houston`,
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${siteUrl}/markets/tampa`,
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${siteUrl}/markets/charlotte`,
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${siteUrl}/markets/indianapolis`,
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${siteUrl}/markets/kansas-city`,
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${siteUrl}/markets/dallas`,
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${siteUrl}/markets/detroit`,
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${siteUrl}/markets/memphis`,
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${siteUrl}/markets/phoenix`,
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
    // Batch A — 4 high-intent listicle posts (Jun 2026).
    {
      url: `${siteUrl}/blog/best-free-rental-property-calculator-2026`,
      lastModified: new Date("2026-06-07"),
      changeFrequency: "monthly",
      priority: 0.9,
    },
    {
      url: `${siteUrl}/blog/best-rental-property-calculator-for-brrrr`,
      lastModified: new Date("2026-06-07"),
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${siteUrl}/blog/best-rental-analysis-tool-for-house-hackers`,
      lastModified: new Date("2026-06-07"),
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${siteUrl}/blog/best-short-term-rental-analysis-tool-2026`,
      lastModified: new Date("2026-06-07"),
      changeFrequency: "monthly",
      priority: 0.8,
    },
    // Batch B — 4 strategy / long-form educational posts (Jun 2026).
    {
      url: `${siteUrl}/blog/short-term-rental-underwriting-playbook`,
      lastModified: new Date("2026-06-07"),
      changeFrequency: "monthly",
      priority: 0.9,
    },
    {
      url: `${siteUrl}/blog/hard-money-vs-dscr-loan`,
      lastModified: new Date("2026-06-07"),
      changeFrequency: "monthly",
      priority: 0.9,
    },
    {
      url: `${siteUrl}/blog/bonus-depreciation-rental-property-2026`,
      lastModified: new Date("2026-06-07"),
      changeFrequency: "monthly",
      priority: 0.9,
    },
    {
      url: `${siteUrl}/blog/house-hack-underwriting-guide`,
      lastModified: new Date("2026-06-07"),
      changeFrequency: "monthly",
      priority: 0.9,
    },
    // Batch C — 3 calculator how-to posts (Jun 2026).
    {
      url: `${siteUrl}/blog/how-to-calculate-cap-rate`,
      lastModified: new Date("2026-06-07"),
      changeFrequency: "monthly",
      priority: 0.85,
    },
    {
      url: `${siteUrl}/blog/how-to-calculate-cash-on-cash-return`,
      lastModified: new Date("2026-06-07"),
      changeFrequency: "monthly",
      priority: 0.85,
    },
    {
      url: `${siteUrl}/blog/how-to-calculate-dscr`,
      lastModified: new Date("2026-06-07"),
      changeFrequency: "monthly",
      priority: 0.85,
    },
  ];

  // Defensive de-dup by URL (keeps first occurrence) so the derived blog
  // list and the legacy hardcoded blog entries below can't double-list a
  // post. New posts flow in via blogUrls above; the hardcoded blog entries
  // are now redundant and can be pruned in a follow-up.
  const seen = new Set<string>();
  return entries.filter((e) => {
    if (seen.has(e.url)) return false;
    seen.add(e.url);
    return true;
  });
}
