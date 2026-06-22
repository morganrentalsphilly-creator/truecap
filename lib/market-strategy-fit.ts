/**
 * Market strategy-fit (P2-3) — classify a market as cash-flow, appreciation,
 * or balanced, and describe it consistently wherever a fit badge renders
 * (programmatic /markets/[city], bespoke market pages, /states/[slug]).
 *
 * Two entry points, one shared badge shape:
 *   - marketStrategyFit(medianCapRate) — derive from a median cap rate. This is
 *     a LABEL over data TrueCap already has (lib/market-benchmarks.ts), not a
 *     new claim: that module documents the same pattern it encodes — Midwest/
 *     South markets carry higher cap rates (more cash flow, typically less
 *     appreciation); coastal/expensive markets carry compressed cap rates
 *     (investors bet on price growth over day-one yield).
 *   - strategyFitFromTier(tier) — map a hand-curated StateData.tier directly.
 *
 * Thresholds are deliberately conservative + round-number (national median
 * ~6.5%, so "balanced" is the band around it with clear cash-flow /
 * appreciation tails).
 */

export type MarketStrategyTone = "cashflow" | "appreciation" | "balanced";

export interface MarketStrategyFit {
  label: string;
  blurb: string;
  tone: MarketStrategyTone;
}

function fitForTone(tone: MarketStrategyTone): MarketStrategyFit {
  switch (tone) {
    case "cashflow":
      return {
        label: "Cash-flow market",
        tone,
        blurb:
          "Higher typical cap rates — built for monthly cash flow more than price growth.",
      };
    case "appreciation":
      return {
        label: "Appreciation market",
        tone,
        blurb:
          "Compressed cap rates — the play here is long-term price growth over day-one cash flow.",
      };
    default:
      return {
        label: "Balanced market",
        tone: "balanced",
        blurb:
          "Mid-range cap rates — cash flow and appreciation are both realistically on the table.",
      };
  }
}

/** Median cap rate (in %, e.g. 7.5) → market strategy lean. */
export function marketStrategyFit(medianCapRatePct: number): MarketStrategyFit {
  if (!Number.isFinite(medianCapRatePct)) return fitForTone("balanced");
  if (medianCapRatePct >= 7.5) return fitForTone("cashflow");
  if (medianCapRatePct <= 5.5) return fitForTone("appreciation");
  return fitForTone("balanced");
}

/**
 * Map a curated market tier (e.g. StateData.tier: "Cash flow" | "Balanced" |
 * "Appreciation") to the same badge shape. Tolerant of casing/spacing.
 */
export function strategyFitFromTier(tier: string): MarketStrategyFit {
  const t = (tier ?? "").toLowerCase();
  if (t.includes("cash")) return fitForTone("cashflow");
  if (t.includes("apprec")) return fitForTone("appreciation");
  return fitForTone("balanced");
}
