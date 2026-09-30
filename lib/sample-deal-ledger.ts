/**
 * The sample deal as a ledger: the numbers the homepage hero and its
 * walkthrough print (DESIGN.md, "The ledger as the hero").
 *
 * Every figure here is read from the production engine through
 * calculateSampleDealOutcome(): the "at asking" column is the analysis at the
 * listing price, the "at the Offer Ceiling" column is the solver's own
 * `maxOffer.achieved` result at the ceiling it returns. Nothing is typed by
 * hand and no formula is repeated. The only arithmetic is presentation: monthly
 * figures from the engine's annual ones (/12) and the gap between two engine
 * outputs. lib/__tests__/sample-deal-ledger.test.ts proves the printed rows add
 * up to the engine's own NOI and cash flow, so the page can never show a
 * column that does not foot.
 */

import type { AnalysisResult } from "@/lib/calc-analysis";
import { buildOfferCeilingPresentation } from "@/lib/offer-ceiling";
import { SAMPLE_DEAL_FIXTURE } from "@/lib/sample-deal";
import { calculateSampleDealOutcome } from "@/lib/sample-deal-analysis";

/** One ledger line, at the asking price and at the Offer Ceiling. */
export type LedgerPair = { asking: number; ceiling: number };

export type LedgerLine = {
  label: string;
  /** Signed monthly dollars: income positive, costs negative. */
  value: LedgerPair;
  /** A subtotal or total line: drawn with a rule above it. */
  total?: boolean;
};

export type SampleDealLedger = {
  title: string;
  askingPrice: number;
  offerCeiling: number;
  /** Asking minus the ceiling, in dollars (0 when asking already fits). */
  belowAsking: number;
  cashFlowMonthly: LedgerPair;
  dscr: LedgerPair;
  meetsTargets: { asking: boolean; ceiling: boolean };
  target: { monthlyCashFlow: number | null; dscr: number | null };
  /** How far the asking price misses the cash-flow target, per month. */
  cashFlowShortfall: number | null;
  bindingTarget: string | null;
  nextConstraint: string | null;
  cashToClose: {
    downPaymentPct: number;
    /** Null when the deal leaves it to the engine's default. */
    closingCostsPct: number | null;
    downPayment: LedgerPair;
    closingCosts: LedgerPair;
    total: LedgerPair;
  };
  /** Rent down to cash flow after reserves, per month. */
  monthly: LedgerLine[];
  annual: { noi: LedgerPair; debtService: LedgerPair };
};

const pair = (
  asking: AnalysisResult,
  ceiling: AnalysisResult,
  read: (result: AnalysisResult) => number,
): LedgerPair => ({ asking: read(asking), ceiling: read(ceiling) });

/** Whether an analysis clears every target the sample Buy Box sets. */
function meets(
  result: AnalysisResult,
  target: { monthlyCashFlow?: number; dscr?: number },
): boolean {
  if (
    target.monthlyCashFlow != null &&
    result.netCashFlow < target.monthlyCashFlow
  ) {
    return false;
  }
  if (target.dscr != null && result.dscr < target.dscr) return false;
  return true;
}

