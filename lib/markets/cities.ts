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
  {
    slug: "austin",
    name: "Austin",
    stateCode: "TX",
    stateName: "Texas",
    blurb:
      "Austin is a tech-driven growth market with strong in-migration and no state income tax — but high prices and Texas property taxes keep day-one cash flow tight.",
    typicalRent: "$1,900–$2,600/mo",
    typicalPrice: "$400,000–$550,000",
    investorAngle:
      "An appreciation-and-rent-growth play, not a cash-flow market. Model the real Texas property-tax bill carefully — it's the line that sinks otherwise-fine Austin deals.",
    neighborhoods: [
      { name: "Pflugerville", why: "Suburb with newer SFRs, family renters, low vacancy." },
      { name: "Round Rock", why: "Tech-job adjacency, steady demand, better value than core." },
      { name: "East Austin edges", why: "Appreciation-led, younger renters, premium pricing." },
    ],
    relatedPosts: ["cash-flow-vs-appreciation", "rental-property-tax-deductions", "what-is-a-good-cap-rate"],
  },
  {
    slug: "fort-worth",
    name: "Fort Worth",
    stateCode: "TX",
    stateName: "Texas",
    blurb:
      "Fort Worth offers Dallas-metro growth at a meaningfully lower entry price — steady population gains with more attainable acquisitions.",
    typicalRent: "$1,600–$2,200/mo",
    typicalPrice: "$280,000–$380,000",
    investorAngle:
      "Better starting math than Dallas with the same growth tailwind. As always in Texas, underwrite the effective property-tax rate, not the listing's stale number.",
    neighborhoods: [
      { name: "Far North Fort Worth", why: "Newer SFRs, family renters, low vacancy." },
      { name: "Riverside", why: "Value-add stock, improving demand." },
      { name: "Haltom City", why: "Affordable, strong cash flow for the metro." },
    ],
    relatedPosts: ["cash-flow-vs-appreciation", "what-is-a-good-cap-rate", "how-to-underwrite-a-rental-property-in-60-seconds"],
  },
  {
    slug: "denver",
    name: "Denver",
    stateCode: "CO",
    stateName: "Colorado",
    blurb:
      "Denver is a high-price, low-cap appreciation market — strong economy and in-migration, but negative leverage is a real risk at today's rates.",
    typicalRent: "$1,900–$2,600/mo",
    typicalPrice: "$450,000–$600,000",
    investorAngle:
      "Buy for long-term appreciation and rent growth, with reserves to carry thin early cash flow. Not a market for yield-first investors right now.",
    neighborhoods: [
      { name: "Aurora", why: "More affordable, family renters, steadier ratios." },
      { name: "Montbello", why: "Value-add, lower entry within the metro." },
      { name: "Lakewood", why: "Stable suburb, low vacancy, reliable tenants." },
    ],
    relatedPosts: ["cash-flow-vs-appreciation", "what-is-a-good-cap-rate", "best-states-for-rental-investors-2026"],
  },
  {
    slug: "colorado-springs",
    name: "Colorado Springs",
    stateCode: "CO",
    stateName: "Colorado",
    blurb:
      "Colorado Springs pairs strong growth with a large military presence (Fort Carson, the Air Force Academy) — more attainable than Denver with stable demand.",
    typicalRent: "$1,700–$2,300/mo",
    typicalPrice: "$360,000–$470,000",
    investorAngle:
      "Military relocations keep occupancy high, and entry is friendlier than Denver. A balanced growth-plus-stability market for buy-and-hold.",
    neighborhoods: [
      { name: "Security-Widefield", why: "Affordable, steady military tenant demand." },
      { name: "Northeast Springs", why: "Newer SFRs, family renters, low vacancy." },
      { name: "Fountain", why: "Near Fort Carson, attainable, reliable demand." },
    ],
    relatedPosts: ["what-is-a-good-cap-rate", "cash-flow-vs-appreciation", "how-to-underwrite-a-rental-property-in-60-seconds"],
  },
  {
    slug: "salt-lake-city",
    name: "Salt Lake City",
    stateCode: "UT",
    stateName: "Utah",
    blurb:
      "Salt Lake City has one of the country's strongest economies and tightest rental markets — low vacancy and rising rents, offset by appreciation-compressed cap rates.",
    typicalRent: "$1,700–$2,300/mo",
    typicalPrice: "$420,000–$560,000",
    investorAngle:
      "Demand is exceptional, but pricing means modest day-one cash flow. Check Ogden to the north for better ratios within the same metro economy.",
    neighborhoods: [
      { name: "West Valley City", why: "Affordable, family renters, steadier ratios." },
      { name: "Ogden", why: "Better cash flow north of the core, growing demand." },
      { name: "Magna", why: "Value-add entry, improving area." },
    ],
    relatedPosts: ["cash-flow-vs-appreciation", "what-is-a-good-cap-rate", "best-states-for-rental-investors-2026"],
  },
  {
    slug: "boise",
    name: "Boise",
    stateCode: "ID",
    stateName: "Idaho",
    blurb:
      "Boise was a pandemic-era growth darling — heavy in-migration pushed prices up, leaving an appreciation-led market with modest day-one yields.",
    typicalRent: "$1,600–$2,200/mo",
    typicalPrice: "$400,000–$520,000",
    investorAngle:
      "Demand and rent growth are real, but cash flow is tight at current prices. A longer-hold appreciation play with reserves, not a yield market.",
    neighborhoods: [
      { name: "Nampa", why: "More affordable, family renters, better ratios." },
      { name: "Caldwell", why: "Value and growth west of Boise." },
      { name: "Meridian", why: "Top schools, low vacancy, premium suburb." },
    ],
    relatedPosts: ["cash-flow-vs-appreciation", "what-is-a-good-cap-rate", "best-states-for-rental-investors-2026"],
  },
  {
    slug: "albuquerque",
    name: "Albuquerque",
    stateCode: "NM",
    stateName: "New Mexico",
    blurb:
      "Albuquerque is an affordable Southwest market with steady demand from Sandia Labs, Kirtland AFB, and the University of New Mexico.",
    typicalRent: "$1,300–$1,800/mo",
    typicalPrice: "$260,000–$350,000",
    investorAngle:
      "Reasonable entry plus durable employment anchors make for dependable, moderate cash flow. A solid balanced market without coastal pricing.",
    neighborhoods: [
      { name: "Northeast Heights", why: "Desirable, stable, strong demand." },
      { name: "Westside", why: "Newer SFRs, family renters." },
      { name: "International District", why: "Value-add, higher cash flow, more management." },
    ],
    relatedPosts: ["what-is-a-good-cap-rate", "single-family-vs-multi-family-rental", "how-to-underwrite-a-rental-property-in-60-seconds"],
  },
  {
    slug: "las-vegas",
    name: "Las Vegas",
    stateCode: "NV",
    stateName: "Nevada",
    blurb:
      "Las Vegas combines strong in-migration and no state income tax with a tourism-driven economy that can swing harder than most through downturns.",
    typicalRent: "$1,600–$2,100/mo",
    typicalPrice: "$360,000–$460,000",
    investorAngle:
      "Growth and tax advantages are attractive, but the economy is cyclical — underwrite vacancy honestly and keep reserves. Henderson offers more stability.",
    neighborhoods: [
      { name: "North Las Vegas", why: "Affordable, family renters, newer stock." },
      { name: "Henderson", why: "Premium suburb, low vacancy, reliable tenants." },
      { name: "East Las Vegas", why: "Value-add entry, higher cash flow." },
    ],
    relatedPosts: ["what-is-a-good-cap-rate", "vacancy-rate-rental-property", "cash-flow-vs-appreciation"],
  },
  {
    slug: "sacramento",
    name: "Sacramento",
    stateCode: "CA",
    stateName: "California",
    blurb:
      "Sacramento is California's relative-value market — Bay Area spillover demand at lower prices, though still high-cost with statewide tenant protections.",
    typicalRent: "$1,900–$2,500/mo",
    typicalPrice: "$450,000–$580,000",
    investorAngle:
      "Appreciation-led with steady government-job demand. Model California's tenant rules and thin day-one yields before committing.",
    neighborhoods: [
      { name: "North Highlands", why: "Affordable, family renters, better ratios." },
      { name: "Rancho Cordova", why: "Job centers, stable demand." },
      { name: "Elk Grove", why: "Suburb, top schools, low vacancy." },
    ],
    relatedPosts: ["cash-flow-vs-appreciation", "rental-property-tax-deductions", "what-is-a-good-cap-rate"],
  },
  {
    slug: "portland",
    name: "Portland",
    stateCode: "OR",
    stateName: "Oregon",
    blurb:
      "Portland is a high-price, low-cap market with some of the country's strictest tenant protections — careful underwriting is non-negotiable here.",
    typicalRent: "$1,700–$2,300/mo",
    typicalPrice: "$430,000–$560,000",
    investorAngle:
      "Appreciation potential exists, but regulation and eviction timelines raise the risk. Model vacancy and tenant-rule costs conservatively.",
    neighborhoods: [
      { name: "Gresham", why: "More affordable, family renters, better ratios." },
      { name: "Beaverton", why: "Job centers, stable demand, low vacancy." },
      { name: "Outer Southeast Portland", why: "Value-add entry within the metro." },
    ],
    relatedPosts: ["cash-flow-vs-appreciation", "vacancy-rate-rental-property", "what-is-a-good-cap-rate"],
  },
  {
    slug: "chicago",
    name: "Chicago",
    stateCode: "IL",
    stateName: "Illinois",
    blurb:
      "Chicago offers real cash flow in the right neighborhoods — but Cook County property taxes and regulation make block-by-block selection everything.",
    typicalRent: "$1,600–$2,200/mo",
    typicalPrice: "$260,000–$380,000",
    investorAngle:
      "Yields can be strong, yet the tax bill and tenant rules swing deals hard. This is a market where local knowledge and honest tax modeling decide outcomes.",
    neighborhoods: [
      { name: "Avondale", why: "Appreciating, strong rental demand." },
      { name: "Portage Park", why: "Stable Northwest Side, owner-occupant feel." },
      { name: "South suburbs", why: "High cash flow, screen neighborhoods carefully." },
    ],
    relatedPosts: ["what-is-a-good-cap-rate", "rental-property-tax-deductions", "single-family-vs-multi-family-rental"],
  },
  {
    slug: "madison",
    name: "Madison",
    stateCode: "WI",
    stateName: "Wisconsin",
    blurb:
      "Madison is recession-resistant by design — the University of Wisconsin plus state government keep vacancy among the lowest in the Midwest.",
    typicalRent: "$1,500–$2,000/mo",
    typicalPrice: "$300,000–$400,000",
    investorAngle:
      "Exceptional demand stability and steady appreciation, with moderate cash flow. A strong core-holding market for risk-averse buy-and-hold.",
    neighborhoods: [
      { name: "Fitchburg", why: "Suburb, family renters, low vacancy." },
      { name: "Sun Prairie", why: "Growth, newer stock, reliable demand." },
      { name: "East Madison", why: "Value relative to the core, steady rentals." },
    ],
    relatedPosts: ["what-is-a-good-cap-rate", "house-hacking-explained", "best-states-for-rental-investors-2026"],
  },
  {
    slug: "dayton",
    name: "Dayton",
    stateCode: "OH",
    stateName: "Ohio",
    blurb:
      "Dayton is a deep-value cash-flow market anchored by Wright-Patterson AFB — low prices and healthy rents for yield-focused buyers.",
    typicalRent: "$1,050–$1,500/mo",
    typicalPrice: "$130,000–$210,000",
    investorAngle:
      "Strong cash-on-cash with a stable federal-employment anchor. Appreciation is modest and stock is older, so reserve honestly for capex.",
    neighborhoods: [
      { name: "Kettering", why: "Suburb, stable, owner-occupant-grade tenants." },
      { name: "Huber Heights", why: "Family renters near the base, low vacancy." },
      { name: "Riverside", why: "Affordable, strong cash flow, value-add." },
    ],
    relatedPosts: ["what-is-a-good-cap-rate", "capex-maintenance-reserves-rental-property", "spot-bad-rental-in-60-seconds"],
  },
  {
    slug: "akron",
    name: "Akron",
    stateCode: "OH",
    stateName: "Ohio",
    blurb:
      "Akron is a high-cap Rust Belt cash-flow market tied to Cleveland-area demand — low entry prices and strong rent ratios for disciplined operators.",
    typicalRent: "$1,050–$1,500/mo",
    typicalPrice: "$120,000–$200,000",
    investorAngle:
      "Yields are excellent on paper; older housing stock means capex discipline matters. Best for operators who reserve properly and screen tenants well.",
    neighborhoods: [
      { name: "West Akron", why: "Desirable, stable, strong demand." },
      { name: "Cuyahoga Falls", why: "Suburb, low vacancy, reliable tenants." },
      { name: "Kenmore", why: "Value-add, higher cash flow." },
    ],
    relatedPosts: ["what-is-a-good-cap-rate", "capex-maintenance-reserves-rental-property", "cap-rate-vs-cash-on-cash-vs-dscr"],
  },
  {
    slug: "toledo",
    name: "Toledo",
    stateCode: "OH",
    stateName: "Ohio",
    blurb:
      "Toledo has some of the lowest entry prices of any metro in the country — a pure-yield market where neighborhood and tenant selection make the deal.",
    typicalRent: "$1,000–$1,450/mo",
    typicalPrice: "$110,000–$190,000",
    investorAngle:
      "Cash-on-cash can be exceptional, but averages hide wide block-level spreads. Screen carefully, reserve for older-home capex, and verify the rent.",
    neighborhoods: [
      { name: "West Toledo", why: "Stable, desirable, steadier tenants." },
      { name: "Old Orchard", why: "Owner-occupant feel, low vacancy." },
      { name: "South Toledo", why: "Cash flow, value-add, more management." },
    ],
    relatedPosts: ["what-is-a-good-cap-rate", "spot-bad-rental-in-60-seconds", "capex-maintenance-reserves-rental-property"],
  },
  {
    slug: "lexington",
    name: "Lexington",
    stateCode: "KY",
    stateName: "Kentucky",
    blurb:
      "Lexington is a stable, affordable market anchored by the University of Kentucky and healthcare — low vacancy and dependable demand.",
    typicalRent: "$1,200–$1,700/mo",
    typicalPrice: "$220,000–$310,000",
    investorAngle:
      "Balanced cash flow with modest, reliable appreciation. A clean buy-and-hold market with low volatility and quick lease-ups.",
    neighborhoods: [
      { name: "Southland", why: "Stable, family renters, steady demand." },
      { name: "North Lexington", why: "Value-add, improving area." },
      { name: "Hamburg area", why: "Newer stock, low vacancy." },
    ],
    relatedPosts: ["what-is-a-good-cap-rate", "single-family-vs-multi-family-rental", "how-to-underwrite-a-rental-property-in-60-seconds"],
  },
  {
    slug: "knoxville",
    name: "Knoxville",
    stateCode: "TN",
    stateName: "Tennessee",
    blurb:
      "Knoxville offers Tennessee growth and no state income tax at a friendlier price than Nashville — steady University of Tennessee and healthcare demand.",
    typicalRent: "$1,300–$1,800/mo",
    typicalPrice: "$260,000–$360,000",
    investorAngle:
      "Better value than Nashville with solid demand drivers. A balanced market: realistic cash flow plus appreciation upside.",
    neighborhoods: [
      { name: "South Knoxville", why: "Improving, value, growing demand." },
      { name: "Fountain City", why: "Stable, family renters, low vacancy." },
      { name: "Powell", why: "Suburb, newer stock, reliable tenants." },
    ],
    relatedPosts: ["cash-flow-vs-appreciation", "what-is-a-good-cap-rate", "best-states-for-rental-investors-2026"],
  },
  {
    slug: "chattanooga",
    name: "Chattanooga",
    stateCode: "TN",
    stateName: "Tennessee",
    blurb:
      "Chattanooga is a revitalized mid-size metro with no state income tax and a growing tech-and-logistics base — affordable with real upside.",
    typicalRent: "$1,300–$1,800/mo",
    typicalPrice: "$250,000–$340,000",
    investorAngle:
      "Balanced cash flow with appreciation potential as the downtown and riverfront draw continues. Attainable entry for the growth on offer.",
    neighborhoods: [
      { name: "East Ridge", why: "Affordable, family renters, steady demand." },
      { name: "Red Bank", why: "Stable suburb, reliable tenants." },
      { name: "Hixson", why: "Newer stock, low vacancy." },
    ],
    relatedPosts: ["what-is-a-good-cap-rate", "cash-flow-vs-appreciation", "how-to-underwrite-a-rental-property-in-60-seconds"],
  },
  {
    slug: "huntsville",
    name: "Huntsville",
    stateCode: "AL",
    stateName: "Alabama",
    blurb:
      "Huntsville is a rare combination — strong, high-wage job growth (NASA, Redstone Arsenal, defense) at still-reasonable prices.",
    typicalRent: "$1,300–$1,800/mo",
    typicalPrice: "$250,000–$340,000",
    investorAngle:
      "Few markets pair this caliber of employment growth with attainable entry. Expect balanced returns: real cash flow plus appreciation.",
    neighborhoods: [
      { name: "Madison", why: "Top schools, low vacancy, premium suburb." },
      { name: "South Huntsville", why: "Stable, family renters, steady demand." },
      { name: "North Huntsville", why: "Value-add, higher cash flow." },
    ],
    relatedPosts: ["what-is-a-good-cap-rate", "cash-flow-vs-appreciation", "best-states-for-rental-investors-2026"],
  },
  {
    slug: "little-rock",
    name: "Little Rock",
    stateCode: "AR",
    stateName: "Arkansas",
    blurb:
      "Little Rock is an affordable capital-city market with steady government and healthcare employment — a dependable yield play.",
    typicalRent: "$1,100–$1,550/mo",
    typicalPrice: "$160,000–$240,000",
    investorAngle:
      "Low prices and stable demand make for solid cash-on-cash. Appreciation is modest, so underwrite for yield and reserve for older stock.",
    neighborhoods: [
      { name: "West Little Rock", why: "Stable, desirable, reliable tenants." },
      { name: "Maumelle", why: "Suburb, low vacancy, family renters." },
      { name: "Southwest Little Rock", why: "Cash flow, value-add, more management." },
    ],
    relatedPosts: ["what-is-a-good-cap-rate", "spot-bad-rental-in-60-seconds", "cap-rate-vs-cash-on-cash-vs-dscr"],
  },
  {
    slug: "new-orleans",
    name: "New Orleans",
    stateCode: "LA",
    stateName: "Louisiana",
    blurb:
      "New Orleans blends tourism-driven short-term-rental demand with rich culture — but insurance and flood costs are the make-or-break line.",
    typicalRent: "$1,500–$2,000/mo",
    typicalPrice: "$250,000–$360,000",
    investorAngle:
      "STR and tourism upside is real, but quote insurance and flood before you offer — they can erase the cash flow. Underwrite them as hard line items.",
    neighborhoods: [
      { name: "Mid-City", why: "Stable, central, steady rental demand." },
      { name: "Gentilly", why: "Value-add, recovering, improving demand." },
      { name: "Algiers", why: "Affordable, ferry access, steadier ratios." },
    ],
    relatedPosts: ["what-is-a-good-cap-rate", "cash-flow-vs-appreciation", "closing-costs-investment-property"],
  },
  {
    slug: "wichita",
    name: "Wichita",
    stateCode: "KS",
    stateName: "Kansas",
    blurb:
      "Wichita is a deep cash-flow market anchored by aviation manufacturing — very affordable entry and strong rent ratios.",
    typicalRent: "$1,000–$1,450/mo",
    typicalPrice: "$130,000–$210,000",
    investorAngle:
      "Strong yield and low prices, with a manufacturing economy to watch through cycles. A pure cash-flow market for disciplined operators.",
    neighborhoods: [
      { name: "East Wichita", why: "Stable, family renters, desirable." },
      { name: "Riverside", why: "Desirable, steady demand." },
      { name: "South Wichita", why: "Cash flow, value-add, more management." },
    ],
    relatedPosts: ["what-is-a-good-cap-rate", "capex-maintenance-reserves-rental-property", "how-to-underwrite-a-rental-property-in-60-seconds"],
  },
  {
    slug: "greensboro",
    name: "Greensboro",
    stateCode: "NC",
    stateName: "North Carolina",
    blurb:
      "Greensboro anchors the Piedmont Triad with logistics, manufacturing, and university demand — affordable with steady, balanced returns.",
    typicalRent: "$1,250–$1,700/mo",
    typicalPrice: "$220,000–$310,000",
    investorAngle:
      "Reasonable entry plus diversified demand make for dependable cash flow with some appreciation. A solid, lower-volatility North Carolina market.",
    neighborhoods: [
      { name: "Northwest Greensboro", why: "Stable, desirable, reliable tenants." },
      { name: "East Greensboro", why: "Value-add, higher cash flow." },
      { name: "High Point", why: "Nearby, affordable, steady demand." },
    ],
    relatedPosts: ["what-is-a-good-cap-rate", "single-family-vs-multi-family-rental", "best-states-for-rental-investors-2026"],
  },
  {
    slug: "winston-salem",
    name: "Winston-Salem",
    stateCode: "NC",
    stateName: "North Carolina",
    blurb:
      "Winston-Salem pairs a healthcare-and-university anchor (Wake Forest) with low prices — a steady, yield-leaning Triad market.",
    typicalRent: "$1,200–$1,650/mo",
    typicalPrice: "$210,000–$300,000",
    investorAngle:
      "Affordable entry and stable institutional employment support dependable cash flow. Appreciation is modest but reliable.",
    neighborhoods: [
      { name: "West Winston", why: "Stable, desirable, steady demand." },
      { name: "Ardmore", why: "Walkable, strong rental demand." },
      { name: "East Winston", why: "Value-add, higher cash flow." },
    ],
    relatedPosts: ["what-is-a-good-cap-rate", "single-family-vs-multi-family-rental", "how-to-underwrite-a-rental-property-in-60-seconds"],
  },
  {
    slug: "savannah",
    name: "Savannah",
    stateCode: "GA",
    stateName: "Georgia",
    blurb:
      "Savannah combines port-driven job growth with tourism and short-term-rental demand — coastal upside with insurance to model carefully.",
    typicalRent: "$1,500–$2,000/mo",
    typicalPrice: "$280,000–$380,000",
    investorAngle:
      "Port expansion and tourism support demand, but coastal insurance is a real cost — quote it before you offer. Balanced growth-plus-cash-flow market.",
    neighborhoods: [
      { name: "Pooler", why: "Growth suburb, newer stock, low vacancy." },
      { name: "Midtown Savannah", why: "Stable, central, steady demand." },
      { name: "Southside", why: "Affordable, family renters." },
    ],
    relatedPosts: ["what-is-a-good-cap-rate", "cash-flow-vs-appreciation", "best-states-for-rental-investors-2026"],
  },
  {
    slug: "fort-wayne",
    name: "Fort Wayne",
    stateCode: "IN",
    stateName: "Indiana",
    blurb:
      "Fort Wayne is a low-cost Midwest cash-flow market with a diversified manufacturing-and-healthcare base and some of the most affordable entry prices in Indiana.",
    typicalRent: "$1,050–$1,500/mo",
    typicalPrice: "$140,000–$230,000",
    investorAngle:
      "Cheap acquisition plus steady demand makes for strong cash-on-cash, and Indiana is landlord-friendly. Appreciation is modest, so underwrite for yield.",
    neighborhoods: [
      { name: "West Central", why: "Historic, stable, desirable rentals." },
      { name: "Northside", why: "Affordable SFRs, family renters." },
      { name: "Waynedale", why: "Quiet, owner-occupant feel, low vacancy." },
    ],
    relatedPosts: ["what-is-a-good-cap-rate", "spot-bad-rental-in-60-seconds", "cap-rate-vs-cash-on-cash-vs-dscr"],
  },
  {
    slug: "spokane",
    name: "Spokane",
    stateCode: "WA",
    stateName: "Washington",
    blurb:
      "Spokane offers Pacific Northwest growth without Seattle prices — steady in-migration, a healthcare-and-education base, and no state income tax.",
    typicalRent: "$1,400–$1,900/mo",
    typicalPrice: "$330,000–$430,000",
    investorAngle:
      "More attainable than the west side of the state with solid demand, but Washington is tenant-friendly — model vacancy and turnover honestly.",
    neighborhoods: [
      { name: "North Spokane", why: "Affordable SFRs, family renters, low vacancy." },
      { name: "Spokane Valley", why: "Suburban, steady demand." },
      { name: "West Central", why: "Value-add, improving area." },
    ],
    relatedPosts: ["cash-flow-vs-appreciation", "what-is-a-good-cap-rate", "vacancy-rate-rental-property"],
  },
  {
    slug: "reno",
    name: "Reno",
    stateCode: "NV",
    stateName: "Nevada",
    blurb:
      "Reno has become a tech-and-logistics hub (Tesla, data centers) with strong in-migration from California and no state income tax.",
    typicalRent: "$1,500–$2,000/mo",
    typicalPrice: "$400,000–$520,000",
    investorAngle:
      "Growth and rent demand are real, but prices have run up — more appreciation than day-one cash flow. Some submarkets carry Tahoe-area seasonality.",
    neighborhoods: [
      { name: "Sparks", why: "More affordable, family renters, steady demand." },
      { name: "Northwest Reno", why: "Newer SFRs, low vacancy." },
      { name: "Midtown", why: "Walkable, younger renters, upside." },
    ],
    relatedPosts: ["cash-flow-vs-appreciation", "what-is-a-good-cap-rate", "best-states-for-rental-investors-2026"],
  },
  {
    slug: "el-paso",
    name: "El Paso",
    stateCode: "TX",
    stateName: "Texas",
    blurb:
      "El Paso is one of the most stable rental markets in Texas — a large military presence (Fort Bliss) and border-trade economy keep occupancy high and prices low.",
    typicalRent: "$1,200–$1,650/mo",
    typicalPrice: "$180,000–$270,000",
    investorAngle:
      "Low volatility and steady Fort Bliss demand make this a dependable cash-flow market. As always in Texas, model the real property-tax rate.",
    neighborhoods: [
      { name: "Northeast El Paso", why: "Near Fort Bliss — steady military demand." },
      { name: "East Side", why: "Newer SFRs, family renters, low vacancy." },
      { name: "Lower Valley", why: "Affordable, value-add." },
    ],
    relatedPosts: ["what-is-a-good-cap-rate", "rental-property-tax-deductions", "how-to-underwrite-a-rental-property-in-60-seconds"],
  },
  {
    slug: "corpus-christi",
    name: "Corpus Christi",
    stateCode: "TX",
    stateName: "Texas",
    blurb:
      "Corpus Christi pairs Gulf Coast affordability with an energy-and-port economy — reasonable entry and steady working-tenant demand.",
    typicalRent: "$1,300–$1,750/mo",
    typicalPrice: "$210,000–$300,000",
    investorAngle:
      "Solid cash flow for Texas, anchored by refining, military, and port jobs. Quote coastal insurance before you offer, and model Texas taxes.",
    neighborhoods: [
      { name: "Calallen", why: "Suburban, family renters, low vacancy." },
      { name: "Flour Bluff", why: "Near the naval base, steady demand." },
      { name: "Southside", why: "Newer stock, reliable tenants." },
    ],
    relatedPosts: ["what-is-a-good-cap-rate", "cash-flow-vs-appreciation", "rental-property-tax-deductions"],
  },
  {
    slug: "baton-rouge",
    name: "Baton Rouge",
    stateCode: "LA",
    stateName: "Louisiana",
    blurb:
      "Baton Rouge is Louisiana's stable capital-city market — state government, LSU, and petrochemical employment underpin steady rental demand.",
    typicalRent: "$1,200–$1,650/mo",
    typicalPrice: "$200,000–$290,000",
    investorAngle:
      "Dependable demand and affordable entry, but Louisiana insurance is a real cost — quote it as a hard line item. Yield-leaning with modest appreciation.",
    neighborhoods: [
      { name: "Mid City", why: "Central, stable, steady demand." },
      { name: "Sherwood Forest", why: "Affordable SFRs, family renters." },
      { name: "Southdowns", why: "Near LSU, reliable demand." },
    ],
    relatedPosts: ["what-is-a-good-cap-rate", "closing-costs-investment-property", "cash-flow-vs-appreciation"],
  },
  {
    slug: "shreveport",
    name: "Shreveport",
    stateCode: "LA",
    stateName: "Louisiana",
    blurb:
      "Shreveport is a deep-value cash-flow market — very low prices and healthy rent ratios, with casino, healthcare, and military (Barksdale AFB) employment.",
    typicalRent: "$1,000–$1,400/mo",
    typicalPrice: "$120,000–$200,000",
    investorAngle:
      "Among the cheapest entry points in the South with strong cash-on-cash. Screen neighborhoods and tenants carefully, and budget insurance + capex honestly.",
    neighborhoods: [
      { name: "South Highlands", why: "Desirable, stable, reliable tenants." },
      { name: "Broadmoor", why: "Affordable, family renters." },
      { name: "Shreve Isle", why: "Value-add, steady demand." },
    ],
    relatedPosts: ["what-is-a-good-cap-rate", "spot-bad-rental-in-60-seconds", "capex-maintenance-reserves-rental-property"],
  },
  {
    slug: "jackson",
    name: "Jackson",
    stateCode: "MS",
    stateName: "Mississippi",
    blurb:
      "Jackson, Mississippi's capital, offers some of the highest cap rates in the country — low prices and government-and-healthcare demand for yield-focused buyers.",
    typicalRent: "$1,050–$1,450/mo",
    typicalPrice: "$130,000–$210,000",
    investorAngle:
      "Yields look excellent on paper; neighborhood selection and tenant screening make or break it. A market for experienced, hands-on operators.",
    neighborhoods: [
      { name: "Northeast Jackson", why: "More stable, desirable, reliable tenants." },
      { name: "Fondren", why: "Revitalizing, younger renters." },
      { name: "Byram", why: "Suburb with newer SFRs, family demand." },
    ],
    relatedPosts: ["what-is-a-good-cap-rate", "section-8-rental-property-investing", "capex-maintenance-reserves-rental-property"],
  },
  {
    slug: "augusta",
    name: "Augusta",
    stateCode: "GA",
    stateName: "Georgia",
    blurb:
      "Augusta is a steady, affordable Georgia market anchored by a major medical center and Fort Eisenhower (Army cyber) — recession-resistant demand.",
    typicalRent: "$1,200–$1,650/mo",
    typicalPrice: "$170,000–$260,000",
    investorAngle:
      "Military + healthcare employment keeps occupancy stable, and entry is affordable. Balanced cash flow with a steady demand floor.",
    neighborhoods: [
      { name: "West Augusta", why: "Desirable, stable, family renters." },
      { name: "Martinez", why: "Suburb with top schools, low vacancy." },
      { name: "South Augusta", why: "Affordable, value-add, cash flow." },
    ],
    relatedPosts: ["what-is-a-good-cap-rate", "cash-flow-vs-appreciation", "how-to-underwrite-a-rental-property-in-60-seconds"],
  },
  {
    slug: "macon",
    name: "Macon",
    stateCode: "GA",
    stateName: "Georgia",
    blurb:
      "Macon is a low-cost central-Georgia cash-flow market within reach of Atlanta's economy, with affordable stock and steady rents.",
    typicalRent: "$1,050–$1,450/mo",
    typicalPrice: "$130,000–$210,000",
    investorAngle:
      "Cheap entry and solid ratios make for strong cash-on-cash. Modest appreciation; reserve for older housing stock.",
    neighborhoods: [
      { name: "North Macon", why: "More desirable, stable, reliable tenants." },
      { name: "Vineville", why: "Historic, steady demand." },
      { name: "West Macon", why: "Affordable, value-add." },
    ],
    relatedPosts: ["what-is-a-good-cap-rate", "spot-bad-rental-in-60-seconds", "single-family-vs-multi-family-rental"],
  },
  {
    slug: "lansing",
    name: "Lansing",
    stateCode: "MI",
    stateName: "Michigan",
    blurb:
      "Lansing is Michigan's capital and home to Michigan State — government plus a large university create unusually stable rental demand at low prices.",
    typicalRent: "$1,150–$1,600/mo",
    typicalPrice: "$150,000–$240,000",
    investorAngle:
      "Recession-resistant employment (state government, MSU, healthcare) and affordable entry make this a dependable cash-flow market.",
    neighborhoods: [
      { name: "East Lansing", why: "MSU demand, high occupancy." },
      { name: "Okemos", why: "Suburb with top schools, low vacancy." },
      { name: "Old Town / REO", why: "Value-add, improving area." },
    ],
    relatedPosts: ["what-is-a-good-cap-rate", "house-hacking-explained", "cap-rate-vs-cash-on-cash-vs-dscr"],
  },
  {
    slug: "fort-collins",
    name: "Fort Collins",
    stateCode: "CO",
    stateName: "Colorado",
    blurb:
      "Fort Collins pairs Colorado growth with a Colorado State University anchor — strong demand and quality of life, though prices have climbed.",
    typicalRent: "$1,700–$2,300/mo",
    typicalPrice: "$420,000–$540,000",
    investorAngle:
      "Appreciation-led with steady student-and-professional demand. Day-one cash flow is tight at these prices — a longer-hold market.",
    neighborhoods: [
      { name: "Midtown", why: "Central, steady demand." },
      { name: "Old Town edges", why: "Desirable, walkable, premium." },
      { name: "Timnath", why: "Suburb with newer SFRs, family renters." },
    ],
    relatedPosts: ["cash-flow-vs-appreciation", "what-is-a-good-cap-rate", "best-states-for-rental-investors-2026"],
  },
  {
    slug: "provo",
    name: "Provo",
    stateCode: "UT",
    stateName: "Utah",
    blurb:
      "Provo combines a young, fast-growing population (BYU, a booming tech corridor) with Utah's strong economy — high demand, low vacancy.",
    typicalRent: "$1,500–$2,000/mo",
    typicalPrice: "$400,000–$520,000",
    investorAngle:
      "Exceptional demand and rent growth, but appreciation has compressed yields. A growth play for investors with reserves.",
    neighborhoods: [
      { name: "Orem", why: "Adjacent; family + student renters, low vacancy." },
      { name: "Provo Bench", why: "Desirable, steady demand." },
      { name: "Spanish Fork", why: "Suburb with newer stock, growth." },
    ],
    relatedPosts: ["cash-flow-vs-appreciation", "what-is-a-good-cap-rate", "best-states-for-rental-investors-2026"],
  },
  {
    slug: "ogden",
    name: "Ogden",
    stateCode: "UT",
    stateName: "Utah",
    blurb:
      "Ogden offers the best cash-flow math in the Salt Lake region — lower prices than SLC with the same strong Utah economy and tight rental supply.",
    typicalRent: "$1,400–$1,850/mo",
    typicalPrice: "$360,000–$460,000",
    investorAngle:
      "Better day-one numbers than Salt Lake or Provo while sharing the regional growth. A good balance of cash flow and appreciation for Utah.",
    neighborhoods: [
      { name: "East Bench", why: "Desirable, stable, reliable tenants." },
      { name: "Downtown Ogden", why: "Revitalizing, younger renters." },
      { name: "Roy", why: "Suburb; affordable, family renters, low vacancy." },
    ],
    relatedPosts: ["what-is-a-good-cap-rate", "cash-flow-vs-appreciation", "best-states-for-rental-investors-2026"],
  },
  {
    slug: "lincoln",
    name: "Lincoln",
    stateCode: "NE",
    stateName: "Nebraska",
    blurb:
      "Lincoln is a low-volatility market anchored by state government and the University of Nebraska — steady demand, low unemployment, affordable housing.",
    typicalRent: "$1,200–$1,650/mo",
    typicalPrice: "$200,000–$290,000",
    investorAngle:
      "Boring and dependable: stable tenants, low vacancy, modest but reliable returns. A clean core-holding market.",
    neighborhoods: [
      { name: "Near South", why: "Historic, steady demand." },
      { name: "University area", why: "Student rentals, high occupancy." },
      { name: "Southeast Lincoln", why: "Newer SFRs, family renters." },
    ],
    relatedPosts: ["what-is-a-good-cap-rate", "single-family-vs-multi-family-rental", "best-states-for-rental-investors-2026"],
  },
  {
    slug: "sioux-falls",
    name: "Sioux Falls",
    stateCode: "SD",
    stateName: "South Dakota",
    blurb:
      "Sioux Falls is a quietly strong market — no state income tax, a finance-and-healthcare economy, fast growth, and very low unemployment.",
    typicalRent: "$1,150–$1,600/mo",
    typicalPrice: "$220,000–$310,000",
    investorAngle:
      "Steady in-migration and a business-friendly climate support reliable demand and gradual appreciation, with decent cash flow.",
    neighborhoods: [
      { name: "Central Sioux Falls", why: "Affordable, steady demand." },
      { name: "Southeast", why: "Newer SFRs, family renters, low vacancy." },
      { name: "Whittier", why: "Value-add, improving." },
    ],
    relatedPosts: ["what-is-a-good-cap-rate", "best-states-for-rental-investors-2026", "how-to-underwrite-a-rental-property-in-60-seconds"],
  },
  {
    slug: "fargo",
    name: "Fargo",
    stateCode: "ND",
    stateName: "North Dakota",
    blurb:
      "Fargo is a stable, recession-resistant market — North Dakota State University, healthcare, and agriculture keep demand steady through cycles.",
    typicalRent: "$1,100–$1,550/mo",
    typicalPrice: "$210,000–$300,000",
    investorAngle:
      "Low vacancy and dependable tenants, with modest appreciation. A steady cash-flow market; budget for cold-climate maintenance.",
    neighborhoods: [
      { name: "North Fargo", why: "Near NDSU; student + family demand." },
      { name: "South Fargo", why: "Newer SFRs, low vacancy." },
      { name: "West Fargo", why: "Suburb; growth, family renters." },
    ],
    relatedPosts: ["what-is-a-good-cap-rate", "capex-maintenance-reserves-rental-property", "single-family-vs-multi-family-rental"],
  },
  {
    slug: "peoria",
    name: "Peoria",
    stateCode: "IL",
    stateName: "Illinois",
    blurb:
      "Peoria is a deep-value Illinois cash-flow market — very low prices and healthy rent ratios, with a healthcare-and-manufacturing base.",
    typicalRent: "$950–$1,350/mo",
    typicalPrice: "$110,000–$180,000",
    investorAngle:
      "Strong cash-on-cash at low entry, but the local economy can be cyclical and Illinois taxes are high — model both. For yield-focused operators.",
    neighborhoods: [
      { name: "North Peoria", why: "More stable, desirable, reliable tenants." },
      { name: "West Peoria", why: "Affordable, family renters." },
      { name: "Peoria Heights", why: "Walkable, steady demand." },
    ],
    relatedPosts: ["what-is-a-good-cap-rate", "rental-property-tax-deductions", "spot-bad-rental-in-60-seconds"],
  },
  {
    slug: "rockford",
    name: "Rockford",
    stateCode: "IL",
    stateName: "Illinois",
    blurb:
      "Rockford has some of the lowest home prices in the Midwest, with aerospace and healthcare employment and strong rent-to-price ratios.",
    typicalRent: "$950–$1,350/mo",
    typicalPrice: "$110,000–$180,000",
    investorAngle:
      "Pure yield: cheap acquisition plus solid rents. Watch Illinois property taxes and screen neighborhoods carefully. Older stock — reserve for capex.",
    neighborhoods: [
      { name: "East Rockford", why: "More stable, desirable tenants." },
      { name: "Northeast", why: "Affordable SFRs, family renters." },
      { name: "Loves Park", why: "Suburb; owner-occupant feel, low vacancy." },
    ],
    relatedPosts: ["what-is-a-good-cap-rate", "capex-maintenance-reserves-rental-property", "rental-property-tax-deductions"],
  },
  {
    slug: "green-bay",
    name: "Green Bay",
    stateCode: "WI",
    stateName: "Wisconsin",
    blurb:
      "Green Bay is a stable, affordable Wisconsin market with a diversified manufacturing-and-healthcare base and dependable, low-turnover tenants.",
    typicalRent: "$1,150–$1,600/mo",
    typicalPrice: "$180,000–$270,000",
    investorAngle:
      "Steady demand and reasonable entry make for reliable cash flow with modest appreciation. Plentiful small-multi stock house-hacks well.",
    neighborhoods: [
      { name: "Allouez", why: "Suburb; desirable, stable, reliable tenants." },
      { name: "De Pere", why: "Family renters, low vacancy." },
      { name: "Downtown / Astor", why: "Walkable, steady demand." },
    ],
    relatedPosts: ["what-is-a-good-cap-rate", "house-hacking-explained", "single-family-vs-multi-family-rental"],
  },
  {
    slug: "fort-myers",
    name: "Fort Myers",
    stateCode: "FL",
    stateName: "Florida",
    blurb:
      "Fort Myers rides Southwest Florida's fast population growth and no state income tax — strong seasonal and long-term rental demand.",
    typicalRent: "$1,600–$2,150/mo",
    typicalPrice: "$300,000–$400,000",
    investorAngle:
      "Growth and demand are strong, but coastal insurance and hurricane risk are the swing factors — quote them hard before you offer.",
    neighborhoods: [
      { name: "Cape Coral", why: "Adjacent; newer SFRs, family renters, growth." },
      { name: "Lehigh Acres", why: "Affordable, value-add, better ratios." },
      { name: "McGregor", why: "Desirable, steady demand." },
    ],
    relatedPosts: ["what-is-a-good-cap-rate", "cash-flow-vs-appreciation", "closing-costs-investment-property"],
  },
  {
    slug: "lakeland",
    name: "Lakeland",
    stateCode: "FL",
    stateName: "Florida",
    blurb:
      "Lakeland sits in the fast-growing I-4 corridor between Tampa and Orlando — logistics-driven job growth and more affordable entry than either metro.",
    typicalRent: "$1,500–$2,000/mo",
    typicalPrice: "$270,000–$360,000",
    investorAngle:
      "Central-Florida growth at a discount to Tampa and Orlando, with solid demand. Model Florida insurance as a real line item.",
    neighborhoods: [
      { name: "South Lakeland", why: "Desirable, family renters, low vacancy." },
      { name: "Dixieland", why: "Historic, steady demand." },
      { name: "North Lakeland", why: "Affordable, value-add." },
    ],
    relatedPosts: ["what-is-a-good-cap-rate", "cash-flow-vs-appreciation", "best-states-for-rental-investors-2026"],
  },
  {
    slug: "tallahassee",
    name: "Tallahassee",
    stateCode: "FL",
    stateName: "Florida",
    blurb:
      "Tallahassee is Florida's capital and a major university town (FSU, FAMU) — government plus students create steady, recession-resistant rental demand.",
    typicalRent: "$1,300–$1,800/mo",
    typicalPrice: "$230,000–$320,000",
    investorAngle:
      "Stable demand from government and ~70k students, with no state income tax. Student-heavy submarkets need turnover-aware underwriting.",
    neighborhoods: [
      { name: "Midtown", why: "Desirable, walkable, steady demand." },
      { name: "Near FSU", why: "Student rentals, high occupancy." },
      { name: "Southwood", why: "Suburb; newer SFRs, family renters." },
    ],
    relatedPosts: ["what-is-a-good-cap-rate", "vacancy-rate-rental-property", "cash-flow-vs-appreciation"],
  },
  {
    slug: "pensacola",
    name: "Pensacola",
    stateCode: "FL",
    stateName: "Florida",
    blurb:
      "Pensacola pairs Gulf Coast appeal with a large military presence (NAS Pensacola) and no state income tax — steady demand and tourism upside.",
    typicalRent: "$1,400–$1,900/mo",
    typicalPrice: "$250,000–$340,000",
    investorAngle:
      "Military relocations keep occupancy stable, and short-term-rental demand adds upside near the beaches. Coastal insurance is the cost to watch.",
    neighborhoods: [
      { name: "East Hill", why: "Desirable, historic, steady demand." },
      { name: "Cordova", why: "Central, family renters, low vacancy." },
      { name: "Pace / Gulf Breeze", why: "Suburbs; newer stock, reliable tenants." },
    ],
    relatedPosts: ["what-is-a-good-cap-rate", "cash-flow-vs-appreciation", "closing-costs-investment-property"],
  },
  {
    slug: "clarksville",
    name: "Clarksville",
    stateCode: "TN",
    stateName: "Tennessee",
    blurb:
      "Clarksville is one of Tennessee's fastest-growing cities, anchored by Fort Campbell and an easy reach to Nashville — strong demand, no state income tax.",
    typicalRent: "$1,300–$1,750/mo",
    typicalPrice: "$230,000–$320,000",
    investorAngle:
      "Fort Campbell drives steady military rental demand, and Nashville-overflow growth adds appreciation — a rare cash-flow-plus-growth balance in Tennessee.",
    neighborhoods: [
      { name: "Sango", why: "Desirable suburb, family renters, low vacancy." },
      { name: "St. Bethlehem", why: "Newer SFRs, steady demand." },
      { name: "Near Fort Campbell", why: "Reliable military tenant pool." },
    ],
    relatedPosts: ["what-is-a-good-cap-rate", "cash-flow-vs-appreciation", "best-states-for-rental-investors-2026"],
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
