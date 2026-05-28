/**
 * City + strategy combo data for /markets/[city]/[strategy] pages.
 *
 * Each entry powers a dedicated long-tail SEO page for a specific
 * strategy in a specific city. Targets queries like:
 *   - "BRRRR in Philadelphia"
 *   - "cash flow rentals Cleveland"
 *   - "house hacking Indianapolis"
 *   - "Section 8 investing Memphis"
 *   - "turnkey rental Memphis"
 *
 * Each combo = a new ranking URL with focused search intent.
 */

export type StrategyKey =
  | "brrrr"
  | "cash-flow"
  | "house-hack"
  | "section-8"
  | "turnkey"
  | "appreciation";

export type CombinedCityStrategy = {
  citySlug: string;
  cityName: string;
  state: string;
  strategy: StrategyKey;
  strategyLabel: string;
  pitch: string;
  /** Why this strategy specifically fits THIS city right now. */
  whyHereWhyNow: string;
  /** Realistic numbers for a typical deal in this combo. */
  typicalNumbers: {
    purchasePrice: string;
    monthlyRent: string;
    capRate: string;
    notes: string;
  };
  /** Specific neighborhoods to consider for this strategy in this city. */
  neighborhoods: Array<{ name: string; why: string }>;
  /** The common pitfalls when running this strategy here. */
  pitfalls: string[];
  /** Related blog post slugs for internal linking. */
  relatedPosts?: string[];
};

