/**
 * Sourced, city-specific facts for /markets/<slug> pages (F8):
 * content/seo/market-facts.json, `{ "markets": { "<slug>": { … } } }`.
 *
 * The SEO loop's seo-market-enrich skill writes entries (county effective tax
 * rate, rental licensing rule, a data-only FAQ); the page renders them in a
 * "Local data" section, and the FAQ items join the page's visible FAQ and its
 * FAQPage JSON-LD. A slug with no entry renders nothing extra.
 *
 * Validated at import, so a malformed or unsourced fact fails `next build`
 * instead of publishing: every fact carries an https source on a
 * primary-source domain (seo/config.json) with a YYYY-MM-DD retrieval date and
 * a value; text is plain, verdict-free and never calls FMR an average rent
 * (lib/seo/fact-source.ts). The entry schema matches
 * .claude/skills/seo-market-enrich/SKILL.md step 6.
 *
 * Pure data + validation: no React, no server-only.
 */

import raw from "@/content/seo/market-facts.json";
import { BESPOKE_MARKETS, MARKET_CITIES } from "@/lib/markets/cities";
import {
  asRecord,
  exactKeys,
  parseFactSource,
  parseFactSourceRef,
  plainText,
  type FactSource,
  type FactSourceRef,
} from "@/lib/seo/fact-source";
import { SLUG_RE } from "@/lib/seo/site-path";

export type MarketTaxRateFact = Readonly<{
  /** The effective rate the source states, in percent (1.23 = 1.23%). */
  value: number;
  unit: "percent";
  /** The county's full name, e.g. "Franklin County". */
  county: string;
  /** The tax year the source states. */
  year: number;
  source: FactSource;
}>;

export type MarketLicensingFact = Readonly<{
  /** True only when the official page says a license, registration or inspection is required. */
  required: boolean;
  /** One factual sentence. */
  summary: string;
  source: FactSource;
}>;

export type MarketFaqFact = Readonly<{ q: string; a: string; sources: readonly FactSourceRef[] }>;

export type MarketFacts = Readonly<{
  countyEffectiveTaxRate: MarketTaxRateFact | null;
  rentalLicensing: MarketLicensingFact | null;
  faq: readonly MarketFaqFact[];
}>;

/** At most this many FAQ items per city (the skill writes 2 to 4). */
export const MARKET_FACTS_MAX_FAQ = 4;

const ENTRY_KEYS = ["countyEffectiveTaxRate", "faq", "rentalLicensing"] as const;

const ALL_MARKET_SLUGS: ReadonlySet<string> = new Set([
  ...MARKET_CITIES.map((city) => city.slug),
  ...BESPOKE_MARKETS.map((market) => market.slug),
]);

function parseTaxRate(value: unknown, where: string): MarketTaxRateFact | null {
  if (value === null) return null;
  const record = asRecord(value, where);
  exactKeys(record, ["county", "source", "unit", "value", "year"], where);
  const rate = record.value;
  if (typeof rate !== "number" || !Number.isFinite(rate) || rate <= 0 || rate >= 10) {
    throw new Error(`${where}.value must be a percent between 0 and 10`);
  }
  if (record.unit !== "percent") throw new Error(`${where}.unit must be "percent"`);
  const year = record.year;
  if (typeof year !== "number" || !Number.isInteger(year) || year < 2000 || year > 2100) {
    throw new Error(`${where}.year must be a four-digit tax year`);
  }
  return Object.freeze({
    value: rate,
    unit: "percent" as const,
    county: plainText(record.county, `${where}.county`, 80),
    year,
    source: parseFactSource(record.source, `${where}.source`),
  });
}

function parseLicensing(value: unknown, where: string): MarketLicensingFact | null {
  if (value === null) return null;
  const record = asRecord(value, where);
  exactKeys(record, ["required", "source", "summary"], where);
  if (typeof record.required !== "boolean") throw new Error(`${where}.required must be true or false`);
  return Object.freeze({
    required: record.required,
    summary: plainText(record.summary, `${where}.summary`, 300),
    source: parseFactSource(record.source, `${where}.source`),
  });
}

function parseFaq(value: unknown, where: string): readonly MarketFaqFact[] {
  if (!Array.isArray(value)) throw new Error(`${where} must be an array`);
  if (value.length > MARKET_FACTS_MAX_FAQ) throw new Error(`${where} has ${value.length} items; at most ${MARKET_FACTS_MAX_FAQ}`);
  const seen = new Set<string>();
  return Object.freeze(
    value.map((item, index) => {
      const at = `${where}[${index}]`;
      const record = asRecord(item, at);
      exactKeys(record, ["a", "q", "sources"], at);
      const q = plainText(record.q, `${at}.q`, 200);
      if (seen.has(q)) throw new Error(`${at}.q repeats an earlier question`);
      seen.add(q);
      if (!Array.isArray(record.sources) || record.sources.length === 0) {
        throw new Error(`${at}.sources must list at least one source`);
      }
      return Object.freeze({
        q,
        a: plainText(record.a, `${at}.a`, 600),
        sources: Object.freeze(record.sources.map((source, i) => parseFactSourceRef(source, `${at}.sources[${i}]`))),
      });
    }),
  );
}

/** Validates the dataset's shape; throws naming the offending slug and field so the build log shows it. */
export function parseMarketFacts(
  value: unknown,
  label = "content/seo/market-facts.json",
  knownSlugs: ReadonlySet<string> = ALL_MARKET_SLUGS,
): Readonly<Record<string, MarketFacts>> {
  const root = asRecord(value, label);
  exactKeys(root, ["markets"], label);
  const markets = asRecord(root.markets, `${label} markets`);
  const out: Record<string, MarketFacts> = {};
  for (const [slug, entry] of Object.entries(markets)) {
    const where = `${label} markets.${slug}`;
    if (!SLUG_RE.test(slug)) throw new Error(`${where}: ${JSON.stringify(slug)} is not a market slug`);
    if (!knownSlugs.has(slug)) throw new Error(`${where}: no /markets/${slug} page exists`);
    const record = asRecord(entry, where);
    exactKeys(record, ENTRY_KEYS, where);
    const facts: MarketFacts = Object.freeze({
      countyEffectiveTaxRate: parseTaxRate(record.countyEffectiveTaxRate, `${where}.countyEffectiveTaxRate`),
      rentalLicensing: parseLicensing(record.rentalLicensing, `${where}.rentalLicensing`),
      faq: parseFaq(record.faq, `${where}.faq`),
    });
    if (!facts.countyEffectiveTaxRate && !facts.rentalLicensing && facts.faq.length === 0) {
      throw new Error(`${where} has no fact: both facts are null and the FAQ is empty`);
    }
    out[slug] = facts;
  }
  return Object.freeze(out);
}

/** The validated dataset (module load fails on bad data). */
export const MARKET_FACTS: Readonly<Record<string, MarketFacts>> = parseMarketFacts(raw);

/** A market page's sourced facts, or null when it has none. */
export function marketFactsFor(slug: string): MarketFacts | null {
  return Object.prototype.hasOwnProperty.call(MARKET_FACTS, slug) ? MARKET_FACTS[slug]! : null;
}
