/**
 * AI deal summary — pure helpers for the one-tap "summarize this deal"
 * card in the analysis dashboard.
 *
 * Like Deal Q&A, the summary is GROUNDED: the server action recomputes the
 * analysis from the submitted form values via calculateAnalysis (the single
 * source of truth) and hands the model a compact, labeled context. The model's
 * only job is interpretation — it never sees or invents market data.
 *
 * The grounding context is shared with Deal Q&A (buildDealQaContext) so the two
 * features can't drift apart; only the TASK (summarize vs. answer) differs.
 *
 * Pure + network-free so the prompt + the cache key are deterministic and
 * unit-testable.
 */

import type { InvestmentFormValues } from "@/lib/investcalc-schema";

export { buildDealQaContext as buildDealSummaryContext } from "@/lib/deal-qa";

/**
 * System prompt — the grounding contract for the summary task. The numbers
 * come precomputed; the model writes a tight, balanced narrative an investor
 * could paste into their notes or send to a partner.
 */
export const DEAL_SUMMARY_SYSTEM_PROMPT = [
  "You are TrueCap's deal analyst. Write a short, balanced summary of ONE rental-property deal using ONLY the context sections provided below (the deal's computed numbers, and — when present — the user's buy box, max allowable offer, projection, and pulled comps).",
  "Rules:",
  "- Use ONLY the provided numbers. NEVER invent or estimate a number that is not present in the context — no made-up rents, prices, rates, comps, projections, or market data.",
  "- Structure: (1) one sentence on what the deal is, (2) the headline cash flow + the two return metrics that matter most here, (3) the single biggest strength, (4) the single biggest risk or what to watch, (5) a one-sentence balanced bottom line.",
  "- When a YOUR BUY BOX or YOUR MAX ALLOWABLE OFFER section is present, weave the single most decision-relevant personal fact into the summary (e.g. \"misses your cap-rate floor by 0.8pp\", \"asking price sits above your $268,500 max offer\"). Never mention a buy box, max offer, comps, or projections when that section is absent.",
  "- 4-6 sentences total. Plain English. No headers, no bullet lists, no markdown.",
  "- Reference the actual figures (e.g. \"$312/mo cash flow\", \"6.1% cap\") rather than vague adjectives.",
  "- You are not a financial advisor. Describe what the numbers say for and against the deal; never tell the user whether to buy.",
].join("\n");

/** Hard caps shared by the action — exported for tests + UI hints. */
export const DEAL_SUMMARY_LIMITS = {
  /** Per-day summaries for visitors / free accounts (a taste of Pro). */
  free: 3,
  /** Per-day fair-use cap for paid plans. */
  pro: 50,
} as const;

/**
 * Stable cache key for a deal's inputs. The summary is deterministic from the
 * form VALUES plus the optional grounding context (buy box / MAO / projection /
 * comps — the same deal with comps pulled reads differently), so identical
 * deal+context pairs share one cached summary — the first generation pays,
 * repeats are free. `extraContext === undefined` hashes exactly like the
 * pre-context era, keeping old cache buckets valid. This is a
 * non-cryptographic content hash for an in-memory cache, not a security
 * boundary.
 */
export function hashDealInput(values: InvestmentFormValues, extraContext?: unknown): string {
  const canonical =
    extraContext === undefined
      ? stableStringify(values)
      : stableStringify({ extra: extraContext, values });
  // FNV-1a 32-bit — fast, dependency-free, good enough for a cache bucket.
  let h = 0x811c9dc5;
  for (let i = 0; i < canonical.length; i += 1) {
    h ^= canonical.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(36);
}

/** Deterministic JSON: object keys sorted at every level so key order in the
 *  form payload can't produce two different hashes for the same deal. */
function stableStringify(input: unknown): string {
  if (input === null || typeof input !== "object") return JSON.stringify(input) ?? "null";
  if (Array.isArray(input)) return `[${input.map(stableStringify).join(",")}]`;
  const obj = input as Record<string, unknown>;
  const keys = Object.keys(obj).sort();
  return `{${keys.map((k) => `${JSON.stringify(k)}:${stableStringify(obj[k])}`).join(",")}}`;
}
