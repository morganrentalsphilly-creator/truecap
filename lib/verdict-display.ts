/**
 * THE single source of verdict wording.
 *
 * WHY THIS FILE EXISTS: before the Aug-2026 hierarchy rebuild the same five
 * display strings were maintained in four independent tables (lib/deal-score,
 * lib/compare-metrics, saved-analyses-page-v2, the OG image) while three
 * surfaces printed the raw internal enum to users, and the word "Pass" meant
 * both "reject this deal" (deal score) and "it clears" (homepage hero, buy
 * box). One deal could read "Avoid" on its workspace page and "Pass" in the
 * list one click away.
 *
 * THE SPLIT — do not collapse it:
 *   INTERNAL value  ("Strong Buy" … "Avoid")  persisted in
 *     saved_analyses.result_snapshot, validated by
 *     lib/saved-analysis-methodology.ts, asserted across ~19 unit tests, and
 *     used as the key for style/model lookups. NEVER rename it — that is a
 *     DB backfill and a broken snapshot validator.
 *   DISPLAY label   (this file)               free to change; no persistence.
 *
 * WORDING RULE: every label states a DECISION, not a category, and no label
 * may be a word that means the opposite elsewhere in the product ("Pass" is
 * banned outright — see lib/pipeline.ts "Passed", lib/buy-box.ts `pass`, and
 * the hero's "clears at asking").
 *
 * Edge-safe: pure data + pure functions, no server imports, so
 * app/d/[encoded]/opengraph-image.tsx (runtime = "edge") can consume it.
 */

import type { DealRecommendation } from "@/lib/deal-score";

/** Visual/semantic tone. Never the ONLY signal — pair with label + icon. */
export type VerdictTone = "positive" | "neutral" | "caution" | "negative";

export type VerdictDisplay = {
  /** Canonical decision wording. Used everywhere there is room. */
  label: string;
  /** Dense contexts only (table cells, OG badge, PDF stripe, mobile pills). */
  shortLabel: string;
  tone: VerdictTone;
  /** Screen-reader phrasing; keeps "verdict" explicit out of visual context. */
  srLabel: string;
};

/**
 * The five tiers. Labels follow the Aug-2026 audit's decision vocabulary.
 *
 * NOTE on coverage: the audit's table listed four rows and conflated stored
 * values with the old display labels (it read "excellent-fit" as a stored
 * value; that was the previous DISPLAY label for "Strong Buy"). The real enum
 * has five values, so "Risky" — absent from the audit — keeps its existing
 * "Needs work" wording, which already reads as a decision.
 */
export const VERDICT_DISPLAY: Record<DealRecommendation, VerdictDisplay> = {
  "Strong Buy": {
    label: "Strong screening result",
    shortLabel: "Strong screen",
    tone: "positive",
    srLabel: "Screening result: strong",
  },
  Buy: {
    label: "Positive screening result",
    shortLabel: "Positive screen",
    tone: "positive",
    srLabel: "Screening result: positive",
  },
  Neutral: {
    label: "Mixed screening result",
    shortLabel: "Mixed screen",
    tone: "neutral",
    srLabel: "Screening result: mixed",
  },
  Risky: {
    label: "Weak screening result",
    shortLabel: "Weak screen",
    tone: "caution",
    srLabel: "Screening result: weak",
  },
  Avoid: {
    label: "Very weak screening result",
    shortLabel: "Very weak screen",
    tone: "negative",
    srLabel: "Screening result: very weak",
  },
};

/** Fallback for a stale/unknown stored value. Never invents a verdict. */
const UNKNOWN_VERDICT: VerdictDisplay = {
  label: "Not scored",
  shortLabel: "Not scored",
  tone: "neutral",
  srLabel: "Verdict: not scored",
};

/**
 * Resolve a stored recommendation to its display record.
 *
 * In development an unmapped value THROWS: the old tolerant helper returned
 * the raw string, which is exactly how "strong-buy" and "Avoid" reached
 * users. In production it degrades to "Not scored" rather than crashing a
 * paying user's results page over a copy lookup.
 */
export function verdictDisplay(recommendation: string | null | undefined): VerdictDisplay {
  if (recommendation && recommendation in VERDICT_DISPLAY) {
    return VERDICT_DISPLAY[recommendation as DealRecommendation];
  }
  if (process.env.NODE_ENV === "development") {
    throw new Error(
      `[verdict-display] Unmapped verdict value: ${JSON.stringify(recommendation)}. ` +
        `Add it to VERDICT_DISPLAY in lib/verdict-display.ts — never render a raw enum.`
    );
  }
  return UNKNOWN_VERDICT;
}

/** Convenience: the canonical label only. Replaces recommendationLabel(). */
export function verdictLabel(recommendation: string | null | undefined): string {
  return verdictDisplay(recommendation).label;
}

/**
 * Screening-context wording. In a shortlist table the question is "does this
 * one survive triage?", so the negative tier reads as an action on the ROW
 * rather than a price judgement. (Absorbs the local override that previously
 * lived in batch-triage-client.tsx.)
 */
export function verdictScreeningLabel(recommendation: string | null | undefined): string {
  const display = verdictDisplay(recommendation);
  return display.shortLabel;
}

/**
 * Kebab "signal" slugs (lib/compare-metrics.ts `Signal`) → internal value.
 *
 * The slug is a legitimate CSS-safe style key AND a persisted filter value in
 * sessionStorage (saved-analyses-page-v2), so the slugs themselves must stay
 * stable. It must never be used as a LABEL key — that indirection is how
 * "strong-buy" reached the compare picker.
 */
export const SIGNAL_TO_RECOMMENDATION: Record<string, DealRecommendation> = {
  "strong-buy": "Strong Buy",
  buy: "Buy",
  neutral: "Neutral",
  risky: "Risky",
  avoid: "Avoid",
};

/** Display record for a kebab signal slug. */
export function signalDisplay(signal: string | null | undefined): VerdictDisplay {
  return verdictDisplay(signal ? SIGNAL_TO_RECOMMENDATION[signal] : null);
}

/** Tailwind classes per tone. Text is always present; color never stands alone. */
export const VERDICT_TONE_CLASSES: Record<VerdictTone, string> = {
  positive: "border-[var(--metric-positive)]/30 bg-[var(--metric-positive)]/10 text-[var(--metric-positive)]",
  neutral: "border-border bg-muted text-foreground",
  caution: "border-[var(--brand-orange)]/30 bg-[var(--brand-orange)]/10 text-[var(--brand-orange-text)]",
  negative: "border-[var(--metric-negative)]/30 bg-[var(--metric-negative)]/10 text-[var(--metric-negative)]",
};
