/**
 * State-by-state rental investing data for /states/[slug] pages.
 *
 * Each entry powers a dedicated state landing page targeting queries
 * like "investing in [state]", "[state] rental properties", "best
 * cities to invest in [state]". 15 states = 15 new ranking pages.
 *
 * Data is illustrative + sourced from publicly available aggregates.
 * Numbers reflect mid-2026 typical conditions; refresh annually.
 */

export type LandlordFriendliness = "Strong" | "Mixed" | "Tenant-leaning";
export type MarketTier = "Cash flow" | "Balanced" | "Appreciation";

export type StateData = {
  /** URL slug — kebab-case, e.g. "pennsylvania". */
  slug: string;
  /** Display name, e.g. "Pennsylvania". */
  name: string;
  /** Two-letter postal abbreviation, e.g. "PA". */
  abbr: string;
  /** One-line summary for meta description + hero subtitle. */
  pitch: string;
  /** Primary investing tier. */
  tier: MarketTier;
  /** Landlord-friendliness based on state law. */
  landlord: LandlordFriendliness;
  /** Typical effective property tax rate (% of value). */
  propertyTaxRatePct: number;
  /** Top marginal state income tax rate. */
  topStateIncomeTaxPct: number;
  /** Typical eviction timeline in days from filing to writ. */
  evictionTimelineDays: string;
  /** Median home price across investing-friendly metros. */
  medianHomePrice: number;
  /** Median monthly rent in investing-friendly markets. */
  medianRent: number;
  /** 3-5 reasons this state attracts investors. */
  pros: string[];
  /** 3-5 honest caveats. */
  cons: string[];
  /** Top cities for investing — link to /markets/[slug] where available. */
  topCities: Array<{ name: string; slug?: string; note: string }>;
  /** Which strategies tend to work best here. */
  bestStrategies: string[];
  /** Notes on insurance volatility (especially relevant for FL/LA/coastal). */
  insuranceNote: string;
};

