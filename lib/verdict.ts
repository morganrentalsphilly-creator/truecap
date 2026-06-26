/**
 * Auto-generated "verdict" paragraph for the PDF cover page (and anywhere
 * else we want a plain-English summary of a deal). Looks at the key metrics
 * and writes 3-5 sentences explaining what the numbers say.
 *
 * Free-tier safe — no Pro-only data required, no API calls. If the Pro
 * Deal Score recommendation engine has an explanation, the caller should
 * prefer that (this is the fallback).
 */

import type { AnalysisResult } from "@/lib/calc-analysis";

export interface VerdictInputs {
  result: AnalysisResult;
  /** Property address (used to anchor the opening sentence). */
  address?: string;
  /** Purchase price ($) — for context in the opening line. */
  purchasePrice?: number;
}

/**
 * Deal tier — a single-word classification of the deal's overall
 * fundamentals. Exposed independently from the full verdict paragraph
 * so UI surfaces (the Overview tier pill, the what-if sliders, the
 * breakpoint solver) can render just the headline.
 */
export type DealTier = "Strong" | "Solid" | "Mixed" | "Marginal" | "Negative";

/**
 * Public API: return just the tier headline for a given result. Useful
 * for live re-classification when the user is dragging what-if sliders,
 * where we want the tier label to update in real time without re-running
 * the full paragraph generator.
 */
export function getDealTier(result: AnalysisResult): DealTier {
  return classifyDeal(result).headline;
}

/**
 * Bucket the deal into a high-level recommendation based on observable
 * metrics. This is intentionally simpler than the Pro Deal Score — it
 * keeps the verdict honest about being a rule-of-thumb.
 */
function classifyDeal(result: AnalysisResult): {
  headline: DealTier;
  cashFlowSentence: string;
  capRateSentence: string;
  dscrSentence: string;
  cocSentence: string;
  closer: string;
} {
  const cf = result.netCashFlow;
  const cap = result.capRate;
  const coc = result.cocReturn;
  const dscr = result.dscr;
  // Cash purchases have no debt service, so DSCR is undefined.
  // calc-analysis returns 0 in that case — treat it as "not applicable"
  // so we don't misclassify an all-cash deal as Marginal/Negative purely
  // on a DSCR value that doesn't apply.
  const isCashPurchase = result.monthlyPayment <= 0;

  // Headline classification — weights cash flow + DSCR most heavily.
  // For cash purchases, DSCR drops out and we lean entirely on cash
  // flow + cap rate + cash-on-cash to gauge the deal.
  let headline: DealTier;
  if (isCashPurchase) {
    if (cf < 0) {
      headline = cf < -200 ? "Negative" : "Marginal";
    } else if (cf >= 400 && cap >= 7 && coc >= 8) {
      headline = "Strong";
    } else if (cf >= 100 && cap >= 5 && coc >= 5) {
      headline = "Solid";
    } else {
      headline = "Mixed";
    }
  } else if (cf < 0 || dscr < 1.0) {
    headline = cf < -200 || dscr < 0.9 ? "Negative" : "Marginal";
  } else if (cf >= 400 && dscr >= 1.25 && coc >= 10) {
    headline = "Strong";
  } else if (cf >= 100 && dscr >= 1.15 && coc >= 6) {
    headline = "Solid";
  } else {
    headline = "Mixed";
  }

  const cashFlowSentence =
    cf >= 0
      ? `Monthly cash flow of $${Math.round(cf).toLocaleString("en-US")} after all expenses${isCashPurchase ? "" : " and debt service"}.`
      : `Negative monthly cash flow of -$${Math.abs(Math.round(cf)).toLocaleString("en-US")} — the property loses money operationally each month.`;

  const capRateSentence =
    cap >= 7
      ? `Cap rate of ${cap.toFixed(1)}% is healthy for most markets, indicating the property earns its own way independent of how it's financed.`
      : cap >= 5
      ? `Cap rate of ${cap.toFixed(1)}% sits in the typical range for stable / appreciation-focused markets.`
      : cap >= 3
      ? `Cap rate of ${cap.toFixed(1)}% is on the low end — common in coastal / Tier-1 markets where appreciation is the dominant return.`
      : `Cap rate of ${cap.toFixed(1)}% is well below market norms; verify the rent assumption and operating expense estimates.`;

  const dscrSentence = isCashPurchase
    ? `DSCR isn't applicable for an all-cash purchase — no lender debt service to cover.`
    : dscr >= 1.25
    ? `DSCR of ${dscr.toFixed(2)} clears the typical ≥1.25 lender threshold — the property comfortably covers debt service.`
    : dscr >= 1.0
    ? `DSCR of ${dscr.toFixed(2)} is in tight territory (above breakeven but below the ≥1.25 most lenders require for investment loans).`
    : `DSCR of ${dscr.toFixed(2)} is below 1.0 — operating income doesn't cover debt service, so the owner subsidizes the property each month.`;

  const cocSentence =
    coc >= 12
      ? `Cash-on-cash of ${coc.toFixed(1)}% is strong — your invested capital is working harder than most alternatives.`
      : coc >= 8
      ? `Cash-on-cash of ${coc.toFixed(1)}% is a healthy target for buy-and-hold investors.`
      : coc >= 4
      ? `Cash-on-cash of ${coc.toFixed(1)}% is modest — likely an appreciation play rather than a cash-flow play.`
      : coc >= 0
      ? `Cash-on-cash of ${coc.toFixed(1)}% is below typical alternatives — needs strong appreciation and tax benefits to justify.`
      : `Cash-on-cash of ${coc.toFixed(1)}% is negative — investor capital loses value year over year on cash terms alone.`;

  const closer =
    headline === "Strong"
      ? "Strong overall fundamentals; if rents and reserves are realistic, this is a deal to move on."
      : headline === "Solid"
      ? "Solid fundamentals across the board. Worth a deeper underwrite and verification of rent / expense assumptions."
      : headline === "Mixed"
      ? "Mixed signals — one or two metrics are below target. Stress-test the rent and vacancy assumptions before offering."
      : headline === "Marginal"
      ? "Margins are thin. The deal could work if rents come in above projection or you can lock in below-market financing, but it leaves no cushion."
      : "These numbers don't support a buy-and-hold thesis as entered. Either the price needs to come down, the rent needs to be higher, or the strategy is appreciation-driven only.";

  return { headline, cashFlowSentence, capRateSentence, dscrSentence, cocSentence, closer };
}