export function buildSampleDealLedger(): SampleDealLedger | null {
  const { analysis, maxOffer } = calculateSampleDealOutcome();
  if (!maxOffer) return null;
  const values = SAMPLE_DEAL_FIXTURE.values;
  const target = SAMPLE_DEAL_FIXTURE.maoTarget;
  const atCeiling = maxOffer.achieved;
  const presentation = buildOfferCeilingPresentation({
    values,
    result: maxOffer,
    source: "selected-targets",
  });

  const rows = (read: (result: AnalysisResult) => number) =>
    pair(analysis, atCeiling, read);

  const monthly: LedgerLine[] = [
    { label: "Rent", value: rows((r) => r.monthlyRentalIncome) },
    {
      label: `Vacancy, ${values.vacancyPct}% of rent`,
      value: rows((r) => -r.vacancy),
    },
    {
      label: `Property tax, ${r1(analysis.propertyTaxPctEffective)}% of price`,
      value: rows((r) => -r.propertyTax),
    },
    {
      label: `Insurance, ${r1(analysis.insurancePctEffective)}% of price`,
      value: rows((r) => -r.insurance),
    },
    {
      label: `Maintenance, ${r1(analysis.maintenancePctEffective)}% of rent`,
      value: rows((r) => -r.maintenance),
    },
    {
      label: `Management, ${values.mgmtPct}% of rent`,
      value: rows((r) => -r.management),
    },
  ];
  // Any operating line the sample does not itemize above (HOA, utilities,
  // other costs) still reaches NOI; print it rather than let the column
  // silently fail to foot.
  const itemized = (r: AnalysisResult) =>
    r.monthlyRentalIncome -
    r.vacancy -
    r.propertyTax -
    r.insurance -
    r.maintenance -
    r.management;
  const otherOperating = rows((r) => r.noiAnnual / 12 - itemized(r));
  if (
    Math.abs(otherOperating.asking) >= 0.5 ||
    Math.abs(otherOperating.ceiling) >= 0.5
  ) {
    monthly.push({ label: "Other operating costs", value: otherOperating });
  }
  monthly.push({
    label: "Net operating income",
    value: rows((r) => r.noiAnnual / 12),
    total: true,
  });
  monthly.push({
    label: `Capex reserve, ${r1(analysis.capexPctEffective)}% of rent`,
    value: rows((r) => -r.capex),
  });
  monthly.push({
    label: `Mortgage payment, ${values.interestRate}% over ${values.loanTermYears} years`,
    value: rows((r) => -r.monthlyPayment),
  });
  if (analysis.pmiMonthly > 0 || atCeiling.pmiMonthly > 0) {
    monthly.push({
      label: "Mortgage insurance",
      value: rows((r) => -r.pmiMonthly),
    });
  }
  monthly.push({
    label: "Cash flow after reserves, per month",
    value: rows((r) => r.netCashFlow),
    total: true,
  });

  const cashFlowTarget = target.monthlyCashFlow ?? null;
  return {
    title: SAMPLE_DEAL_FIXTURE.display.shortAddress,
    askingPrice: values.purchasePrice,
    offerCeiling: maxOffer.maxPrice,
    belowAsking: Math.max(0, values.purchasePrice - maxOffer.maxPrice),
    cashFlowMonthly: rows((r) => r.netCashFlow),
    dscr: rows((r) => r.dscr),
    meetsTargets: {
      asking: meets(analysis, target),
      ceiling: meets(atCeiling, target),
    },
    target: { monthlyCashFlow: cashFlowTarget, dscr: target.dscr ?? null },
    cashFlowShortfall:
      cashFlowTarget != null && analysis.netCashFlow < cashFlowTarget
        ? cashFlowTarget - analysis.netCashFlow
        : null,
    bindingTarget:
      presentation.bindingConstraints
        .map((item) => item.criterion)
        .join(" + ") || null,
    nextConstraint: presentation.nextConstraint?.criterion ?? null,
    cashToClose: {
      downPaymentPct: values.downPaymentPct,
      closingCostsPct: values.closingCostsPct ?? null,
      downPayment: rows((r) => r.downPayment),
      closingCosts: rows((r) => r.closingCosts),
      total: rows((r) => r.totalCashRequired),
    },
    monthly,
    annual: {
      noi: rows((r) => r.noiAnnual),
      debtService: rows((r) => r.annualDebtService),
    },
  };
}

/** Percent inputs print without a trailing ".0" (5, not 5.0; 1.49 stays). */
function r1(value: number): string {
  return Number.isInteger(value)
    ? String(value)
    : String(Math.round(value * 100) / 100);
}

/** Whole dollars with a true minus sign for costs, the way a ledger prints. */
export function formatLedgerDollars(value: number): string {
  const rounded = Math.round(value);
  const magnitude = `$${Math.abs(rounded).toLocaleString("en-US")}`;
  return rounded < 0 ? `−${magnitude}` : magnitude;
}
