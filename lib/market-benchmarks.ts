/**
 * Market cap rate benchmarks — gives users a "is this good in MY market?"
 * answer instead of just absolute thresholds.
 *
 * Problem this solves: a 7% cap rate is EXCELLENT in California (4-5%
 * typical) and MEDIOCRE in Detroit (9-10% typical). The verdict engine
 * uses absolute thresholds, which leaves first-time investors without
 * the context they need to know whether THEIR number is good in THEIR
 * market.
 *
 * Approach:
 * - State-level medians for all 50 states + DC, drawn from rough 2025
 *   market patterns. NOT a single sourced dataset — these are TrueCap
 *   estimates compiled from public market reports + observable patterns.
 *   Surfaced with caveats so users don't treat them as authoritative.
 * - Metro overrides for the top ~30 US metros where state-level alone
 *   is misleading (NYC is not "New York State" cap rates).
 * - Address parser to extract city + 2-letter state code from the
 *   free-form address field. Falls back gracefully when parsing fails
 *   — better to show no benchmark than a wrong one.
 *
 * Data freshness: numbers reflect rough 2025 market conditions. Real
 * cap rates move with interest rates; refresh annually. Last updated
 * 2026-Q2 (light revision for rate stabilization). See
 * /methodology for the disclosure surfaced to users.
 */

export type BenchmarkScope = "metro" | "state" | "national";

export interface CapRateBenchmark {
  /** Median cap rate as a percentage (e.g. 7.5 = 7.5%). */
  median: number;
  /** Human-readable name of the geographic scope ("Philadelphia", "PA", "U.S."). */
  scopeName: string;
  /** Which lookup level produced this benchmark. */
  scope: BenchmarkScope;
}

// ──────────────────────────────────────────────────────────────────
// State-level medians (2025, rough)
//
// Bias: Northeast / Pacific are expensive markets with compressed
// cap rates; Midwest / South Central are higher cap (often lower
// appreciation). National median sits around 6.5%.
// ──────────────────────────────────────────────────────────────────
const STATE_MEDIANS: Record<string, number> = {
  AL: 8.0,
  AK: 7.5,
  AZ: 5.8,
  AR: 8.5,
  CA: 4.8,
  CO: 5.5,
  CT: 6.2,
  DE: 6.8,
  DC: 5.0,
  FL: 5.8,
  GA: 6.5,
  HI: 5.0,
  ID: 6.5,
  IL: 7.5,
  IN: 8.5,
  IA: 8.0,
  KS: 8.5,
  KY: 8.5,
  LA: 7.5,
  ME: 7.0,
  MD: 6.0,
  MA: 5.5,
  MI: 8.5,
  MN: 6.8,
  MS: 9.0,
  MO: 8.0,
  MT: 7.0,
  NE: 8.0,
  NV: 6.2,
  NH: 6.8,
  NJ: 5.5,
  NM: 7.0,
  NY: 5.5,
  NC: 6.5,
  ND: 8.5,
  OH: 8.5,
  OK: 8.0,
  OR: 5.5,
  PA: 7.0,
  RI: 6.5,
  SC: 6.8,
  SD: 8.5,
  TN: 6.8,
  TX: 6.5,
  UT: 5.8,
  VT: 6.8,
  VA: 6.0,
  WA: 5.5,
  WV: 8.5,
  WI: 7.5,
  WY: 7.5,
};

const STATE_FULL_NAMES: Record<string, string> = {
  AL: "Alabama",
  AK: "Alaska",
  AZ: "Arizona",
  AR: "Arkansas",
  CA: "California",
  CO: "Colorado",
  CT: "Connecticut",
  DE: "Delaware",
  DC: "Washington DC",
  FL: "Florida",
  GA: "Georgia",
  HI: "Hawaii",
  ID: "Idaho",
  IL: "Illinois",
  IN: "Indiana",
  IA: "Iowa",
  KS: "Kansas",
  KY: "Kentucky",
  LA: "Louisiana",
  ME: "Maine",
  MD: "Maryland",
  MA: "Massachusetts",
  MI: "Michigan",
  MN: "Minnesota",
  MS: "Mississippi",
  MO: "Missouri",
  MT: "Montana",
  NE: "Nebraska",
  NV: "Nevada",
  NH: "New Hampshire",
  NJ: "New Jersey",
  NM: "New Mexico",
  NY: "New York",
  NC: "North Carolina",
  ND: "North Dakota",
  OH: "Ohio",
  OK: "Oklahoma",
  OR: "Oregon",
  PA: "Pennsylvania",
  RI: "Rhode Island",
  SC: "South Carolina",
  SD: "South Dakota",
  TN: "Tennessee",
  TX: "Texas",
  UT: "Utah",
  VT: "Vermont",
  VA: "Virginia",
  WA: "Washington",
  WV: "West Virginia",
  WI: "Wisconsin",
  WY: "Wyoming",
};

