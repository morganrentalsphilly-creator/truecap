/**
 * Calculator → full-analyzer handoff (P2-2).
 *
 * A /tools calculator (or an embed of one) can carry the numbers the user
 * already typed into the full TrueCap analyzer, so they don't re-enter them.
 * Generated URLs remain backward-compatible, but first-party links stage
 * exact values in short-lived sessionStorage and render only a scrubbed URL.
 * A pre-analytics bootstrap consumes old/direct query links before any vendor
 * script can observe an address or financial input. Cross-origin embeds open
 * a clean analyzer without carrying exact inputs between storage partitions.
 *
 * Pure and client-safe so it's unit-testable and safe to import on both the
 * client widgets (build the URL) and the analyzer (read the params). Strategy
 * parsing also enforces the build-time specialist-model release gates.
 *
 * Only a small, common set of fields is supported — the ones that map cleanly
 * onto the analyzer's primary single-family inputs. A partial handoff (e.g.
 * price + rent only, from the cap-rate calculator) is fine: the analyzer
 * prefills what's provided and leaves the rest on defaults.
 */

import { isSpecialistStrategyEnabled } from "@/lib/feature-flags";

/** The three property types the analyzer supports (mirrors the form enum;
 *  kept local so this module stays dependency-free). */
export type HandoffPropertyType =
  | "single-family"
  | "multi-family"
  | "owner-occupant";
const HANDOFF_PROPERTY_TYPES: readonly HandoffPropertyType[] = [
  "single-family",
  "multi-family",
  "owner-occupant",
];

/** "What's your play?" chip keys the analyzer supports (mirrors
 *  lib/investor-strategies — kept local so this module stays dependency-free;
 *  the mirror is unit-tested against the registry). */
export type HandoffStrategyKey =
  | "buy-hold"
  | "house-hack"
  | "brrrr"
  | "wholesale-mao"
  | "fix-flip"
  | "short-term";
export const HANDOFF_STRATEGY_KEYS: readonly HandoffStrategyKey[] = [
  "buy-hold",
  "house-hack",
  "brrrr",
  "wholesale-mao",
  "fix-flip",
  "short-term",
];

/** A known key is not necessarily a released key. This check is shared by
 * inbound parsing and outbound URL creation so a dark strategy can neither be
 * emitted by first-party links nor materialized from a crafted URL. */
export function isReleasedHandoffStrategy(
  value: string | null | undefined,
): value is HandoffStrategyKey {
  return Boolean(
    value &&
    (HANDOFF_STRATEGY_KEYS as readonly string[]).includes(value) &&
    isSpecialistStrategyEnabled(value),
  );
}

export interface AnalyzerHandoff {
  /** Maps to purchasePrice. */
  purchasePrice?: number;
  /** Maps to monthlyRent (single-family primary). */
  monthlyRent?: number;
  /** Maps to bedrooms. */
  bedrooms?: number;
  /** Exact screened financing assumption, when a shortlist row is promoted. */
  interestRate?: number;
  /** Exact screened property-tax assumption, when a shortlist row is promoted. */
  propertyTaxPct?: number;
  /** Maps to address. */
  address?: string;
  /**
   * Maps to propertyType — lets a persona/marketing link land the visitor on
   * the right form (house-hacker → owner-occupant, multi-family investor →
   * multi-family) instead of a blank single-family form. Ignored when it
   * isn't one of the three valid types.
   */
  propertyType?: HandoffPropertyType;
  /**
   * Maps to the "What's your play?" strategy chip — lets a persona page
   * (/for-brrrr → /?strategy=brrrr) land the visitor with the play already
   * selected: property type, starter assumptions, and the lead result tab all
   * set, exactly as if they'd clicked the chip. Ignored when it isn't one of
   * the known keys. Wins over `type` when both are present (the play sets its
   * own property type).
   */
  strategy?: HandoffStrategyKey;
}

export const ANALYZER_HANDOFF_SESSION_KEY =
  "truecap_private_analyzer_handoff_v1";
export const PRIVATE_ANALYZER_HANDOFF_QUERY_PARAMETERS = [
  "price",
  "rent",
  "beds",
  "rate",
  "tax",
  "address",
] as const;
const PRIVATE_ANALYZER_HANDOFF_TTL_MS = 5 * 60 * 1000;

type HandoffStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;

