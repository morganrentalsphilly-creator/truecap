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
  {
    slug: "nashville",
    name: "Nashville",
    stateCode: "TN",
    stateName: "Tennessee",
    blurb:
      "Nashville is a growth-market favorite — strong in-migration, a diversified economy (healthcare, music, tech), and no state income tax — though appreciation has compressed cap rates.",
    typicalRent: "$1,800–$2,500/mo",
    typicalPrice: "$330,000–$450,000",
    investorAngle:
      "Buy here for appreciation and rent growth, not day-one cash flow — many deals run thin until rents catch up. Best for investors with reserves and a longer hold.",
    neighborhoods: [
      { name: "Antioch", why: "More affordable SFRs, steady demand, better rent ratios." },
      { name: "Madison", why: "Value relative to the core, improving area, solid rentals." },
      { name: "East Nashville edges", why: "Appreciation-led, younger renters, premium pricing." },
    ],
    relatedPosts: ["cash-flow-vs-appreciation", "what-is-a-good-cap-rate", "best-states-for-rental-investors-2026"],
  },
  {
    slug: "raleigh",
    name: "Raleigh",
    stateCode: "NC",
    stateName: "North Carolina",
    blurb:
      "Raleigh rides the Research Triangle's tech and university engine — fast job growth and educated renters, with appreciation that outpaces day-one cash flow.",
    typicalRent: "$1,600–$2,200/mo",
    typicalPrice: "$320,000–$430,000",
    investorAngle:
      "A growth play: vacancy is low and rents keep rising, but entry prices mean modest cash flow up front. Strong for buy-and-hold with a 5+ year horizon.",
    neighborhoods: [
      { name: "Southeast Raleigh", why: "Lower entry, gentrifying, real upside." },
      { name: "Garner", why: "Affordable suburb, family renters, stable demand." },
      { name: "Durham edges", why: "Triangle demand at better acquisition prices." },
    ],
    relatedPosts: ["cash-flow-vs-appreciation", "what-is-a-good-cap-rate", "how-to-underwrite-a-rental-property-in-60-seconds"],
  },
  {
    slug: "richmond",
    name: "Richmond",
    stateCode: "VA",
    stateName: "Virginia",
    blurb:
      "Richmond offers East Coast stability at mid-market prices — government, university, and healthcare employment keep demand steady through cycles.",
    typicalRent: "$1,400–$2,000/mo",
    typicalPrice: "$250,000–$360,000",
    investorAngle:
      "A balanced market: decent cash flow with real appreciation and low volatility. A good second market for investors diversifying out of pure cash-flow metros.",
    neighborhoods: [
      { name: "Southside", why: "Affordable SFRs, value-add, solid rent ratios." },
      { name: "Church Hill", why: "Historic, gentrifying, appreciation upside." },
      { name: "Henrico County", why: "Suburban, owner-occupant-grade, low vacancy." },
    ],
    relatedPosts: ["what-is-a-good-cap-rate", "single-family-vs-multi-family-rental", "best-states-for-rental-investors-2026"],
  },
  {
    slug: "columbia",
    name: "Columbia",
    stateCode: "SC",
    stateName: "South Carolina",
    blurb:
      "Columbia, South Carolina's capital, pairs a university and state-government anchor with low prices — a quietly strong cash-flow market.",
    typicalRent: "$1,200–$1,700/mo",
    typicalPrice: "$180,000–$270,000",
    investorAngle:
      "Affordable entry, steady USC + government tenant demand, and landlord-friendly law. A solid first market for cash-flow-focused buyers.",
    neighborhoods: [
      { name: "Northeast Columbia", why: "Newer SFRs, family renters, low vacancy." },
      { name: "West Columbia", why: "Affordable, value-add, good rent ratios." },
      { name: "Forest Acres", why: "Stable, owner-occupant feel, reliable tenants." },
    ],
    relatedPosts: ["what-is-a-good-cap-rate", "section-8-rental-property-investing", "how-to-underwrite-a-rental-property-in-60-seconds"],
  },
  {
    slug: "greenville",
    name: "Greenville",
    stateCode: "SC",
    stateName: "South Carolina",
    blurb:
      "Greenville is one of the Southeast's fastest-growing small metros — a revitalized downtown and a manufacturing base (BMW, Michelin) driving steady rental demand.",
    typicalRent: "$1,400–$1,900/mo",
    typicalPrice: "$230,000–$330,000",
    investorAngle:
      "Growth plus reasonable entry: cash flow is achievable and appreciation has been strong. Downtown-adjacent pricing has run up — the math is better a ring out.",
    neighborhoods: [
      { name: "Berea", why: "Affordable, improving, good rent ratios." },
      { name: "Wade Hampton", why: "Stable suburban rentals, family demand." },
      { name: "Mauldin", why: "Growing suburb, newer stock, low vacancy." },
    ],
    relatedPosts: ["cash-flow-vs-appreciation", "what-is-a-good-cap-rate", "best-states-for-rental-investors-2026"],
  },
  {
    slug: "oklahoma-city",
    name: "Oklahoma City",
    stateCode: "OK",
    stateName: "Oklahoma",
    blurb:
      "Oklahoma City is a textbook cash-flow market — low prices, healthy rents, and an economy anchored by energy, aerospace, and government.",
    typicalRent: "$1,100–$1,600/mo",
    typicalPrice: "$160,000–$250,000",
    investorAngle:
      "Strong rent-to-price ratios make day-one cash flow realistic, and Oklahoma is landlord-friendly. Appreciation is modest, so underwrite for yield, not equity growth.",
    neighborhoods: [
      { name: "The Village", why: "Affordable SFRs, central, reliable tenants." },
      { name: "Midwest City", why: "Near Tinker AFB — steady military demand." },
      { name: "Del City", why: "Low entry, strong cash flow, value-add." },
    ],
    relatedPosts: ["what-is-a-good-cap-rate", "spot-bad-rental-in-60-seconds", "cap-rate-vs-cash-on-cash-vs-dscr"],
  },
  {
    slug: "tulsa",
    name: "Tulsa",
    stateCode: "OK",
    stateName: "Oklahoma",
    blurb:
      "Tulsa offers some of the lowest entry prices among growing metros, with cash flow that still clears screening thresholds most markets can't.",
    typicalRent: "$1,050–$1,500/mo",
    typicalPrice: "$140,000–$230,000",
    investorAngle:
      "A pure yield market: cheap acquisition plus solid rents. Tulsa Remote and a diversifying economy add demand stability. Budget capex honestly on older stock.",
    neighborhoods: [
      { name: "Midtown edges", why: "Value-add SFRs, improving demand." },
      { name: "Broken Arrow", why: "Suburb with newer stock, family renters, low vacancy." },
      { name: "East Tulsa", why: "Affordable, strong cash flow, more management." },
    ],
    relatedPosts: ["what-is-a-good-cap-rate", "capex-maintenance-reserves-rental-property", "how-to-underwrite-a-rental-property-in-60-seconds"],
  },
  {
    slug: "omaha",
    name: "Omaha",
    stateCode: "NE",
    stateName: "Nebraska",
    blurb:
      "Omaha is a stability play — a diversified, recession-resistant economy (insurance, finance, agriculture) with low volatility and dependable rents.",
    typicalRent: "$1,300–$1,800/mo",
    typicalPrice: "$200,000–$300,000",
    investorAngle:
      "Boring in the best way: steady demand, low vacancy, modest but reliable cash flow and appreciation. A strong core-holding market.",
    neighborhoods: [
      { name: "Benson", why: "Revitalizing, younger renters, upside." },
      { name: "Millard", why: "Suburb with family rentals, top schools, low vacancy." },
      { name: "South Omaha", why: "Affordable, strong cash flow, steady demand." },
    ],
    relatedPosts: ["what-is-a-good-cap-rate", "single-family-vs-multi-family-rental", "best-states-for-rental-investors-2026"],
  },
  {
    slug: "des-moines",
    name: "Des Moines",
    stateCode: "IA",
    stateName: "Iowa",
    blurb:
      "Des Moines is an underrated stability market — an insurance-and-finance hub with steady job growth, low unemployment, and affordable housing.",
    typicalRent: "$1,250–$1,750/mo",
    typicalPrice: "$190,000–$290,000",
    investorAngle:
      "Low volatility, dependable tenants, and reasonable entry make for a clean buy-and-hold market. Cash flow is solid; appreciation is steady, not spectacular.",
    neighborhoods: [
      { name: "Beaverdale", why: "Desirable, stable, strong tenant demand." },
      { name: "East Des Moines", why: "Affordable SFRs, good rent ratios." },
      { name: "West Des Moines", why: "Suburb with newer stock, family renters, low vacancy." },
    ],
    relatedPosts: ["what-is-a-good-cap-rate", "best-states-for-rental-investors-2026", "how-to-underwrite-a-rental-property-in-60-seconds"],
  },
  {
    slug: "minneapolis",
    name: "Minneapolis",
    stateCode: "MN",
    stateName: "Minnesota",
    blurb:
      "Minneapolis pairs a strong, diversified economy with deep rental demand — but high property taxes and tenant-friendly rules require careful underwriting.",
    typicalRent: "$1,500–$2,200/mo",
    typicalPrice: "$260,000–$380,000",
    investorAngle:
      "A solid metro for buy-and-hold if you model the real tax bill and tenant-protection rules. Duplexes and small multis are plentiful and house-hack well.",
    neighborhoods: [
      { name: "Northeast Minneapolis", why: "Popular, walkable, strong demand." },
      { name: "St. Paul (Midway)", why: "Affordable, central, steady rentals." },
      { name: "Brooklyn Park", why: "Suburb with newer stock, family renters, low vacancy." },
    ],
    relatedPosts: ["house-hacking-explained", "what-is-a-good-cap-rate", "rental-property-tax-deductions"],
  },
  {
    slug: "buffalo",
    name: "Buffalo",
    stateCode: "NY",
    stateName: "New York",
    blurb:
      "Buffalo combines bargain prices with a surprising appreciation run — an affordable Rust Belt market that's quietly rewarded patient landlords.",
    typicalRent: "$1,150–$1,650/mo",
    typicalPrice: "$150,000–$250,000",
    investorAngle:
      "Low entry plus rising rents drives strong cash-on-cash, with appreciation upside as the metro stabilizes. Mind New York's higher taxes and tenant protections.",
    neighborhoods: [
      { name: "North Buffalo", why: "Desirable, stable, strong demand." },
      { name: "West Side", why: "Gentrifying, upside, value-add." },
      { name: "Kenmore", why: "Suburb that's owner-occupant-grade, low vacancy." },
    ],
    relatedPosts: ["what-is-a-good-cap-rate", "cash-flow-vs-appreciation", "capex-maintenance-reserves-rental-property"],
  },
  {
    slug: "rochester",
    name: "Rochester",
    stateCode: "NY",
    stateName: "New York",
    blurb:
      "Rochester is a high-cap, high-tax cash-flow market — cheap entry and strong rent ratios offset by some of the highest effective property taxes in the country.",
    typicalRent: "$1,150–$1,600/mo",
    typicalPrice: "$140,000–$230,000",
    investorAngle:
      "Yields look excellent until you model the tax line — so model it first. For disciplined operators, the cash-on-cash is among the best in the Northeast.",
    neighborhoods: [
      { name: "Park Ave area", why: "Desirable, stable, strong demand." },
      { name: "South Wedge", why: "Walkable, younger renters, upside." },
      { name: "Irondequoit", why: "Suburb that's owner-occupant-grade, steady tenants." },
    ],
    relatedPosts: ["what-is-a-good-cap-rate", "vacancy-rate-rental-property", "rental-property-tax-deductions"],
  },
  {
    slug: "orlando",
    name: "Orlando",
    stateCode: "FL",
    stateName: "Florida",
    blurb:
      "Orlando blends strong population growth, tourism-driven demand, and no state income tax — a market where long-term and short-term rental strategies both compete.",
    typicalRent: "$1,800–$2,400/mo",
    typicalPrice: "$300,000–$400,000",
    investorAngle:
      "Growth and rent demand are real, but Florida insurance and HOA costs are the swing factors — quote them before you offer. Short-term-rental rules vary sharply by jurisdiction.",
    neighborhoods: [
      { name: "Pine Hills", why: "Affordable SFRs, value-add, better ratios." },
      { name: "Kissimmee", why: "STR-friendly pockets, tourist demand." },
      { name: "East Orlando (near UCF)", why: "Student + family demand, steady rentals." },
    ],
    relatedPosts: ["what-is-a-good-cap-rate", "cash-flow-vs-appreciation", "best-states-for-rental-investors-2026"],
  },
  {
    slug: "tucson",
    name: "Tucson",
    stateCode: "AZ",
    stateName: "Arizona",
    blurb:
      "Tucson offers Sun Belt growth at a discount to Phoenix — university and defense employment underpin steady rental demand.",
    typicalRent: "$1,400–$1,900/mo",
    typicalPrice: "$260,000–$360,000",
    investorAngle:
      "More affordable entry than Phoenix with comparable demand drivers (University of Arizona, Raytheon, Davis-Monthan AFB). Solid for balanced cash flow + appreciation.",
    neighborhoods: [
      { name: "Midtown", why: "Central, stable, strong demand." },
      { name: "University area", why: "Student rentals, high occupancy." },
      { name: "Rita Ranch", why: "Newer SFRs near the base, family renters." },
    ],
    relatedPosts: ["what-is-a-good-cap-rate", "cash-flow-vs-appreciation", "how-to-underwrite-a-rental-property-in-60-seconds"],
  },
  {
    slug: "grand-rapids",
    name: "Grand Rapids",
    stateCode: "MI",
    stateName: "Michigan",
    blurb:
      "Grand Rapids is one of the Midwest's stronger growth stories — a diversifying economy and tight housing supply driving steady rent and price gains.",
    typicalRent: "$1,400–$1,900/mo",
    typicalPrice: "$230,000–$330,000",
    investorAngle:
      "Low vacancy and consistent demand make this a dependable buy-and-hold market with better appreciation than most cash-flow metros. Inventory is tight, so deals move fast.",
    neighborhoods: [
      { name: "Eastown", why: "Desirable, walkable, strong demand." },
      { name: "Wyoming", why: "Suburb that's affordable, family renters, low vacancy." },
      { name: "Creston", why: "Improving, value-add, good rent ratios." },
    ],
    relatedPosts: ["what-is-a-good-cap-rate", "single-family-vs-multi-family-rental", "best-states-for-rental-investors-2026"],
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
