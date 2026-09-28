/**
 * Shared validation for the sourced-fact datasets (F8):
 * content/seo/market-facts.json (lib/seo/market-facts.ts) and
 * content/seo/state-facts.json (lib/seo/state-facts.ts).
 *
 * A fact reaches a page only with its source: an https URL on a primary-source
 * domain (seo/config.json `primarySourceDomains`, owner-edited, never by the
 * model), a title, a publisher and the YYYY-MM-DD day it was retrieved. Text
 * is plain (no markup, single spaces only), carries no investment verdict, and
 * never calls HUD's Fair Market Rent an average, typical, median or market
 * rent (docs/voice.md).
 *
 * Pure data + validation: no React, no server-only.
 */

import seoConfig from "@/seo/config.json";
import { isIsoDate } from "@/lib/seo/site-path";

/** Federal primary-source domains a fact may cite (subdomains included). */
export const PRIMARY_SOURCE_DOMAINS: readonly string[] = Object.freeze([
  ...(seoConfig as { primarySourceDomains: string[] }).primarySourceDomains,
]);

export type FactSource = Readonly<{
  url: string;
  title: string;
  publisher: string;
  /** YYYY-MM-DD the source was fetched. */
  retrievedAt: string;
}>;

/** A `sources[]` item: exactly url, title and retrievedAt (verify-static's checkContentJson rule). */
export type FactSourceRef = Readonly<{ url: string; title: string; retrievedAt: string }>;

const TRACKING_PARAM = /^(?:utm_[a-z]+|gclid|fbclid|mc_[a-z]+|ref)$/i;

/**
 * Phrases a fact may not contain: investment verdicts and advice framing
 * (seo-market-enrich gate 4), and FMR called an average/typical/median/market
 * rent. "Fair Market Rent" itself is allowed; "market rent" alone is not.
 */
export const FORBIDDEN_FACT_PHRASES: readonly RegExp[] = Object.freeze([
  /\b(?:average|typical|median)\s+rents?\b/i,
  /(?<!\bfair\s)\bmarket\s+rents?\b/i,
  /\bworth buying\b/i,
  /\bmax(?:imum)? offer\b/i,
  /\bMAO\b/,
  /\bwalk[- ]away price\b/i,
  /\bTrueCap recommends?\b/i,
  /\bverdict\b/i,
  /\b(?:good|bad|great|smart|safe)\s+investment\b/i,
  /\b(?:strong|weak|hot|best)\s+(?:rental\s+)?market\b/i,
  /\bcash[- ]flow market\b/i,
  /\b(?:landlord|tenant)[- ]friendly\b/i,
  /\bguarantee(?:d|s)?\b/i,
  /\bshould (?:buy|sell|invest)\b/i,
  /\bundervalued\b/i,
  /\byou should\b/i,
]);

/** Null when `value` is an allowed source URL, else the reason it is not. */
export function sourceUrlProblem(value: unknown, extraHosts: readonly string[] = []): string | null {
  if (typeof value !== "string") return "url must be a string";
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return `url ${JSON.stringify(value)} does not parse`;
  }
  if (url.protocol !== "https:") return `url ${value} is not https`;
  if (url.username || url.password || url.port) return `url ${value} carries userinfo or a port`;
  const host = url.hostname.toLowerCase();
  const allowed = [...PRIMARY_SOURCE_DOMAINS, ...extraHosts];
  if (!allowed.some((domain) => host === domain || host.endsWith(`.${domain}`))) {
    return `url host ${host} is not a primary-source domain (seo/config.json primarySourceDomains)`;
  }
  for (const key of url.searchParams.keys()) {
    if (TRACKING_PARAM.test(key)) return `url ${value} carries the tracking parameter ${key}`;
  }
  return null;
}

/**
 * A plain-text string of 1..max characters with no markup, no forbidden phrase
 * and single spaces only; throws otherwise. The page collapses whitespace and
 * the FAQPage JSON-LD keeps the string as written, so a tab, line break,
 * non-breaking space, doubled space or edge space would make the two differ.
 */
