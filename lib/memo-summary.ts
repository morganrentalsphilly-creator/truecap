/**
 * Decision-memo summary — PURE composition of the production engines.
 *
 * The numbers a memo email (and the L1/T1 "what could break this deal"
 * follow-ups) quote: first-year metrics from calculateAnalysis, the Offer
 * Ceiling from the max-allowable-offer solver, and the one preset downside
 * scenario that costs the deal the most monthly cash flow. No second formula
 * layer (CLAUDE.md §3.4) and no I/O, so it is unit-testable and the email can
 * never quote a figure the analyzer would not show.
 */

import { calculateAnalysis } from "@/lib/calc-analysis";
import type { InvestmentFormValues } from "@/lib/investcalc-schema";
import {
  calculateMaxAllowableOffer,
  type MaoTarget,
} from "@/lib/max-allowable-offer";
import { normalizeMaoTargetForFinancing } from "@/lib/mao-target-editor";
import { DEFAULT_MAO_TARGET, describeMaoTarget } from "@/lib/mao-targets";
import {
  buildSensitivityReport,
  type SensitivityAxis,
} from "@/lib/sensitivity-analysis";
import {
  formatDscr,
  formatRatioPct,
  formatSignedPct,
} from "@/lib/financial-presentation";

export type MemoBreaker = {
  axis: SensitivityAxis;
  /** "Rent", "Vacancy", "Interest rate" — the sensitivity row's own label. */
  label: string;
  /** The applied stress, e.g. "-10%" or "+5pp". */
  deltaLabel: string;
  stressMonthlyCashFlow: number;
  /** Stress minus base monthly cash flow (negative = worse). */
  monthlyCashFlowChange: number;
};

export type MemoSummary = {
  purchasePrice: number;
  monthlyCashFlow: number;
  capRatePct: number;
  /** Null when no acquisition cash is modeled (cash-on-cash undefined). */
  cocReturnPct: number | null;
  /** Null for cash purchases (no debt service). */
  dscr: number | null;
  /** Null when not requested or when no supported price meets the targets. */
  offerCeiling: { maxPrice: number; targetLabel: string } | null;
  breaker: MemoBreaker | null;
};

export const memoMoney = (value: number) =>
  `${value < 0 ? "-" : ""}$${Math.abs(Math.round(value)).toLocaleString("en-US")}`;

/** The preset stress scenario that removes the most monthly cash flow. */
export function findMemoBreaker(values: InvestmentFormValues): MemoBreaker | null {
  const report = buildSensitivityReport(values);
  if (!report) return null;
  let worst: MemoBreaker | null = null;
  for (const row of report) {
    const base = row.scenarios.find((s) => s.name === "Base");
    const stress = row.scenarios.find((s) => s.name === "Stress");
    if (!base || !stress) continue;
    const change = stress.result.netCashFlow - base.result.netCashFlow;
    if (!Number.isFinite(change) || change >= 0) continue;
    if (!worst || change < worst.monthlyCashFlowChange) {
      worst = {
        axis: row.axis,
        label: row.label,
        deltaLabel: stress.deltaLabel,
        stressMonthlyCashFlow: stress.result.netCashFlow,
        monthlyCashFlowChange: change,
      };
    }
  }
  return worst;
}

export function buildMemoSummary(
  values: InvestmentFormValues,
  options: { maoTarget?: MaoTarget | null; includeOfferCeiling: boolean },
): MemoSummary {
  const analysis = calculateAnalysis(values);
  const hasDebtService = analysis.monthlyPayment > 0;

  let offerCeiling: MemoSummary["offerCeiling"] = null;
  if (options.includeOfferCeiling) {
    const target = normalizeMaoTargetForFinancing(
      options.maoTarget ?? DEFAULT_MAO_TARGET,
      { isCashPurchase: !hasDebtService },
    );
    const solved = target ? calculateMaxAllowableOffer(values, target) : null;
    if (target && solved) {
      offerCeiling = {
        maxPrice: solved.maxPrice,
        targetLabel: describeMaoTarget(target),
      };
    }
  }

  return {
    purchasePrice: Number(values.purchasePrice) || 0,
    monthlyCashFlow: analysis.netCashFlow,
    capRatePct: analysis.capRate,
    cocReturnPct: analysis.totalCashRequired > 0 ? analysis.cocReturn : null,
    // A financed deal with negative NOI has a NEGATIVE dscr, so the debt
    // fact — not the sign — decides applicability (CLAUDE.md §3.4).
    dscr: hasDebtService ? analysis.dscr : null,
    offerCeiling,
    breaker: findMemoBreaker(values),
  };
}

/** Label/value rows in the fixed order the memo shows them. */
export function memoMetricLines(summary: MemoSummary): Array<{ label: string; value: string }> {
  const lines = [
    { label: "Monthly cash flow", value: memoMoney(summary.monthlyCashFlow) },
    { label: "Cap rate", value: formatRatioPct(summary.capRatePct) },
    {
      label: "Cash-on-cash",
      value: summary.cocReturnPct == null ? "N/A" : formatSignedPct(summary.cocReturnPct),
    },
    { label: "DSCR", value: formatDscr(summary.dscr, summary.dscr != null) },
  ];
  if (summary.offerCeiling) {
    lines.push({ label: "Offer Ceiling", value: memoMoney(summary.offerCeiling.maxPrice) });
  }
  return lines;
}

/** One sentence naming the preset downside that hurts most, or null. */
export function memoBreakerSentence(summary: MemoSummary): string | null {
  const b = summary.breaker;
  if (!b) return null;
  return `${b.label} is the assumption most likely to break this deal: at ${b.deltaLabel}, modeled cash flow moves to ${memoMoney(b.stressMonthlyCashFlow)}/mo (${memoMoney(b.monthlyCashFlowChange)}).`;
}