function splitPrivateHandoffUrl(href: string): {
  cleanHref: string;
  privateSearch: string;
} {
  const parsed = new URL(href, "https://truecap.invalid");
  const privateParams = new URLSearchParams();
  for (const name of PRIVATE_ANALYZER_HANDOFF_QUERY_PARAMETERS) {
    const value = parsed.searchParams.get(name);
    if (value !== null) privateParams.set(name, value);
    parsed.searchParams.delete(name);
  }
  return {
    cleanHref: `${parsed.pathname}${parsed.search}${parsed.hash}`,
    privateSearch: privateParams.toString(),
  };
}

/** Render-safe destination: never puts exact handoff inputs in an anchor. */
export function scrubAnalyzerHandoffHref(href: string): string {
  try {
    return splitPrivateHandoffUrl(href).cleanHref;
  } catch {
    return "/";
  }
}

/** Stage an exact same-tab handoff just before navigation. */
export function stageAnalyzerHandoffHref(
  href: string,
  storage: HandoffStorage,
  now = Date.now(),
): boolean {
  try {
    const { privateSearch } = splitPrivateHandoffUrl(href);
    if (!privateSearch) return false;
    storage.setItem(
      ANALYZER_HANDOFF_SESSION_KEY,
      JSON.stringify({ version: 1, privateSearch, createdAt: now }),
    );
    return true;
  } catch {
    return false;
  }
}