/**
 * Public API — the verdict broken into its parts, so UI surfaces can render
 * it with progressive disclosure (a one-line closer always visible, the
 * per-metric "why" sentences tucked behind a toggle). Free-tier safe and
 * per-deal — the same engine that powers the PDF paragraph, exposed
 * structured instead of pre-joined. The dashboard uses this to give FREE
 * users the plain-English "why this verdict" that was previously Pro-only.
 */
export function getVerdictNarrative(input: VerdictInputs): {
  headline: DealTier;
  opener: string;
  /** The four per-metric explanations: cash flow, cap rate, DSCR, CoC. */
  sentences: string[];
  closer: string;
} {
  const { result, address } = input;
  const c = classifyDeal(result);
  const opener = address
    ? `${address}: ${c.headline.toLowerCase()} fundamentals.`
    : `Overall: ${c.headline.toLowerCase()} fundamentals.`;
  return {
    headline: c.headline,
    opener,
    sentences: [c.cashFlowSentence, c.capRateSentence, c.dscrSentence, c.cocSentence],
    closer: c.closer,
  };
}

/**
 * Public API — returns a single paragraph string (3-5 sentences) suitable
 * for embedding in the PDF cover page, share links, etc.
 */
export function buildAutoVerdict(input: VerdictInputs): string {
  const { result, address } = input;
  const c = classifyDeal(result);
  const opener = address
    ? `${address}: ${c.headline.toLowerCase()} fundamentals.`
    : `Overall: ${c.headline.toLowerCase()} fundamentals.`;
  return [
    opener,
    c.cashFlowSentence,
    c.capRateSentence,
    c.dscrSentence,
    c.cocSentence,
    c.closer,
  ].join(" ");
}
