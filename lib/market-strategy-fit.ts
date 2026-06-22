/**
 * Market strategy-fit (P2-3) — derive whether a market leans cash-flow,
 * appreciation, or balanced from its median cap rate.
 *
 * This is a LABEL over data TrueCap already has (lib/market-benchmarks.ts),
 * not a new claim: that module documents the same pattern it encodes —
 * Midwest/South markets carry higher cap rates (more monthly cash flow,
 * typically lower appreciation), while coastal/expensive markets carry
 * compressed cap rates (investors bet on price growth over day-one yield).
 *
 * Thresholds are deliberately conservative and round-number so the call is
 * defensible: the national median sits ~6.5%, so "balanced" is the band
 * around it, with clear cash-flow / appreciation tails.
 */

export type MarketStrategyTone = "cashflow" | "appreciation" | "balanced";

export interface MarketStrategyFit {
  label: string;
  blurb: string;
  tone: MarketStrategyTone;
}

/** Median cap rate (in %, e.g. 7.5) → market strategy lean. */
export function marketStrategyFit(medianCapRatePct: number): MarketStrategyFit {
  if (!Number.isFinite(medianCapRatePct)) {
    return {
      label: "Balanced market",
      tone: "balanced",
      blurb: "Cash flow and appreciation are both in play here.",
    };
  }
  if (medianCapRatePct >= 7.5) {
    return {
      label: "Cash-flow market",
      tone: "cashflow",
      blurb:
        "High typical cap rates — this market is built for monthly cash flow more than price growth.",
    };
  }
  if (medianCapRatePct <= 5.5) {
    return {
      label: "Appreciation market",
      tone: "appreciation",
      blurb:
        "Compressed cap rates — investors here lean on long-term price growth over day-one cash flow.",
    };
  }
  return {
    label: "Balanced market",
    tone: "balanced",
    blurb:
      "Mid-range cap rates — both cash flow and appreciation are realistically on the table.",
  };
}
