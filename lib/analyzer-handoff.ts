/**
 * Calculator → full-analyzer handoff (P2-2).
 *
 * A /tools calculator (or an embed of one) can carry the numbers the user
 * already typed into the full TrueCap analyzer, so they don't re-enter them.
 * Links may initially carry URL query params (?price=&rent=&beds=&address=)
 * so handoffs work cross-origin from embeds. A synchronous head bootstrap
 * captures those values and removes them before telemetry loads; the analyzer
 * consumes the short-lived same-tab copy below.
 *
 * Pure + dependency-free so it's unit-testable and safe to import on both the
 * client widgets (build the URL) and the analyzer (read the params).
 *
 * Only a small, common set of fields is supported — the ones that map cleanly
 * onto the analyzer's primary single-family inputs. A partial handoff (e.g.
 * price + rent only, from the cap-rate calculator) is fine: the analyzer
 * prefills what's provided and leaves the rest on defaults.
 */

/** The three property types the analyzer supports (mirrors the form enum;
 *  kept local so this module stays dependency-free). */
export type HandoffPropertyType = "single-family" | "multi-family" | "owner-occupant";
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

export const ANALYZER_HANDOFF_PRIVATE_QUERY_NAMES = Object.freeze([
  "price",
  "rent",
  "beds",
  "address",
] as const);

export const EARLY_ANALYZER_HANDOFF_KEY = "truecap:analyzer-handoff-v1";
const EARLY_ANALYZER_HANDOFF_MAX_AGE_MS = 10 * 60 * 1000;

type EarlyAnalyzerHandoffState = {
  v: 1;
  search: string;
  capturedAt: number;
};

type AnalyzerHandoffWindow = Pick<Window, "sessionStorage"> & {
  __truecapAnalyzerHandoffSearch?: string;
};

/**
 * Runs while the document head is parsed, before analytics components mount.
 * Private deal inputs are copied to same-tab storage and immediately removed
 * from browser history/referrers. Campaign + strategy parameters remain.
 */
export function analyzerHandoffBootstrapScript(): string {
  return `(function(){var n=${JSON.stringify(ANALYZER_HANDOFF_PRIVATE_QUERY_NAMES)},k=${JSON.stringify(EARLY_ANALYZER_HANDOFF_KEY)};try{var u=new URL(window.location.href);if(u.pathname!=='/')return;var q=new URLSearchParams(),f=false;n.forEach(function(x){u.searchParams.getAll(x).forEach(function(v){q.append(x,v);f=true;});u.searchParams.delete(x);});if(!f)return;var s=q.toString(),p={v:1,search:s,capturedAt:Date.now()};window.__truecapAnalyzerHandoffSearch=s;try{window.sessionStorage.setItem(k,JSON.stringify(p));}catch(_storageError){}window.history.replaceState(window.history.state,'',u.pathname+u.search+u.hash);}catch(_error){try{if(window.location.pathname!=='/')return;var p2=new URLSearchParams(window.location.search);n.forEach(function(x){p2.delete(x);});window.history.replaceState(window.history.state,'',window.location.pathname+(p2.toString()?'?'+p2.toString():'')+window.location.hash);}catch(_ignored){}}})();`;
}

/** Consume the bootstrap payload once; stale/corrupt storage fails closed. */
export function consumeEarlyAnalyzerHandoff(
  target: AnalyzerHandoffWindow,
  now = Date.now()
): string {
  const inMemory = target.__truecapAnalyzerHandoffSearch;
  delete target.__truecapAnalyzerHandoffSearch;

  let stored: string | null = null;
  try {
    stored = target.sessionStorage.getItem(EARLY_ANALYZER_HANDOFF_KEY);
    target.sessionStorage.removeItem(EARLY_ANALYZER_HANDOFF_KEY);
  } catch {
    // The head bootstrap also keeps an in-memory copy for storage-blocked tabs.
  }

  if (inMemory) return inMemory;
  if (!stored) return "";
  try {
    const parsed = JSON.parse(stored) as Partial<EarlyAnalyzerHandoffState>;
    if (
      parsed.v !== 1 ||
      typeof parsed.search !== "string" ||
      typeof parsed.capturedAt !== "number" ||
      now - parsed.capturedAt < 0 ||
      now - parsed.capturedAt > EARLY_ANALYZER_HANDOFF_MAX_AGE_MS
    ) {
      return "";
    }
    return parsed.search;
  } catch {
    return "";
  }
}

export function mergeAnalyzerHandoffSearch(
  earlySearch: string,
  currentSearch: string
): string {
  const merged = new URLSearchParams(earlySearch);
  const current = new URLSearchParams(currentSearch);
  for (const [key, value] of current.entries()) merged.set(key, value);
  return merged.toString();
}

export interface AnalyzerHandoff {
  /** Maps to purchasePrice. */
  purchasePrice?: number;
  /** Maps to monthlyRent (single-family primary). */
  monthlyRent?: number;
  /** Maps to bedrooms. */
  bedrooms?: number;
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

  const address = params.get("address")?.trim();
  if (address && address.length >= 5 && address.length <= 200) {
    out.address = address;
  }

  // `type` (or the explicit `propertyType`) — validated against the enum;
  // anything else is silently ignored so a bad link never crashes init.
  const rawType = (params.get("type") ?? params.get("propertyType"))?.trim();
  if (rawType && (HANDOFF_PROPERTY_TYPES as readonly string[]).includes(rawType)) {
    out.propertyType = rawType as HandoffPropertyType;
  }

  // `strategy` — a persona/marketing link pre-selects a "What's your play?"
  // chip. Same contract as `type`: validated against the known keys, anything
  // else silently ignored so a bad link never crashes init.
  const rawStrategy = params.get("strategy")?.trim();
  if (rawStrategy && (HANDOFF_STRATEGY_KEYS as readonly string[]).includes(rawStrategy)) {
    out.strategy = rawStrategy as HandoffStrategyKey;
  }

  return Object.keys(out).length > 0 ? out : null;
}

/**
 * Build a handoff URL into the full analyzer from a calculator's inputs.
 * Adds utm_source for attribution (ignored by readAnalyzerHandoff).
 */
export function buildAnalyzerHandoffUrl(
  input: AnalyzerHandoff,
  opts?: { base?: string; utmSource?: string }
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
  if (input.address && input.address.trim().length >= 5) {
    params.set("address", input.address.trim());
  }
  if (input.propertyType && input.propertyType !== "single-family") {
    // single-family is the analyzer default — omit it to keep links clean.
    params.set("type", input.propertyType);
  }
  if (input.strategy) {
    params.set("strategy", input.strategy);
  }
  params.set("utm_source", opts?.utmSource ?? "tool-handoff");

  return `${base}?${params.toString()}`;
}
