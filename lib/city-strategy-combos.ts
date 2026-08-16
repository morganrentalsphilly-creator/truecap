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
  /** Illustrative orientation ranges that require property-specific verification. */
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
      "Philadelphia's older housing stock and distressed inventory can create BRRRR candidates, but the completed value and refinance proceeds depend on the property, rehab, closed comps, seasoning, appraisal, and lender terms.",
    whyHereWhyNow:
      "Philly's pre-WW2 rowhouse inventory gives investors many properties to screen. Treat acquisition, rehab, rent, ARV, and refinance ranges as hypotheses: verify the address with current closed comps, contractor bids, permit timing, and a written lender scenario before committing.",
    typicalNumbers: {
      purchasePrice: "$95-165k acquisition",
      monthlyRent: "$1,400-2,200 post-rehab",
      capRate: "7.5-9.5% post-rehab",
      notes: "Illustrative orientation only. Model purchase, rehab, holding time, supported ARV, lender LTV, seasoning, and an appraisal downside; capital returned at refinance can be materially lower than modeled.",
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
      "Do not assume the planned ARV will appraise; support it with relevant closed comps and explicit downside values",
      "Permit and inspection timing varies by scope and agency workload — confirm the current process and carry a delay scenario",
      "Landlord-tenant procedure and timing are case-specific — use current local counsel or official court guidance rather than a fixed eviction timeline",
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
      "Philly's 2-4 unit rowhouse inventory gives owner-occupants house-hack candidates to screen. Financing eligibility and the owner's housing cost depend on the property, supported rents, borrower, occupancy, insurance, taxes, and current program terms.",
    whyHereWhyNow:
      "Philadelphia has more 2-4 unit residential properties per capita than nearly any major US city. Combined with FHA-financeable entry points ($300-450k for solid duplexes/triplexes in livable neighborhoods) and PA's relatively flat 3.07% state income tax, the house-hack math works particularly well here for first-time investors building their portfolio.",
    typicalNumbers: {
      purchasePrice: "$300-450k for 2-3 unit",
      monthlyRent: "$1,400-1,950 per unit",
      capRate: "True out-of-pocket: $200-600/mo for your unit (vs ~$1,500/mo market rent)",
      notes: "Illustrative financing screen only. Confirm occupancy, property eligibility, down payment, reserves, mortgage insurance, supported rents, and post-move cash flow with the lender and current property evidence.",
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
      "Cleveland's lower entry prices can produce cash-flow candidates, but cap rate and cash flow vary substantially by block, property condition, tenant profile, taxes, insurance, vacancy, and management execution.",
    whyHereWhyNow:
      "Cleveland's accessible prices and older rental stock make it a frequent cash-flow screen. Do not infer a reliable return from city-level price-to-rent ranges: verify achievable rent, tax, insurance, condition, vacancy, management, and near-term capital work for the address.",
    typicalNumbers: {
      purchasePrice: "$85-145k typical",
      monthlyRent: "$1,100-1,550",
      capRate: "8-11% in B+ neighborhoods, higher in C-class",
      notes: "Illustrative orientation only. Replace the rent, tax, insurance, financing, vacancy, management, capex, and appreciation assumptions with current property-specific evidence.",
    },
    neighborhoods: [
      { name: "Old Brooklyn", why: "B+ stable neighborhood, owner-occupant friendly, low turnover — investor sweet spot" },
      { name: "Lee-Harvard", why: "Mostly B-class, voucher-favorable, strong cash flow" },
      { name: "Detroit-Shoreway", why: "Gentrifying, balanced cash flow + appreciation, walkable" },
      { name: "Slavic Village", why: "Higher cap rates but block-by-block research critical" },
    ],
    pitfalls: [
      "Pre-WW2 housing stock means year-1 capex is real — budget 4-6% of purchase price for the first year",
      "A rehabbed property's appraisal can differ from the planned ARV; support the assumption with independent closed comps and downside scenarios",
      "Some neighborhoods have block-by-block quality variation — walk before you buy",
      "Do not assume a property-tax appeal will succeed; verify the current county procedure and support any filing with property-specific evidence",
      "Out-of-state owners should price and vet local management rather than assume remote operations will be passive",
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
      "Cleveland BRRRR outcomes depend on acquisition basis, rehab execution, rent, lender terms, and the independent appraisal. Do not assume a standard market-wide appraisal haircut; test multiple ARV and refinance scenarios.",
    whyHereWhyNow:
      "Cleveland has older housing stock and distressed inventory that can create BRRRR candidates, but neither the completed value nor refinance proceeds are guaranteed. Build the ARV from relevant closed comps, document the rehab scope, ask the lender how value and seasoning will be handled, and run explicit appraisal-downside cases before committing.",
    typicalNumbers: {
      purchasePrice: "$45-80k distressed acquisition",
      monthlyRent: "$1,200-1,500 post-rehab",
      capRate: "9-12% on the BRRRR-completed property",
      notes: "Illustrative screening ranges only. Verify the purchase, scope, rent, closed comps, seasoning, lender LTV, and appraisal; a BRRRR refinance may return less capital than modeled.",
    },
    neighborhoods: [
      { name: "Detroit-Shoreway", why: "Research current closed comps, rehab demand, and block-level variation" },
      { name: "Old Brooklyn", why: "Research closed-comp depth, property condition, and rent support" },
      { name: "Tremont", why: "Already gentrified — fewer distressed deals but cleaner appraisals" },
      { name: "Cudell / Edgewater", why: "Earlier gentrification cycle; risk-reward higher" },
    ],
    pitfalls: [
      "Do not assume the planned ARV will appraise; run explicit downside values and size refinance proceeds from each case",
      "Rehab cost variance higher than newer-stock markets (older systems mean surprises)",
      "Foundation issues common in pre-1940 Cleveland houses — get a structural opinion before buying",
      "Some lenders require 6+ months of seasoning before cash-out refi — affects capital recycling speed",
      "Code-compliance scope and cost are property-specific — verify permits, inspection history, and required work before closing",
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
      "Indianapolis is often screened for buy-and-hold cash flow because of its entry prices and rental stock, but address-level rent, condition, taxes, insurance, and operations determine whether a deal works.",
    whyHereWhyNow:
      "Indianapolis combines relatively accessible entry prices with a sizable rental market. Treat citywide cap-rate and insurance descriptions as screening context only, and verify current rent, property tax, insurance, management, condition, and owner-specific tax treatment.",
    typicalNumbers: {
      purchasePrice: "$150-225k typical",
      monthlyRent: "$1,400-1,800",
      capRate: "7-9% in B+ neighborhoods",
      notes: "Illustrative orientation only. Replace cash flow, tax, appreciation, and management assumptions with current property- and operator-specific evidence.",
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
      "Indianapolis voucher economics are property- and program-specific. Compare the applicable payment standard, utility allowance, rent-reasonableness decision, tenant portion, inspection timing, and achievable unassisted rent before choosing a lease strategy.",
    whyHereWhyNow:
      "HUD FMR is a benchmark, not an approved rent or a promise of collections. Obtain the current local payment standard and utility allowance, ask the administering housing authority about timing and inspections, and support requested rent with current unassisted comps. Model the housing-assistance and tenant portions separately, including abatement and collection risk.",
    typicalNumbers: {
      purchasePrice: "$120-180k",
      monthlyRent: "Property-specific approved contract rent",
      capRate: "Scenario-based after verified rent and costs",
      notes: "Do not treat FMR as market rent or approved contract rent. Verify the current PHA inputs, unassisted comps, tenant portion, inspection timing, payment terms, and property expenses.",
    },
    neighborhoods: [
      { name: "Mars Hill", why: "Compare current payment standards, unassisted comps, inspection condition, and demand" },
      { name: "Crown Hill", why: "Verify current payment standards, property condition, and block-level rent support" },
      { name: "Eagle Ledge", why: "Research property age, inspection readiness, expenses, and current program demand" },
      { name: "Far Eastside (Lawrence)", why: "Verify entry price, unassisted comps, payment standard, and management capacity" },
    ],
    pitfalls: [
      "Inspection standards, frequency, cure periods, and preparation cost vary — confirm the current PHA process",
      "Lease-up timing varies with paperwork, inspection, rent approval, and agency workload — carry a delay scenario",
      "Rent changes require contract and program compliance — confirm timing and approval rules with the PHA",
      "Use property and manager history to set vacancy and collection assumptions; do not infer them from voucher status",
      "Screening and source-of-income rules vary by jurisdiction and program — use current written policy and local legal guidance",
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
      "Memphis has an established turnkey-rental ecosystem, but 'turnkey' describes a sales model, not rehab quality, tenant performance, management quality, or a passive return.",
    whyHereWhyNow:
      "Memphis gives out-of-state buyers many operators and properties to compare. Independently verify the purchase price, completed scope, permits, inspection, lease, payment history, rent support, manager agreement, reserves, and current insurance; operator projections are not evidence of an achievable return.",
    typicalNumbers: {
      purchasePrice: "$95-160k turnkey priced",
      monthlyRent: "$1,000-1,400",
      capRate: "Scenario-based after verified expenses",
      notes: "Treat seller cap-rate and cash-on-cash figures as marketing until every income, expense, financing, vacancy, management, and capex input is independently supported.",
    },
    neighborhoods: [
      { name: "Berclair", why: "Working-class, strong rental demand, voucher-friendly" },
      { name: "Cooper-Young", why: "Gentrifying, walkable, balanced cash flow + appreciation" },
      { name: "Hickory Hill", why: "Suburban-feeling, larger lots, family-renter demand" },
      { name: "High Point Terrace", why: "Stable middle-class neighborhood, lower turnover" },
    ],
    pitfalls: [
      "Do not substitute a citywide vacancy percentage for the property's and manager's records; verify collections, turnover, and downtime",
      "Verify every claim about the current lease and payment history against source documents and collected funds",
      "Rehab quality varies dramatically — pay for an independent inspection BEFORE closing, never rely on the operator's",
      "Management materially affects the result — compare scope, fees, controls, references, and termination terms before signing",
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
      "Atlanta's changing intown neighborhoods can contain BRRRR candidates, but acquisition basis, rehab execution, supported ARV, seasoning, appraisal, rent, and lender terms decide the result.",
    whyHereWhyNow:
      "Atlanta's older stock and changing neighborhoods give investors properties to screen, but neither neighborhood momentum nor legal labels establish an outcome. Use current closed comps, contractor bids, permit timing, rent evidence, local legal guidance, and appraisal-downside cases.",
    typicalNumbers: {
      purchasePrice: "$140-220k distressed acquisition",
      monthlyRent: "$1,800-2,400 post-rehab",
      capRate: "6-8% post-rehab",
      notes: "Illustrative orientation only. Verify rehab, holding time, supported ARV, seasoning, lender LTV, appraisal, rent, and expenses before estimating refinance proceeds.",
    },
    neighborhoods: [
      { name: "East Atlanta Village", why: "Gentrified core — appreciation real, distressed inventory still available" },
      { name: "Kirkwood", why: "Continued gentrification, strong ARV upside" },
      { name: "West End", why: "Earlier gentrification cycle, better entry prices, higher risk" },
      { name: "Decatur (East Lake)", why: "Adjacent to Decatur city, school-district premium" },
    ],
    pitfalls: [
      "Fast-changing neighborhoods can have thin or stale closed comps; support ARV with current evidence and downside cases",
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
      "Kansas City has duplexes and small multifamily properties that owner-occupants can screen for house hacking. The owner's housing cost and later rental result depend on the address, supported rents, financing, expenses, condition, and occupancy rules.",
    whyHereWhyNow:
      "KC's duplex inventory and renter demand make house hacking worth modeling. Confirm property and borrower eligibility, supported rent, owner-occupancy requirements, taxes, insurance, reserves, condition, and the full payment before estimating an out-of-pocket housing cost.",
    typicalNumbers: {
      purchasePrice: "$280-420k for 2-3 unit",
      monthlyRent: "$1,200-1,700 per unit",
      capRate: "True out-of-pocket: $0-400/mo for your unit",
      notes: "Illustrative financing screen only. Obtain current loan terms and verify rent and every expense; moving out later does not guarantee positive rental cash flow.",
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
      "Weather exposure and coverage terms are property- and carrier-specific — obtain a current quote and review exclusions",
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
      "Detroit's distressed inventory creates BRRRR candidates, but extreme block-by-block variation, title, rehab execution, rent support, appraisal, and lender terms make property-level verification essential.",
    whyHereWhyNow:
      "Detroit's recovery has been uneven, so citywide appreciation or appraisal-haircut claims are not safe underwriting inputs. Build the acquisition, scope, rent, ARV, title, tax, and refinance cases from current address-level evidence and run meaningful downside scenarios.",
    typicalNumbers: {
      purchasePrice: "$35-85k distressed acquisition",
      monthlyRent: "$1,200-1,650 post-rehab",
      capRate: "9-12% post-rehab",
      notes: "Illustrative orientation only. Verify title, taxes, scope, closed comps, rent, seasoning, lender LTV, and appraisal; refinance proceeds can be materially lower than modeled.",
    },
    neighborhoods: [
      { name: "East English Village", why: "Research current closed comps, title, condition, taxes, and block-level demand" },
      { name: "Bagley", why: "Strong stable neighborhood, family demand, lower BRRRR risk" },
      { name: "Boston-Edison", why: "Historic district, premium appreciation upside, fewer distressed deals" },
      { name: "Cornerstone Village", why: "Affordable entry, gentrifying, higher execution risk" },
    ],
    pitfalls: [
      "Do not assume a citywide appraisal haircut; use relevant closed comps and test multiple supported ARV outcomes",
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
      "Tampa's population and housing demand make it a frequent screen, but insurance availability and pricing can materially change a result. Obtain a current property-specific quote, flood determination, roof and wind-mitigation details, taxes, and rent comps rather than extrapolating from a seller policy or citywide trend.",
    typicalNumbers: {
      purchasePrice: "$310-475k typical SFR",
      monthlyRent: "$1,950-2,700",
      capRate: "Scenario-based after a current insurance quote",
      notes: "Illustrative orientation only. Replace insurance, flood coverage, tax, rent, vacancy, maintenance, and financing inputs with address-level evidence.",
    },
    neighborhoods: [
      { name: "Seminole Heights", why: "Inland, walkable, gentrifying — best balance of insurance manageability + appreciation" },
      { name: "Temple Terrace", why: "Suburban, university-adjacent, lower insurance volatility" },
      { name: "Brandon", why: "Suburban Tampa, lower entry prices, manageable insurance" },
      { name: "Westchase", why: "Newer construction = better insurance pricing, lower capex risk" },
    ],
    pitfalls: [
      "Insurance can be decisive — obtain a current subject-property quote and review deductibles and exclusions before relying on the deal",
      "Do not assume a citywide rent-growth rate; use current submarket evidence and flat/downside scenarios",
      "Older properties (1970s-1980s) often have insurance-disqualifying roof issues — verify roof age in inspection",
      "Flood zone designation matters — even some non-coastal Tampa zones require flood insurance",
      "For condos, review current reserve studies, milestone-inspection status, budgets, assessments, and meeting minutes",
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
      "Cincinnati is often screened for cash flow, but cap rate and operating effort depend on the specific property, block, condition, rent, taxes, insurance, and management.",
    whyHereWhyNow:
      "Cincinnati's two healthcare anchors (Mercy + UC Health) plus diverse manufacturing + finance employers keep rental demand stable. Insurance is among the most predictable in the country. Property taxes are reasonable. Compared to Cleveland, Cincinnati has fewer block-by-block neighborhood variation issues and the housing stock is somewhat newer on average, lowering year-1 capex risk.",
    typicalNumbers: {
      purchasePrice: "$130-200k typical",
      monthlyRent: "$1,300-1,700",
      capRate: "7-9% in B+ neighborhoods",
      notes: "Illustrative orientation only. Verify rent, tax, insurance, condition, vacancy, management, financing, and appreciation assumptions for the address.",
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
      "Do not assume a standard appraisal haircut; support value with relevant closed comps and downside cases",
      "Out-of-state owners should price and vet local management rather than assume remote operations will be passive",
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
      "Pittsburgh's older stock and changing neighborhoods can contain BRRRR candidates, but property-specific acquisition, scope, comps, appraisal, seasoning, rent, and lender terms determine the result.",
    whyHereWhyNow:
      "Pittsburgh has education, healthcare, and technology employment anchors, alongside older housing stock and some distressed inventory. A rehabbed property's value and refinance proceeds still depend on property-specific closed comps, execution, seasoning, and the independent appraisal; do not assume a citywide appraisal advantage.",
    typicalNumbers: {
      purchasePrice: "$55-110k distressed acquisition",
      monthlyRent: "$1,300-1,700 post-rehab",
      capRate: "7.5-9.5% post-rehab",
      notes: "Illustrative orientation only. Verify scope, holding time, supported ARV, seasoning, lender LTV, appraisal, rent, and expenses before estimating capital returned.",
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
      "Landlord-tenant procedure and timing are case-specific — use current local counsel or official court guidance",
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
      "Pittsburgh's small-multifamily stock and renter demand make house hacking worth modeling. Confirm financing and property eligibility, supported rent, occupancy rules, taxes, insurance, condition, reserves, and the full payment before estimating owner cost or later rental cash flow.",
    typicalNumbers: {
      purchasePrice: "$200-350k for 2-3 unit",
      monthlyRent: "$1,000-1,500 per unit",
      capRate: "True out-of-pocket: $200-500/mo for your unit",
      notes: "Illustrative financing screen only. Obtain current loan terms and verify rent and every expense; later rental conversion does not guarantee positive cash flow.",
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
      "State income tax can affect the owner-specific result; model it separately from property cash flow",
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
      "Birmingham's relatively accessible inventory makes it a cash-flow market to screen, but the property, current tax bill, insurance, condition, rent, operations, and local legal process determine the result.",
    whyHereWhyNow:
      "Birmingham's employment base and entry prices provide screening context, not a promised return or legal timeline. Verify current parcel taxes, insurance, rent, condition, management, and landlord-tenant requirements for the address.",
    typicalNumbers: {
      purchasePrice: "$130-200k typical",
      monthlyRent: "$1,250-1,650",
      capRate: "8-10% in B+ neighborhoods",
      notes: "Illustrative orientation only. Replace tax, insurance, rent, vacancy, management, capex, financing, and cash-flow inputs with current property-specific evidence.",
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
      "Verify the current assessment and appeal process rather than assuming an appeal is unnecessary",
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
      "California tax treatment is taxpayer-specific; a top marginal rate is not a property-level return assumption",
      "Landlord-tenant procedure and timing vary by facts and jurisdiction — obtain current California-specific guidance",
      "Confirm whether current state and local rent rules apply to the property before modeling renewal increases",
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
      "Charlotte's employment and population history create an appreciation thesis, not a forecast. Test lower-cap-rate deals under flat and downside rent and value growth.",
    whyHereWhyNow:
      "Charlotte's banking, technology, and healthcare employers support an investment thesis, but rent, appreciation, and legal timelines are not guaranteed. Verify property-specific demand and expenses, model flat/downside growth, and use current local guidance for landlord-tenant assumptions.",
    typicalNumbers: {
      purchasePrice: "$325-475k typical SFR",
      monthlyRent: "$2,100-2,800",
      capRate: "4.5-6% after honest underwriting",
      notes: "Illustrative orientation only. Model current parcel tax, rent, expenses, financing, and multiple appreciation scenarios; do not treat a projected IRR as achievable performance.",
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
      "Dallas-Fort Worth has had a long period of population and employment growth, but past appreciation does not establish future rent growth, value growth, or IRR. Lower-cap-rate deals should be tested under flat and downside appreciation scenarios.",
    whyHereWhyNow:
      "DFW's corporate-relocation economy has supported rental demand, but appreciation and rent growth are not guaranteed. The Texas property-tax burden, especially in MUD zones, requires parcel-level verification because an understated bill can materially reduce NOI and cash flow.",
    typicalNumbers: {
      purchasePrice: "$285-425k typical SFR",
      monthlyRent: "$2,100-2,800",
      capRate: "5-6.5% after honest property tax modeling",
      notes: "Illustrative orientation only. Verify the current parcel tax, insurance, rent, expenses, financing, and flat/downside appreciation scenarios; projected IRR is not achievable-performance evidence.",
    },
    neighborhoods: [
      { name: "Oak Cliff (Bishop Arts adjacent)", why: "Gentrifying, walkable, appreciation upside" },
      { name: "East Dallas (Lakewood adjacent)", why: "Established appreciation, premium school districts" },
      { name: "Fort Worth (TCU area)", why: "University anchor, growth corridor, lower entry than Dallas" },
      { name: "McKinney / Frisco", why: "Suburban appreciation plays, school-district premiums" },
    ],
    pitfalls: [
      "MUD and other special-district charges can materially affect the bill — pull the parcel's current tax record and proposed-payment estimate",
      "Cap rate compression means cash flow is tight — small underwriting errors swing deals to negative",
      "Hail exposure, roof condition, deductibles, and carrier rules can materially affect insurance — obtain a current quote",
      "Do not assume a property-tax appeal is required or will succeed; verify the assessment and current appeal process",
      "Some Dallas zip codes have undergone rapid gentrification — buying at top of cycle is real risk",
    ],
    relatedPosts: ["cash-flow-vs-appreciation"],
  },

  // ─── CLEVELAND (house-hack) ───
  {
    citySlug: "cleveland",
    cityName: "Cleveland",
    state: "Ohio",
    strategy: "house-hack",
    strategyLabel: "house hacking",
    pitch:
      "Cleveland's duplex and triplex inventory gives owner-occupants house-hack candidates to screen. Property and borrower eligibility, supported rents, condition, taxes, insurance, and current program terms determine the result.",
    whyHereWhyNow:
      "Cleveland's 2-4 unit stock and renter demand make house hacking worth modeling. Confirm occupancy and property eligibility, supported rent, financing, taxes, insurance, reserves, condition, and the full payment before estimating owner cost or later rental cash flow.",
    typicalNumbers: {
      purchasePrice: "$150-260k for 2-3 unit",
      monthlyRent: "$900-1,300 per unit",
      capRate: "True out-of-pocket: $0-300/mo for your unit",
      notes: "Illustrative financing screen only. Obtain current loan terms and verify rent and every expense; moving out later does not guarantee positive rental cash flow.",
    },
    neighborhoods: [
      { name: "Tremont", why: "Walkable, gentrified, premium house-hack neighborhood" },
      { name: "Ohio City", why: "Walkable to West Side Market, strong young-professional demand" },
      { name: "Detroit-Shoreway", why: "Gentrifying, lake-adjacent, balanced cash flow + appreciation" },
      { name: "Old Brooklyn", why: "Lower entry, family-renter demand, less walkable but cheaper" },
    ],
    pitfalls: [
      "Pre-WW2 housing stock means real year-1 capex even on owner-occupant deals",
      "Lead paint disclosure required on pre-1978 properties",
      "FHA self-sufficiency rule on 3-4 unit properties: rental income must independently cover mortgage",
      "Some Cleveland neighborhoods have block-by-block variation — walk before buying",
      "Living next to tenants requires temperament — noise, maintenance calls, awkward moments",
    ],
    relatedPosts: ["house-hacking-explained"],
  },

  // ─── MEMPHIS (BRRRR) ───
  {
    citySlug: "memphis",
    cityName: "Memphis",
    state: "Tennessee",
    strategy: "brrrr",
    strategyLabel: "BRRRR",
    pitch:
      "Memphis has distressed inventory and a mature contractor and manager ecosystem, but BRRRR results depend on sourcing, scope, title, rent, appraisal, seasoning, lender terms, and local execution.",
    whyHereWhyNow:
      "Memphis gives investors distressed and operator-sourced properties to compare. Independently verify acquisition price, title, scope, permits, contractor capacity, closed comps, rent, manager terms, seasoning, appraisal, and lender conditions rather than relying on an operator markup or return narrative.",
    typicalNumbers: {
      purchasePrice: "$40-85k distressed acquisition",
      monthlyRent: "$1,000-1,400 post-rehab",
      capRate: "9-12% post-rehab",
      notes: "Illustrative orientation only. Verify title, scope, holding time, supported ARV, rent, seasoning, lender LTV, and appraisal before estimating refinance proceeds or capital returned.",
    },
    neighborhoods: [
      { name: "Berclair", why: "Working-class, voucher-friendly, distressed inventory available" },
      { name: "Cooper-Young", why: "Gentrifying — ARV upside, lower BRRRR haircut" },
      { name: "Binghampton", why: "Earlier gentrification cycle, lower entry, higher execution risk" },
      { name: "Frayser", why: "Deep distress, lowest entry, requires experienced PM" },
    ],
    pitfalls: [
      "Rehabbed-property appraisals can differ from planned ARV; use relevant closed comps and test downside values",
      "Block-by-block variation extreme — drive every street before committing",
      "Some Memphis zip codes have insurance-disqualifying vacancy/arson history",
      "Foundation issues common in pre-1960 Memphis homes — get structural opinion",
      "Management materially affects the result — compare scope, fees, controls, references, and termination terms before signing",
    ],
    relatedPosts: ["spot-bad-rental-in-60-seconds", "property-management-yes-or-no"],
  },

  // ─── ATLANTA (cash-flow) ───
  {
    citySlug: "atlanta",
    cityName: "Atlanta",
    state: "Georgia",
    strategy: "cash-flow",
    strategyLabel: "cash flow",
    pitch:
      "Atlanta suburban properties can screen better for cash flow than some intown properties, but current rent, tax, insurance, vacancy, condition, management, and financing determine the address-level cap rate.",
    whyHereWhyNow:
      "Atlanta's population and employment history provide screening context, not a guaranteed demand or legal outcome. Verify current submarket rent and supply, property expenses, school and municipal boundaries, and applicable landlord-tenant procedure.",
    typicalNumbers: {
      purchasePrice: "$210-310k typical suburban SFR",
      monthlyRent: "$1,750-2,300",
      capRate: "7-9% in suburban submarkets",
      notes: "Illustrative orientation only. Replace property tax, insurance, rent, vacancy, maintenance, management, financing, cash flow, and appreciation with current address-level evidence.",
    },
    neighborhoods: [
      { name: "South Fulton", why: "Suburban cash flow with appreciation tailwind from intown overflow" },
      { name: "Clayton County (Riverdale)", why: "Lowest entry in metro Atlanta, voucher-friendly, real cash flow" },
      { name: "Gwinnett County (Lawrenceville)", why: "Diverse demographics, family-renter demand, school-district premium" },
      { name: "Stone Mountain", why: "Suburban-feeling, accessible entry, stable rental demand" },
    ],
    pitfalls: [
      "Suburban Atlanta cap rates lower than they look — verify property taxes (some zones over 1.4%)",
      "School district matters more in suburbs than urban core — verify before family-renter targeting",
      "Sun Belt overbuilding flattening some suburban submarkets — verify rent comps current",
      "GA's 2025 STR restrictions affect short-term rental conversion plans",
      "Property crime varies by Atlanta suburban submarket — verify on walks",
    ],
    relatedPosts: ["what-is-a-good-cap-rate", "50-percent-rule-rentals"],
  },

  // ─── PHOENIX (BRRRR) ───
  {
    citySlug: "phoenix",
    cityName: "Phoenix",
    state: "Arizona",
    strategy: "brrrr",
    strategyLabel: "BRRRR",
    pitch:
      "Phoenix's older ranch inventory can contain BRRRR candidates, but acquisition, cooling and envelope scope, insurance, supported ARV, appraisal, rent, and lender terms determine the result.",
    whyHereWhyNow:
      "Phoenix's older housing stock gives investors properties to screen. Obtain contractor bids for cooling, roof, envelope, and water-related work; verify current insurance, rent, closed comps, seasoning, appraisal, and lender terms instead of assuming cosmetic work creates a particular ARV.",
    typicalNumbers: {
      purchasePrice: "$200-285k distressed acquisition",
      monthlyRent: "$1,650-2,200 post-rehab",
      capRate: "6-8% post-rehab",
      notes: "Illustrative orientation only. Verify scope, insurance, holding time, supported ARV, rent, seasoning, lender LTV, and appraisal before estimating refinance proceeds.",
    },
    neighborhoods: [
      { name: "Maryvale", why: "Older ranch inventory, gentrifying, BRRRR-friendly entry prices" },
      { name: "South Phoenix", why: "Earlier gentrification cycle, lower entry, higher upside" },
      { name: "Glendale (older zones)", why: "1960s-70s ranch stock, working-class demand" },
      { name: "Coronado Historic District", why: "Already gentrified, premium ARV but tighter acquisition" },
    ],
    pitfalls: [
      "Do not assume every HVAC system requires replacement or a fixed budget; obtain condition evidence and current bids",
      "Insurance availability and price are property- and carrier-specific — obtain a current quote and review exclusions",
      "Water-stress + monsoon damage on older properties — verify roof + foundation",
      "Fast-changing neighborhoods can have thin or stale closed comps; test multiple supported ARV scenarios",
      "AZ tax rates modest but insurance + utilities offset the savings",
    ],
    relatedPosts: ["spot-bad-rental-in-60-seconds"],
  },

  // ─── DALLAS (cash-flow) ───
  {
    citySlug: "dallas",
    cityName: "Dallas",
    state: "Texas",
    strategy: "cash-flow",
    strategyLabel: "cash flow",
    pitch:
      "Pure cash-flow plays in Dallas are tighter than they used to be. Some mid-tier suburban SFRs may screen at higher cap rates, but parcel-level property tax, insurance, vacancy, and maintenance must be verified before treating the range as achievable.",
    whyHereWhyNow:
      "Dallas-Fort Worth's population growth has supported rental demand, while some mid-tier suburbs screen better for cash flow than the urban core. Texas has no individual state income tax, but the owner-specific tax effect is not a property return assumption. Verify the parcel's current property-tax bill, insurance, rent, and expenses before deciding that a deal pencils.",
    typicalNumbers: {
      purchasePrice: "$245-325k typical suburban SFR",
      monthlyRent: "$1,950-2,500",
      capRate: "6.5-8% in mid-tier suburbs after honest tax modeling",
      notes: "Illustrative orientation only. Replace parcel tax, insurance, rent, vacancy, maintenance, management, financing, cash flow, and appreciation with current address-level evidence.",
    },
    neighborhoods: [
      { name: "Mesquite", why: "Lower entry than Dallas proper, strong rental demand, family-renter base" },
      { name: "Garland", why: "Diverse demographics, school-district options, stable demand" },
      { name: "Arlington (TCU side)", why: "University-anchor demand, lower entry than Fort Worth proper" },
      { name: "Grand Prairie", why: "Mid-suburb, balanced cash flow + slow appreciation" },
    ],
    pitfalls: [
      "MUD and other special-district charges can materially affect the bill — pull the parcel's current tax record and proposed-payment estimate",
      "Hail exposure, roof condition, deductibles, and carrier rules can materially affect insurance — obtain a current quote",
      "Sun Belt overbuilding flattening some suburban submarkets — verify rent comps current",
      "Do not assume a property-tax appeal is required or will succeed; verify the assessment and current appeal process",
      "School district variation within Dallas suburbs significant — affects family-renter pricing",
    ],
    relatedPosts: ["what-is-a-good-cap-rate", "50-percent-rule-rentals"],
  },

  // ─── HOUSTON (cash-flow) ───
  {
    citySlug: "houston",
    cityName: "Houston",
    state: "Texas",
    strategy: "cash-flow",
    strategyLabel: "cash flow",
    pitch:
      "Houston's large rental inventory gives investors many properties to screen, but flood exposure, parcel tax, insurance, rent, condition, vacancy, management, and financing determine whether a deal cash-flows.",
    whyHereWhyNow:
      "Houston's employment base and inventory provide screening context, not guaranteed demand or returns. Verify current submarket rent, flood and drainage history, parcel taxes, insurance, condition, and expenses for the address.",
    typicalNumbers: {
      purchasePrice: "$190-285k typical SFR",
      monthlyRent: "$1,750-2,300",
      capRate: "7-9% in mid-tier neighborhoods",
      notes: "Illustrative orientation only. Replace parcel tax, insurance and flood coverage, rent, vacancy, maintenance, management, financing, and cash flow with current property-specific evidence.",
    },
    neighborhoods: [
      { name: "Spring Branch", why: "Diverse demographics, family-renter demand, stable cash flow" },
      { name: "Pasadena", why: "Working-class, port + petrochem worker demand, lower entry" },
      { name: "Acres Homes", why: "Earlier gentrification cycle, higher cap rates, more execution risk" },
      { name: "Independence Heights", why: "Gentrifying inside-the-loop, balanced cash flow + appreciation" },
    ],
    pitfalls: [
      "Flood-zone maps are only one input — verify current maps, prior losses, drainage, elevation, and coverage needs for the property",
      "Obtain current property-specific insurance and flood-coverage quotes rather than using a citywide monthly range",
      "Do not assume a property-tax appeal is required or will succeed; verify the assessment and current appeal process",
      "Use the parcel's current record and a sale-price reassessment scenario rather than assuming a fixed annual tax swing",
      "Foundation risk is property-specific — use inspection findings and specialist review when evidence warrants it",
    ],
    relatedPosts: ["what-is-a-good-cap-rate", "50-percent-rule-rentals"],
  },

  // ─── ST. LOUIS (cash-flow) ───
  {
    citySlug: "st-louis",
    cityName: "St. Louis",
    state: "Missouri",
    strategy: "cash-flow",
    strategyLabel: "cash flow",
    pitch:
      "St. Louis's entry prices make it a frequent cash-flow screen, but rent, condition, vacancy, taxes, insurance, management, and block-level variation determine the address-level result.",
    whyHereWhyNow:
      "St. Louis's employment anchors and accessible inventory provide screening context, not guaranteed demand or reliable returns. Verify current rent, condition, parcel tax, insurance, management capacity, local legal rules, and owner-specific tax treatment.",
    typicalNumbers: {
      purchasePrice: "$85-145k typical",
      monthlyRent: "$1,000-1,400",
      capRate: "8-11% in B+ neighborhoods",
      notes: "Illustrative orientation only. Replace tax, insurance, rent, vacancy, condition, management, financing, cash flow, and appreciation with current address-level evidence.",
    },
    neighborhoods: [
      { name: "Tower Grove South", why: "Walkable, gentrifying, premium for the area; balanced cash flow + appreciation" },
      { name: "Bevo Mill", why: "Working-class, family-renter demand, strong cash flow" },
      { name: "Dutchtown", why: "Earlier gentrification cycle, lower entry, higher upside" },
      { name: "Maplewood", why: "Suburban-feeling, school-district premium, lower turnover" },
    ],
    pitfalls: [
      "Do not assume a rehabbed property's planned ARV will appraise; support it with relevant closed comps and downside scenarios",
      "Block-by-block variation pronounced in some neighborhoods — walk before buying",
      "Older housing stock means year-1 capex real — budget 4-6% of purchase price",
      "Weather exposure and coverage terms are property- and carrier-specific — obtain a current quote and review exclusions",
      "Verify the current assessment and appeal process; do not assume an appeal is appropriate or successful",
    ],
    relatedPosts: ["what-is-a-good-cap-rate", "50-percent-rule-rentals"],
  },

  // ─── GREENVILLE ───
  {
    citySlug: "greenville",
    cityName: "Greenville",
    state: "South Carolina",
    strategy: "appreciation",
    strategyLabel: "appreciation",
    pitch:
      "Greenville's employment and population history create an appreciation thesis, not a forecast. Test any lower-cap-rate deal under flat and downside rent and value growth.",
    whyHereWhyNow:
      "Greenville's manufacturing employers and redevelopment provide screening context, but employer concentration, rent, appreciation, and legal timelines are not guaranteed. Verify property-specific demand and expenses, model flat/downside growth, and use current local guidance for landlord-tenant assumptions.",
    typicalNumbers: {
      purchasePrice: "$245-355k typical SFR",
      monthlyRent: "$1,700-2,200",
      capRate: "5.5-7% after honest underwriting",
      notes: "Illustrative orientation only. Model current parcel tax, rent, expenses, financing, employer downside, and multiple appreciation scenarios; projected IRR is not achievable-performance evidence.",
    },
    neighborhoods: [
      { name: "West End", why: "Walkable to downtown, gentrified, premium appreciation upside" },
      { name: "Augusta Road", why: "Established neighborhood, school-district premium, low turnover" },
      { name: "Overbrook", why: "Walkable, gentrifying, balanced cash flow + appreciation" },
      { name: "Sans Souci", why: "Earlier gentrification cycle, lower entry, higher upside" },
    ],
    pitfalls: [
      "Greenville is small — single-employer announcements (BMW expansion, Michelin layoffs) move the market more than larger metros",
      "Cap rate compression means cash flow tight — small underwriting errors swing deals negative",
      "Some Greenville zip codes have undergone rapid gentrification — buying at top of cycle real risk",
      "Limited PM ecosystem vs larger metros — vet carefully before out-of-state purchase",
      "Weather exposure and coverage terms are property- and carrier-specific — obtain a current quote and review exclusions",
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