export const STATES: Record<string, StateData> = {
  texas: {
    slug: "texas",
    name: "Texas",
    abbr: "TX",
    pitch:
      "Strong population + job growth, no state income tax, landlord-friendly law. The catch: property taxes are among the highest in the country, and MUD zones push effective rates above 3% in some suburbs.",
    tier: "Balanced",
    landlord: "Strong",
    propertyTaxRatePct: 1.68,
    topStateIncomeTaxPct: 0,
    evictionTimelineDays: "21-45",
    medianHomePrice: 295000,
    medianRent: 1850,
    pros: [
      "No state income tax — keeps more of every rent dollar",
      "Population + job growth among highest in US",
      "Landlord-friendly law: fast eviction, strong lease enforceability",
      "Strong rental demand in major metros (Dallas, Houston, Austin, San Antonio)",
      "Diverse economy — energy, tech, healthcare, defense",
    ],
    cons: [
      "Property taxes 1.7-2.5% effective in most metros — among highest in country",
      "MUD (Municipal Utility District) zones can push effective tax to 2.8-3.2%",
      "Insurance up 25%+ over 5 years on coastal + storm-belt zones",
      "Austin specifically overbuilt 2022-2024, rents still negative YoY",
      "Property tax appeal process is meaningful work but high-ROI in TX",
    ],
    topCities: [
      { name: "Dallas", slug: "dallas", note: "Strong job growth, suburban cash flow plays, MUD tax requires careful underwriting" },
      { name: "Houston", slug: "houston", note: "Energy-driven economy, lower entry prices, hurricane insurance volatility" },
      { name: "San Antonio", note: "Lower-cost alternative to Austin, military + healthcare anchors" },
      { name: "Fort Worth", note: "Suburban growth alongside Dallas, stronger cash flow than DFW proper" },
    ],
    bestStrategies: ["Buy-and-hold in B-class suburbs", "House hacking on duplexes near major employers", "BRRRR in working-class neighborhoods"],
    insuranceNote: "Inland TX is stable. Coastal counties (Galveston, Brazoria, Harris coastal zones) and the I-35 hail belt have seen 20-35% premium increases since 2020.",
  },

  florida: {
    slug: "florida",
    name: "Florida",
    abbr: "FL",
    pitch:
      "No state income tax, massive population inflow, year-round rental demand. The catch: insurance pricing has reshaped which deals pencil — coastal Florida is harder to make work than at any point in the last decade.",
    tier: "Appreciation",
    landlord: "Strong",
    propertyTaxRatePct: 0.91,
    topStateIncomeTaxPct: 0,
    evictionTimelineDays: "21-30",
    medianHomePrice: 380000,
    medianRent: 2200,
    pros: [
      "No state income tax",
      "Population growth from domestic migration + retirees",
      "Strong landlord-friendly law and fast eviction (~21-30 days)",
      "Short-term rental potential in vacation markets (Orlando, Panhandle)",
      "Year-round rental season — minimal seasonal vacancy in most metros",
    ],
    cons: [
      "Insurance up 35-50% since 2020 in coastal zones; some carriers exiting entirely",
      "Hurricane risk = mandatory windstorm + flood insurance in many areas",
      "Condo associations face post-Surfside reserve requirements → 20-40% HOA hikes coming",
      "Sun Belt overbuilding (Tampa, Cape Coral, Sarasota) has flattened rent growth",
      "Older properties (1970s-1980s) often have insurance-disqualifying roof issues",
    ],
    topCities: [
      { name: "Tampa", slug: "tampa", note: "Insurance is the dealbreaker — quote it BEFORE you offer" },
      { name: "Jacksonville", note: "Lower insurance risk than peninsula FL, strong jobs growth" },
      { name: "Orlando", note: "STR demand + tourism economy, but condo HOAs are a landmine" },
      { name: "Gainesville", note: "Student-housing market with steady University of FL demand" },
    ],
    bestStrategies: ["Short-term rental in true vacation markets", "Long-term hold in Jacksonville / Tallahassee (lower insurance risk)", "Avoid coastal condos until HOA reserve picture clears"],
    insuranceNote: "Florida is the single most-changed insurance market in the US. Annual premiums of $3,500-7,500 on a $350k SFR are now common in coastal counties. Always quote insurance yourself before signing a contract.",
  },

  ohio: {
    slug: "ohio",
    name: "Ohio",
    abbr: "OH",
    pitch:
      "The classic cash-flow state. Low property prices + strong rent yields make this one of the most reliable buy-and-hold markets in the country. Appreciation is modest but predictable.",
    tier: "Cash flow",
    landlord: "Strong",
    propertyTaxRatePct: 1.41,
    topStateIncomeTaxPct: 3.50,
    evictionTimelineDays: "30-45",
    medianHomePrice: 175000,
    medianRent: 1325,
    pros: [
      "Among lowest entry prices in country — $80-180k for solid cash-flow SFRs",
      "Cap rates 7-10% achievable in select markets (Cleveland, Cincinnati)",
      "Insurance stable — among the lowest-volatility states for landlords",
      "Strong landlord-friendly law with reasonable eviction process",
      "Multi-family inventory abundant in older urban cores",
    ],
    cons: [
      "Modest appreciation (1-3%/yr typical) — wealth-build is slower than coastal",
      "Older housing stock (pre-WW2) carries higher capex risk",
      "Some neighborhoods have block-by-block quality variation",
      "Cleveland + Toledo appraisals run 3-7% under-comp on rehabbed properties — affects BRRRR exits",
      "Cash-flow plays in C-class neighborhoods require more active management",
    ],
    topCities: [
      { name: "Cleveland", slug: "cleveland", note: "Strongest cash flow in the state; verify neighborhoods block by block" },
      { name: "Cincinnati", slug: "cincinnati", note: "More stable than Cleveland, better B-class options" },
      { name: "Columbus", note: "Faster growth, stronger appreciation, lower cap rates" },
      { name: "Toledo", note: "Extremely low entry prices but C-class management overhead" },
    ],
    bestStrategies: ["Buy-and-hold for cash flow", "BRRRR in older neighborhoods (with conservative ARV)", "Multi-family value-add"],
    insuranceNote: "Ohio is one of the most insurance-stable states for landlords. Annual premiums in the $700-1,200 range for typical SFRs.",
  },

  pennsylvania: {
    slug: "pennsylvania",
    name: "Pennsylvania",
    abbr: "PA",
    pitch:
      "Old housing stock with strong rental demand in major metros. Philadelphia leads on cash flow, Pittsburgh has the best balance of appreciation + yield in the state.",
    tier: "Balanced",
    landlord: "Mixed",
    propertyTaxRatePct: 1.49,
    topStateIncomeTaxPct: 3.07,
    evictionTimelineDays: "45-75",
    medianHomePrice: 235000,
    medianRent: 1650,
    pros: [
      "Philadelphia + Pittsburgh both offer strong cash-flow opportunities",
      "Flat 3.07% state income tax — among the simpler tax structures",
      "Strong rental demand in college towns (State College, Lehigh Valley, Erie)",
      "House-hacking-friendly: many 2-4 unit rowhouses in older neighborhoods",
      "Pittsburgh gentrification (Lawrenceville, Garfield, Northside) creates real appreciation upside",
    ],
    cons: [
      "Philadelphia eviction process is longer than landlord-friendly states (45-75 days)",
      "Pre-WW2 housing stock = real year-1 capex risk if not recently renovated",
      "Some Philly neighborhoods require active block-level due diligence",
      "Property tax assessments often need appealing — Philadelphia reassessed significantly in 2024-2025",
      "Lead paint disclosure requirements (pre-1978 properties) add compliance overhead",
    ],
    topCities: [
      { name: "Philadelphia", slug: "philadelphia", note: "Strong cash flow in B-class neighborhoods; older stock = budget capex aggressively" },
      { name: "Pittsburgh", note: "Best balance of cash flow + appreciation in the state; gentrifying core neighborhoods" },
      { name: "Allentown", note: "Lower entry prices, NYC-commuter demand, less competitive than NJ" },
      { name: "Lancaster", note: "Stable demand, modest appreciation, lower volatility" },
    ],
    bestStrategies: ["House hacking on Philly + Pittsburgh duplexes/triplexes", "Buy-and-hold in B-class Pittsburgh neighborhoods", "Multi-family rehab in older urban cores"],
    insuranceNote: "PA insurance is generally stable. Older Philadelphia rowhouses may face limited carrier options — get multiple quotes before closing.",
  },

  georgia: {
    slug: "georgia",
    name: "Georgia",
    abbr: "GA",
    pitch:
      "Atlanta-led growth + lower entry prices than other Sun Belt growth markets. Strong population inflow and a diverse economic base make GA one of the most consistent buy-and-hold states.",
    tier: "Balanced",
    landlord: "Strong",
    propertyTaxRatePct: 0.92,
    topStateIncomeTaxPct: 5.75,
    evictionTimelineDays: "14-30",
    medianHomePrice: 285000,
    medianRent: 1850,
    pros: [
      "Atlanta is one of the fastest-growing major metros in the US",
      "Lower entry prices than NC/TN/FL for comparable demographics",
      "Diverse economy — film industry, tech, logistics, healthcare",
      "Landlord-friendly law: fast eviction process (14-30 days)",
      "Strong B-class neighborhood inventory in Atlanta metro suburbs",
    ],
    cons: [
      "Some Atlanta neighborhoods have gentrified rapidly — cap rates compressed",
      "Insurance increases meaningful in coastal GA (Savannah, Brunswick)",
      "5.75% state income tax eats into after-tax cash flow vs no-tax states",
      "Lease-up timelines vary widely across Atlanta sub-metros",
      "Property crime higher in select Atlanta zip codes — neighborhood research matters",
    ],
    topCities: [
      { name: "Atlanta", slug: "atlanta", note: "Suburb-of-Atlanta deals (Decatur, East Point, College Park) offer better cap rates than the core" },
      { name: "Augusta", note: "Lower entry prices, military demand, golf-tourism upside" },
      { name: "Macon", note: "Cash-flow-heavy with C-class management overhead" },
      { name: "Savannah", note: "STR potential + steady long-term demand; insurance volatility a real concern" },
    ],
    bestStrategies: ["Buy-and-hold in Atlanta suburb B-class", "BRRRR in gentrifying intown neighborhoods", "Multi-family in Decatur / East Point"],
    insuranceNote: "Inland GA is stable; coastal counties (Chatham, Glynn) have seen 20-30% premium increases. Hurricane risk requires windstorm coverage south of Macon.",
  },

  "north-carolina": {
    slug: "north-carolina",
    name: "North Carolina",
    abbr: "NC",
    pitch:
      "Population + job growth in the Triangle (RTP) and Charlotte have created some of the most reliable appreciation markets in the Southeast. The Piedmont Triad (Greensboro/Winston-Salem) offers better cash flow at lower entry prices.",
    tier: "Appreciation",
    landlord: "Strong",
    propertyTaxRatePct: 0.77,
    topStateIncomeTaxPct: 4.75,
    evictionTimelineDays: "14-30",
    medianHomePrice: 325000,
    medianRent: 1925,
    pros: [
      "Strong population growth — among top 5 states for net inflow",
      "Tech (RTP), banking (Charlotte), military (Fayetteville), film + logistics — diverse base",
      "Low effective property tax rate (~0.77%)",
      "Fast eviction process (14-30 days)",
      "Charlotte + Raleigh-Durham have consistent appreciation since 2015",
    ],
    cons: [
      "Cap rates compressed in Charlotte + RTP — 4.5-6% typical for SFR",
      "Hurricane risk for coastal NC properties (Wilmington, OBX)",
      "Cash-flow plays require moving to Piedmont Triad or smaller markets",
      "Property prices grew 35-50% in 2020-2023, leaving newer entrants with worse cap math",
      "STR-restricted in most major cities (Asheville is heavily regulated)",
    ],
    topCities: [
      { name: "Charlotte", note: "Banking + healthcare anchors; cap rates lower but appreciation strong" },
      { name: "Raleigh-Durham", note: "RTP-driven; appreciation strong, cash flow weak — wealth-build play" },
      { name: "Greensboro", note: "Lower entry prices, steady cash flow, less competitive than coastal NC" },
      { name: "Winston-Salem", note: "Best cash-flow market in NC; older housing stock requires capex awareness" },
    ],
    bestStrategies: ["Buy-and-hold for appreciation in Charlotte/RTP", "Cash-flow buy-and-hold in Piedmont Triad", "House hacking near university anchors"],
    insuranceNote: "Inland NC is stable. Coastal NC (Wilmington, Outer Banks) has hurricane risk = higher premiums and mandatory flood coverage in some zones.",
  },

  tennessee: {
    slug: "tennessee",
    name: "Tennessee",
    abbr: "TN",
    pitch:
      "No state income tax + lower entry prices than TX/FL + Nashville-driven population growth. Memphis offers high-yield cash flow plays; Nashville is the appreciation engine; Knoxville + Chattanooga sit in between.",
    tier: "Balanced",
    landlord: "Strong",
    propertyTaxRatePct: 0.71,
    topStateIncomeTaxPct: 0,
    evictionTimelineDays: "10-30",
    medianHomePrice: 270000,
    medianRent: 1750,
    pros: [
      "No state income tax",
      "Among lowest effective property tax rates in country",
      "Strong landlord law + fast eviction process",
      "Nashville drives statewide population growth narrative",
      "Memphis has the highest cap-rate opportunities in the state",
    ],
    cons: [
      "Memphis cap rates often misleading — real vacancy + bad-debt push down realized returns",
      "Nashville cap rates compressed by 2020-2023 appreciation",
      "Davidson County tax appeals require a hearing (more work than paper appeals)",
      "Insurance modestly up — hurricane spillover risk for west TN",
      "Healthcare + tourism = economic concentration risk in some metros",
    ],
    topCities: [
      { name: "Memphis", slug: "memphis", note: "Highest cap rates in state — but verify all tenant + neighborhood claims before buying" },
      { name: "Nashville", note: "Strong appreciation, weak cap rates, premium prices — wealth-build play" },
      { name: "Knoxville", note: "Steady cash flow, university anchor, lower volatility" },
      { name: "Chattanooga", note: "Outdoor-tourism economy, modest appreciation, balanced cap rates" },
    ],
    bestStrategies: ["High-yield buy-and-hold in Memphis (with rigorous PM)", "Appreciation buy-and-hold in Nashville", "Balanced plays in Knoxville/Chattanooga"],
    insuranceNote: "Generally stable across TN. Modest premium increases in western TN (Memphis area) due to wind/storm spillover from MS/AR.",
  },

  indiana: {
    slug: "indiana",
    name: "Indiana",
    abbr: "IN",
    pitch:
      "Indianapolis-led cash flow market with consistent fundamentals. Lower volatility than most Sun Belt states + flat-tax structure + strong landlord-friendly law make this one of the steadiest buy-and-hold markets in the country.",
    tier: "Cash flow",
    landlord: "Strong",
    propertyTaxRatePct: 0.84,
    topStateIncomeTaxPct: 3.05,
    evictionTimelineDays: "21-45",
    medianHomePrice: 215000,
    medianRent: 1525,
    pros: [
      "Flat 3.05% state income tax + relatively low property tax",
      "Indianapolis among most stable cash-flow markets in country",
      "Strong landlord law with reasonable eviction process",
      "Cap rates of 7-9% achievable in B+ neighborhoods",
      "Lower insurance volatility than coastal states",
    ],
    cons: [
      "Modest appreciation (1-2.5%/yr typical) — slow wealth-build",
      "Some Indianapolis sub-metros gentrifying faster than data shows (lower cap rates than expected)",
      "Smaller cities (Fort Wayne, Evansville, South Bend) have thin investor markets",
      "Older housing stock in urban cores carries capex risk",
      "Single-employer concentration risk in some smaller metros",
    ],
    topCities: [
      { name: "Indianapolis", slug: "indianapolis", note: "Best cash-flow market in state with multiple solid neighborhoods" },
      { name: "Fort Wayne", note: "Lower entry prices, military + manufacturing economy" },
      { name: "Carmel", note: "Suburban Indianapolis — appreciation play with weaker cap rates" },
      { name: "Evansville", note: "Steady cash flow market with healthcare + manufacturing anchors" },
    ],
    bestStrategies: ["Buy-and-hold for cash flow", "Section 8 in voucher-favorable zones", "Multi-family value-add"],
    insuranceNote: "Indiana insurance is stable. Annual premiums in $800-1,400 range for typical SFRs.",
  },

  missouri: {
    slug: "missouri",
    name: "Missouri",
    abbr: "MO",
    pitch:
      "Kansas City + St. Louis offer some of the strongest cash-flow opportunities in the Midwest. Strong landlord-friendly law and consistent rental demand make MO a reliable buy-and-hold state.",
    tier: "Cash flow",
    landlord: "Strong",
    propertyTaxRatePct: 0.97,
    topStateIncomeTaxPct: 4.95,
    evictionTimelineDays: "21-45",
    medianHomePrice: 215000,
    medianRent: 1550,
    pros: [
      "Kansas City among best balanced cash-flow + appreciation markets in country",
      "Strong landlord law, fast eviction process",
      "Lower volatility than most Sun Belt markets",
      "Cap rates 7-9% achievable in select neighborhoods",
      "Lower insurance + stable property tax",
    ],
    cons: [
      "Jackson County (KC) had a controversial 2023 reassessment — many appeals filed",
      "St. Louis demographic decline in some neighborhoods (proper research required)",
      "Smaller cities have thin investor markets",
      "4.95% state income tax higher than Midwest peers (IN, OH)",
      "Some older housing stock requires aggressive capex budgeting",
    ],
    topCities: [
      { name: "Kansas City", slug: "kansas-city", note: "Best balance of cash flow + appreciation in MO; Brookside / Waldo / Volker are top neighborhoods" },
      { name: "St. Louis", note: "Cash flow available but neighborhood selection is critical" },
      { name: "Springfield", note: "University anchor + healthcare, lower entry prices" },
      { name: "Columbia", note: "University-driven, steady demand, modest appreciation" },
    ],
    bestStrategies: ["Buy-and-hold for cash flow in KC", "BRRRR in St. Louis (with careful neighborhood research)", "House hacking near university anchors"],
    insuranceNote: "Missouri insurance is stable but with periodic spikes from storm events. Premiums modestly higher in tornado-belt counties.",
  },

  michigan: {
    slug: "michigan",
    name: "Michigan",
    abbr: "MI",
    pitch:
      "Detroit redevelopment story is real but uneven. Strong cap rates available at low entry prices; BRRRR investors find good opportunities. Grand Rapids offers more stable buy-and-hold plays.",
    tier: "Cash flow",
    landlord: "Mixed",
    propertyTaxRatePct: 1.34,
    topStateIncomeTaxPct: 4.25,
    evictionTimelineDays: "30-60",
    medianHomePrice: 195000,
    medianRent: 1450,
    pros: [
      "Detroit + Flint offer some of lowest entry prices in country",
      "BRRRR-friendly: distressed properties with rehab upside in gentrifying zones",
      "Grand Rapids is one of the most underrated buy-and-hold markets",
      "Cap rates 8-12% achievable in select neighborhoods",
      "Property taxes deductible but offset higher Midwest expense ratios",
    ],
    cons: [
      "Detroit appraisals notoriously lag comps by 5-10% — affects BRRRR refi math",
      "Block-by-block quality variation in Detroit + Flint is extreme",
      "Eviction process slower than Sun Belt (30-60 days)",
      "Insurance volatility in some neighborhoods (high vacancy/arson history)",
      "Property tax in Wayne County (Detroit) historically over-assessed — appeal expected",
    ],
    topCities: [
      { name: "Detroit", slug: "detroit", note: "BRRRR opportunities real but neighborhood selection critical; budget conservative ARV" },
      { name: "Grand Rapids", note: "Most stable buy-and-hold market in state; balanced cap rates" },
      { name: "Ann Arbor", note: "University-driven, strong appreciation, weak cap rates" },
      { name: "Lansing", note: "Government + university anchors, steady cash flow" },
    ],
    bestStrategies: ["BRRRR in Detroit gentrifying zones (East English Village, Bagley)", "Buy-and-hold in Grand Rapids", "House hacking in Ann Arbor"],
    insuranceNote: "MI is generally stable but Detroit properties may face limited carrier options. Always get multiple quotes; some specialty carriers serve harder zones at premium pricing.",
  },

  arizona: {
    slug: "arizona",
    name: "Arizona",
    abbr: "AZ",
    pitch:
      "Phoenix-led growth story is real but 2022-2024 overbuilding has flattened rents. Strong long-term demographic tailwind + landlord-friendly law + no state income tax above modest thresholds make AZ attractive once supply absorbs.",
    tier: "Appreciation",
    landlord: "Strong",
    propertyTaxRatePct: 0.66,
    topStateIncomeTaxPct: 2.5,
    evictionTimelineDays: "10-21",
    medianHomePrice: 395000,
    medianRent: 2050,
    pros: [
      "Among lowest effective property tax rates in country (~0.66%)",
      "Flat 2.5% state income tax (one of lowest)",
      "Among fastest eviction processes in country (10-21 days)",
      "Strong long-term population growth from CA migration",
      "Tucson + Mesa offer lower entry prices than Phoenix proper",
    ],
    cons: [
      "Phoenix overbuilt 2022-2024 — rents negative YoY since 2023",
      "Insurance modestly up in extreme-heat / wildfire areas",
      "Cap rates have compressed across most of state since 2018",
      "Cash flow plays harder to find than in pre-2020 Phoenix",
      "Air conditioning capex is meaningful in summer-extreme zones",
    ],
    topCities: [
      { name: "Phoenix", slug: "phoenix", note: "Wait for supply absorption (likely 12-18 more months) before aggressive entry" },
      { name: "Tucson", note: "Lower entry prices, university anchor, slower-growth alternative" },
      { name: "Mesa", note: "Phoenix suburb with stronger cash flow than core" },
      { name: "Flagstaff", note: "STR potential + university anchor; insurance + winter weather considerations" },
    ],
    bestStrategies: ["Wait-and-watch for Phoenix entry in 2026-2027", "Buy-and-hold in Tucson/Mesa", "Long-term appreciation play for the patient investor"],
    insuranceNote: "AZ insurance is mostly stable; modest increases in wildfire-prone areas (Flagstaff, Prescott, Sedona) and extreme-heat zones requiring more HVAC capacity.",
  },

  illinois: {
    slug: "illinois",
    name: "Illinois",
    abbr: "IL",
    pitch:
      "Chicago has strong rental demand and meaningful cash flow opportunities, but Illinois carries the highest property tax burden in the US — every deal must be modeled with property tax as a primary variable.",
    tier: "Balanced",
    landlord: "Tenant-leaning",
    propertyTaxRatePct: 2.27,
    topStateIncomeTaxPct: 4.95,
    evictionTimelineDays: "45-90",
    medianHomePrice: 245000,
    medianRent: 1825,
    pros: [
      "Strong rental demand in Chicago across multiple price tiers",
      "Cash flow plays available in many Chicago neighborhoods",
      "Cook County, despite high tax, has stable long-term demand",
      "Lower entry prices than NY/CA major metros for comparable demand",
      "Multi-family inventory abundant in older Chicago neighborhoods",
    ],
    cons: [
      "Highest effective property tax rate in country (~2.27%)",
      "Cook County reassessment cycle creates tax-bill volatility",
      "Eviction process slower than most states (45-90 days)",
      "Chicago-specific landlord ordinances add compliance overhead",
      "State income tax compresses after-tax returns vs no-tax peer states",
    ],
    topCities: [
      { name: "Chicago", note: "Cap rates achievable but property tax is THE underwriting variable" },
      { name: "Rockford", note: "Lower entry prices, manufacturing anchor, less competitive" },
      { name: "Peoria", note: "Cash-flow plays available but smaller investor market" },
      { name: "Naperville", note: "Suburban Chicago appreciation play; weaker cap rates" },
    ],
    bestStrategies: ["Buy-and-hold in Chicago B-class with aggressive tax appeal", "Multi-family value-add in older neighborhoods", "Smaller-metro cash flow plays"],
    insuranceNote: "IL insurance is stable. Tornado spillover risk in central + southern IL adds modest premium overhead.",
  },

  alabama: {
    slug: "alabama",
    name: "Alabama",
    abbr: "AL",
    pitch:
      "Birmingham + Huntsville offer some of the most underrated cash-flow opportunities in the Southeast. Low entry prices + landlord-friendly law + lower volatility than Mississippi or Louisiana.",
    tier: "Cash flow",
    landlord: "Strong",
    propertyTaxRatePct: 0.42,
    topStateIncomeTaxPct: 5.00,
    evictionTimelineDays: "7-21",
    medianHomePrice: 195000,
    medianRent: 1425,
    pros: [
      "Lowest property tax rates in country (~0.42%)",
      "Fast eviction process (7-21 days)",
      "Birmingham + Huntsville offer strong cap rate opportunities",
      "Lower volatility than MS / LA peer states",
      "Strong landlord law",
    ],
    cons: [
      "Smaller investor markets — less data, less inventory",
      "Mobile + coastal AL face insurance volatility",
      "5% state income tax higher than peer TN/FL (no tax)",
      "Slower population growth than NC/GA/TN",
      "Some older urban cores require active neighborhood research",
    ],
    topCities: [
      { name: "Birmingham", note: "Best cash-flow market in state; B-class neighborhoods plentiful" },
      { name: "Huntsville", note: "Defense + tech anchors, growing investor market" },
      { name: "Montgomery", note: "Government anchor, steady cash flow, smaller market" },
      { name: "Mobile", note: "Lower entry prices but insurance + hurricane risk a real factor" },
    ],
    bestStrategies: ["Buy-and-hold for cash flow in Birmingham/Huntsville", "Section 8 in voucher-favorable zones", "Avoid coastal AL unless insurance pricing fits the deal"],
    insuranceNote: "Inland AL is stable. Coastal counties (Mobile, Baldwin) face hurricane risk + premium volatility.",
  },

  "south-carolina": {
    slug: "south-carolina",
    name: "South Carolina",
    abbr: "SC",
    pitch:
      "Charleston tourism + Greenville growth + Columbia university anchor. Lower entry prices than NC for similar demographics, with stronger cash flow upside in non-coastal markets.",
    tier: "Balanced",
    landlord: "Strong",
    propertyTaxRatePct: 0.57,
    topStateIncomeTaxPct: 6.30,
    evictionTimelineDays: "10-30",
    medianHomePrice: 295000,
    medianRent: 1750,
    pros: [
      "Low effective property tax rate (~0.57%)",
      "Strong landlord law + fast eviction process",
      "Charleston STR market (limited but real)",
      "Greenville is one of fastest-growing mid-size metros in US",
      "Tourism + military + manufacturing diverse economic base",
    ],
    cons: [
      "Coastal SC (Charleston, Myrtle Beach) has hurricane + insurance issues",
      "Charleston STR heavily regulated within city limits",
      "6.30% state income tax higher than neighboring NC",
      "Cap rates compressed in Charleston + Greenville",
      "Some older Columbia stock requires capex awareness",
    ],
    topCities: [
      { name: "Greenville", note: "Fast-growing mid-size metro; balanced cap rates + appreciation" },
      { name: "Columbia", note: "University of SC anchor, steady demand, lower entry prices" },
      { name: "Charleston", note: "Tourism economy, STR restricted in city, insurance volatility" },
      { name: "Spartanburg", note: "Lower entry prices, BMW + manufacturing anchor" },
    ],
    bestStrategies: ["Buy-and-hold in Greenville/Spartanburg", "Cash-flow plays in Columbia near university", "Avoid Charleston STR unless property has grandfathered permit"],
    insuranceNote: "Inland SC stable. Coastal SC (Charleston, Beaufort, Myrtle Beach) faces hurricane risk + 25-40% premium increases since 2020.",
  },

  nevada: {
    slug: "nevada",
    name: "Nevada",
    abbr: "NV",
    pitch:
      "No state income tax + strong tourism + growing tech presence (Tesla in Reno, casinos in Vegas). The catch: Las Vegas overbuilt 2022-2024 like Phoenix, and STR is heavily regulated in both major markets.",
    tier: "Appreciation",
    landlord: "Strong",
    propertyTaxRatePct: 0.53,
    topStateIncomeTaxPct: 0,
    evictionTimelineDays: "21-45",
    medianHomePrice: 425000,
    medianRent: 2150,
    pros: [
      "No state income tax",
      "Low effective property tax (~0.53%)",
      "Strong landlord law + reasonable eviction process",
      "Reno benefits from Tahoe tourism + Tesla/tech growth",
      "Las Vegas has consistent long-term population inflow",
    ],
    cons: [
      "Las Vegas overbuilt 2022-2024 — rents negative YoY",
      "STR heavily regulated in Las Vegas + Henderson",
      "Reno STR restricted in most zones",
      "Higher entry prices than Sun Belt peer states (TX, FL)",
      "Tourism economy concentration risk for Las Vegas market",
    ],
    topCities: [
      { name: "Las Vegas", note: "Wait for supply absorption (12-18 more months) before aggressive entry" },
      { name: "Henderson", note: "Better B-class neighborhoods than core Vegas; appreciation play" },
      { name: "Reno", note: "Tech + tourism growth, but cap rates compressed" },
      { name: "Sparks", note: "Reno suburb with lower entry prices" },
    ],
    bestStrategies: ["Long-term appreciation play in Henderson + Reno", "Wait-and-watch for Vegas in 2026-2027", "Avoid STR plays unless property has grandfathered permit"],
    insuranceNote: "NV insurance is stable. Modest premium increases in wildfire-prone areas (Lake Tahoe region, parts of Reno).",
  },

  california: {
    slug: "california",
    name: "California",
    abbr: "CA",
    pitch:
      "High entry prices + tenant-leaning law + 13.3% top income tax make CA the hardest landlord-friendly math in the country. But the long-term appreciation story is real, and house-hacking near major employers can work — if the property pencils on house-hack math, not investor math.",
    tier: "Appreciation",
    landlord: "Tenant-leaning",
    propertyTaxRatePct: 0.74,
    topStateIncomeTaxPct: 13.3,
    evictionTimelineDays: "60-120",
    medianHomePrice: 750000,
    medianRent: 2950,
    pros: [
      "Prop 13 caps property tax increases — long-term owners benefit significantly",
      "Strong long-term appreciation in coastal metros",
      "Some inland cities (Sacramento, Bakersfield) more workable",
      "Job market depth supports rental demand",
      "Diverse economic base — tech, entertainment, agriculture, ports",
    ],
    cons: [
      "13.3% top state income tax compresses after-tax returns severely",
      "Tenant-leaning law: longer eviction process (60-120 days), rent control in some cities",
      "Statewide rent caps (AB 1482) limit pricing flexibility",
      "Entry prices in coastal metros price out most cash-flow strategies",
      "Wildfire insurance crisis: FAIR Plan-only in many areas, $5-15k+/yr premiums",
    ],
    topCities: [
      { name: "Sacramento", slug: "sacramento", note: "Most workable major-CA market; balanced cap rates" },
      { name: "Fresno", note: "Lower entry prices, Central Valley agriculture + healthcare anchors" },
      { name: "Bakersfield", note: "Cash-flow plays possible at lower entry; oil + agriculture economy" },
      { name: "Riverside", note: "Inland Empire commuter market; better cap rates than LA proper" },
    ],
    bestStrategies: ["House hacking near major employers", "Long-hold appreciation in coastal metros for high-income investors", "Inland cash-flow plays in Sacramento / Inland Empire"],
    insuranceNote: "CA insurance is the most-stressed in the US after FL. Wildfire zones face FAIR Plan-only coverage at premium pricing. Verify carrier availability BEFORE making an offer.",
  },

  "new-york": {
    slug: "new-york",
    name: "New York",
    abbr: "NY",
    pitch:
      "NYC and upstate are two different markets. NYC rentals are an appreciation play with brutal regulation. Upstate (Buffalo, Rochester, Syracuse) is genuine cash-flow territory with reasonable economics for investors who can stomach winter weather and slow population growth.",
    tier: "Balanced",
    landlord: "Tenant-leaning",
    propertyTaxRatePct: 1.72,
    topStateIncomeTaxPct: 10.9,
    evictionTimelineDays: "60-180",
    medianHomePrice: 380000,
    medianRent: 2100,
    pros: [
      "Upstate cities (Buffalo, Rochester, Syracuse) offer real cash-flow opportunities",
      "Lower entry prices upstate (~$120-180k typical)",
      "Strong rental demand statewide",
      "Multifamily inventory abundant in older urban cores",
      "NYC long-term appreciation undeniable for patient investors",
    ],
    cons: [
      "10.9% top state income tax + NYC adds 3.876% local on top",
      "Tenant-leaning law statewide; NYC rent stabilization adds complexity",
      "Eviction process slow — 60-180 days depending on jurisdiction",
      "1.72% effective property tax rate is among highest in country",
      "Winter weather + aging infrastructure inflate capex on older properties",
    ],
    topCities: [
      { name: "Buffalo", note: "Best cash-flow market in NY state; lower entry, decent rental demand" },
      { name: "Rochester", note: "Steady demand, university + healthcare anchors" },
      { name: "Syracuse", note: "Lower entry prices, university anchor" },
      { name: "Albany", note: "Government + healthcare jobs, stable demand" },
    ],
    bestStrategies: ["Cash-flow buy-and-hold in upstate NY", "Long-hold NYC appreciation for high-income investors", "Avoid NYC investment unless you have a specific operational edge"],
    insuranceNote: "NY insurance is mostly stable. Some upstate cities have higher premium overhead from harsh winters; NYC carriers occasionally tighten coverage on older buildings.",
  },

  massachusetts: {
    slug: "massachusetts",
    name: "Massachusetts",
    abbr: "MA",
    pitch:
      "Boston metro is one of the most consistent appreciation markets in the US — university anchors + biotech + healthcare drive multi-decade rent growth. Cash flow is tight; appreciation is the play.",
    tier: "Appreciation",
    landlord: "Tenant-leaning",
    propertyTaxRatePct: 1.04,
    topStateIncomeTaxPct: 5.0,
    evictionTimelineDays: "45-90",
    medianHomePrice: 575000,
    medianRent: 2800,
    pros: [
      "Boston metro has 30+ years of consistent appreciation",
      "University + biotech + healthcare = stable rental demand",
      "Western MA (Springfield, Worcester) offers more workable cash flow",
      "Flat 5% state income tax — simpler than NY/CA",
      "Strong long-term economic fundamentals",
    ],
    cons: [
      "Boston entry prices price out most cash-flow strategies",
      "Tenant-leaning law: eviction process 45-90 days",
      "Cambridge + Boston have rent control discussions ongoing — regulatory risk",
      "1.04% effective property tax + 5% state income tax = real after-tax drag",
      "Older housing stock common — capex risk meaningful",
    ],
    topCities: [
      { name: "Boston", note: "Appreciation play only — cash flow doesn't work at entry prices" },
      { name: "Worcester", note: "Lower entry, university anchors, balanced cap rates" },
      { name: "Springfield", note: "Western MA cash-flow market, lower competition" },
      { name: "Lowell", note: "Lowell + surrounding Merrimack Valley have BRRRR opportunities" },
    ],
    bestStrategies: ["Long-hold appreciation in Boston metro for high-income investors", "Cash-flow buy-and-hold in Worcester / Springfield", "House hacking near university anchors"],
    insuranceNote: "MA insurance is stable. Coastal Cape Cod / South Shore properties face hurricane risk; mainland MA has modest premium overhead from harsh winters.",
  },

  washington: {
    slug: "washington",
    name: "Washington",
    abbr: "WA",
    pitch:
      "Seattle-driven tech growth + no state income tax + strong landlord protections in non-Seattle markets. Seattle itself is tenant-leaning; outside Seattle, the state is workable for investors.",
    tier: "Appreciation",
    landlord: "Mixed",
    propertyTaxRatePct: 0.84,
    topStateIncomeTaxPct: 0,
    evictionTimelineDays: "30-60",
    medianHomePrice: 590000,
    medianRent: 2400,
    pros: [
      "No state income tax",
      "Tech-driven economy with multi-decade growth fundamentals",
      "Modest 0.84% property tax rate",
      "Spokane + Tacoma offer more workable cash flow than Seattle",
      "Strong rental demand statewide",
    ],
    cons: [
      "Seattle has rent stabilization conversations + tenant-leaning enforcement",
      "Entry prices in Seattle metro price out most cash-flow strategies",
      "Statewide just-cause eviction makes evictions more complex",
      "Eastern WA (Spokane area) faces wildfire risk + insurance pressure",
      "Recent housing law changes have added compliance overhead",
    ],
    topCities: [
      { name: "Spokane", note: "Eastern WA's strongest cash-flow market" },
      { name: "Tacoma", note: "Seattle-adjacent but better entry prices, growing investor market" },
      { name: "Vancouver", note: "WA-side of Portland metro; no state income tax draws investors" },
      { name: "Bellingham", note: "Smaller market, university anchor, stable demand" },
    ],
    bestStrategies: ["Cash-flow in Spokane / Tacoma", "Appreciation hold in Seattle metro for high-income investors", "Vancouver WA arbitrage for OR-area investors"],
    insuranceNote: "Western WA stable. Eastern WA (Spokane area) increasingly faces wildfire-related premium pressure — quote insurance before committing.",
  },

  colorado: {
    slug: "colorado",
    name: "Colorado",
    abbr: "CO",
    pitch:
      "Denver-led growth attracted huge investor inflow 2018-2023 — cap rates compressed, and the math is now harder than it used to be. Colorado Springs offers more workable economics. Mountain towns are STR-restricted; long-hold appreciation is the dominant play.",
    tier: "Appreciation",
    landlord: "Mixed",
    propertyTaxRatePct: 0.55,
    topStateIncomeTaxPct: 4.4,
    evictionTimelineDays: "30-45",
    medianHomePrice: 575000,
    medianRent: 2350,
    pros: [
      "Low effective property tax (~0.55%)",
      "Strong long-term population inflow (especially Denver metro)",
      "Diverse economy — tech, outdoor recreation, military, healthcare",
      "Flat 4.4% state income tax",
      "Reasonable eviction process (30-45 days)",
    ],
    cons: [
      "Denver cap rates compressed by 2018-2023 appreciation",
      "Mountain town STR heavily regulated (Aspen, Vail, Breckenridge)",
      "Wildfire insurance pressure in Foothills + Western Slope",
      "Statewide just-cause eviction has added complexity",
      "Colorado Springs growth has pushed cap rates lower than 5 years ago",
    ],
    topCities: [
      { name: "Denver", note: "Appreciation play; cap rates 4-5.5% typical" },
      { name: "Colorado Springs", note: "Better cash flow than Denver; military anchor (NORAD, Air Force Academy)" },
      { name: "Pueblo", note: "Lower entry prices, less competitive investor market" },
      { name: "Fort Collins", note: "University + tech anchor; stable appreciation play" },
    ],
    bestStrategies: ["Appreciation hold in Denver metro", "Better cash flow in Colorado Springs", "Avoid mountain town STR unless property has grandfathered permit"],
    insuranceNote: "Front Range stable. Western Slope + Foothills face significant wildfire premium pressure since 2020 fires.",
  },

  minnesota: {
    slug: "minnesota",
    name: "Minnesota",
    abbr: "MN",
    pitch:
      "Twin Cities are one of the most underrated balanced markets in the US — strong job market, low insurance volatility, moderate cap rates, reliable rental demand. Northern MN winters keep the casual investors away.",
    tier: "Balanced",
    landlord: "Mixed",
    propertyTaxRatePct: 1.12,
    topStateIncomeTaxPct: 9.85,
    evictionTimelineDays: "21-45",
    medianHomePrice: 335000,
    medianRent: 1850,
    pros: [
      "Twin Cities have diverse economy — healthcare (Mayo), retail (Target), 3M, banking",
      "Reasonable eviction process by Midwest standards",
      "Low insurance volatility — among most stable states for landlords",
      "Strong rental demand year-round in Minneapolis + St. Paul",
      "Newer neighborhood gentrification in Northeast Minneapolis offers BRRRR upside",
    ],
    cons: [
      "9.85% top state income tax compresses after-tax returns",
      "Older housing stock common in Twin Cities urban core — capex risk",
      "Winter weather adds capex overhead (HVAC, snow removal, ice damage)",
      "St. Paul + Minneapolis have rent stabilization in select neighborhoods",
      "Smaller cities (Duluth, Rochester) have thin investor markets",
    ],
    topCities: [
      { name: "Minneapolis", note: "Northeast Minneapolis gentrification offers BRRRR upside" },
      { name: "St. Paul", note: "More stable, less competitive than Minneapolis core" },
      { name: "Rochester", note: "Mayo Clinic anchor; thin but reliable rental market" },
      { name: "Duluth", note: "Lower entry prices, college anchor, port economy" },
    ],
    bestStrategies: ["Buy-and-hold in Twin Cities B-class neighborhoods", "BRRRR in Northeast Minneapolis gentrifying zones", "Avoid Minneapolis rent-stabilized buildings"],
    insuranceNote: "MN insurance among most stable in country. Winter-weather claims occasional but premium impact modest.",
  },

  "new-jersey": {
    slug: "new-jersey",
    name: "New Jersey",
    abbr: "NJ",
    pitch:
      "NJ has the highest effective property tax in the US (2.21%), tenant-leaning law, and major NYC-commuter rental demand. Investors who pencil deals around the actual tax burden + slow eviction process can find solid long-hold plays.",
    tier: "Balanced",
    landlord: "Tenant-leaning",
    propertyTaxRatePct: 2.21,
    topStateIncomeTaxPct: 10.75,
    evictionTimelineDays: "75-150",
    medianHomePrice: 460000,
    medianRent: 2500,
    pros: [
      "NYC-commuter rental demand creates consistent occupancy",
      "Long-term appreciation in commuter towns is reliable",
      "Strong rental market in college towns (Rutgers, Princeton)",
      "Multi-family inventory abundant in older urban cores (Jersey City, Newark, Trenton)",
      "Diverse economic base — pharma, banking, ports, commuter workforce",
    ],
    cons: [
      "Highest effective property tax in US (~2.21%) — THE underwriting variable",
      "10.75% top state income tax + property tax = brutal after-tax drag",
      "Tenant-leaning law: 75-150 day eviction process",
      "Some cities (Newark) have rent control",
      "Coastal NJ properties face flood + hurricane insurance issues",
    ],
    topCities: [
      { name: "Newark", note: "Cash-flow opportunities but careful neighborhood research required" },
      { name: "Jersey City", note: "NYC-adjacent appreciation play; cap rates compressed" },
      { name: "Trenton", note: "Lower entry prices, state capital anchor, more available stock" },
      { name: "Camden", note: "Lowest entry prices in NJ; deeply C-class management overhead" },
    ],
    bestStrategies: ["Long-hold appreciation in NYC-commuter towns", "Cash-flow plays in Trenton / Newark with aggressive tax appeal", "Avoid coastal NJ flood-zone properties unless insurance fits"],
    insuranceNote: "NJ insurance varies dramatically. Coastal counties (Ocean, Monmouth, Cape May) face hurricane + flood risk and 20-40% premium increases since 2020. Inland NJ stable.",
  },

  virginia: {
    slug: "virginia",
    name: "Virginia",
    abbr: "VA",
    pitch:
      "Northern VA is a federal-government-driven appreciation market with reliable rental demand. Richmond + Hampton Roads offer more workable cash flow at lower entry prices. Modest taxes + landlord-friendly law make VA one of the better mid-Atlantic options.",
    tier: "Balanced",
    landlord: "Strong",
    propertyTaxRatePct: 0.82,
    topStateIncomeTaxPct: 5.75,
    evictionTimelineDays: "30-60",
    medianHomePrice: 380000,
    medianRent: 2050,
    pros: [
      "Federal government + defense + tech (NoVA) drive consistent demand",
      "Landlord-friendly law with reasonable eviction process",
      "Modest 0.82% effective property tax rate",
      "Richmond and Hampton Roads offer balanced cap rates",
      "University anchor markets (Charlottesville, Blacksburg) have stable demand",
    ],
    cons: [
      "Northern VA entry prices push cap rates into the 4-5% range",
      "5.75% top state income tax modest but real",
      "Hampton Roads insurance affected by hurricane spillover",
      "Federal-government employment concentration risk in NoVA",
      "Some smaller markets (Roanoke, Lynchburg) have thin investor data",
    ],
    topCities: [
      { name: "Richmond", note: "Best balance of cash flow + appreciation in VA" },
      { name: "Virginia Beach", note: "Tourism + military anchor; insurance volatility a real factor" },
      { name: "Norfolk", note: "Military anchor, lower entry, balanced cap rates" },
      { name: "Roanoke", note: "Lower entry, university + healthcare anchors" },
    ],
    bestStrategies: ["Buy-and-hold in Richmond / Hampton Roads", "Appreciation hold in Northern VA for high-income investors", "Avoid coastal VA flood-zone unless insurance fits"],
    insuranceNote: "Inland VA stable. Hampton Roads (Norfolk, Virginia Beach, Newport News) face hurricane risk + 15-25% premium increases since 2020. Verify coverage availability.",
  },

  maryland: {
    slug: "maryland",
    name: "Maryland",
    abbr: "MD",
    pitch:
      "Baltimore offers some of the strongest cash-flow opportunities in the mid-Atlantic at entry prices under $200k. DC-commuter suburbs (Silver Spring, Bethesda) are pure appreciation plays. The state's tenant-leaning law adds operational overhead.",
    tier: "Balanced",
    landlord: "Tenant-leaning",
    propertyTaxRatePct: 1.06,
    topStateIncomeTaxPct: 5.75,
    evictionTimelineDays: "45-90",
    medianHomePrice: 380000,
    medianRent: 2100,
    pros: [
      "Baltimore offers cap rates of 8-12% on B/C-class properties",
      "DC-commuter suburbs have consistent appreciation tailwind",
      "Diverse economy — federal government, healthcare, biotech",
      "Modest 1.06% effective property tax statewide",
      "Section 8 voucher market mature in Baltimore + Prince George's County",
    ],
    cons: [
      "Tenant-leaning law: 45-90 day eviction process",
      "Baltimore has block-by-block quality variation — neighborhood research critical",
      "Some Baltimore neighborhoods have insurance carrier limitations",
      "5.75% state income tax + local county piggyback taxes (1-3% additional)",
      "Lead paint disclosure on pre-1978 properties (most of Baltimore) adds compliance work",
    ],
    topCities: [
      { name: "Baltimore", note: "Strong cash-flow potential but neighborhood research is non-negotiable" },
      { name: "Silver Spring", note: "DC-commuter appreciation play" },
      { name: "Frederick", note: "Less competitive, balanced cap rates, growing population" },
      { name: "Annapolis", note: "Premium market, lower cap rates, stable demand" },
    ],
    bestStrategies: ["Cash-flow + Section 8 in Baltimore B-class neighborhoods", "Appreciation hold in DC-commuter suburbs", "Avoid coastal MD properties without flood insurance check"],
    insuranceNote: "Mostly stable. Coastal counties (Anne Arundel, Worcester, Somerset) face hurricane + flood risk. Baltimore properties may face limited carrier options.",
  },

  connecticut: {
    slug: "connecticut",
    name: "Connecticut",
    abbr: "CT",
    pitch:
      "NYC-commuter towns (Stamford, Greenwich, New Haven) drive consistent appreciation. Hartford + smaller cities offer better cash-flow math at lower entry prices. CT's high property tax + state income tax burden requires careful underwriting.",
    tier: "Balanced",
    landlord: "Tenant-leaning",
    propertyTaxRatePct: 2.14,
    topStateIncomeTaxPct: 6.99,
    evictionTimelineDays: "45-75",
    medianHomePrice: 360000,
    medianRent: 2050,
    pros: [
      "NYC-commuter rental demand creates consistent occupancy in Fairfield County",
      "Hartford offers balanced cap rates at lower entry prices",
      "Strong rental demand in college towns (New Haven, Storrs)",
      "Wealth concentration in Fairfield County supports appreciation",
      "Lower competition for investor inventory than peer Northeast states",
    ],
    cons: [
      "Second-highest property tax in country (~2.14%) — THE underwriting variable",
      "6.99% top state income tax + 2.14% property tax = brutal after-tax drag",
      "Tenant-leaning law: 45-75 day eviction process",
      "Older housing stock common — capex risk meaningful",
      "Slow population growth statewide outside Fairfield County",
    ],
    topCities: [
      { name: "Hartford", note: "Best cash-flow market in CT; lower entry, decent rental demand" },
      { name: "New Haven", note: "Yale anchor, stable rental market" },
      { name: "Bridgeport", note: "Lower entry prices, B/C-class management overhead" },
      { name: "Stamford", note: "NYC-commuter appreciation play; cap rates compressed" },
    ],
    bestStrategies: ["Cash-flow in Hartford with aggressive tax appeal", "Appreciation hold in Fairfield County for high-income investors", "Avoid weak New Haven neighborhoods without local PM"],
    insuranceNote: "CT insurance mostly stable. Coastal Fairfield County faces hurricane risk + 15-20% premium increases since 2020.",
  },

  oregon: {
    slug: "oregon",
    name: "Oregon",
    abbr: "OR",
    pitch:
      "Portland metro is the Pacific Northwest's most active investor market, but state-level rent control (SB 608) caps annual rent increases. Bend + Salem + Eugene offer alternatives without the rent-control friction. Wildfire risk affects insurance statewide.",
    tier: "Appreciation",
    landlord: "Tenant-leaning",
    propertyTaxRatePct: 0.93,
    topStateIncomeTaxPct: 9.9,
    evictionTimelineDays: "45-90",
    medianHomePrice: 510000,
    medianRent: 2200,
    pros: [
      "Portland appreciation has been strong since 2010",
      "No state sales tax (uniquely)",
      "Strong rental demand in college towns (Eugene, Corvallis)",
      "Bend benefits from outdoor-recreation economy + Pacific Northwest in-migration",
      "Vancouver WA-arbitrage option (cross river to no-income-tax state)",
    ],
    cons: [
      "Statewide rent control (SB 608) caps annual increases at CPI + 7% (max 10%)",
      "9.9% top state income tax",
      "Tenant-leaning law: 45-90 day eviction process",
      "Wildfire insurance pressure statewide — premium increases 30%+ in fire-prone zones",
      "Portland-specific tenant protections add compliance overhead",
    ],
    topCities: [
      { name: "Portland", note: "Appreciation play; rent control + tenant protections limit operational flexibility" },
      { name: "Salem", note: "State capital, lower entry prices, balanced cap rates" },
      { name: "Eugene", note: "University of Oregon anchor, stable rental demand" },
      { name: "Bend", note: "Outdoor-recreation economy + STR-friendly outside city limits" },
    ],
    bestStrategies: ["Long-hold appreciation in Portland for high-income investors", "Cash-flow plays in Salem / Eugene", "Avoid Portland rent-controlled buildings unless math survives the cap"],
    insuranceNote: "Statewide wildfire pressure since 2020. Fire-zone-adjacent properties face 30%+ premium increases. Verify carrier availability in Bend, Medford, southern OR areas.",
  },

  utah: {
    slug: "utah",
    name: "Utah",
    abbr: "UT",
    pitch:
      "Salt Lake City + Provo + St. George have been among the fastest-growing metros in the US since 2020. Tech industry expansion (Silicon Slopes), low taxes, strong landlord law. The catch: prices grew 40%+ in 2020-2023, leaving newer entrants with worse cap math.",
    tier: "Appreciation",
    landlord: "Strong",
    propertyTaxRatePct: 0.51,
    topStateIncomeTaxPct: 4.55,
    evictionTimelineDays: "15-30",
    medianHomePrice: 525000,
    medianRent: 2100,
    pros: [
      "Among lowest effective property tax rates in country (~0.51%)",
      "Strong landlord-friendly law + fast eviction process (15-30 days)",
      "Silicon Slopes tech anchor drives population + rent growth",
      "Flat 4.55% state income tax — among the lowest",
      "St. George + Park City offer STR opportunities in vacation markets",
    ],
    cons: [
      "Cap rates compressed by 2020-2023 appreciation (4-5% typical for SLC SFR)",
      "Tech-employment concentration risk if industry contracts",
      "Park City + Moab heavily restricted STR — verify regulations",
      "Wildfire risk for properties in wildland-urban interface",
      "Some smaller markets (Logan, Cedar City) have thin investor data",
    ],
    topCities: [
      { name: "Salt Lake City", note: "Appreciation play; cap rates compressed but population growth strong" },
      { name: "Provo", note: "BYU + tech anchor, stable demand, slightly better cap rates" },
      { name: "St. George", note: "Retirement + tourism economy, STR potential" },
      { name: "Ogden", note: "Lower entry prices than SLC, growing investor market" },
    ],
    bestStrategies: ["Appreciation hold in SLC + Provo for high-income investors", "Cash-flow plays in Ogden", "STR in St. George (with regulation check)"],
    insuranceNote: "Mostly stable. Wildfire risk in foothills + Wasatch Front interface zones — verify carrier coverage before closing.",
  },

  idaho: {
    slug: "idaho",
    name: "Idaho",
    abbr: "ID",
    pitch:
      "Boise was the poster child of 2020-2022 overbuilding — rents still negative YoY in 2026. Coeur d'Alene, Idaho Falls, and Twin Falls offer more workable economics. Strong landlord law + no state STR restrictions in most markets.",
    tier: "Balanced",
    landlord: "Strong",
    propertyTaxRatePct: 0.69,
    topStateIncomeTaxPct: 5.8,
    evictionTimelineDays: "14-30",
    medianHomePrice: 425000,
    medianRent: 1850,
    pros: [
      "Strong landlord-friendly law with fast eviction (14-30 days)",
      "Low effective property tax rate (~0.69%)",
      "STR opportunities in vacation markets (Coeur d'Alene, McCall)",
      "Population inflow from CA + WA continues",
      "Boise tech anchor + healthcare diversifies economy",
    ],
    cons: [
      "Boise overbuilt 2020-2022 — rents still negative YoY",
      "5.8% state income tax modest but real",
      "Wildfire risk significant in many parts of state",
      "Insurance pressure in wildland-interface zones",
      "Smaller markets have thin investor data + slow appreciation",
    ],
    topCities: [
      { name: "Boise", note: "Wait for supply absorption (12-18 more months) before aggressive entry" },
      { name: "Coeur d'Alene", note: "Tourism + retirement economy, STR-friendly outside city" },
      { name: "Idaho Falls", note: "Lower entry, energy + agriculture, balanced cap rates" },
      { name: "Twin Falls", note: "Smaller market, lower entry, less competitive" },
    ],
    bestStrategies: ["Wait-and-watch for Boise entry in 2026-2027", "STR in Coeur d'Alene / McCall", "Cash-flow in Idaho Falls"],
    insuranceNote: "Wildfire pressure significant. Boise foothills + Coeur d'Alene area face 30%+ premium increases. Verify carrier availability before closing.",
  },

  wisconsin: {
    slug: "wisconsin",
    name: "Wisconsin",
    abbr: "WI",
    pitch:
      "Milwaukee and Madison offer underrated balanced markets — moderate appreciation, decent cap rates, low insurance volatility. WI's flat-ish income tax and reasonable property tax structure are friendly to investors.",
    tier: "Balanced",
    landlord: "Strong",
    propertyTaxRatePct: 1.61,
    topStateIncomeTaxPct: 7.65,
    evictionTimelineDays: "21-45",
    medianHomePrice: 295000,
    medianRent: 1650,
    pros: [
      "Madison drives state-level appreciation (UW + state government + biotech)",
      "Milwaukee offers cash-flow opportunities at lower entry prices",
      "Strong landlord law + reasonable eviction process",
      "Low insurance volatility — among the most stable states",
      "Diverse economy — manufacturing, healthcare, agriculture, tech",
    ],
    cons: [
      "1.61% effective property tax higher than peer Midwest states",
      "7.65% top state income tax",
      "Winter weather inflates capex (HVAC, snow removal, ice damage)",
      "Some Milwaukee neighborhoods require active block-level due diligence",
      "Smaller cities have thin investor markets",
    ],
    topCities: [
      { name: "Madison", note: "Appreciation play; cap rates compressed, strong long-term fundamentals" },
      { name: "Milwaukee", note: "Cash-flow opportunities; neighborhood research is critical" },
      { name: "Green Bay", note: "Lower entry prices, stable demand, manufacturing economy" },
      { name: "Appleton", note: "Smaller market, lower competition, modest appreciation" },
    ],
    bestStrategies: ["Appreciation hold in Madison", "Cash-flow plays in Milwaukee B-class neighborhoods", "Stable buy-and-hold in Green Bay / Appleton"],
    insuranceNote: "WI insurance is stable. Winter-weather claims occasional but premium impact modest.",
  },

  kentucky: {
    slug: "kentucky",
    name: "Kentucky",
    abbr: "KY",
    pitch:
      "Louisville + Lexington offer some of the most underrated cash-flow markets in the Southeast — entry prices under $200k, decent rental demand, low insurance volatility. KY's flat 4% state income tax is reasonable.",
    tier: "Cash flow",
    landlord: "Strong",
    propertyTaxRatePct: 0.83,
    topStateIncomeTaxPct: 4.0,
    evictionTimelineDays: "21-45",
    medianHomePrice: 215000,
    medianRent: 1450,
    pros: [
      "Low effective property tax (~0.83%)",
      "Flat 4% state income tax (one of the lowest among non-zero states)",
      "Strong landlord law with reasonable eviction process",
      "Louisville + Lexington offer cap rates 7-9% in B+ neighborhoods",
      "Lower volatility than Memphis or Detroit peer cash-flow markets",
    ],
    cons: [
      "Slower population growth than Sun Belt peer states",
      "Smaller investor markets — less data, less inventory",
      "Some Louisville neighborhoods have block-by-block variation",
      "Insurance modest premium increases from tornado spillover risk",
      "Smaller cities (Bowling Green, Owensboro) have thin investor markets",
    ],
    topCities: [
      { name: "Louisville", note: "Best balance of cash flow + appreciation in KY; bourbon + healthcare economy" },
      { name: "Lexington", note: "University of Kentucky anchor + agriculture, stable demand" },
      { name: "Bowling Green", note: "WKU anchor, lower entry prices" },
      { name: "Covington", note: "Cincinnati-metro adjacent, lower entry prices for cash flow" },
    ],
    bestStrategies: ["Buy-and-hold in Louisville B+ neighborhoods", "Cash-flow in Lexington near university", "Cincinnati-metro arbitrage via Covington"],
    insuranceNote: "Generally stable. Tornado spillover risk creates modest premium overhead in central + western KY.",
  },

  oklahoma: {
    slug: "oklahoma",
    name: "Oklahoma",
    abbr: "OK",
    pitch:
      "Oklahoma City + Tulsa offer cap rates of 8-11% at entry prices under $200k. Strong landlord-friendly law + fast eviction process + low taxes. The catch: tornado + storm risk affects insurance.",
    tier: "Cash flow",
    landlord: "Strong",
    propertyTaxRatePct: 0.89,
    topStateIncomeTaxPct: 4.75,
    evictionTimelineDays: "10-30",
    medianHomePrice: 195000,
    medianRent: 1350,
    pros: [
      "Strong cap rates achievable (8-11% in B+ neighborhoods)",
      "Fast eviction process (10-30 days)",
      "Low effective property tax (~0.89%)",
      "Energy + aerospace + healthcare economic anchors",
      "Strong landlord law statewide",
    ],
    cons: [
      "Tornado + severe-storm insurance premium overhead",
      "Slower population growth than Sun Belt peer states",
      "Oil + gas economy concentration risk in some neighborhoods",
      "4.75% state income tax modest but real",
      "Smaller investor markets — less data, less inventory",
    ],
    topCities: [
      { name: "Oklahoma City", note: "Best cash-flow market in state; diverse economy + Devon Energy anchor" },
      { name: "Tulsa", note: "Lower entry prices than OKC, oil + healthcare anchors" },
      { name: "Norman", note: "University of Oklahoma anchor, stable rental demand" },
      { name: "Edmond", note: "OKC suburb with stronger appreciation, family-renter demand" },
    ],
    bestStrategies: ["Buy-and-hold for cash flow in OKC + Tulsa", "Cash-flow in Norman near university", "Avoid tornado-belt without storm insurance check"],
    insuranceNote: "Tornado + hail belt — premium overhead 20-30% above neighboring states. Always quote insurance before closing. May & April storm season creates claims volatility.",
  },

  kansas: {
    slug: "kansas",
    name: "Kansas",
    abbr: "KS",
    pitch:
      "Wichita + Kansas City KS offer some of the lowest-entry cash-flow opportunities in the country. Strong landlord law + fast eviction + low taxes. Tornado risk + thin investor markets are the trade-offs.",
    tier: "Cash flow",
    landlord: "Strong",
    propertyTaxRatePct: 1.34,
    topStateIncomeTaxPct: 5.7,
    evictionTimelineDays: "14-30",
    medianHomePrice: 180000,
    medianRent: 1325,
    pros: [
      "Among lowest entry prices in country",
      "Strong landlord law with fast eviction (14-30 days)",
      "Cap rates 8-11% achievable in B+ neighborhoods",
      "KC-metro arbitrage available (KS side of state line)",
      "Healthcare + aerospace (Wichita) + agriculture anchors",
    ],
    cons: [
      "1.34% effective property tax higher than peer Midwest cash-flow states",
      "Tornado + storm insurance premium overhead",
      "Slow population growth statewide",
      "Smaller investor markets — less data, thin liquidity",
      "5.7% state income tax modest but real",
    ],
    topCities: [
      { name: "Wichita", note: "Best cash-flow market in KS; aerospace anchor (Boeing, Cessna)" },
      { name: "Overland Park", note: "KC-metro suburb on KS side; family-renter demand" },
      { name: "Topeka", note: "State capital, lower entry, government anchor" },
      { name: "Lawrence", note: "University of Kansas anchor, smaller but stable market" },
    ],
    bestStrategies: ["Buy-and-hold for cash flow in Wichita", "KC-metro arbitrage in Overland Park / KCK", "Avoid tornado-prone zones without storm insurance check"],
    insuranceNote: "Tornado + hail risk creates premium overhead 20-30% above eastern states. Storm-prone April-June season; carriers occasionally non-renew after multiple claims.",
  },

  iowa: {
    slug: "iowa",
    name: "Iowa",
    abbr: "IA",
    pitch:
      "Des Moines + Cedar Rapids offer underrated cash-flow markets — stable insurance, low property tax, university anchors (Iowa State, U of I). The trade-off is slow population growth and small investor markets.",
    tier: "Cash flow",
    landlord: "Strong",
    propertyTaxRatePct: 1.50,
    topStateIncomeTaxPct: 5.7,
    evictionTimelineDays: "14-30",
    medianHomePrice: 215000,
    medianRent: 1425,
    pros: [
      "Strong landlord law + fast eviction process",
      "Stable insurance environment — among most predictable states",
      "Des Moines drives state-level appreciation (insurance + finance)",
      "University anchors (Iowa State, U of I, UNI) create stable demand",
      "Lower competition for investor inventory than peer states",
    ],
    cons: [
      "1.50% effective property tax higher than peer Midwest cash-flow states",
      "Slow population growth statewide",
      "Smaller investor markets — less data, slower liquidity",
      "Winter weather creates modest capex overhead",
      "5.7% state income tax modest but real",
    ],
    topCities: [
      { name: "Des Moines", note: "State capital + insurance industry hub; balanced cap rates" },
      { name: "Cedar Rapids", note: "Lower entry prices, manufacturing + university anchors" },
      { name: "Iowa City", note: "U of I anchor + UIHC healthcare, stable rental demand" },
      { name: "Davenport", note: "Quad Cities metro, lower entry, manufacturing economy" },
    ],
    bestStrategies: ["Buy-and-hold for cash flow in Des Moines + Cedar Rapids", "University-rental plays in Iowa City + Ames", "Stable hold in Davenport"],
    insuranceNote: "IA insurance among most stable in country. Modest premium overhead from winter weather + occasional severe storm; carriers rarely non-renew.",
  },
};

/** Convenience helpers */
export const ALL_STATE_SLUGS: string[] = Object.values(STATES).map((s) => s.slug);

export function getStateBySlug(slug: string): StateData | null {
  return STATES[slug] ?? null;
}
