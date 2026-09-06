/**
 * Indexability rules for the programmatic market and state pages
 * (docs/site-overhaul.md Phase 8.1–8.2).
 *
 * A /markets/<city> page earns an index tag only when HUD Fair Market Rent
 * exists for its slug — that data is what turns the template into a page
 * worth ranking. A /states/<slug> page earns one only when it can render at
 * least STATE_PAGE_MIN_WORDS of real content: the state record's own fields
 * (pitch, tier, landlord-tenant lean, property-tax rate) plus at least one
 * market city in that state with HUD rent. Everything else renders with
 * `robots: noindex, follow` so crawl equity still flows through the links.
 *
 * app/sitemap.ts consumes the two slug helpers; the page templates consume
 * the booleans and the shared copy builders below. The word estimate counts
 * only the strings the state page actually renders (see STATE_PAGE_GUIDANCE),
 * so it is conservative — the rendered page always has more words than the
 * estimate, never fewer. lib/__tests__/markets-indexability.test.ts measures
 * the rendered HTML to keep that true.
 */

import { BESPOKE_MARKETS, MARKET_CITIES } from "@/lib/markets/cities";
import { HUD_RENTS, type HudRent } from "@/lib/markets/hud-rents";
import {
  STATES,
  getStateBySlug,
  type LandlordFriendliness,
  type MarketTier,
  type StateData,
} from "@/lib/states";

/** Metadata `robots` value for a page that stays crawlable but unindexed. */
export const NOINDEX_FOLLOW = { index: false, follow: true } as const;

/** Visible words a state page must render before it may be indexed. */
export const STATE_PAGE_MIN_WORDS = 300;

/** Year to state when a page has no HUD figure to date itself by. */
export const DEFAULT_DATA_YEAR = 2026;

function hudFor(slug: string): HudRent | null {
  if (!Object.prototype.hasOwnProperty.call(HUD_RENTS, slug)) return null;
  return HUD_RENTS[slug] ?? null;
}

/** HUD Fair Market Rent for a market slug, or null when none exists. */
export function getMarketHudRent(slug: string): HudRent | null {
  return hudFor(slug);
}

/** True only when HUD Fair Market Rent exists for the slug. */
export function isMarketIndexable(slug: string): boolean {
  return hudFor(slug) !== null;
}

/** Every city-page slug (programmatic + bespoke) that carries HUD rent. */
export function getIndexableMarketSlugs(): string[] {
  const seen = new Set<string>();
  const slugs: string[] = [];
  for (const slug of [
    ...MARKET_CITIES.map((city) => city.slug),
    ...BESPOKE_MARKETS.map((market) => market.slug),
  ]) {
    if (seen.has(slug) || !isMarketIndexable(slug)) continue;
    seen.add(slug);
    slugs.push(slug);
  }
  return slugs;
}

/** The HUD fiscal year a market page can date itself by. */
export function getMarketDataYear(slug: string): number {
  return hudFor(slug)?.year ?? DEFAULT_DATA_YEAR;
}

/** The one dating line every market, strategy, and state page renders. */
export function buildDataAsOfLine(year: number): string {
  return `Data as of ${year}; verify locally before you offer.`;
}

export type StateHudCity = { slug: string; name: string; hud: HudRent };

/** Market cities in a state (matched on the full state name) that have HUD rent. */
export function getStateHudCities(stateName: string): StateHudCity[] {
  return MARKET_CITIES.filter((city) => city.stateName === stateName).flatMap(
    (city) => {
      const hud = hudFor(city.slug);
      return hud ? [{ slug: city.slug, name: city.name, hud }] : [];
    },
  );
}

/** Bespoke city pages in a state (no HUD rent today, still worth a link). */
export function getStateBespokeMarkets(
  stateName: string,
): { slug: string; name: string }[] {
  return BESPOKE_MARKETS.filter(
    (market) => market.stateName === stateName,
  ).map((market) => ({ slug: market.slug, name: market.name }));
}

/** Latest HUD fiscal year among a state's market cities. */
export function getStateDataYear(slug: string): number {
  const state = getStateBySlug(slug);
  if (!state) return DEFAULT_DATA_YEAR;
  const years = getStateHudCities(state.name).map((city) => city.hud.year);
  return years.length > 0 ? Math.max(...years) : DEFAULT_DATA_YEAR;
}

const TIER_NOTE: Record<MarketTier, string> = {
  "Cash flow":
    "Investors mostly buy here for monthly cash flow rather than price growth.",
  Balanced:
    "Investors buy here for a mix of monthly cash flow and price growth.",
  Appreciation:
    "Investors mostly buy here for price growth. Monthly cash flow is harder to find at asking prices.",
};

const LANDLORD_VALUE: Record<LandlordFriendliness, string> = {
  Strong: "Landlord-leaning",
  Mixed: "Mixed",
  "Tenant-leaning": "Tenant-leaning",
};

export type StateFact = { label: string; value: string; note: string };

/**
 * The three state-record facts the page renders, each with its source label.
 * Values come straight from lib/states.ts; nothing is retyped into prose.
 */