// ──────────────────────────────────────────────────────────────────
// Metro overrides — top ~30 US metros where the state median is
// misleading. NYC ≠ Upstate NY, San Francisco ≠ Central Valley CA.
// Keyed by lowercase city name + state code so collisions like
// "Portland, OR" vs "Portland, ME" resolve correctly.
// ──────────────────────────────────────────────────────────────────
const METRO_OVERRIDES: Record<string, { median: number; displayName: string }> = {
  "new york|NY": { median: 4.5, displayName: "New York City" },
  "brooklyn|NY": { median: 4.5, displayName: "Brooklyn (NYC)" },
  "queens|NY": { median: 4.5, displayName: "Queens (NYC)" },
  "san francisco|CA": { median: 4.2, displayName: "San Francisco" },
  "oakland|CA": { median: 4.8, displayName: "Oakland" },
  "los angeles|CA": { median: 4.5, displayName: "Los Angeles" },
  "san jose|CA": { median: 4.0, displayName: "San Jose" },
  "san diego|CA": { median: 4.8, displayName: "San Diego" },
  "sacramento|CA": { median: 5.5, displayName: "Sacramento" },
  "seattle|WA": { median: 4.8, displayName: "Seattle" },
  "boston|MA": { median: 4.8, displayName: "Boston" },
  "washington|DC": { median: 5.0, displayName: "Washington DC" },
  "miami|FL": { median: 5.0, displayName: "Miami" },
  "orlando|FL": { median: 5.8, displayName: "Orlando" },
  "tampa|FL": { median: 5.8, displayName: "Tampa" },
  "jacksonville|FL": { median: 6.2, displayName: "Jacksonville" },
  "chicago|IL": { median: 6.5, displayName: "Chicago" },
  "atlanta|GA": { median: 5.8, displayName: "Atlanta" },
  "dallas|TX": { median: 5.5, displayName: "Dallas" },
  "houston|TX": { median: 6.2, displayName: "Houston" },
  "austin|TX": { median: 5.0, displayName: "Austin" },
  "san antonio|TX": { median: 6.0, displayName: "San Antonio" },
  "fort worth|TX": { median: 5.8, displayName: "Fort Worth" },
  "phoenix|AZ": { median: 5.5, displayName: "Phoenix" },
  "philadelphia|PA": { median: 7.5, displayName: "Philadelphia" },
  "pittsburgh|PA": { median: 8.0, displayName: "Pittsburgh" },
  "detroit|MI": { median: 10.0, displayName: "Detroit" },
  "cleveland|OH": { median: 9.0, displayName: "Cleveland" },
  "cincinnati|OH": { median: 8.0, displayName: "Cincinnati" },
  "columbus|OH": { median: 7.5, displayName: "Columbus" },
  "indianapolis|IN": { median: 7.5, displayName: "Indianapolis" },
  "memphis|TN": { median: 9.0, displayName: "Memphis" },
  "nashville|TN": { median: 5.8, displayName: "Nashville" },
  "knoxville|TN": { median: 7.0, displayName: "Knoxville" },
  "birmingham|AL": { median: 9.0, displayName: "Birmingham" },
  "kansas city|MO": { median: 7.5, displayName: "Kansas City" },
  "st louis|MO": { median: 8.5, displayName: "St. Louis" },
  "st. louis|MO": { median: 8.5, displayName: "St. Louis" },
  "saint louis|MO": { median: 8.5, displayName: "St. Louis" },
  "charlotte|NC": { median: 6.0, displayName: "Charlotte" },
  "raleigh|NC": { median: 5.8, displayName: "Raleigh" },
  "denver|CO": { median: 5.2, displayName: "Denver" },
  "colorado springs|CO": { median: 5.8, displayName: "Colorado Springs" },
  "minneapolis|MN": { median: 6.0, displayName: "Minneapolis" },
  "portland|OR": { median: 5.0, displayName: "Portland" },
  "portland|ME": { median: 6.5, displayName: "Portland (Maine)" },
  "las vegas|NV": { median: 5.8, displayName: "Las Vegas" },
  "baltimore|MD": { median: 7.0, displayName: "Baltimore" },
  "milwaukee|WI": { median: 7.5, displayName: "Milwaukee" },
  "buffalo|NY": { median: 8.5, displayName: "Buffalo" },
  "rochester|NY": { median: 8.5, displayName: "Rochester" },
  "albuquerque|NM": { median: 6.8, displayName: "Albuquerque" },
  "salt lake city|UT": { median: 5.5, displayName: "Salt Lake City" },
  "new orleans|LA": { median: 7.0, displayName: "New Orleans" },
  "oklahoma city|OK": { median: 7.5, displayName: "Oklahoma City" },
  "tulsa|OK": { median: 7.8, displayName: "Tulsa" },
};

