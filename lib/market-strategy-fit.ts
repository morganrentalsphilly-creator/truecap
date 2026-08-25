/**
 * Market cap-rate context — classify a published median as above, below, or
 * near a national reference and describe it consistently wherever it renders
 * (programmatic /markets/[city] and bespoke market pages).
 *
 * Two entry points, one shared badge shape:
 *   - marketStrategyFit(medianCapRate) — derive from a median cap rate. This is
 *     a LABEL over data TrueCap already has (lib/market-benchmarks.ts), not a
 *     new claim: that module documents the same pattern it encodes — Midwest/
 *     South markets carry higher cap rates (more cash flow, typically less
 *     appreciation); coastal/expensive markets carry compressed cap rates
 *     (investors bet on price growth over day-one yield).
 *   - strategyFitFromTier(tier) — expose a hand-curated StateData.tier as an
 *     explicitly editorial grouping, never as a measured cap-rate fact.
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
        label: "Higher median cap rate",
        tone,
        blurb:
          "The published median cap rate is above the national reference. This benchmark does not establish address-level cash flow or future price growth.",
      };
    case "appreciation":
      return {
        label: "Lower median cap rate",
        tone,
        blurb:
          "The published median cap rate is below the national reference. This benchmark does not establish address-level returns or future appreciation.",
      };
    default:
      return {
        label: "Mid-range median cap rate",
        tone: "balanced",
        blurb:
          "The published median cap rate is near the national reference. Property-level income, costs, condition, and financing still determine the modeled result.",
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
  const tone: MarketStrategyTone = t.includes("cash")
    ? "cashflow"
    : t.includes("apprec")
      ? "appreciation"
      : "balanced";
  const label =
    tone === "cashflow"
      ? "Editorial tier: cash-flow leaning"
      : tone === "appreciation"
        ? "Editorial tier: appreciation leaning"
        : "Editorial tier: balanced";

  return {
    label,
    tone,
    blurb:
      "TrueCap's illustrative editorial grouping uses broad public aggregates. It is not a measured cap-rate median, an address-level result, or investment guidance.",
  };
}
