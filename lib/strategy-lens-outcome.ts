/**
 * Strategy-lens outcome — the one-strip answer to "how does THIS deal do on
 * the metrics MY kind of investor cares about?".
 *
 * The investor lens (Deal Score card) reorders which metric tiles lead, but
 * that alone reads as almost nothing changing. This module turns the chosen
 * lens into an explicit statement near the verdict: which already-computed
 * metrics carry the deal for that investor type, each with its value and a
 * one-word band ("strong", "tight", ...).
 *
 * DISPLAY-ONLY. No new math — every number is read straight off the existing
 * AnalysisResult, and every band below mirrors wording/thresholds already
 * shown elsewhere in the dashboard (metric-tile sublines + the Deal Score
 * "Why this score?" breakdown). The verdict/score engines are untouched; if
 * those display bands ever move, keep these in sync.
 *
 * Balanced (the default lens) returns null — the strip only appears once the
 * user actively picks a lens, so the default read stays uncluttered.
 *
 * Pure: metrics in, a {headline, metrics[]} out. Tested in lib/__tests__.
 */

import type { DealStrategy } from "./deal-score";
import { isExtremeAnnualizedRoi } from "./extreme-value-format";

/** Chip color intent — maps to the metric-positive/negative CSS vars. */
export type LensMetricTone = "good" | "neutral" | "bad";

export type LensOutcomeMetric = {
  /** Short metric name, e.g. "CoC". */
  label: string;
  /** Pre-formatted value, e.g. "9.1%", "+$350/mo", "1.41". */
  value: string;
  /** One-or-two-word band, e.g. "strong", "tight", "underwater". */
  band: string;
  tone: LensMetricTone;
};

export type StrategyLensOutcome = {
  /** One-line framing, e.g. "You're a cash-flow investor — ...". */
  headline: string;
  /** The 3 metrics that carry the verdict for this investor type. */
  metrics: LensOutcomeMetric[];
};

export type StrategyLensMetricsInput = {
  /** Monthly net cash flow ($, pre-tax). */
  netCashFlow: number;
  /** Cash-on-cash return (%). */
  cocReturn: number;
  /** False when no initial cash is modeled and CoC is mathematically N/A. */
  cashOnCashApplicable?: boolean;
  /** Debt-service coverage ratio. */
  dscr: number;
  /** Cap rate (%). */
  capRate: number;
  /** Monthly after-tax cash flow ($). */
  afterTaxCF: number;
  /** Monthly debt-service payment; <= 0 means a cash purchase (DSCR N/A). */
  monthlyPayment: number;
  /** 10-yr annualized total return (%); null when projections unavailable. */
  annualizedReturnPct: number | null;
  /** Owner-occupant house-hack — softens the sub-1.0 DSCR band (expected). */
  isOwnerOccupant?: boolean;
};

const fmtMoneyPerMo = (n: number) =>
  `${n >= 0 ? "+" : "-"}$${Math.abs(Math.round(n)).toLocaleString()}/mo`;

const fmtPct1 = (n: number) => `${n.toFixed(1)}%`;

/** Bands mirror cashFlowBenchmarkLabel in components/investcalc/metrics-band.tsx
 *  (≥$500 strong / $200–500 solid / >$0 modest / >-$100 break-even). */
function cashFlowMetric(netCashFlow: number): LensOutcomeMetric {
  const band =
    netCashFlow >= 500
      ? "strong"
      : netCashFlow >= 200
        ? "solid"
        : netCashFlow > 0
          ? "modest"
          : netCashFlow > -100
            ? "≈break-even"
            : "losing money";
  return {
    label: "Cash flow",
    value: `${fmtMoneyPerMo(netCashFlow)} after all expenses`,
    band,
    tone: netCashFlow > 0 ? "good" : netCashFlow > -100 ? "neutral" : "bad",
  };
}

/** Bands mirror cocBenchmarkLabel / the Deal Score CoC tiers
 *  (>7 strong / 5–7 healthy / 3–5 modest / <3 weak). */
function cocMetric(cocReturn: number, applicable = true): LensOutcomeMetric {
  if (!applicable) {
    return {
      label: "CoC",
      value: "N/A",
      band: "no modeled cash invested",
      tone: "neutral",
    };
  }
  const band =
    cocReturn > 7
      ? "strong"
      : cocReturn > 5
        ? "healthy"
        : cocReturn > 3
          ? "modest"
          : cocReturn >= 0
            ? "thin"
            : "negative";
  return {
    label: "CoC",
    value: fmtPct1(cocReturn),
    band,
    tone: cocReturn > 5 ? "good" : cocReturn >= 0 ? "neutral" : "bad",
  };
}