export const CITY_STRATEGY_COMBOS: CombinedCityStrategy[] = [
  // ─── PHILADELPHIA ───
  {
    citySlug: "philadelphia",
    cityName: "Philadelphia",
    state: "Pennsylvania",
    strategy: "brrrr",
    strategyLabel: "BRRRR",
    pitch:
      "Philadelphia is one of the best BRRRR markets in the country — old housing stock, plentiful distressed inventory, and a refinance market that supports ARV-driven cash-outs in gentrifying neighborhoods.",
    whyHereWhyNow:
      "Philly's pre-WW2 rowhouse inventory creates constant BRRRR opportunities. Distressed acquisition prices in B-class neighborhoods range $80-180k, rehab budgets $30-70k, and ARVs in gentrifying zones like Fishtown, Brewerytown, and Point Breeze support 75% LTV cash-out refis that recycle most of your capital. The post-rehab cash flow + appreciation tailwind in these neighborhoods makes Philly one of the few BRRRR markets where the math still pencils consistently.",
    typicalNumbers: {
      purchasePrice: "$95-165k acquisition",
      monthlyRent: "$1,400-2,200 post-rehab",
      capRate: "7.5-9.5% post-rehab",
      notes: "All-in (purchase + rehab + holding) typically $145-225k. ARV in gentrifying zones: $185-275k. Cash-out refi at 75% LTV recycles 80-100% of capital.",
    },
    neighborhoods: [
      { name: "Fishtown", why: "Gentrified core — appreciation strong but acquisition prices already up. BRRRR works on remaining un-renovated stock." },
      { name: "Brewerytown", why: "Earlier in gentrification cycle — better acquisition prices, comparable ARV upside." },
      { name: "Point Breeze", why: "Active gentrification, lower entry, strong post-rehab demand." },
      { name: "Kensington (east of Frankford)", why: "Deeper distress, lower acquisition, more execution risk. Not for first-time BRRRRers." },
    ],
    pitfalls: [
      "Lead paint disclosure on pre-1978 properties — required and adds compliance work",
      "Older systems (knob-and-tube electrical, galvanized supply lines, cast-iron drains) inflate rehab budgets — budget 20-30% over your initial estimate",
      "Appraisals in some Philly zip codes lag comps by 5-7% — build a haircut into your ARV assumption",
      "Long permitting process for major rehabs — budget 6-9 months from purchase to refi, not 3-4",
      "Eviction process slower than landlord-friendly states (45-75 days) — affects holding-cost math",
    ],
    relatedPosts: ["house-hacking-explained", "spot-bad-rental-in-60-seconds"],
  },
  {
    citySlug: "philadelphia",
    cityName: "Philadelphia",
    state: "Pennsylvania",
    strategy: "house-hack",
    strategyLabel: "house hacking",
    pitch:
      "Philly's 2-4 unit rowhouse inventory makes it one of the top house-hacking markets in the country. FHA 3.5% down on a $300-450k triplex covers most of your housing cost from day one — and converts to a full cash-flowing rental when you move out.",
    whyHereWhyNow:
      "Philadelphia has more 2-4 unit residential properties per capita than nearly any major US city. Combined with FHA-financeable entry points ($300-450k for solid duplexes/triplexes in livable neighborhoods) and PA's relatively flat 3.07% state income tax, the house-hack math works particularly well here for first-time investors building their portfolio.",
    typicalNumbers: {
      purchasePrice: "$300-450k for 2-3 unit",
      monthlyRent: "$1,400-1,950 per unit",
      capRate: "True out-of-pocket: $200-600/mo for your unit (vs ~$1,500/mo market rent)",
      notes: "FHA 3.5% down ($10.5-15.75k) or conventional 5% ($15-22.5k). Year 2: move out, rent your unit, cash flow flips positive.",
    },
    neighborhoods: [
      { name: "Fishtown / Northern Liberties", why: "Walkable, livable, strong rental demand — premium house-hack neighborhood" },
      { name: "Passyunk Square / East Passyunk", why: "South Philly walkable rowhouses, strong food + nightlife scene, premium for that lifestyle" },
      { name: "Point Breeze", why: "Lower entry, gentrifying, balanced cash flow + appreciation upside" },
      { name: "Mt. Airy / Germantown", why: "Larger 2-4 unit properties at lower entry prices; less walkable but more space" },
    ],
    pitfalls: [
      "FHA self-sufficiency rule on 3-4 unit properties: rental income must independently cover mortgage — excludes some otherwise-attractive deals",
      "Living next to tenants requires temperament — noise, maintenance calls, awkward boundary moments",
      "Lead paint + asbestos disclosure on pre-1978 properties (most of Philly's housing stock)",
      "Year-1 cash flow is usually break-even to slightly negative — your balance sheet must carry that for 12 months",
      "Older rowhouse systems (plumbing, electrical, foundation) require year-1 capex reserves",
    ],
    relatedPosts: ["house-hacking-explained"],
  },

  // ─── CLEVELAND ───
  {
    citySlug: "cleveland",
    cityName: "Cleveland",
    state: "Ohio",
    strategy: "cash-flow",
    strategyLabel: "cash flow",
    pitch:
      "Cleveland is the gold standard cash-flow market in the US. Entry prices of $80-150k combined with rents of $1,100-1,500 produce cap rates of 8-11% that simply don't exist in most other major metros.",
    whyHereWhyNow:
      "Cleveland's housing market never recovered the way coastal markets did — meaning entry prices stayed accessible while rental demand stayed real. The 1% rule clears regularly here (rent ≥ 1% of price). Insurance is among the most stable in the country. Property tax is reasonable. The combination produces the most reliable buy-and-hold cash flow in the country — for investors who can stomach modest appreciation and the operational nuances of older urban housing stock.",
    typicalNumbers: {
      purchasePrice: "$85-145k typical",
      monthlyRent: "$1,100-1,550",
      capRate: "8-11% in B+ neighborhoods, higher in C-class",
      notes: "Monthly NCF of $400-800 common on financed deals. Insurance ~$70-100/mo. Property tax ~$130-200/mo. Modest appreciation (1-2.5%/yr).",
    },
    neighborhoods: [
      { name: "Old Brooklyn", why: "B+ stable neighborhood, owner-occupant friendly, low turnover — investor sweet spot" },
      { name: "Lee-Harvard", why: "Mostly B-class, voucher-favorable, strong cash flow" },
      { name: "Detroit-Shoreway", why: "Gentrifying, balanced cash flow + appreciation, walkable" },
      { name: "Slavic Village", why: "Higher cap rates but block-by-block research critical" },
    ],
    pitfalls: [
      "Pre-WW2 housing stock means year-1 capex is real — budget 4-6% of purchase price for the first year",
      "Cleveland appraisals run 3-7% under-comp on rehabbed properties (affects BRRRR but also resale)",
      "Some neighborhoods have block-by-block quality variation — walk before you buy",
      "Property tax appeals in Cuyahoga County require a hearing — but the success rate is high when armed with comps",
      "Out-of-state investors should ALWAYS use a vetted PM — Cleveland's nuances are not Florida's",
    ],
    relatedPosts: ["50-percent-rule-rentals", "what-is-a-good-cap-rate"],
  },
  {
    citySlug: "cleveland",
    cityName: "Cleveland",
    state: "Ohio",
    strategy: "brrrr",
    strategyLabel: "BRRRR",
    pitch:
      "Cleveland BRRRR works if you build a 5-7% appraisal haircut into your ARV planning. Distressed inventory is plentiful; the challenge is getting refi appraisers to value the rehab at full comp.",
    whyHereWhyNow:
      "Cleveland has the distressed inventory + rehab labor cost structure that supports BRRRR economics. The catch unique to Cleveland: appraisers consistently come in 5-7% below recent comps on freshly-rehabbed properties. If you plan for ARV $145k and the appraisal comes in at $135k, your 75% LTV refi pulls out $7,500 less than you modeled. Investors who succeed here build that haircut into the underwrite from day one.",
    typicalNumbers: {
      purchasePrice: "$45-80k distressed acquisition",
      monthlyRent: "$1,200-1,500 post-rehab",
      capRate: "9-12% on the BRRRR-completed property",
      notes: "Rehab $25-50k. All-in $80-130k. ARV (with 5-7% haircut) $125-150k. Refi at 75% pulls $95-115k — recycles 90-100% of capital on well-executed deals.",
    },
    neighborhoods: [
      { name: "Detroit-Shoreway", why: "Gentrifying — appraisals more accurate, ARV less haircut" },
      { name: "Old Brooklyn", why: "Stable comps, predictable ARV, lower upside but lower risk" },
      { name: "Tremont", why: "Already gentrified — fewer distressed deals but cleaner appraisals" },
      { name: "Cudell / Edgewater", why: "Earlier gentrification cycle; risk-reward higher" },
    ],
    pitfalls: [
      "5-7% appraisal haircut on rehabbed properties — build into underwrite from day one",
      "Rehab cost variance higher than newer-stock markets (older systems mean surprises)",
      "Foundation issues common in pre-1940 Cleveland houses — get a structural opinion before buying",
      "Some lenders require 6+ months of seasoning before cash-out refi — affects capital recycling speed",
      "Cleveland inspectors are thorough — code-compliance costs in older homes can add $3-8k",
    ],
    relatedPosts: ["spot-bad-rental-in-60-seconds"],
  },

  // ─── INDIANAPOLIS ───
  {
    citySlug: "indianapolis",
    cityName: "Indianapolis",
    state: "Indiana",
    strategy: "cash-flow",
    strategyLabel: "cash flow",
    pitch:
      "Indianapolis is the most consistent buy-and-hold cash flow market in the Midwest — boring, reliable, and rarely surprising. The 1% rule clears in many neighborhoods, and the operational nuances are less than Cleveland.",
    whyHereWhyNow:
      "Indianapolis combines lower entry prices, stable demographics, low insurance volatility, and a flat 3.05% state income tax to produce reliable cash flow without the operational complexity of Cleveland or Detroit. Cap rates of 7-9% are achievable in B+ neighborhoods. Indianapolis is the market most experienced investors recommend for first-time out-of-state buyers learning cash flow.",
    typicalNumbers: {
      purchasePrice: "$150-225k typical",
      monthlyRent: "$1,400-1,800",
      capRate: "7-9% in B+ neighborhoods",
      notes: "Monthly NCF $400-700 common. Property tax ~$150-200/mo. Modest 2-3%/yr appreciation. Lower management overhead than Cleveland.",
    },
    neighborhoods: [
      { name: "Mars Hill", why: "Working-class neighborhood, strong rental demand, cap rates in the 7-8% range" },
      { name: "Garfield Park", why: "Slightly more gentrified, balanced cash flow + appreciation" },
      { name: "Fountain Square", why: "Gentrifying, walkable, appreciation tailwind alongside cash flow" },
      { name: "Speedway", why: "Suburban-feeling, strong school district, lower turnover" },
    ],
    pitfalls: [
      "Some Indianapolis sub-metros gentrifying faster than Zillow data shows — cap rates lower than expected",
      "Older urban core properties carry capex risk (older HVAC, plumbing) — budget conservatively",
      "Marion County tax appeals available but require attention to detail",
      "Tornado risk modest but real — insurance modestly higher than Ohio peer markets",
      "Single-employer concentration (Eli Lilly, Salesforce) — broader market is fine but specific neighborhoods feel ripple effects",
    ],
    relatedPosts: ["what-is-a-good-cap-rate", "50-percent-rule-rentals"],
  },
  {
    citySlug: "indianapolis",
    cityName: "Indianapolis",
    state: "Indiana",
    strategy: "section-8",
    strategyLabel: "Section 8",
    pitch:
      "Indianapolis has multiple zip codes where Section 8 Fair Market Rent meaningfully exceeds market rent — making voucher tenants more profitable than market-rate tenants for properly-positioned properties.",
    whyHereWhyNow:
      "The Indianapolis Housing Agency administers the local Section 8 program with reasonable processes and reliable payment. In specific zones (parts of Mars Hill, Crown Hill, Lee-Harvard) FMR runs 10-18% above market rent. Combined with the HUD-paid guaranteed portion of rent and reasonable inspection requirements, voucher rentals can produce more stable returns than market-rate equivalents.",
    typicalNumbers: {
      purchasePrice: "$120-180k",
      monthlyRent: "$1,300-1,650 (FMR rate)",
      capRate: "8-10% with voucher premium",
      notes: "Market rent in same property: $1,150-1,400. FMR premium: $150-250/mo. Voucher portion paid by housing authority direct deposit.",
    },
    neighborhoods: [
      { name: "Mars Hill", why: "FMR premium ~15% over market rent; strong voucher demand" },
      { name: "Crown Hill", why: "Working-class, voucher-friendly zoning, decent stock" },
      { name: "Eagle Ledge", why: "Newer construction option for voucher tenants, lower capex" },
      { name: "Far Eastside (Lawrence)", why: "Lower entry prices, voucher-supported demand" },
    ],
    pitfalls: [
      "Annual Housing Quality Standards (HQS) inspections require prep work — budget $200-500/yr per unit",
      "Initial lease-up takes 30-60 days for housing authority paperwork — vs 14-30 for market-rate",
      "Cannot raise rent mid-lease — limits responsiveness to market changes",
      "Some voucher tenants have higher turnover (life-stage instability) — budget vacancy realistically",
      "Tenant screening rules differ from market-rate — you can't reject for some standard reasons",
    ],
    relatedPosts: ["50-percent-rule-rentals"],
  },

  // ─── MEMPHIS ───
  {
    citySlug: "memphis",
    cityName: "Memphis",
    state: "Tennessee",
    strategy: "turnkey",
    strategyLabel: "turnkey",
    pitch:
      "Memphis has the deepest turnkey rental market in the country — rehabbed properties with tenants in place, ready for absentee owners. Done right, it's a hands-off cash-flow play. Done wrong, it's a magnet for the seller-friendly turnkey trap.",
    whyHereWhyNow:
      "Memphis has more dedicated turnkey operators than any other US market. The combination of low entry prices ($90-160k), tenant-friendly demand, no state income tax, and an established PM ecosystem makes it the default destination for first-time out-of-state cash-flow investors. The catch: 'turnkey' is a sales category, not a quality guarantee. The good operators produce reliable 8-10% cash-on-cash returns; the bad ones overprice rehabs and place marginal tenants in cosmetically-painted properties.",
    typicalNumbers: {
      purchasePrice: "$95-160k turnkey priced",
      monthlyRent: "$1,000-1,400",
      capRate: "7-9% true cap rate (after honest vacancy + capex)",
      notes: "Paper cap rates often quoted at 10-12% but real cap drops 2-4 points after honest assumptions. CoC 8-10% on financed deals.",
    },
    neighborhoods: [
      { name: "Berclair", why: "Working-class, strong rental demand, voucher-friendly" },
      { name: "Cooper-Young", why: "Gentrifying, walkable, balanced cash flow + appreciation" },
      { name: "Hickory Hill", why: "Suburban-feeling, larger lots, family-renter demand" },
      { name: "High Point Terrace", why: "Stable middle-class neighborhood, lower turnover" },
    ],
    pitfalls: [
      "Real Memphis vacancy runs 8-12%, not the 5% turnkey sellers quote — verify in your underwrite",
      "Verify EVERY claim about tenant payment history (some turnkey operators place marginal tenants to inflate occupancy)",
      "Rehab quality varies dramatically — pay for an independent inspection BEFORE closing, never rely on the operator's",
      "PM selection is the entire game in Memphis — vet 3+ before signing",
      "Some zip codes have insurance-disqualifying issues (vacancy/arson history) — quote insurance independently",
    ],
    relatedPosts: ["spot-bad-rental-in-60-seconds", "property-management-yes-or-no"],
  },

  // ─── ATLANTA ───
  {
    citySlug: "atlanta",
    cityName: "Atlanta",
    state: "Georgia",
    strategy: "brrrr",
    strategyLabel: "BRRRR",
    pitch:
      "Atlanta BRRRR works in gentrifying intown neighborhoods where ARV appreciation has run for 3-5 years. East Atlanta Village, Kirkwood, and parts of West End offer real BRRRR upside when executed with conservative ARV assumptions.",
    whyHereWhyNow:
      "Atlanta's intown gentrification has been steady through 2020-2025, creating a continuous flow of BRRRR opportunities in neighborhoods that haven't yet fully gentrified. Combined with GA's landlord-friendly law, fast eviction process, and diverse economic base, Atlanta is one of the more reliable BRRRR markets in the Sun Belt. The challenge: appraisals in actively-gentrifying neighborhoods can lag rapid comp growth — build a buffer.",
    typicalNumbers: {
      purchasePrice: "$140-220k distressed acquisition",
      monthlyRent: "$1,800-2,400 post-rehab",
      capRate: "6-8% post-rehab",
      notes: "Rehab $40-80k. All-in $200-300k. ARV in gentrifying intown $260-360k. Refi at 75% pulls $195-270k.",
    },
    neighborhoods: [
      { name: "East Atlanta Village", why: "Gentrified core — appreciation real, distressed inventory still available" },
      { name: "Kirkwood", why: "Continued gentrification, strong ARV upside" },
      { name: "West End", why: "Earlier gentrification cycle, better entry prices, higher risk" },
      { name: "Decatur (East Lake)", why: "Adjacent to Decatur city, school-district premium" },
    ],
    pitfalls: [
      "Atlanta appraisals in fast-gentrifying neighborhoods can lag 3-6 months — build a 5% ARV haircut",
      "Property crime higher in some BRRRR-target neighborhoods — verify on walks before committing",
      "Rehab labor cost up 20-30% in Atlanta since 2020 — budget current pricing not 2022 numbers",
      "Long-tail school district effects on resale — verify before committing in family-target neighborhoods",
      "Some Atlanta zip codes face insurance carrier exits — quote insurance during acquisition",
    ],
    relatedPosts: ["spot-bad-rental-in-60-seconds"],
  },

  // ─── KANSAS CITY ───
  {
    citySlug: "kansas-city",
    cityName: "Kansas City",
    state: "Missouri",
    strategy: "house-hack",
    strategyLabel: "house hacking",
    pitch:
      "Kansas City offers some of the best house-hacking economics in the country — moderate entry prices, strong rental demand in walkable neighborhoods, and a market where the 'live free' math actually works in year 1, not just year 2.",
    whyHereWhyNow:
      "KC's combination of $200-380k duplexes in livable urban neighborhoods (Brookside, Waldo, Volker, Westport) and rental demand from young professionals + university students makes house-hacking unusually accessible. FHA 3.5% or conventional 5% down covers a duplex with rental income that often produces near-zero true out-of-pocket housing cost from month one. Year 2 (when you move out) the property converts to strong cash-flow rental.",
    typicalNumbers: {
      purchasePrice: "$280-420k for 2-3 unit",
      monthlyRent: "$1,200-1,700 per unit",
      capRate: "True out-of-pocket: $0-400/mo for your unit",
      notes: "FHA 3.5% ($9.8-14.7k down) or conventional 5% ($14-21k). Year 2 conversion to pure rental yields ~$600-900/mo NCF.",
    },
    neighborhoods: [
      { name: "Brookside", why: "Walkable, university-adjacent, premium house-hack neighborhood" },
      { name: "Waldo", why: "Lower entry than Brookside, similar demographics, strong rental demand" },
      { name: "Volker", why: "Young professional + arts community, gentrifying with appreciation upside" },
      { name: "Westport", why: "Walkable, nightlife adjacent, premium for that lifestyle" },
    ],
    pitfalls: [
      "Jackson County tax appeals have been heavily filed since 2023 reassessment — budget for appeal process",
      "Older 2-4 unit properties often have shared utility metering — fix before tenant placement or live with the negotiation",
      "Some KC neighborhoods have block-by-block variation — walk before buying",
      "Tornado risk is real but stable — insurance accounts for it; no surprises",
      "Conversion to pure rental in year 2 requires PM selection — start vetting before year 1 ends",
    ],
    relatedPosts: ["house-hacking-explained"],
  },

  // ─── DETROIT ───
  {
    citySlug: "detroit",
    cityName: "Detroit",
    state: "Michigan",
    strategy: "brrrr",
    strategyLabel: "BRRRR",
    pitch:
      "Detroit has the largest distressed-property inventory in the country and the biggest BRRRR upside — for investors who can manage extreme block-by-block neighborhood variation and budget for appraisals that consistently lag rehabbed-property comps.",
    whyHereWhyNow:
      "Detroit's housing recovery has been real but uneven. East English Village, Bagley, Boston-Edison, and Sherwood Forest neighborhoods have appreciated 8-12%/yr since 2018, with distressed inventory still available at $30-80k entry prices. Rehab budgets of $30-60k produce ARVs of $130-180k in gentrifying zones. The two persistent challenges: appraisers value rehabbed Detroit properties 5-10% below comp prices, AND block-by-block neighborhood quality variation is extreme.",
    typicalNumbers: {
      purchasePrice: "$35-85k distressed acquisition",
      monthlyRent: "$1,200-1,650 post-rehab",
      capRate: "9-12% post-rehab",
      notes: "Rehab $30-65k. All-in $75-130k. ARV in gentrifying zones (with 5-10% haircut) $130-170k. Refi at 75% LTV pulls $95-130k.",
    },
    neighborhoods: [
      { name: "East English Village", why: "Most stable gentrifying neighborhood; cleanest comps; lowest haircut on appraisal" },
      { name: "Bagley", why: "Strong stable neighborhood, family demand, lower BRRRR risk" },
      { name: "Boston-Edison", why: "Historic district, premium appreciation upside, fewer distressed deals" },
      { name: "Cornerstone Village", why: "Affordable entry, gentrifying, higher execution risk" },
    ],
    pitfalls: [
      "Appraisals lag comps by 5-10% in most Detroit neighborhoods — build this into your ARV planning",
      "Block-by-block variation extreme — drive every street before committing to an offer",
      "Wayne County tax assessments often over-assessed — appeal early and often",
      "Insurance options limited for some neighborhoods — quote BEFORE closing",
      "Some Detroit properties have title issues (tax liens, prior foreclosure history) — pay extra for title insurance research",
    ],
    relatedPosts: ["spot-bad-rental-in-60-seconds"],
  },

  // ─── TAMPA ───
  {
    citySlug: "tampa",
    cityName: "Tampa",
    state: "Florida",
    strategy: "cash-flow",
    strategyLabel: "cash flow",
    pitch:
      "Tampa cash flow plays are harder than they were in 2021 — insurance pricing has reshaped which deals pencil. But for investors who properly model insurance volatility, Tampa's population inflow + no state income tax + reasonable property prices in inland zones still produce solid returns.",
    whyHereWhyNow:
      "Tampa's population growth is real — among the fastest-growing major metros in the US. The challenge is insurance: premiums up 35-50% since 2020, with some carriers exiting entirely. Inland Tampa (Seminole Heights, Temple Terrace, parts of Brandon) has more manageable insurance pricing than coastal zones, making cash-flow plays more workable. Investors who model insurance at the renewal rate (not the seller's current rate) find Tampa still pencils.",
    typicalNumbers: {
      purchasePrice: "$310-475k typical SFR",
      monthlyRent: "$1,950-2,700",
      capRate: "5.5-7% after honest insurance modeling",
      notes: "Insurance can be $3,500-7,500/yr depending on zone + property age. Property tax modest (~0.9%). Strong rental demand year-round.",
    },
    neighborhoods: [
      { name: "Seminole Heights", why: "Inland, walkable, gentrifying — best balance of insurance manageability + appreciation" },
      { name: "Temple Terrace", why: "Suburban, university-adjacent, lower insurance volatility" },
      { name: "Brandon", why: "Suburban Tampa, lower entry prices, manageable insurance" },
      { name: "Westchase", why: "Newer construction = better insurance pricing, lower capex risk" },
    ],
    pitfalls: [
      "Insurance is the dealbreaker — always quote it yourself before signing a contract",
      "Sun Belt overbuilding has flattened Tampa rent growth — don't model 4-6% rent growth",
      "Older properties (1970s-1980s) often have insurance-disqualifying roof issues — verify roof age in inspection",
      "Flood zone designation matters — even some non-coastal Tampa zones require flood insurance",
      "Condos face post-Surfside reserve requirements — 20-40% HOA hikes coming for many buildings",
    ],
    relatedPosts: ["50-percent-rule-rentals"],
  },

  // ─── CINCINNATI ───
  {
    citySlug: "cincinnati",
    cityName: "Cincinnati",
    state: "Ohio",
    strategy: "cash-flow",
    strategyLabel: "cash flow",
    pitch:
      "Cincinnati is the quietly outperforming Ohio cash-flow market — more stable than Cleveland, less overhead than Detroit, and consistently undersupplied for investor inventory. Cap rates 7-9% in B+ neighborhoods are reliably available.",
    whyHereWhyNow:
      "Cincinnati's two healthcare anchors (Mercy + UC Health) plus diverse manufacturing + finance employers keep rental demand stable. Insurance is among the most predictable in the country. Property taxes are reasonable. Compared to Cleveland, Cincinnati has fewer block-by-block neighborhood variation issues and the housing stock is somewhat newer on average, lowering year-1 capex risk.",
    typicalNumbers: {
      purchasePrice: "$130-200k typical",
      monthlyRent: "$1,300-1,700",
      capRate: "7-9% in B+ neighborhoods",
      notes: "Monthly NCF $400-700 common. Insurance ~$70-100/mo. Taxes ~$150-220/mo. Modest 2-3%/yr appreciation. Fewer operational surprises than Cleveland.",
    },
    neighborhoods: [
      { name: "College Hill", why: "B+ stable neighborhood with strong owner-occupant + tenant mix" },
      { name: "Pleasant Ridge", why: "Walkable, gentrifying, family demand" },
      { name: "Northside", why: "Gentrifying, balanced cash flow + appreciation upside" },
      { name: "Westwood", why: "Best cash-flow neighborhood in Cincinnati; family-renter demand" },
    ],
    pitfalls: [
      "Older housing stock (pre-WW2) carries year-1 capex risk — budget 4-6% of purchase price for the first year",
      "Some Cincinnati neighborhoods have block-by-block quality variation — walk before you buy",
      "Hamilton County property tax appeals available — budget time for the process",
      "Cincinnati appraisals modestly under-comp on rehabbed properties (3-5% haircut)",
      "Out-of-state investors should ALWAYS use a vetted local PM — Cincinnati's nuances aren't Florida's",
    ],
    relatedPosts: ["what-is-a-good-cap-rate", "50-percent-rule-rentals"],
  },

  // ─── PITTSBURGH ───
  {
    citySlug: "pittsburgh",
    cityName: "Pittsburgh",
    state: "Pennsylvania",
    strategy: "brrrr",
    strategyLabel: "BRRRR",
    pitch:
      "Pittsburgh BRRRR works in the gentrifying neighborhoods — Lawrenceville, Garfield, parts of Northside. Distressed inventory + ARV-supporting comps + reasonable refi appraisals make this one of the cleaner BRRRR markets in the Northeast.",
    whyHereWhyNow:
      "Pittsburgh's gentrification has been steady through 2018-2025, anchored by Carnegie Mellon + UPMC + a growing tech ecosystem (Duolingo, Aurora, autonomous vehicle startups). Distressed inventory remains available at $60-120k in gentrifying zones, rehab budgets $30-55k produce ARVs of $160-220k. Unlike Cleveland or Detroit, Pittsburgh appraisals on rehabbed properties tend to match comps more closely — better refi math.",
    typicalNumbers: {
      purchasePrice: "$55-110k distressed acquisition",
      monthlyRent: "$1,300-1,700 post-rehab",
      capRate: "7.5-9.5% post-rehab",
      notes: "Rehab $30-55k. All-in $90-170k. ARV $170-225k in gentrifying zones. Refi at 75% pulls $128-170k. Capital recycled 85-100% on clean executions.",
    },
    neighborhoods: [
      { name: "Lawrenceville", why: "Gentrified core — strong ARV upside, premium acquisition prices" },
      { name: "Garfield", why: "Earlier gentrification cycle, better entry prices, higher upside" },
      { name: "Bloomfield", why: "Walkable, gentrifying, strong demographic tailwind" },
      { name: "Allentown / Beltzhoover", why: "Lower entry, more execution risk, higher long-term upside" },
    ],
    pitfalls: [
      "Steep terrain in Pittsburgh means foundation + drainage issues common — get structural review",
      "Older housing stock (pre-1940) carries asbestos + knob-and-tube electrical risk",
      "PA eviction process slower than landlord-friendly states (45-75 days)",
      "Some Pittsburgh neighborhoods have steep hills affecting parking + access — walk before buying",
      "Allegheny County tax appeals worth filing on most purchases",
    ],
    relatedPosts: ["spot-bad-rental-in-60-seconds"],
  },
  {
    citySlug: "pittsburgh",
    cityName: "Pittsburgh",
    state: "Pennsylvania",
    strategy: "house-hack",
    strategyLabel: "house hacking",
    pitch:
      "Pittsburgh house hacking economics are among the best in the country — duplexes and triplexes in walkable neighborhoods at $200-350k entry prices, with rental demand from CMU + Pitt + UPMC students and young professionals.",
    whyHereWhyNow:
      "Pittsburgh's combination of moderate housing prices + walkable urban neighborhoods + young-professional and student rental demand makes it ideal for FHA 3.5% / conventional 5% house-hacks. Year-1 true out-of-pocket is often $200-500/mo (vs $1,200-1,600 market rent for comparable housing). Year-2 conversion to pure rental yields meaningful cash flow.",
    typicalNumbers: {
      purchasePrice: "$200-350k for 2-3 unit",
      monthlyRent: "$1,000-1,500 per unit",
      capRate: "True out-of-pocket: $200-500/mo for your unit",
      notes: "FHA 3.5% ($7-12.25k down) or conventional 5% ($10-17.5k). Year 2: move out, full rental conversion yields $400-700/mo NCF.",
    },
    neighborhoods: [
      { name: "Lawrenceville", why: "Walkable, young-professional demand, premium house-hack neighborhood" },
      { name: "Bloomfield", why: "Walkable, ethnic-food anchor, strong rental demand" },
      { name: "Squirrel Hill", why: "Family + grad-student demand, premium for school district" },
      { name: "Mt. Washington", why: "Iconic views, lower entry, walkable to downtown via incline" },
    ],
    pitfalls: [
      "Steep Pittsburgh terrain creates parking challenges + foundation issues",
      "Older housing stock = real year-1 capex even on owner-occupant FHA financing",
      "PA's flat 3.07% state income tax modest but still affects after-tax math",
      "Allegheny County reassessments affect tax bills periodically",
      "Living next to college-aged tenants requires temperament — noise, turnover, awkward moments",
    ],
    relatedPosts: ["house-hacking-explained"],
  },

  // ─── BIRMINGHAM ───
  {
    citySlug: "birmingham",
    cityName: "Birmingham",
    state: "Alabama",
    strategy: "cash-flow",
    strategyLabel: "cash flow",
    pitch:
      "Birmingham is the most underrated cash-flow market in the Southeast. Property tax of just 0.42% (among lowest in US), fast 7-21 day eviction process, and B-class neighborhood inventory at $130-200k make this a steady buy-and-hold market.",
    whyHereWhyNow:
      "Birmingham's combination of UAB Medicine, manufacturing, and banking employers supports steady rental demand. Alabama's landlord-friendly law and fast eviction process reduce operational risk. Property tax of 0.42% is the lowest of any major US metro. Cap rates of 8-10% in B+ neighborhoods are reliably available, with less operational overhead than Memphis or Detroit.",
    typicalNumbers: {
      purchasePrice: "$130-200k typical",
      monthlyRent: "$1,250-1,650",
      capRate: "8-10% in B+ neighborhoods",
      notes: "Property tax ~$50-80/mo (the AL advantage). Insurance ~$80-110/mo. Monthly NCF $450-750 common.",
    },
    neighborhoods: [
      { name: "Crestwood", why: "B+ stable neighborhood with strong family demand" },
      { name: "Forest Park", why: "Walkable, gentrifying, premium for the area" },
      { name: "Bluff Park", why: "Suburban-feeling, school district premium" },
      { name: "Avondale", why: "Gentrifying urban core, walkable, BRRRR upside" },
    ],
    pitfalls: [
      "Tornado risk modest but real — insurance accounts for it; storm damage occasional",
      "Some Birmingham neighborhoods have crime concentration in specific zones — walk before buying",
      "Older urban core stock may need year-1 capex (older HVAC, plumbing)",
      "Property tax appeals available but rarely needed at such low rates",
      "5% AL state income tax modestly higher than peer cash-flow states (TN, FL)",
    ],
    relatedPosts: ["what-is-a-good-cap-rate", "50-percent-rule-rentals"],
  },

  // ─── SACRAMENTO ───
  {
    citySlug: "sacramento",
    cityName: "Sacramento",
    state: "California",
    strategy: "house-hack",
    strategyLabel: "house hacking",
    pitch:
      "Sacramento is the most workable major-California market for house-hacking. Entry prices are 30-40% lower than the Bay Area, ADU laws are permissive, and FHA owner-occupant financing works on duplexes and ADU-equipped SFRs.",
    whyHereWhyNow:
      "California's ADU laws (SB 9, SB 10) plus Sacramento's relatively reasonable entry prices ($400-550k for SFR with ADU potential, $500-700k for duplexes) create unusual house-hacking opportunities for CA investors who'd be priced out of Bay Area or LA. FHA 3.5% on the right deal makes year-1 true out-of-pocket comparable to renting a single unit elsewhere.",
    typicalNumbers: {
      purchasePrice: "$450-650k for SFR + ADU or 2-unit",
      monthlyRent: "$1,400-2,000 per unit",
      capRate: "True out-of-pocket: $800-1,500/mo for your unit (vs $2,200+ market rent)",
      notes: "FHA 3.5% ($15.75-22.75k down) or conventional 5% ($22.5-32.5k). High insurance + CA tax requires careful underwriting.",
    },
    neighborhoods: [
      { name: "Tahoe Park", why: "Walkable, university-adjacent, ADU-friendly, family-renter demand" },
      { name: "Curtis Park", why: "Established neighborhood, premium for the area, stable demand" },
      { name: "Oak Park", why: "Gentrifying, more accessible entry, balanced cash flow + appreciation" },
      { name: "South Land Park", why: "Family demand, school-district premium, larger lots" },
    ],
    pitfalls: [
      "California insurance volatility — Tahoe Park is reasonable but verify carrier availability",
      "13.3% top CA state income tax compresses after-tax returns severely",
      "Tenant-leaning law: 60-120 day eviction process",
      "Statewide AB 1482 rent caps limit pricing flexibility on renewals",
      "ADU construction can take 6-12 months with permits — factor into year-1 plans",
    ],
    relatedPosts: ["house-hacking-explained"],
  },

  // ─── CHARLOTTE ───
  {
    citySlug: "charlotte",
    cityName: "Charlotte",
    state: "North Carolina",
    strategy: "appreciation",
    strategyLabel: "appreciation",
    pitch:
      "Charlotte is one of the most consistent appreciation markets in the Southeast — banking (Bank of America, Wells Fargo, Truist) + healthcare (Atrium, Novant) + tech growth drive consistent rent + price growth. Cap rates are compressed but 10-year IRR math is strong.",
    whyHereWhyNow:
      "Charlotte's population growth has been among the fastest in the US for 15+ years. Banking + tech + healthcare anchors create reliable rental demand from young professionals. The trade-off: cap rates are 4.5-6% on most SFRs, monthly cash flow modest. Long-hold appreciation strategy is the dominant play. Strong landlord law + fast eviction (14-30 days) reduces operational risk.",
    typicalNumbers: {
      purchasePrice: "$325-475k typical SFR",
      monthlyRent: "$2,100-2,800",
      capRate: "4.5-6% after honest underwriting",
      notes: "Year-1 cash flow modest ($100-400/mo). 10-year IRR typically 12-16% on leveraged deals with strong appreciation. NC's low 0.77% property tax helps the math.",
    },
    neighborhoods: [
      { name: "Plaza Midwood", why: "Walkable, gentrified, premium appreciation upside" },
      { name: "NoDa", why: "Arts district, strong young-professional demand" },
      { name: "Cherry", why: "Adjacent to South End growth, slightly more accessible" },
      { name: "South End", why: "Light-rail corridor, walkable, premium for that lifestyle" },
    ],
    pitfalls: [
      "Cap rate compression means cash flow is tight — small underwriting errors swing deals to negative",
      "Charlotte rapid gentrification means buying at top of cycle is real risk",
      "Banking-sector employment concentration risk in downturns",
      "STR restricted in most Charlotte neighborhoods",
      "Property crime higher in some target neighborhoods — verify on walks",
    ],
    relatedPosts: ["cash-flow-vs-appreciation"],
  },

  // ─── DALLAS ───
  {
    citySlug: "dallas",
    cityName: "Dallas",
    state: "Texas",
    strategy: "appreciation",
    strategyLabel: "appreciation",
    pitch:
      "Dallas-Fort Worth has been one of the most consistent appreciation markets in the country for 15 years and the underlying drivers (corporate relocations, population growth, no state income tax) remain in place. Cap rates are compressed but long-term IRR is strong.",
    whyHereWhyNow:
      "DFW's corporate-relocation economy keeps producing population inflow that supports rent growth + appreciation. The trade-off vs cash-flow markets: cap rates of 5-6% are typical, monthly cash flow modest, but the 10-year wealth-build math is strong. The Texas property tax burden (often 2-2.8% effective, higher in MUD zones) requires careful underwriting — many deals look strong on pro forma but fail on after-tax cash flow.",
    typicalNumbers: {
      purchasePrice: "$285-425k typical SFR",
      monthlyRent: "$2,100-2,800",
      capRate: "5-6.5% after honest property tax modeling",
      notes: "Property tax often $5-9k/yr (1.7-2.5% effective). 10-year IRR typically 11-15% on leveraged deals with strong appreciation assumption.",
    },
    neighborhoods: [
      { name: "Oak Cliff (Bishop Arts adjacent)", why: "Gentrifying, walkable, appreciation upside" },
      { name: "East Dallas (Lakewood adjacent)", why: "Established appreciation, premium school districts" },
      { name: "Fort Worth (TCU area)", why: "University anchor, growth corridor, lower entry than Dallas" },
      { name: "McKinney / Frisco", why: "Suburban appreciation plays, school-district premiums" },
    ],
    pitfalls: [
      "MUD (Municipal Utility District) zones push effective property tax to 2.8-3.2% — always pull the actual tax bill, never trust Zillow",
      "Cap rate compression means cash flow is tight — small underwriting errors swing deals to negative",
      "Insurance up 20-30% in DFW hail belt over 5 years",
      "Property tax appeals are essentially required in TX — budget time annually",
      "Some Dallas zip codes have undergone rapid gentrification — buying at top of cycle is real risk",
    ],
    relatedPosts: ["cash-flow-vs-appreciation"],
  },
];

/** Find a combo by city slug + strategy. */
export function getCityStrategyCombo(
  citySlug: string,
  strategy: string
): CombinedCityStrategy | null {
  return (
    CITY_STRATEGY_COMBOS.find(
      (c) => c.citySlug === citySlug && c.strategy === strategy
    ) ?? null
  );
}

/** All combos for a given city. */
export function getCombosForCity(citySlug: string): CombinedCityStrategy[] {
  return CITY_STRATEGY_COMBOS.filter((c) => c.citySlug === citySlug);
}