function consumeStagedAnalyzerHandoff(
  storage: HandoffStorage,
  now = Date.now(),
): AnalyzerHandoff | null {
  try {
    const raw = storage.getItem(ANALYZER_HANDOFF_SESSION_KEY);
    storage.removeItem(ANALYZER_HANDOFF_SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    if (
      parsed.version !== 1 ||
      typeof parsed.privateSearch !== "string" ||
      typeof parsed.createdAt !== "number" ||
      !Number.isFinite(parsed.createdAt) ||
      now - parsed.createdAt < 0 ||
      now - parsed.createdAt > PRIVATE_ANALYZER_HANDOFF_TTL_MS
    ) {
      return null;
    }
    return readAnalyzerHandoff(parsed.privateSearch);
  } catch {
    return null;
  }
}

/** Consume direct safe params plus one short-lived private same-tab payload. */
export function consumeAnalyzerHandoff(
  search: string,
  storage: HandoffStorage,
  now = Date.now(),
): AnalyzerHandoff | null {
  const staged = consumeStagedAnalyzerHandoff(storage, now);
  const direct = readAnalyzerHandoff(search);
  if (!staged) return direct;
  if (!direct) return staged;
  return { ...staged, ...direct };
}

/**
 * Inline head bootstrap for backward-compatible/direct URLs. It moves exact
 * inputs to short-lived session storage and removes them from location.href
 * before Google, Vercel, PostHog, Sentry, or the browser referrer can read
 * them. Storage failure still strips the URL (privacy-first degradation).
 */
export function analyzerHandoffBootstrapScript(): string {
  const names = JSON.stringify(PRIVATE_ANALYZER_HANDOFF_QUERY_PARAMETERS);
  const key = JSON.stringify(ANALYZER_HANDOFF_SESSION_KEY);
  return `(function(){try{var u=new URL(window.location.href);if(u.pathname!=="/")return;var n=${names},p=new URLSearchParams(),f=false;n.forEach(function(k){var v=u.searchParams.get(k);if(v!==null){p.set(k,v);u.searchParams.delete(k);f=true;}});if(!f)return;try{window.sessionStorage.setItem(${key},JSON.stringify({version:1,privateSearch:p.toString(),createdAt:Date.now()}));}catch(_){}window.history.replaceState(window.history.state,"",u.pathname+u.search+u.hash);}catch(_){}})();`;
}

/**
 * Same-page strategy handoff event. The homepage persona cards live on the
 * SAME route as the calculator ("/"), so clicking a seeded link is a soft
 * navigation — the URL gains ?strategy= but the calculator's mount-time
 * readAnalyzerHandoff never re-runs and the seed is inert. The cards
 * therefore ALSO dispatch this window CustomEvent (the hero address form's
 * handshake pattern) and the calculator applies the strategy live. Hard
 * loads and open-in-new-tab still consume the URL param at mount.
 */
export const ANALYZER_STRATEGY_EVENT = "truecap:analyzer-strategy";
export interface AnalyzerStrategyEventDetail {
  strategy: HandoffStrategyKey;
}

function toFiniteNum(v: string | null): number | undefined {
  if (v == null) return undefined;
  const trimmed = v.trim();
  if (trimmed === "") return undefined;
  const n = Number(trimmed);
  return Number.isFinite(n) && n >= 0 ? n : undefined;
}

/**
 * Parse handoff params from a query string (e.g. window.location.search).
 * Returns null when none of the supported params are present/valid, so the
 * caller can cleanly fall through to its normal init path.
 *
 * Validation mirrors the form schema's bounds so we never prefill an
 * out-of-range value: price ≥ 10000, beds 0–20, address ≥ 5 chars.
 */
export function readAnalyzerHandoff(search: string): AnalyzerHandoff | null {
  const params = new URLSearchParams(search || "");
  const out: AnalyzerHandoff = {};

  const price = toFiniteNum(params.get("price"));
  if (price !== undefined && price >= 10000 && price <= 100_000_000) {
    out.purchasePrice = price;
  }

  const rent = toFiniteNum(params.get("rent"));
  if (rent !== undefined && rent <= 1_000_000) {
    out.monthlyRent = rent;
  }

  const beds = toFiniteNum(params.get("beds"));
  if (beds !== undefined && beds >= 0 && beds <= 20) {
    out.bedrooms = beds;
  }

  const interestRate = toFiniteNum(params.get("rate"));
  if (interestRate !== undefined && interestRate <= 30) {
    out.interestRate = interestRate;
  }

  const propertyTaxPct = toFiniteNum(params.get("tax"));
  if (propertyTaxPct !== undefined && propertyTaxPct <= 20) {
    out.propertyTaxPct = propertyTaxPct;
  }

  const address = params.get("address")?.trim();
  if (address && address.length >= 5 && address.length <= 200) {
    out.address = address;
  }

  // `type` (or the explicit `propertyType`) — validated against the enum;
  // anything else is silently ignored so a bad link never crashes init.
  const rawType = (params.get("type") ?? params.get("propertyType"))?.trim();
  if (
    rawType &&
    (HANDOFF_PROPERTY_TYPES as readonly string[]).includes(rawType)
  ) {
    out.propertyType = rawType as HandoffPropertyType;
  }

  // `strategy` — a persona/marketing link pre-selects a "What's your play?"
  // chip. Same contract as `type`: validated against the known keys, anything
  // else silently ignored so a bad link never crashes init.
  const rawStrategy = params.get("strategy")?.trim();
  if (isReleasedHandoffStrategy(rawStrategy)) {
    out.strategy = rawStrategy;
  }

  return Object.keys(out).length > 0 ? out : null;
}

/**
 * Build a handoff URL into the full analyzer from a calculator's inputs.
 * Adds utm_source for attribution (ignored by readAnalyzerHandoff).
 */
export function buildAnalyzerHandoffUrl(
  input: AnalyzerHandoff,
  opts?: { base?: string; utmSource?: string },
): string {
  const base = opts?.base ?? "/";
  const params = new URLSearchParams();

  if (typeof input.purchasePrice === "number" && input.purchasePrice >= 10000) {
    params.set("price", String(Math.round(input.purchasePrice)));
  }
  if (typeof input.monthlyRent === "number" && input.monthlyRent > 0) {
    params.set("rent", String(Math.round(input.monthlyRent)));
  }
  if (typeof input.bedrooms === "number" && input.bedrooms >= 0) {
    params.set("beds", String(input.bedrooms));
  }
  if (
    typeof input.interestRate === "number" &&
    input.interestRate >= 0 &&
    input.interestRate <= 30
  ) {
    params.set("rate", String(input.interestRate));
  }
  if (
    typeof input.propertyTaxPct === "number" &&
    input.propertyTaxPct >= 0 &&
    input.propertyTaxPct <= 20
  ) {
    params.set("tax", String(input.propertyTaxPct));
  }
  if (input.address && input.address.trim().length >= 5) {
    params.set("address", input.address.trim());
  }
  if (input.propertyType && input.propertyType !== "single-family") {
    // single-family is the analyzer default — omit it to keep links clean.
    params.set("type", input.propertyType);
  }
  if (isReleasedHandoffStrategy(input.strategy)) {
    params.set("strategy", input.strategy);
  }
  params.set("utm_source", opts?.utmSource ?? "tool-handoff");

  return `${base}?${params.toString()}`;
}
