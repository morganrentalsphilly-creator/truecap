/**
 * Indexability rules for the market and state pages (docs/site-overhaul.md
 * Phase 8.1–8.2; data-first reframe F8).
 *
 * A /markets/<city> page earns an index tag only when HUD Fair Market Rent
 * exists for its slug (lib/markets/hud-rents.ts) — that data is what turns the
 * template into a page worth ranking. The rule is the same for the 150
 * programmatic cities and the 12 bespoke metros. A /states/<slug> page earns
 * one only when it can render at least STATE_PAGE_MIN_WORDS of real content:
 * the state's sourced facts (content/seo/state-facts.json via
 * lib/seo/state-facts.ts), the data-only summary and FAQ built from them, and
 * at least one market city in that state with HUD rent. Everything else
 * renders with `robots: noindex, follow` so crawl equity still flows.
 *
 * app/sitemap.ts and app/llms.txt consume the slug helpers; the page
 * templates consume the booleans and the shared copy builders below. The word
 * estimate counts only the strings the state page actually renders, so it is
 * conservative — the rendered page always has more words than the estimate,
 * never fewer. lib/__tests__/markets-indexability.test.ts measures the
 * rendered HTML to keep that true.
 */

import { BESPOKE_MARKETS, MARKET_CITIES } from "@/lib/markets/cities";
import {
  FMR_DEFINITION,
  HUD_FMR_OVERVIEW_RETRIEVED_AT,
  HUD_FMR_OVERVIEW_URL,
  count,
  fmrLabel,
  sharePct,
  usd,
  type DataFaqItem,
  type SourceLink,
} from "@/lib/markets/data-copy";
import { HUD_RENTS, type HudRent } from "@/lib/markets/hud-rents";
import { STATES, getStateBySlug } from "@/lib/states";
import { stateFactsFor, type StateFacts } from "@/lib/seo/state-facts";

/** Metadata `robots` value for a page that stays crawlable but unindexed. */
export const NOINDEX_FOLLOW = { index: false, follow: true } as const;

/** Visible words a state page must render before it may be indexed. */
export const STATE_PAGE_MIN_WORDS = 300;

/**
 * Year the strategy pages state when their city has no HUD figure. Market and
 * state pages date themselves only by a HUD vintage (buildHudDataAsOfLine).
 */
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

/** The strategy pages' dating line (the market and state pages use buildHudDataAsOfLine). */
export function buildDataAsOfLine(year: number): string {
  return `Data as of ${year}; verify locally before you offer.`;
}

export type StateHudCity = { slug: string; name: string; hud: HudRent };

/**
 * Market pages in a state (matched on the full state name), programmatic and
 * bespoke, that have HUD rent — sorted by city name.
 */
export function getStateHudCities(stateName: string): StateHudCity[] {
  return [...MARKET_CITIES, ...BESPOKE_MARKETS]
    .filter((city) => city.stateName === stateName)
    .flatMap((city) => {
      const hud = hudFor(city.slug);
      return hud ? [{ slug: city.slug, name: city.name, hud }] : [];
    })
    .sort((a, b) => a.name.localeCompare(b.name));
}

/** Bespoke city pages in a state that have no HUD rent (still worth a link). */
export function getStateBespokeMarkets(
  stateName: string,
): { slug: string; name: string }[] {
  return BESPOKE_MARKETS.filter(
    (market) => market.stateName === stateName && hudFor(market.slug) === null,
  ).map((market) => ({ slug: market.slug, name: market.name }));
}

/** Latest HUD fiscal year among a state's market cities. */
export function getStateDataYear(slug: string): number {
  const state = getStateBySlug(slug);
  if (!state) return DEFAULT_DATA_YEAR;
  const years = getStateHudCities(state.name).map((city) => city.hud.year);
  return years.length > 0 ? Math.max(...years) : DEFAULT_DATA_YEAR;
}

/** The days a state's HUD city rows were retrieved. */
export function getStateHudRetrievedDates(slug: string): string[] {
  const state = getStateBySlug(slug);
  if (!state) return [];
  return [...new Set(getStateHudCities(state.name).map((city) => city.hud.retrievedAt))].sort();
}

export type StateFact = { label: string; value: string; note: string; source: SourceLink };

const acsLabel = (year: number, table: string) => `American Community Survey ${year} 1-year, table ${table}`;