export function plainText(value: unknown, where: string, max: number): string {
  if (typeof value !== "string" || !value.trim()) throw new Error(`${where} must be a non-empty string`);
  if (value.length > max) throw new Error(`${where} is longer than ${max} characters`);
  if (value !== value.trim()) throw new Error(`${where} starts or ends with whitespace`);
  if (/[^\S ]| {2}/.test(value)) {
    throw new Error(`${where} contains whitespace other than single spaces (a tab, line break, non-breaking space or doubled space)`);
  }
  if (/[<>]/.test(value)) throw new Error(`${where} contains markup (< or >)`);
  const banned = FORBIDDEN_FACT_PHRASES.find((pattern) => pattern.test(value));
  if (banned) throw new Error(`${where} contains a forbidden phrase (${banned.source})`);
  return value;
}

/** Throws unless `record` has exactly `keys`. */
export function exactKeys(record: Record<string, unknown>, keys: readonly string[], where: string): void {
  const actual = Object.keys(record).sort().join();
  const wanted = [...keys].sort().join();
  if (actual !== wanted) throw new Error(`${where} must have exactly ${keys.join(", ")} (has ${Object.keys(record).join(", ") || "nothing"})`);
}

export function asRecord(value: unknown, where: string): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) throw new Error(`${where} must be an object`);
  return value as Record<string, unknown>;
}

/**
 * The latest retrieval day a fact may carry: tomorrow in UTC, so a source
 * fetched "today" in any time zone passes and a future day (a typo, or a
 * model inventing a date) fails. Only ever grows, so data that passes once
 * keeps passing: no time bomb. Not the lastmod map's newest date — the loop's
 * verify-build runs before its publish job bumps the map, so a fact retrieved
 * on the run's day would be refused.
 */
export function latestRetrievalDay(now: number = Date.now()): string {
  return new Date(now + 86_400_000).toISOString().slice(0, 10);
}

/** Null when `value` is a YYYY-MM-DD retrieval day that is not in the future, else the reason. */
export function retrievedAtProblem(value: unknown): string | null {
  if (!isIsoDate(value)) return "must be a YYYY-MM-DD date";
  const latest = latestRetrievalDay();
  if (value > latest) return `${value} is in the future (latest allowed ${latest})`;
  return null;
}

/** A single `source` object: exactly url, title, publisher and retrievedAt. */
export function parseFactSource(value: unknown, where: string, extraHosts: readonly string[] = []): FactSource {
  const record = asRecord(value, where);
  exactKeys(record, ["publisher", "retrievedAt", "title", "url"], where);
  const problem = sourceUrlProblem(record.url, extraHosts);
  if (problem) throw new Error(`${where}: ${problem}`);
  const dateProblem = retrievedAtProblem(record.retrievedAt);
  if (dateProblem) throw new Error(`${where}.retrievedAt ${dateProblem}`);
  return Object.freeze({
    url: record.url as string,
    title: plainText(record.title, `${where}.title`, 200),
    publisher: plainText(record.publisher, `${where}.publisher`, 120),
    retrievedAt: record.retrievedAt as string,
  });
}

/** One `sources[]` item: exactly url, title and retrievedAt. */
export function parseFactSourceRef(value: unknown, where: string, extraHosts: readonly string[] = []): FactSourceRef {
  const record = asRecord(value, where);
  exactKeys(record, ["retrievedAt", "title", "url"], where);
  const problem = sourceUrlProblem(record.url, extraHosts);
  if (problem) throw new Error(`${where}: ${problem}`);
  const dateProblem = retrievedAtProblem(record.retrievedAt);
  if (dateProblem) throw new Error(`${where}.retrievedAt ${dateProblem}`);
  return Object.freeze({
    url: record.url as string,
    title: plainText(record.title, `${where}.title`, 200),
    retrievedAt: record.retrievedAt as string,
  });
}

