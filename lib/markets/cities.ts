/**
 * Programmatic city dataset for the dynamic /markets/[city] template.
 *
 * Each entry powers one data-driven local-SEO landing page targeting
 * queries like:
 *   - "philadelphia rental property analysis"
 *   - "columbus cap rate"
 *   - "is cincinnati good for rental property"
 *   - "average rent + property tax {city}"
 *
 * Design notes:
 * - Cap-rate context and property-tax % are NOT stored here. They are
 *   looked up at render time from the single sources of truth:
 *     getCapRateBenchmark()  (lib/market-benchmarks.ts)
 *     getStatePropertyTaxPct() (lib/property-enrichment/state-property-tax.ts)
 *   so this file never drifts from the numbers the analyzer itself uses.
 * - typicalRent / typicalPrice are RANGES presented as estimates (same
 *   convention as lib/market-benchmarks.ts and city-strategy-combos.ts).
 *   The embedded analyzer is the authoritative, per-address number.
 * - Slugs here MUST NOT collide with the bespoke static pages in
 *   app/markets/<city>/page.tsx (philadelphia, atlanta, charlotte,
 *   cleveland, dallas, detroit, houston, indianapolis, kansas-city,
 *   memphis, phoenix, tampa). Next.js static routes win, so a collision
 *   would silently shadow this template. BESPOKE_MARKET_SLUGS guards it.
 */

/** Static bespoke market pages that already exist under app/markets/<slug>/page.tsx. */
export const BESPOKE_MARKET_SLUGS = new Set<string>([
  "philadelphia",
  "atlanta",
  "charlotte",
  "cleveland",
  "dallas",
  "detroit",
  "houston",
  "indianapolis",
  "kansas-city",
  "memphis",
  "phoenix",
  "tampa",
]);

export type MarketNeighborhood = { name: string; why: string };

export type MarketCity = {
  slug: string;
  /** Display city name, e.g. "Columbus". */
  name: string;
  /** 2-letter state code, used for tax + cap-rate lookups. */
  stateCode: string;
  /** Full state name for prose + schema. */
  stateName: string;
  /** 1-2 sentence, specific, why-invest-here summary. Unique per city. */
  blurb: string;
  /** Representative monthly rent range for a typical SFR / small multi (estimate). */
  typicalRent: string;
  /** Representative all-in purchase price range (estimate). */
  typicalPrice: string;
  /** Why this market suits TrueCap's cash-flow-focused audience. */
  investorAngle: string;
  /** 3 neighborhoods worth a look (qualitative). */
  neighborhoods: MarketNeighborhood[];
  /** Related blog slugs for internal linking (must exist under app/blog/). */
  relatedPosts: string[];
};