/** The state's sourced facts as the page lists them, each with its linked source. */
export function buildStateFacts(facts: StateFacts): StateFact[] {
  const { medianHomeValue, medianRealEstateTaxesPaid, occupiedHousingUnits, renterOccupiedUnits } = facts;
  const link = (fact: StateFacts[keyof StateFacts]): SourceLink => ({
    label: fact.source.title,
    href: fact.source.url,
    retrievedAt: fact.source.retrievedAt,
  });
  return [
    {
      label: "Median home value",
      value: usd(medianHomeValue.value),
      note: `Owner-occupied homes. ${acsLabel(medianHomeValue.year, "B25077")}.`,
      source: link(medianHomeValue),
    },
    {
      label: "Median real estate taxes paid",
      value: `${usd(medianRealEstateTaxesPaid.value)} a year`,
      note: `Owner-occupied homes. ${acsLabel(medianRealEstateTaxesPaid.year, "B25103")}.`,
      source: link(medianRealEstateTaxesPaid),
    },
    {
      label: "Renter-occupied homes",
      value: sharePct(renterOccupiedUnits.value, occupiedHousingUnits.value),
      note: `${count(renterOccupiedUnits.value)} of ${count(occupiedHousingUnits.value)} occupied homes. ${acsLabel(renterOccupiedUnits.year, "B25003")}.`,
      source: link(renterOccupiedUnits),
    },
  ];
}

/** "{State} Rental Market Data": its figures carry two vintages (HUD FY, ACS year), each named on the page. */
export function buildStateTitle(stateName: string): string {
  return `${stateName} Rental Market Data`;
}

/** Meta description from the state's sourced facts (≤160 characters). */
export function buildStateDescription(slug: string, stateName: string): string {
  const facts = stateFactsFor(slug);
  if (!facts) {
    return `${stateName} rental market data: HUD Fair Market Rent by city and what to verify locally before you offer.`;
  }
  return `${stateName} rental data: Census median home value ${usd(facts.medianHomeValue.value)}, real estate taxes ${usd(facts.medianRealEstateTaxesPaid.value)} a year, ${sharePct(facts.renterOccupiedUnits.value, facts.occupiedHousingUnits.value)} renters, and HUD FMR by city.`;
}

/** The data-only summary that replaced the unsourced state pitch. */
export function buildStateSummary(stateName: string, facts: StateFacts): string {
  const { medianHomeValue, medianRealEstateTaxesPaid, occupiedHousingUnits, renterOccupiedUnits } = facts;
  return `U.S. Census Bureau figures for ${stateName} (American Community Survey, ${medianHomeValue.year} 1-year estimates): the median owner-occupied home is valued at ${usd(medianHomeValue.value)}, owner-occupied homes paid a median ${usd(medianRealEstateTaxesPaid.value)} a year in real estate taxes, and renters occupied ${count(renterOccupiedUnits.value)} of the state's ${count(occupiedHousingUnits.value)} occupied homes (${sharePct(renterOccupiedUnits.value, occupiedHousingUnits.value)}).`;
}

/** Row copy for one HUD city as the state page renders it. */
export function describeStateHudCity(city: StateHudCity): string {
  return `${city.name}: ${fmrLabel(city.hud.year)}, 2-bedroom ${usd(city.hud.rent2br)}, 3-bedroom ${usd(city.hud.rent3br)}.`;
}

