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
 * Bucket the deal into a high-level recommendation based on observable
 * metrics. This is intentionally simpler than the Pro Deal Score — it
 * keeps the verdict honest about being a rule-of-thumb.
 */
function classifyDeal(result: AnalysisResult): {
  headline: "Strong" | "Solid" | "Mixed" | "Marginal" | "Negative";
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

  // Headline classification — weights cash flow + DSCR most heavily.
  let headline: "Strong" | "Solid" | "Mixed" | "Marginal" | "Negative";
  if (cf < 0 || dscr < 1.0) {
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
      ? `Monthly cash flow of $${Math.round(cf).toLocaleString("en-US")} after all expenses and debt service.`
      : `Negative monthly cash flow of -$${Math.abs(Math.round(cf)).toLocaleString("en-US")} — the property loses money operationally each month.`;

  const capRateSentence =
    cap >= 7
      ? `Cap rate of ${cap.toFixed(1)}% is healthy for most markets, indicating the property earns its own way independent of how it's financed.`
      : cap >= 5
      ? `Cap rate of ${cap.toFixed(1)}% sits in the typical range for stable / appreciation-focused markets.`
      : cap >= 3
      ? `Cap rate of ${cap.toFixed(1)}% is on the low end — common in coastal / Tier-1 markets where appreciation is the dominant return.`
      : `Cap rate of ${cap.toFixed(1)}% is well below market norms; verify the rent assumption and operating expense estimates.`;

  const dscrSentence =
    dscr >= 1.25
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