export const MARKET_CITIES: MarketCity[] = [
  {
    slug: "columbus",
    name: "Columbus",
    stateCode: "OH",
    stateName: "Ohio",
    blurb:
      "Columbus pairs Midwest pricing with above-average population and job growth — a rare combination that gives investors cash flow today and a real appreciation tailwind.",
    typicalRent: "$1,300–$1,900/mo",
    typicalPrice: "$180,000–$280,000",
    investorAngle:
      "Landlord-friendly Ohio law, a large university + state-government employment base, and steady in-migration make Columbus one of the most balanced buy-and-hold markets in the country. Cap rates run healthy without the deep-distress risk of pure cash-flow metros.",
    neighborhoods: [
      { name: "Hilltop", why: "Lower entry prices, value-add SFR stock, improving demand." },
      { name: "Linden", why: "Aggressive cash flow with more management intensity — not for first-timers." },
      { name: "Whitehall", why: "Stable working-class rentals near job centers; reliable tenant pool." },
    ],
    relatedPosts: ["what-is-a-good-cap-rate", "best-states-for-rental-investors-2026", "how-to-underwrite-a-rental-property-in-60-seconds"],
  },
  {
    slug: "cincinnati",
    name: "Cincinnati",
    stateCode: "OH",
    stateName: "Ohio",
    blurb:
      "Cincinnati is a classic cash-flow market: low purchase prices, solid rent-to-price ratios, and stable blue-chip employers that keep vacancy low.",
    typicalRent: "$1,200–$1,800/mo",
    typicalPrice: "$150,000–$240,000",
    investorAngle:
      "Diversified employment (P&G, Kroger, healthcare) and affordable B-class stock make Cincinnati friendly to first deals. The 1% rule still passes in several neighborhoods — rare in 2026.",
    neighborhoods: [
      { name: "Westwood", why: "Largest neighborhood, deep SFR + small-multi inventory at low prices." },
      { name: "Northside", why: "Gentrifying, better appreciation, tighter cash flow." },
      { name: "Price Hill", why: "Strong cash flow, value-add upside, screen tenants carefully." },
    ],
    relatedPosts: ["what-is-a-good-cap-rate", "spot-bad-rental-in-60-seconds", "cap-rate-vs-cash-on-cash-vs-dscr"],
  },
  {
    slug: "pittsburgh",
    name: "Pittsburgh",
    stateCode: "PA",
    stateName: "Pennsylvania",
    blurb:
      "Pittsburgh offers some of the lowest entry prices of any major metro, anchored by a recession-resistant 'eds and meds' economy that keeps rental demand steady.",
    typicalRent: "$1,100–$1,700/mo",
    typicalPrice: "$120,000–$220,000",
    investorAngle:
      "Universities and hospitals (UPMC, CMU, Pitt) stabilize tenant demand, and cheap rowhouse stock supports strong cash-on-cash. Watch older-home capex — budget reserves honestly.",
    neighborhoods: [
      { name: "Brookline", why: "Affordable, stable, owner-occupant-heavy — quality long-term tenants." },
      { name: "Lawrenceville", why: "Gentrified, appreciation-led, lower yields." },
      { name: "Beechview", why: "Lower entry with upside as transit-adjacent demand grows." },
    ],
    relatedPosts: ["capex-maintenance-reserves-rental-property", "what-is-a-good-cap-rate", "brrrr-method-explained"],
  },
  {
    slug: "baltimore",
    name: "Baltimore",
    stateCode: "MD",
    stateName: "Maryland",
    blurb:
      "Baltimore is a high-cap, high-screening market: rowhouse prices stay low while rents hold up, but neighborhood selection makes or breaks the deal.",
    typicalRent: "$1,300–$1,900/mo",
    typicalPrice: "$130,000–$240,000",
    investorAngle:
      "Yields look excellent on paper; the discipline is in block-by-block selection and honest vacancy/turnover assumptions. Strong fit for experienced operators using DSCR financing.",
    neighborhoods: [
      { name: "Hamilton", why: "Stable northeast SFR pocket, owner-occupant feel, steady tenants." },
      { name: "Canton", why: "Premium waterfront rowhomes — appreciation and young-professional renters." },
      { name: "Highlandtown", why: "Value-add rowhomes with upside as the area improves." },
    ],
    relatedPosts: ["vacancy-rate-rental-property", "dscr-loans-explained", "what-is-a-good-cap-rate"],
  },
  {
    slug: "st-louis",
    name: "St. Louis",
    stateCode: "MO",
    stateName: "Missouri",
    blurb:
      "St. Louis is a dependable cash-flow market with low prices, brick-built housing stock, and rent ratios that still clear the screening thresholds many coastal markets can't.",
    typicalRent: "$1,100–$1,600/mo",
    typicalPrice: "$120,000–$210,000",
    investorAngle:
      "Affordable entry plus durable brick construction lowers long-run capex risk. A good first-market for buy-and-hold investors who want yield without deep rehab exposure.",
    neighborhoods: [
      { name: "Tower Grove South", why: "Desirable, stable rentals with appreciation upside." },
      { name: "Dutchtown", why: "High cash flow, value-add, more hands-on management." },
      { name: "Affton (county)", why: "Owner-occupant-grade SFRs, low vacancy, easy to manage." },
    ],
    relatedPosts: ["what-is-a-good-cap-rate", "single-family-vs-multi-family-rental", "how-to-underwrite-a-rental-property-in-60-seconds"],
  },
  {
    slug: "milwaukee",
    name: "Milwaukee",
    stateCode: "WI",
    stateName: "Wisconsin",
    blurb:
      "Milwaukee is a duplex investor's market — abundant 2–4 unit stock at modest prices makes house-hacking and small-multi cash flow unusually accessible.",
    typicalRent: "$1,200–$1,800/mo",
    typicalPrice: "$150,000–$250,000",
    investorAngle:
      "The deep supply of small multifamily is the edge here: live in one unit, rent the rest, and let tenants cover the mortgage. Verify lead-paint compliance on pre-1978 stock.",
    neighborhoods: [
      { name: "Bay View", why: "Popular, walkable, strong rental demand and appreciation." },
      { name: "Riverwest", why: "Eclectic, renter-heavy, solid duplex inventory." },
      { name: "West Allis", why: "Affordable suburban-feel duplexes, reliable tenants." },
    ],
    relatedPosts: ["house-hacking-explained", "single-family-vs-multi-family-rental", "what-is-a-good-cap-rate"],
  },
  {
    slug: "san-antonio",
    name: "San Antonio",
    stateCode: "TX",
    stateName: "Texas",
    blurb:
      "San Antonio blends steady population growth and a large military presence with no state income tax — appreciation is moderate but tenant demand is exceptionally stable.",
    typicalRent: "$1,400–$1,900/mo",
    typicalPrice: "$200,000–$300,000",
    investorAngle:
      "Military relocations and a diversified economy keep occupancy high. The catch is Texas property taxes — model the real effective rate, because it can swing cash flow hard.",
    neighborhoods: [
      { name: "Northeast (near Randolph AFB)", why: "Steady military tenant demand, low vacancy." },
      { name: "Alamo Heights edges", why: "Premium adjacency at lower entry — appreciation play." },
      { name: "Far West Side", why: "Newer SFR rentals, family tenants, manageable upkeep." },
    ],
    relatedPosts: ["rental-property-tax-deductions", "what-is-a-good-cap-rate", "rental-property-pro-forma-explained"],
  },
  {
    slug: "jacksonville",
    name: "Jacksonville",
    stateCode: "FL",
    stateName: "Florida",
    blurb:
      "Jacksonville is Florida's value play: strong in-migration and no state income tax, at prices well below Miami, Tampa, or Orlando.",
    typicalRent: "$1,500–$2,100/mo",
    typicalPrice: "$230,000–$330,000",
    investorAngle:
      "Growth-market upside with cash flow that still works — but insurance is the swing factor in Florida. Quote it before you offer and underwrite it as a real line item, not an afterthought.",
    neighborhoods: [
      { name: "Arlington", why: "Affordable SFRs, steady working tenant base." },
      { name: "Westside", why: "Lower entry, value-add stock, solid rent ratios." },
      { name: "Riverside/Avondale edges", why: "Appreciation-led, younger renters, tighter yields." },
    ],
    relatedPosts: ["what-is-a-good-cap-rate", "best-states-for-rental-investors-2026", "spot-bad-rental-in-60-seconds"],
  },
  {
    slug: "birmingham",
    name: "Birmingham",
    stateCode: "AL",
    stateName: "Alabama",
    blurb:
      "Birmingham is one of the highest-cap-rate metros in the country and a hub for turnkey rental providers — yield is the whole thesis here.",
    typicalRent: "$1,100–$1,600/mo",
    typicalPrice: "$130,000–$220,000",
    investorAngle:
      "Low prices + healthy rents produce strong cash-on-cash, which is why out-of-state and turnkey buyers flock here. Vet operators and neighborhoods carefully — averages hide wide block-level spreads.",
    neighborhoods: [
      { name: "Crestwood", why: "Desirable, stable, appreciation plus solid rents." },
      { name: "Center Point", why: "Affordable SFRs, strong cash flow, popular with turnkey buyers." },
      { name: "Hoover (suburb)", why: "Owner-occupant-grade rentals, top schools, low vacancy." },
    ],
    relatedPosts: ["what-is-a-good-cap-rate", "section-8-rental-property-investing", "how-to-underwrite-a-rental-property-in-60-seconds"],
  },
  {
    slug: "louisville",
    name: "Louisville",
    stateCode: "KY",
    stateName: "Kentucky",
    blurb:
      "Louisville is a stable, affordable cash-flow market anchored by logistics (UPS Worldport) and healthcare — steady demand, low volatility, easy entry.",
    typicalRent: "$1,200–$1,700/mo",
    typicalPrice: "$160,000–$250,000",
    investorAngle:
      "A dependable first or second market: prices stay reasonable, the economy is recession-resistant, and B-class SFRs rent quickly. Appreciation is modest but reliable.",
    neighborhoods: [
      { name: "Germantown", why: "Walkable, popular with renters, steady appreciation." },
      { name: "Okolona", why: "Affordable SFRs near logistics jobs, low vacancy." },
      { name: "Shively", why: "Strong cash flow, value-add stock, working-tenant base." },
    ],
    relatedPosts: ["what-is-a-good-cap-rate", "single-family-vs-multi-family-rental", "cap-rate-vs-cash-on-cash-vs-dscr"],
  },
];

const MARKET_CITY_BY_SLUG = new Map(MARKET_CITIES.map((c) => [c.slug, c]));

/** Look up a programmatic market city by slug (returns undefined for bespoke or unknown slugs). */
export function getMarketCity(slug: string): MarketCity | undefined {
  return MARKET_CITY_BY_SLUG.get(slug);
}

/** Slugs to pre-render for the dynamic template — excludes any bespoke collisions as a safety net. */
export function getMarketCityParams(): { city: string }[] {
  return MARKET_CITIES.filter((c) => !BESPOKE_MARKET_SLUGS.has(c.slug)).map((c) => ({
    city: c.slug,
  }));
}