/** The state page's visible FAQ: every answer is one of the page's own sourced numbers. */
export function buildStateFaq(stateName: string, facts: StateFacts, cities: StateHudCity[], year: number): DataFaqItem[] {
  const { medianHomeValue, medianRealEstateTaxesPaid, occupiedHousingUnits, renterOccupiedUnits } = facts;
  const source = (fact: StateFacts[keyof StateFacts]): SourceLink => ({
    label: fact.source.title,
    href: fact.source.url,
    retrievedAt: fact.source.retrievedAt,
  });
  const items: DataFaqItem[] = [
    {
      question: `What is the median home value in ${stateName}?`,
      answer: `The U.S. Census Bureau's ${medianHomeValue.year} American Community Survey (1-year estimates) puts the median value of owner-occupied homes in ${stateName} at ${usd(medianHomeValue.value)}.`,
      sources: [source(medianHomeValue)],
    },
    {
      question: `How much do ${stateName} homeowners pay in real estate taxes?`,
      answer: `Owner-occupied homes in ${stateName} paid a median ${usd(medianRealEstateTaxesPaid.value)} a year in real estate taxes in the Census Bureau's ${medianRealEstateTaxesPaid.year} American Community Survey (1-year estimates).`,
      sources: [source(medianRealEstateTaxesPaid)],
    },
    {
      question: `What share of ${stateName} homes are rented?`,
      answer: `Renters occupied ${count(renterOccupiedUnits.value)} of ${stateName}'s ${count(occupiedHousingUnits.value)} occupied homes (${sharePct(renterOccupiedUnits.value, occupiedHousingUnits.value)}) in the Census Bureau's ${renterOccupiedUnits.year} American Community Survey (1-year estimates).`,
      sources: [source(renterOccupiedUnits)],
    },
  ];
  if (cities.length > 0) {
    items.push({
      question: `What is HUD's Fair Market Rent in ${stateName} cities for FY${year}?`,
      answer: `${fmrLabel(year)}, 2-bedroom and 3-bedroom, for the HUD area that includes each city: ${cities
        .map((city) => `${city.name} ${usd(city.hud.rent2br)} and ${usd(city.hud.rent3br)}`)
        .join("; ")}.`,
      sources: [{ label: "HUD Fair Market Rents (huduser.gov)", href: HUD_FMR_OVERVIEW_URL, retrievedAt: HUD_FMR_OVERVIEW_RETRIEVED_AT }],
    });
  }
  return items;
}

/** The fixed guidance a state page renders, shared so the word estimate is honest. */
export const STATE_PAGE_GUIDANCE = {
  intro: (stateName: string) =>
    `This page collects ${stateName} data from two federal sources: the Census Bureau's American Community Survey for home values, real estate taxes paid and the share of homes that are rented, and HUD's Fair Market Rent for each ${stateName} city TrueCap covers. Use them to set your first assumptions, then verify the parcel before you offer.`,
  fmr: (stateName: string, year: number) =>
    `${fmrLabel(year)} is set for the county or metro area that contains each city. ${FMR_DEFINITION} Use it as a starting rent for a 2-bedroom or 3-bedroom unit, then replace it with current leases for the address. When you enter a supported ${stateName} address, TrueCap starts from the HUD figure and labels it HUD FMR so you can see what you changed.`,
  verify: [
    {
      title: "Property tax bill",
      body: "Pull the current bill for the parcel from the county assessor or treasurer, then check how the assessment resets after a sale. The statewide Census median describes owner-occupied homes, not the bill you will pay.",
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
    `Enter an address and asking price. TrueCap shows cash flow, DSCR, cap rate, and the Offer Ceiling — the highest price that still meets your targets — with every assumption labeled and editable. Enter ${stateName} property tax and insurance from local evidence, not a statewide figure.`,
} as const;

/** Whitespace-separated word count of plain text. */
export function countWords(text: string): number {
  return text
    .replace(/<[^>]+>/g, " ")
    .split(/\s+/)
    .filter((word) => /[A-Za-z0-9]/.test(word)).length;
}

/**
 * Conservative estimate of the visible words a state page renders from real
 * content: the data summary, the facts, the HUD city rows, the FAQ and the
 * fixed guidance. Headings, breadcrumbs, the CTA and the footer are not counted.
 */
export function estimateStatePageWords(slug: string): number {
  const state = getStateBySlug(slug);
  const facts = stateFactsFor(slug);
  if (!state || !facts) return 0;
  const year = getStateDataYear(slug);
  const cities = getStateHudCities(state.name);
  const text = [
    buildStateSummary(state.name, facts),
    STATE_PAGE_GUIDANCE.intro(state.name),
    ...buildStateFacts(facts).flatMap((fact) => [fact.label, fact.value, fact.note]),
    STATE_PAGE_GUIDANCE.fmr(state.name, year),
    ...cities.map(describeStateHudCity),
    ...buildStateFaq(state.name, facts, cities, year).flatMap((item) => [item.question, item.answer]),
    ...STATE_PAGE_GUIDANCE.verify.flatMap((item) => [item.title, item.body]),
    STATE_PAGE_GUIDANCE.run(state.name),
  ].join(" ");
  return countWords(text);
}

/**
 * True only when the state page can render STATE_PAGE_MIN_WORDS of real
 * content from its sourced facts plus at least one market city with HUD rent.
 */
export function isStateIndexable(slug: string): boolean {
  const state = getStateBySlug(slug);
  if (!state || stateFactsFor(slug) === null) return false;
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
