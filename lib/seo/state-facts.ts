/**
 * Sourced facts for /states/<slug> pages (F8): content/seo/state-facts.json,
 * `{ "states": { "<slug>": { "<fact>": { "value", "year", "source" } } } }`.
 *
 * Replaces the unsourced state record fields (lib/states.ts pitch, tier,
 * landlord lean and property-tax rate), which no page renders any more. Every
 * fact is one U.S. Census Bureau American Community Survey figure for the
 * state, with the table's data.census.gov page and the day it was retrieved.
 *
 * Validated at import, so a malformed or unsourced fact fails `next build`:
 * each fact is a positive integer with a survey year and an https source on a
 * primary-source domain (seo/config.json), or, for a state-law fact added
 * later, on that state's own official host listed in STATE_OFFICIAL_HOSTS.
 *
 * Pure data + validation: no React, no server-only.
 */

import raw from "@/content/seo/state-facts.json";
import { STATES } from "@/lib/states";
import { asRecord, exactKeys, parseFactSource, type FactSource } from "@/lib/seo/fact-source";
import { SLUG_RE } from "@/lib/seo/site-path";

export type StateNumberFact = Readonly<{
  value: number;
  /** Survey year of the estimate (ACS 1-year: the calendar year surveyed). */
  year: number;
  source: FactSource;
}>;

export type StateFacts = Readonly<{
  /** ACS B25077: median value of owner-occupied homes, dollars. */
  medianHomeValue: StateNumberFact;
  /** ACS B25103: median real estate taxes paid by owner-occupied homes, dollars a year. */
  medianRealEstateTaxesPaid: StateNumberFact;
  /** ACS B25003: occupied housing units. */
  occupiedHousingUnits: StateNumberFact;
  /** ACS B25003: renter-occupied housing units. */
  renterOccupiedUnits: StateNumberFact;
}>;

export const STATE_FACT_KEYS = [
  "medianHomeValue",
  "medianRealEstateTaxesPaid",
  "occupiedHousingUnits",
  "renterOccupiedUnits",
] as const;

/**
 * A state's own official hosts (revenue department, legislature, courts) that
 * may source a fact about that state. Owner-edited, never by the model; empty
 * until a state-law fact is added.
 */
export const STATE_OFFICIAL_HOSTS: Readonly<Record<string, readonly string[]>> = Object.freeze({});

function parseNumberFact(value: unknown, where: string, extraHosts: readonly string[]): StateNumberFact {
  const record = asRecord(value, where);
  exactKeys(record, ["source", "value", "year"], where);
  const n = record.value;
  if (typeof n !== "number" || !Number.isInteger(n) || n <= 0) throw new Error(`${where}.value must be a positive integer`);
  const year = record.year;
  if (typeof year !== "number" || !Number.isInteger(year) || year < 2000 || year > 2100) {
    throw new Error(`${where}.year must be a four-digit survey year`);
  }
  return Object.freeze({ value: n, year, source: parseFactSource(record.source, `${where}.source`, extraHosts) });
}

/** Validates the dataset's shape; throws naming the offending state and fact so the build log shows it. */
export function parseStateFacts(
  value: unknown,
  label = "content/seo/state-facts.json",
  knownSlugs: ReadonlySet<string> = new Set(Object.keys(STATES)),
): Readonly<Record<string, StateFacts>> {
  const root = asRecord(value, label);
  exactKeys(root, ["states"], label);
  const states = asRecord(root.states, `${label} states`);
  const out: Record<string, StateFacts> = {};
  for (const [slug, entry] of Object.entries(states)) {
    const where = `${label} states.${slug}`;
    if (!SLUG_RE.test(slug) || !knownSlugs.has(slug)) throw new Error(`${where}: no /states/${slug} page exists`);
    const record = asRecord(entry, where);
    exactKeys(record, STATE_FACT_KEYS, where);
    const extraHosts = STATE_OFFICIAL_HOSTS[slug] ?? [];
    const facts = Object.fromEntries(
      STATE_FACT_KEYS.map((key) => [key, parseNumberFact(record[key], `${where}.${key}`, extraHosts)]),
    ) as unknown as StateFacts;
    if (facts.renterOccupiedUnits.value > facts.occupiedHousingUnits.value) {
      throw new Error(`${where}: renterOccupiedUnits exceeds occupiedHousingUnits`);
    }
    if (facts.renterOccupiedUnits.year !== facts.occupiedHousingUnits.year) {
      throw new Error(`${where}: renter and occupied unit counts must come from the same survey year`);
    }
    out[slug] = Object.freeze(facts);
  }
  return Object.freeze(out);
}

/** The validated dataset (module load fails on bad data). */
export const STATE_FACTS: Readonly<Record<string, StateFacts>> = parseStateFacts(raw);

/** A state page's sourced facts, or null when it has none. */
export function stateFactsFor(slug: string): StateFacts | null {
  return Object.prototype.hasOwnProperty.call(STATE_FACTS, slug) ? STATE_FACTS[slug]! : null;
}