const NATIONAL_MEDIAN = 6.5;

// ──────────────────────────────────────────────────────────────────
// Address parsing — Google Places gives us addresses like
// "1205 N 5th St, Philadelphia, PA 19122, USA". Pull out the
// 2-letter state code and the city name preceding it. Tolerant of
// missing zip + missing country and of free-form user input.
// ──────────────────────────────────────────────────────────────────
const STATE_CODES = new Set(Object.keys(STATE_MEDIANS));

export function parseLocationFromAddress(
  address: string | null | undefined
): { city: string | null; state: string | null } {
  if (!address || typeof address !== "string") return { city: null, state: null };
  const trimmed = address.trim();
  if (trimmed.length < 5) return { city: null, state: null };

  // Look for a 2-letter state code, optionally followed by a zip,
  // optionally followed by ", USA". Anchored on a comma + space so we
  // don't pick up random capitals inside a street name.
  const stateMatch = trimmed.match(/,\s*([A-Z]{2})(?:\s+\d{5}(?:-\d{4})?)?(?:\s*,\s*USA)?\s*$/);
  if (!stateMatch || !stateMatch[1] || !STATE_CODES.has(stateMatch[1])) {
    return { city: null, state: null };
  }
  const state = stateMatch[1];

  // City is the segment immediately before the state — i.e. the
  // last comma-separated piece BEFORE the state match.
  const beforeState = trimmed.slice(0, stateMatch.index).trim();
  const segments = beforeState
    .split(",")
    .map((segment) => segment.trim())
    .filter(Boolean);
  const city = segments.length > 0 ? (segments[segments.length - 1] ?? null) : null;

  return { city, state };
}

// ──────────────────────────────────────────────────────────────────
// Benchmark lookup. Tries metro override first, falls back to state,
// then national median. Returns null only when address parsing fails
// entirely — we always have SOME benchmark for a parseable address.
// ──────────────────────────────────────────────────────────────────
export function getCapRateBenchmark(
  address: string | null | undefined
): CapRateBenchmark | null {
  const { city, state } = parseLocationFromAddress(address);
  if (!state) {
    // Address didn't parse — fall back to national so we still give
    // SOME context. Callers can choose to show or hide based on scope.
    return { median: NATIONAL_MEDIAN, scopeName: "U.S.", scope: "national" };
  }

  if (city) {
    const key = `${city.toLowerCase()}|${state}`;
    const metro = METRO_OVERRIDES[key];
    if (metro) {
      return { median: metro.median, scopeName: metro.displayName, scope: "metro" };
    }
  }

  const stateMedian = STATE_MEDIANS[state];
  if (typeof stateMedian === "number") {
    return {
      median: stateMedian,
      scopeName: STATE_FULL_NAMES[state] ?? state,
      scope: "state",
    };
  }

  return { median: NATIONAL_MEDIAN, scopeName: "U.S.", scope: "national" };
}

// ──────────────────────────────────────────────────────────────────
// UI formatter — builds the human-readable subline that appears on
// the Cap Rate metric card. Compares the user's cap rate against
// the local median and tells them where they stand.
//
// "Above the 7.5% Philadelphia median" — confident, no padding
// "Below the 4.5% NYC median (5.5%)" — flags underperformance
// "Near the 6.5% Atlanta median" — within ±0.5pt is "near"
// ──────────────────────────────────────────────────────────────────
export function formatCapRateBenchmarkSubline(
  userCapRatePct: number,
  benchmark: CapRateBenchmark
): string {
  const median = benchmark.median;
  const delta = userCapRatePct - median;
  const scopeNote = benchmark.scope === "national" ? "U.S." : benchmark.scopeName;

  if (Math.abs(delta) < 0.5) {
    return `Near the ${median.toFixed(1)}% ${scopeNote} median`;
  }
  if (delta >= 0.5) {
    return `Above the ${median.toFixed(1)}% ${scopeNote} median`;
  }
  return `Below the ${median.toFixed(1)}% ${scopeNote} median`;
}