/** Bands mirror the DSCR tile subline (≥1.25 bankable / ≥1.0 tight /
 *  underwater; sub-1.0 is expected on a house-hack, so stay neutral there). */
function dscrMetric(
  dscr: number,
  monthlyPayment: number,
  isOwnerOccupant: boolean
): LensOutcomeMetric {
  if (monthlyPayment <= 0) {
    return { label: "DSCR", value: "—", band: "all-cash, no debt to cover", tone: "neutral" };
  }
  if (dscr >= 1.25) {
    return { label: "DSCR", value: dscr.toFixed(2), band: "comfortable", tone: "good" };
  }
  if (dscr >= 1.0) {
    return { label: "DSCR", value: dscr.toFixed(2), band: "tight", tone: "neutral" };
  }
  if (isOwnerOccupant) {
    return {
      label: "DSCR",
      value: dscr.toFixed(2),
      band: "normal for a house-hack",
      tone: "neutral",
    };
  }
  return { label: "DSCR", value: dscr.toFixed(2), band: "underwater", tone: "bad" };
}

/** Bands mirror the Deal Score total-return breakdown
 *  (>11 strong / 8–11 solid / 5–8 modest / <5 limited). */
function tenYearReturnMetric(annualizedReturnPct: number | null): LensOutcomeMetric {
  if (annualizedReturnPct == null) {
    return { label: "10-yr return", value: "—", band: "not available", tone: "neutral" };
  }
  // Beyond the Deal Score's own top band (>15%/yr ≈ >300% cumulative,
  // Choose-TrueCap finding 5): stop celebrating and ask for verification.
  // The numeric value stays visible — display framing only.
  if (isExtremeAnnualizedRoi(annualizedReturnPct)) {
    return {
      label: "10-yr return",
      value: `~${Math.round(annualizedReturnPct)}%/yr`,
      band: "unusually high — verify assumptions",
      tone: "neutral",
    };
  }
  const band =
    annualizedReturnPct > 11
      ? "strong"
      : annualizedReturnPct >= 8
        ? "solid"
        : annualizedReturnPct >= 5
          ? "modest"
          : "limited";
  return {
    label: "10-yr return",
    value: `~${Math.round(annualizedReturnPct)}%/yr`,
    band,
    tone: annualizedReturnPct >= 8 ? "good" : annualizedReturnPct >= 0 ? "neutral" : "bad",
  };
}

/** Bands mirror the Deal Score cap-rate breakdown national tiers
 *  (>6.5 strong / 5–6.5 fair / <5 relies on price growth). */
function capRateMetric(capRate: number): LensOutcomeMetric {
  const band =
    capRate > 6.5 ? "strong" : capRate >= 5 ? "fair" : "relies on price growth";
  return {
    label: "Cap rate",
    value: fmtPct1(capRate),
    band,
    tone: capRate > 6.5 ? "good" : capRate >= 0 ? "neutral" : "bad",
  };
}

/** Signed illustrative after-tax cash flow. A positive estimate is not proof
 *  the hold pays for itself because deduction usability is taxpayer-specific. */
function afterTaxCfMetric(afterTaxCF: number): LensOutcomeMetric {
  return {
    label: "After-tax CF",
    value: fmtMoneyPerMo(afterTaxCF),
    band: afterTaxCF >= 0 ? "illustrative estimate ≥ $0" : "illustrative estimate < $0",
    tone: afterTaxCF >= 0 ? "neutral" : "bad",
  };
}

/**
 * Build the lens outcome strip for the active investor lens.
 * Returns null for "balanced" (the default) — no lens, no strip.
 */
export function buildStrategyLensOutcome(
  strategy: DealStrategy,
  m: StrategyLensMetricsInput
): StrategyLensOutcome | null {
  if (strategy === "cash-flow") {
    return {
      headline: "You're a cash-flow investor — monthly income, CoC, and DSCR carry this deal:",
      metrics: [
        cashFlowMetric(m.netCashFlow),
        cocMetric(m.cocReturn, m.cashOnCashApplicable !== false),
        dscrMetric(m.dscr, m.monthlyPayment, m.isOwnerOccupant ?? false),
      ],
    };
  }
  if (strategy === "appreciation") {
    return {
      headline:
        "You're an appreciation investor — long-term total return and yield carry this deal:",
      metrics: [
        tenYearReturnMetric(m.annualizedReturnPct),
        capRateMetric(m.capRate),
        afterTaxCfMetric(m.afterTaxCF),
      ],
    };
  }
  // Balanced = no active lens; the strip stays invisible.
  return null;
}