export function buildStateFacts(state: StateData): StateFact[] {
  return [
    {
      label: "Market tier",
      value: state.tier,
      note: TIER_NOTE[state.tier],
    },
    {
      label: "Landlord-tenant law",
      value: LANDLORD_VALUE[state.landlord],
      note: "TrueCap's read of state law. Confirm the statute and local ordinances with counsel before you rely on a timeline.",
    },
    {
      label: "Typical effective property tax",
      value: `${state.propertyTaxRatePct}% of value`,
      note: "TrueCap default — replace it with the parcel's current bill from the county assessor.",
    },
  ];
}

/** The fixed guidance a state page renders, shared so the word estimate is honest. */
export const STATE_PAGE_GUIDANCE = {
  intro: (stateName: string) =>
    `This page gives you the ${stateName} starting numbers TrueCap uses: the market tier, how landlord-tenant law leans, a typical effective property-tax rate, and HUD Fair Market Rent for each ${stateName} city TrueCap covers. Use them to set your first assumptions, then verify the parcel before you offer.`,
  fmr: (stateName: string, year: number) =>
    `HUD Fair Market Rent is the FY${year} housing-program benchmark for the county or metro that contains each city. It is a starting rent for a 2-bedroom or 3-bedroom unit, not a comp for a specific property. Replace it with current leases for the address. When you enter a supported ${stateName} address, TrueCap starts from the HUD figure and labels it HUD FMR so you can see what you changed.`,
  verify: [
    {
      title: "Property tax bill",
      body: "Pull the current bill for the parcel from the county assessor or treasurer, then check how the assessment resets after a sale. A statewide rate is a starting point, not the bill you will pay.",
    },
    {
      title: "Rental licensing and permits",
      body: "Many cities require a rental license, an inspection, or a certificate of occupancy before you can lease. Check the city and county rules for the address before you close, and budget the fees.",
    },
    {
      title: "Insurance quotes",
      body: "Get a written landlord-policy quote for the specific property, including wind, hail, or flood coverage where it applies. Premiums vary by ZIP, building age, and roof, and they decide whether a thin deal still clears.",
    },
  ],
  run: (stateName: string) =>
    `Enter an address and asking price. TrueCap shows cash flow, DSCR, cap rate, and the Offer Ceiling — the highest price that still meets your targets — with every assumption labeled and editable. Enter ${stateName} property tax and insurance from local evidence, not a statewide average.`,
} as const;

/** Whitespace-separated word count of plain text. */
export function countWords(text: string): number {
  return text
    .replace(/<[^>]+>/g, " ")
    .split(/\s+/)
    .filter((word) => /[A-Za-z0-9]/.test(word)).length;
}

/** Row copy for one HUD city as the state page renders it. */
export function describeStateHudCity(city: StateHudCity): string {
  return `${city.name}: HUD Fair Market Rent FY${city.hud.year}, 2-bedroom $${city.hud.rent2br.toLocaleString("en-US")}, 3-bedroom $${city.hud.rent3br.toLocaleString("en-US")}.`;
}

/**
 * Conservative estimate of the visible words a state page renders from real
 * content: pitch, the three facts, the HUD city rows, and the fixed guidance.
 * Headings, breadcrumbs, the CTA, and the footer are not counted.
 */
export function estimateStatePageWords(slug: string): number {
  const state = getStateBySlug(slug);
  if (!state) return 0;
  const year = getStateDataYear(slug);
  const cities = getStateHudCities(state.name);
  const text = [
    state.pitch,
    STATE_PAGE_GUIDANCE.intro(state.name),
    ...buildStateFacts(state).flatMap((fact) => [
      fact.label,
      fact.value,
      fact.note,
    ]),
    STATE_PAGE_GUIDANCE.fmr(state.name, year),
    ...cities.map(describeStateHudCity),
    ...STATE_PAGE_GUIDANCE.verify.flatMap((item) => [item.title, item.body]),
    STATE_PAGE_GUIDANCE.run(state.name),
  ].join(" ");
  return countWords(text);
}

function hasStateFacts(state: StateData): boolean {
  return (
    state.pitch.trim().length > 0 &&
    state.tier in TIER_NOTE &&
    state.landlord in LANDLORD_VALUE &&
    Number.isFinite(state.propertyTaxRatePct) &&
    state.propertyTaxRatePct > 0
  );
}

/**
 * True only when the state page can render STATE_PAGE_MIN_WORDS of real
 * content from its own fields plus at least one market city with HUD rent.
 */
export function isStateIndexable(slug: string): boolean {
  const state = getStateBySlug(slug);
  if (!state || !hasStateFacts(state)) return false;
  if (getStateHudCities(state.name).length === 0) return false;
  return estimateStatePageWords(slug) >= STATE_PAGE_MIN_WORDS;
}

/** Every /states slug that clears the indexability bar. */
export function getIndexableStateSlugs(): string[] {
  return Object.values(STATES)
    .map((state) => state.slug)
    .filter(isStateIndexable);
}

/**
 * Strategy pages (/markets/<city>/<strategy>) render a ~240-word template
 * today (measured by scripts/seo-audit.ts on 2026-09-06), which is thin by
 * the same rule the city and state pages follow. They stay `noindex, follow`
 * and out of the sitemap until the template carries real content; flip this
 * constant when it does and both surfaces follow.
 */
export const STRATEGY_PAGES_INDEXABLE = false;

/** True only when strategy pages carry real content AND the city is indexable. */
export function isStrategyIndexable(citySlug: string): boolean {
  return STRATEGY_PAGES_INDEXABLE && isMarketIndexable(citySlug);
}
