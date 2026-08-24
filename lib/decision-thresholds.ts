/**
 * Unified "What Needs To Be True?" threshold engine.
 *
 * This module does not introduce a second underwriting model. Every boundary
 * is either produced by the canonical inverse solvers or re-run through
 * calculateAnalysis at the exact value returned for display. Unsupported
 * one-variable stories are reported as such instead of being inferred.
 */

import { calculateAnalysis, type AnalysisResult } from "@/lib/calc-analysis";
import type { InvestmentFormValues } from "@/lib/investcalc-schema";
import {
  calculateMaxAllowableOffer,
  meetsTarget,
  solveRequiredInterestRate,
  solveRequiredMonthlyRent,
  type MaoTarget,
} from "@/lib/max-allowable-offer";

export const DECISION_GAP_NORMALIZATION_FORMULA =
  "absolute required change / max(absolute current value, 1) * 100" as const;

export type DecisionThresholdId =
  | "max_purchase_price"
  | "required_monthly_rent"
  | "max_interest_rate"
  | "cash_needed_reduction"
  | "max_rehab_budget"
  | "max_total_recurring_expenses";

export type DecisionThresholdStatus =
  | "already_true"
  | "change_required"
  | "unreachable"
  | "not_applicable";

export type DecisionThresholdUnit = "usd" | "usd_per_month" | "percent";
export type DecisionThresholdDirection = "maximum" | "minimum" | "reduction";

export interface DecisionThreshold {
  id: DecisionThresholdId;
  label: string;
  status: DecisionThresholdStatus;
  direction: DecisionThresholdDirection;
  unit: DecisionThresholdUnit;
  /** The input value in the deal as currently underwritten. */
  currentValue: number | null;
  /** The conservative displayed boundary, or null when no boundary is valid. */
  thresholdValue: number | null;
  /** Absolute one-variable change from currentValue to thresholdValue. */
  requiredChange: number | null;
  /** Percentage used for ranking; see DECISION_GAP_NORMALIZATION_FORMULA. */
  normalizedGapPct: number | null;
  normalizationBasisValue: number | null;
  /** True only when recheckedAnalysis clears the complete MaoTarget. */
  rechecked: boolean;
  recheckedAnalysis: AnalysisResult | null;
  reason: string;
}

export interface CashNeededReductionThreshold extends DecisionThreshold {
  id: "cash_needed_reduction";
  requiredCashReduction: number | null;
  maximumTotalCashRequired: number | null;
  /**
   * Model-level support only: the required reduction fits inside modeled
   * closing costs. Actual lender/program seller-credit limits still apply.
   */
  sellerCreditFramingSupportedByModel: boolean;
  sellerCreditAmount: number | null;
}

export interface RehabBudgetThreshold extends DecisionThreshold {
  id: "max_rehab_budget";
  maximumRehabBudget: number | null;
}

export interface OperatingExpenseThreshold extends DecisionThreshold {
  id: "max_total_recurring_expenses";
  maximumTotalRecurringExpensesMonthly: number | null;
  requiredOpexReductionMonthly: number | null;
  /** CapEx is held at the deal's current reserve percentage for this solve. */
  capexReserveHeldFixedMonthly: number;
}

export type AnyDecisionThreshold =
  | DecisionThreshold
  | CashNeededReductionThreshold
  | RehabBudgetThreshold
  | OperatingExpenseThreshold;

export interface RankedDecisionGap {
  id: DecisionThresholdId;
  normalizedGapPct: number;
  requiredChange: number;
  normalizationBasisValue: number;
  formula: typeof DECISION_GAP_NORMALIZATION_FORMULA;
}

export interface WhatNeedsToBeTrueResult {
  currentAnalysis: AnalysisResult;
  target: MaoTarget;
  targetAlreadyMet: boolean;
  maxPrice: DecisionThreshold;
  requiredRent: DecisionThreshold;
  maxInterestRate: DecisionThreshold;
  cashNeededReduction: CashNeededReductionThreshold;
  maxRehabBudget: RehabBudgetThreshold;
  operatingExpenses: OperatingExpenseThreshold;
  thresholds: AnyDecisionThreshold[];
  /** Only exact, rechecked, one-variable changes participate in this ranking. */
  rankedGaps: RankedDecisionGap[];
  /** The first item in rankedGaps; this is a size comparison, not a feasibility claim. */
  smallestNormalizedGap: RankedDecisionGap | null;
}

export interface DecisionThresholdOptions {
  /** Product schema maximum by default. */
  maxPurchasePrice?: number;
  /** Product schema maximum by default. */
  maxMonthlyRent?: number;
  /** Product schema maximum by default. */
  maxInterestRatePct?: number;
  /** Safety ceiling for the synthetic aggregate-expense search. */
  maxOperatingExpensesMonthly?: number;
}

const DEFAULT_MAX_PURCHASE_PRICE = 100_000_000;
const DEFAULT_MAX_MONTHLY_RENT = 1_000_000;
const DEFAULT_MAX_INTEREST_RATE_PCT = 30;
const DEFAULT_MAX_OPERATING_EXPENSES_MONTHLY = 100_000_000;

function hasAnyTarget(target: MaoTarget): boolean {
  return (
    target.capRate !== undefined ||
    target.cocReturn !== undefined ||
    target.monthlyCashFlow !== undefined ||
    target.dscr !== undefined ||
    target.maxPurchasePrice !== undefined
  );
}

function targetWithoutCoc(target: MaoTarget): MaoTarget {
  const { cocReturn: _ignored, ...rest } = target;
  return rest;
}

function safeCalc(values: InvestmentFormValues): AnalysisResult | null {
  try {
    return calculateAnalysis(values);
  } catch {
    return null;
  }
}

function normalizeGap(requiredChange: number, currentValue: number): number | null {
  if (!Number.isFinite(requiredChange) || requiredChange < 0 || !Number.isFinite(currentValue)) {
    return null;
  }
  return (requiredChange / Math.max(Math.abs(currentValue), 1)) * 100;
}

function commonThreshold(args: {
  id: DecisionThresholdId;
  label: string;
  status: DecisionThresholdStatus;
  direction: DecisionThresholdDirection;
  unit: DecisionThresholdUnit;
  currentValue: number | null;
  thresholdValue: number | null;
  requiredChange?: number | null;
  recheckedAnalysis?: AnalysisResult | null;
  target: MaoTarget;
  reason: string;
}): DecisionThreshold {
  const requiredChange = args.requiredChange ?? null;
  const basis = args.currentValue;
  const rechecked =
    args.recheckedAnalysis != null && meetsTarget(args.recheckedAnalysis, args.target);
  return {
    id: args.id,
    label: args.label,
    status: args.status,
    direction: args.direction,
    unit: args.unit,
    currentValue: args.currentValue,
    thresholdValue: args.thresholdValue,
    requiredChange,
    normalizedGapPct:
      args.status === "change_required" && requiredChange != null && basis != null
        ? normalizeGap(requiredChange, basis)
        : null,
    normalizationBasisValue:
      args.status === "change_required" && requiredChange != null && basis != null
        ? Math.max(Math.abs(basis), 1)
        : null,
    rechecked,
    recheckedAnalysis: args.recheckedAnalysis ?? null,
    reason: args.reason,
  };
}

function unavailableThreshold(args: {
  id: DecisionThresholdId;
  label: string;
  status: "unreachable" | "not_applicable";
  direction: DecisionThresholdDirection;
  unit: DecisionThresholdUnit;
  currentValue: number | null;
  reason: string;
  target: MaoTarget;
}): DecisionThreshold {
  return commonThreshold({ ...args, thresholdValue: null, target: args.target });
}

function solveMaxPrice(
  values: InvestmentFormValues,
  current: AnalysisResult,
  target: MaoTarget,
  targetAlreadyMet: boolean,
  options: DecisionThresholdOptions
): DecisionThreshold {
  const configuredMax = options.maxPurchasePrice ?? DEFAULT_MAX_PURCHASE_PRICE;
  const maxPrice = Math.max(values.purchasePrice, configuredMax);
  const atSearchLimit = safeCalc({ ...values, purchasePrice: maxPrice });

  // If the product's upper supported price still passes, that supported
  // boundary is safer and more exact than presenting the solver's penultimate
  // bisection step as an economic maximum.
  if (atSearchLimit && meetsTarget(atSearchLimit, target)) {
    return commonThreshold({
      id: "max_purchase_price",
      label: "Maximum purchase price within the supported range",
      status: "already_true",
      direction: "maximum",
      unit: "usd",
      currentValue: values.purchasePrice,
      thresholdValue: maxPrice,
      requiredChange: 0,
      recheckedAnalysis: atSearchLimit,
      target,
      reason: "The complete target still passes at the supported Offer Ceiling.",
    });
  }

  const solved = calculateMaxAllowableOffer(values, target, {
    minPrice: 10_000,
    maxPrice,
  });
  if (!solved) {
    return unavailableThreshold({
      id: "max_purchase_price",
      label: "Maximum purchase price",
      status: "unreachable",
      direction: "maximum",
      unit: "usd",
      currentValue: values.purchasePrice,
      reason: "The complete target does not pass even at the solver's $10,000 floor.",
      target,
    });
  }

  const exact = safeCalc({ ...values, purchasePrice: solved.maxPrice });
  if (!exact || !meetsTarget(exact, target)) {
    return unavailableThreshold({
      id: "max_purchase_price",
      label: "Maximum purchase price",
      status: "unreachable",
      direction: "maximum",
      unit: "usd",
      currentValue: values.purchasePrice,
      reason: "The displayed price did not pass its exact underwriting recheck.",
      target,
    });
  }

  const reduction = Math.max(0, values.purchasePrice - solved.maxPrice);
  const changeRequired = !targetAlreadyMet && reduction > 0;
  return commonThreshold({
    id: "max_purchase_price",
    label: "Maximum purchase price",
    status: changeRequired ? "change_required" : "already_true",
    direction: "maximum",
    unit: "usd",
    currentValue: values.purchasePrice,
    thresholdValue: solved.maxPrice,
    requiredChange: changeRequired ? reduction : 0,
    recheckedAnalysis: exact,
    target,
    reason: changeRequired
      ? "Reducing only purchase price to this displayed boundary passes the complete target."
      : "The current purchase price is at or below the rechecked boundary.",
  });
}

function solveRent(
  values: InvestmentFormValues,
  current: AnalysisResult,
  target: MaoTarget,
  targetAlreadyMet: boolean,
  options: DecisionThresholdOptions
): DecisionThreshold {
  const currentRent = Number(values.monthlyRent);
  const isStr =
    values.propertyType === "single-family" &&
    typeof values.avgDailyRate === "number" &&
    values.avgDailyRate > 0;

  if (isStr) {
    return unavailableThreshold({
      id: "required_monthly_rent",
      label: "Required monthly rent",
      status: "not_applicable",
      direction: "minimum",
      unit: "usd_per_month",
      currentValue: current.monthlyRentalIncome,
      reason: "This STR is modeled from ADR and occupancy, so monthly rent is not an active input.",
      target,
    });
  }
  if (values.propertyType !== "single-family" || !Number.isFinite(currentRent)) {
    return unavailableThreshold({
      id: "required_monthly_rent",
      label: "Required monthly rent",
      status: "not_applicable",
      direction: "minimum",
      unit: "usd_per_month",
      currentValue: current.monthlyRentalIncome,
      reason: "Multi-unit income is entered per unit; a single rent threshold would be misleading.",
      target,
    });
  }

  // Probe from $0 so the existing inverse solver returns the actual minimum,
  // even when the current rent already passes.
  const solved = solveRequiredMonthlyRent(
    { ...values, monthlyRent: 0 },
    target,
    { maxRent: options.maxMonthlyRent ?? DEFAULT_MAX_MONTHLY_RENT }
  );
  if (!solved || solved.unreachable) {
    return unavailableThreshold({
      id: "required_monthly_rent",
      label: "Required monthly rent",
      status: "unreachable",
      direction: "minimum",
      unit: "usd_per_month",
      currentValue: currentRent,
      reason: "The complete target does not pass within the supported monthly-rent range.",
      target,
    });
  }

  const exact = safeCalc({ ...values, monthlyRent: solved.value });
  if (!exact || !meetsTarget(exact, target)) {
    return unavailableThreshold({
      id: "required_monthly_rent",
      label: "Required monthly rent",
      status: "unreachable",
      direction: "minimum",
      unit: "usd_per_month",
      currentValue: currentRent,
      reason: "The displayed rent did not pass its exact underwriting recheck.",
      target,
    });
  }

  const increase = Math.max(0, solved.value - currentRent);
  const changeRequired = !targetAlreadyMet && increase > 0;
  return commonThreshold({
    id: "required_monthly_rent",
    label: "Required monthly rent",
    status: changeRequired ? "change_required" : "already_true",
    direction: "minimum",
    unit: "usd_per_month",
    currentValue: currentRent,
    thresholdValue: solved.value,
    requiredChange: changeRequired ? increase : 0,
    recheckedAnalysis: exact,
    target,
    reason: changeRequired
      ? "Increasing only monthly rent to this whole-dollar boundary passes the complete target."
      : "The current monthly rent is at or above the rechecked boundary.",
  });
}

function solveMaxRate(
  values: InvestmentFormValues,
  current: AnalysisResult,
  target: MaoTarget,
  targetAlreadyMet: boolean,
  options: DecisionThresholdOptions
): DecisionThreshold {
  if (current.monthlyPayment <= 0) {
    return unavailableThreshold({
      id: "max_interest_rate",
      label: "Maximum interest rate",
      status: "not_applicable",
      direction: "maximum",
      unit: "percent",
      currentValue: null,
      reason: "This is a cash purchase, so interest rate does not affect the underwriting.",
      target,
    });
  }

  const maxRate = options.maxInterestRatePct ?? DEFAULT_MAX_INTEREST_RATE_PCT;
  // Probe from the supported ceiling so the inverse solver returns the actual
  // maximum rather than short-circuiting at an already-passing current rate.
  const solved = solveRequiredInterestRate(
    { ...values, interestRate: maxRate },
    target,
    { maxRate }
  );
  if (!solved || solved.unreachable) {
    return unavailableThreshold({
      id: "max_interest_rate",
      label: "Maximum interest rate",
      status: "unreachable",
      direction: "maximum",
      unit: "percent",
      currentValue: values.interestRate,
      reason: "The complete target does not pass even at a 0% modeled rate.",
      target,
    });
  }

  const exact = safeCalc({ ...values, interestRate: solved.value });
  if (!exact || !meetsTarget(exact, target)) {
    return unavailableThreshold({
      id: "max_interest_rate",
      label: "Maximum interest rate",
      status: "unreachable",
      direction: "maximum",
      unit: "percent",
      currentValue: values.interestRate,
      reason: "The displayed rate did not pass its exact underwriting recheck.",
      target,
    });
  }

  const reduction = Math.max(0, values.interestRate - solved.value);
  const changeRequired = !targetAlreadyMet && reduction > 0;
  return commonThreshold({
    id: "max_interest_rate",
    label: "Maximum interest rate",
    status: changeRequired ? "change_required" : "already_true",
    direction: "maximum",
    unit: "percent",
    currentValue: values.interestRate,
    thresholdValue: solved.value,
    requiredChange: changeRequired ? reduction : 0,
    recheckedAnalysis: exact,
    target,
    reason: changeRequired
      ? "Reducing only the rate to this 0.01-point boundary passes the complete target."
      : "The current rate is at or below the rechecked boundary.",
  });
}

function applyModeledCashReduction(
  values: InvestmentFormValues,
  current: AnalysisResult,
  reduction: number
): InvestmentFormValues | null {
  if (!Number.isFinite(reduction) || reduction < 0) return null;

  let remaining = reduction;
  // Closing-cost reductions are the only portion that may be described as a
  // seller credit by this model. Reductions beyond that come from explicit
  // one-time rehab/furnishing inputs and therefore remain generic.
  const closingReduction = Math.min(remaining, current.closingCosts);
  remaining -= closingReduction;
  const closingCostsAfter = Math.max(0, current.closingCosts - closingReduction);

  const currentRehab = Math.max(0, Number(values.rehabBudget) || 0);
  const rehabReduction = Math.min(remaining, currentRehab);
  remaining -= rehabReduction;

  const currentFurnishing = Math.max(0, Number(values.strFurnishingCost) || 0);
  const furnishingReduction = Math.min(remaining, currentFurnishing);
  remaining -= furnishingReduction;

  if (remaining > 1e-7) return null;
  return {
    ...values,
    closingCostsPct:
      values.purchasePrice > 0 ? (closingCostsAfter / values.purchasePrice) * 100 : 0,
    rehabBudget: currentRehab - rehabReduction,
    strFurnishingCost: currentFurnishing - furnishingReduction,
  };
}

function solveCashNeededReduction(
  values: InvestmentFormValues,
  current: AnalysisResult,
  target: MaoTarget,
  targetAlreadyMet: boolean
): CashNeededReductionThreshold {
  const base = {
    id: "cash_needed_reduction" as const,
    label: "Required reduction in modeled cash needed",
    direction: "reduction" as const,
    unit: "usd" as const,
  };

  if (targetAlreadyMet) {
    const common = commonThreshold({
      ...base,
      status: "already_true",
      currentValue: current.totalCashRequired,
      thresholdValue: current.totalCashRequired,
      requiredChange: 0,
      recheckedAnalysis: current,
      target,
      reason: "The complete target already passes; no cash-needed reduction is required.",
    });
    return {
      ...common,
      id: "cash_needed_reduction",
      requiredCashReduction: 0,
      maximumTotalCashRequired: current.totalCashRequired,
      sellerCreditFramingSupportedByModel: false,
      sellerCreditAmount: null,
    };
  }

  if (target.cocReturn === undefined) {
    const common = unavailableThreshold({
      ...base,
      status: "not_applicable",
      currentValue: current.totalCashRequired,
      reason: "Cash needed changes cash-on-cash return only, and no cash-on-cash target is active.",
      target,
    });
    return {
      ...common,
      id: "cash_needed_reduction",
      requiredCashReduction: null,
      maximumTotalCashRequired: null,
      sellerCreditFramingSupportedByModel: false,
      sellerCreditAmount: null,
    };
  }

  if (!meetsTarget(current, targetWithoutCoc(target))) {
    const common = unavailableThreshold({
      ...base,
      status: "unreachable",
      currentValue: current.totalCashRequired,
      reason: "Reducing cash needed cannot repair another active target that also fails.",
      target,
    });
    return {
      ...common,
      id: "cash_needed_reduction",
      requiredCashReduction: null,
      maximumTotalCashRequired: null,
      sellerCreditFramingSupportedByModel: false,
      sellerCreditAmount: null,
    };
  }

  if (target.cocReturn <= 0 || current.annualCashFlow <= 0) {
    const common = unavailableThreshold({
      ...base,
      status: "unreachable",
      currentValue: current.totalCashRequired,
      reason: "Reducing the cash denominator cannot clear this target while annual cash flow is non-positive.",
      target,
    });
    return {
      ...common,
      id: "cash_needed_reduction",
      requiredCashReduction: null,
      maximumTotalCashRequired: null,
      sellerCreditFramingSupportedByModel: false,
      sellerCreditAmount: null,
    };
  }

  const mathematicalMaxCash = current.annualCashFlow / (target.cocReturn / 100);
  const rawReduction = current.totalCashRequired - mathematicalMaxCash;
  if (!Number.isFinite(rawReduction) || rawReduction <= 0) {
    const common = unavailableThreshold({
      ...base,
      status: "unreachable",
      currentValue: current.totalCashRequired,
      reason: "No positive one-time cash reduction reconciles the current result with the target.",
      target,
    });
    return {
      ...common,
      id: "cash_needed_reduction",
      requiredCashReduction: null,
      maximumTotalCashRequired: null,
      sellerCreditFramingSupportedByModel: false,
      sellerCreditAmount: null,
    };
  }

  // A minimum reduction rounds up. Recheck and add at most a few extra dollars
  // to absorb closing-cost rounding at the displayed whole-dollar boundary.
  let displayedReduction = Math.ceil(rawReduction);
  let adjustedValues = applyModeledCashReduction(values, current, displayedReduction);
  let exact = adjustedValues ? safeCalc(adjustedValues) : null;
  for (
    let i = 0;
    i < 5 && adjustedValues && exact && !meetsTarget(exact, target);
    i += 1
  ) {
    displayedReduction += 1;
    adjustedValues = applyModeledCashReduction(values, current, displayedReduction);
    exact = adjustedValues ? safeCalc(adjustedValues) : null;
  }

  if (!adjustedValues || !exact || !meetsTarget(exact, target)) {
    const common = unavailableThreshold({
      ...base,
      status: "unreachable",
      currentValue: current.totalCashRequired,
      reason:
        "The required reduction exceeds modeled closing costs, rehab, and furnishing outlays that can be reduced without changing financing.",
      target,
    });
    return {
      ...common,
      id: "cash_needed_reduction",
      requiredCashReduction: displayedReduction,
      maximumTotalCashRequired: null,
      sellerCreditFramingSupportedByModel: false,
      sellerCreditAmount: null,
    };
  }

  const sellerCreditSupported = displayedReduction <= current.closingCosts;
  const common = commonThreshold({
    ...base,
    status: "change_required",
    currentValue: current.totalCashRequired,
    thresholdValue: exact.totalCashRequired,
    requiredChange: displayedReduction,
    recheckedAnalysis: exact,
    target,
    reason: sellerCreditSupported
      ? "The reduction fits within modeled closing costs; lender and loan-program credit limits still require verification."
      : "The reduction is rechecked only as a mix of modeled one-time cost reductions, not as a seller credit.",
  });
  return {
    ...common,
    id: "cash_needed_reduction",
    requiredCashReduction: displayedReduction,
    maximumTotalCashRequired: exact.totalCashRequired,
    sellerCreditFramingSupportedByModel: sellerCreditSupported,
    sellerCreditAmount: sellerCreditSupported ? displayedReduction : null,
  };
}

function solveMaxRehabBudget(
  values: InvestmentFormValues,
  current: AnalysisResult,
  target: MaoTarget,
  targetAlreadyMet: boolean
): RehabBudgetThreshold {
  const currentRehab = Math.max(0, Number(values.rehabBudget) || 0);
  const base = {
    id: "max_rehab_budget" as const,
    label: "Maximum rehab budget",
    direction: "maximum" as const,
    unit: "usd" as const,
  };

  const unavailable = (
    status: "unreachable" | "not_applicable",
    reason: string
  ): RehabBudgetThreshold => ({
    ...unavailableThreshold({
      ...base,
      status,
      currentValue: currentRehab,
      reason,
      target,
    }),
    id: "max_rehab_budget",
    maximumRehabBudget: null,
  });

  if (target.cocReturn === undefined) {
    return unavailable(
      "not_applicable",
      "Rehab is modeled as a one-time cash outlay and no cash-on-cash target is active."
    );
  }
  if (target.cocReturn <= 0 || current.annualCashFlow <= 0) {
    return unavailable(
      "unreachable",
      "A positive maximum rehab budget requires positive annual cash flow and a positive cash-on-cash target."
    );
  }
  if (!meetsTarget(current, targetWithoutCoc(target))) {
    return unavailable(
      "unreachable",
      "Changing rehab cannot repair another active target because rehab only changes cash invested."
    );
  }

  const withoutRehab = safeCalc({ ...values, rehabBudget: 0 });
  if (!withoutRehab || !meetsTarget(withoutRehab, target)) {
    return unavailable(
      "unreachable",
      "The complete target does not pass even with the rehab budget set to $0."
    );
  }

  const maxTotalCash = current.annualCashFlow / (target.cocReturn / 100);
  const otherCash = withoutRehab.totalCashRequired;
  const rawMaximum = maxTotalCash - otherCash;
  if (!Number.isFinite(rawMaximum) || rawMaximum < 0) {
    return unavailable("unreachable", "No non-negative rehab budget clears the complete target.");
  }

  // A maximum rounds down. Recheck the displayed dollar and walk down a few
  // dollars if floating-point equality lands just over the target.
  let displayedMaximum = Math.floor(rawMaximum);
  let exact = safeCalc({ ...values, rehabBudget: displayedMaximum });
  for (let i = 0; i < 5 && exact && !meetsTarget(exact, target); i += 1) {
    displayedMaximum -= 1;
    exact = safeCalc({ ...values, rehabBudget: displayedMaximum });
  }
  if (!exact || displayedMaximum < 0 || !meetsTarget(exact, target)) {
    return unavailable("unreachable", "The displayed rehab boundary failed its exact recheck.");
  }

  const reduction = Math.max(0, currentRehab - displayedMaximum);
  const changeRequired = !targetAlreadyMet && reduction > 0;
  const common = commonThreshold({
    ...base,
    status: changeRequired ? "change_required" : "already_true",
    currentValue: currentRehab,
    thresholdValue: displayedMaximum,
    requiredChange: changeRequired ? reduction : 0,
    recheckedAnalysis: exact,
    target,
    reason: changeRequired
      ? "Reducing only rehab to this whole-dollar boundary passes the complete target."
      : "The current rehab budget is at or below the rechecked boundary.",
  });
  return { ...common, id: "max_rehab_budget", maximumRehabBudget: displayedMaximum };
}

/**
 * Represent an aggregate non-CapEx operating-expense budget without implying
 * that one real category is utilities. All non-CapEx categories enter NOI and
 * cash flow dollar-for-dollar in the canonical engine, so a synthetic utility
 * bucket lets us recheck the exact aggregate boundary while keeping the
 * current CapEx reserve fixed.
 */
function withNonCapexExpenseBudget(
  values: InvestmentFormValues,
  budgetMonthly: number
): InvestmentFormValues {
  return {
    ...values,
    propertyTaxInputMode: "annual",
    propertyTaxAnnual: 0,
    insuranceInputMode: "monthly",
    insuranceMonthly: 0,
    hoaMonthly: 0,
    utilitiesMonthly: budgetMonthly,
    maintenancePct: 0,
    vacancyPct: 0,
    mgmtPct: 0,
  };
}

function solveOperatingExpenses(
  values: InvestmentFormValues,
  current: AnalysisResult,
  target: MaoTarget,
  targetAlreadyMet: boolean,
  options: DecisionThresholdOptions
): OperatingExpenseThreshold {
  const base = {
    id: "max_total_recurring_expenses" as const,
    label: "Maximum modeled recurring expenses per month",
    direction: "maximum" as const,
    unit: "usd_per_month" as const,
  };
  const unavailable = (
    status: "unreachable" | "not_applicable",
    reason: string
  ): OperatingExpenseThreshold => ({
    ...unavailableThreshold({
      ...base,
      status,
      currentValue: current.totalOperatingExpenses,
      reason,
      target,
    }),
    id: "max_total_recurring_expenses",
    maximumTotalRecurringExpensesMonthly: null,
    requiredOpexReductionMonthly: null,
    capexReserveHeldFixedMonthly: current.capex,
  });

  const hasExpenseSensitiveTarget =
    target.capRate !== undefined ||
    target.cocReturn !== undefined ||
    target.monthlyCashFlow !== undefined ||
    (target.dscr !== undefined && current.monthlyPayment > 0);
  if (!hasExpenseSensitiveTarget) {
    return unavailable(
      "not_applicable",
      "No active target responds to recurring expenses (cash-purchase DSCR is not applicable)."
    );
  }

  const zeroNonCapex = safeCalc(withNonCapexExpenseBudget(values, 0));
  if (!zeroNonCapex || !meetsTarget(zeroNonCapex, target)) {
    return unavailable(
      "unreachable",
      "The complete target still fails with non-CapEx recurring expenses at $0 and the current CapEx reserve held fixed."
    );
  }

  const searchLimit =
    options.maxOperatingExpensesMonthly ?? DEFAULT_MAX_OPERATING_EXPENSES_MONTHLY;
  let lo = 0;
  let hi = Math.max(
    1,
    Math.ceil(current.totalOperatingExpenses - current.capex),
    Math.ceil(current.monthlyRentalIncome * 2)
  );
  hi = Math.min(hi, searchLimit);

  let highResult = safeCalc(withNonCapexExpenseBudget(values, hi));
  while (highResult && meetsTarget(highResult, target) && hi < searchLimit) {
    lo = hi;
    hi = Math.min(searchLimit, hi * 2);
    highResult = safeCalc(withNonCapexExpenseBudget(values, hi));
  }

  if (highResult && meetsTarget(highResult, target) && hi === searchLimit) {
    return unavailable(
      "not_applicable",
      "No finite recurring-expense boundary was found inside the configured safety range."
    );
  }
  if (!highResult) {
    return unavailable("unreachable", "The aggregate-expense search could not be rechecked.");
  }

  // Whole-dollar maximum: find the largest passing synthetic budget.
  let left = lo;
  let right = hi - 1;
  let bestResult = safeCalc(withNonCapexExpenseBudget(values, lo)) ?? zeroNonCapex;
  while (left <= right) {
    const mid = Math.floor((left + right) / 2);
    const result = safeCalc(withNonCapexExpenseBudget(values, mid));
    if (result && meetsTarget(result, target)) {
      bestResult = result;
      left = mid + 1;
    } else {
      right = mid - 1;
    }
  }

  if (!meetsTarget(bestResult, target)) {
    return unavailable("unreachable", "The displayed recurring-expense boundary failed its exact recheck.");
  }

  const maximumTotal = bestResult.totalOperatingExpenses;
  const reduction = Math.max(0, current.totalOperatingExpenses - maximumTotal);
  const changeRequired = !targetAlreadyMet && reduction > 0;
  const common = commonThreshold({
    ...base,
    status: changeRequired ? "change_required" : "already_true",
    currentValue: current.totalOperatingExpenses,
    thresholdValue: maximumTotal,
    requiredChange: changeRequired ? reduction : 0,
    recheckedAnalysis: bestResult,
    target,
    reason: changeRequired
      ? "Reducing aggregate non-CapEx expenses to this boundary passes; the current CapEx reserve is held fixed."
      : "Current recurring expenses are at or below the rechecked aggregate boundary, with CapEx held fixed.",
  });
  return {
    ...common,
    id: "max_total_recurring_expenses",
    maximumTotalRecurringExpensesMonthly: maximumTotal,
    requiredOpexReductionMonthly: changeRequired ? reduction : 0,
    capexReserveHeldFixedMonthly: current.capex,
  };
}

function rankThresholdGaps(thresholds: AnyDecisionThreshold[]): RankedDecisionGap[] {
  return thresholds
    .filter(
      (threshold): threshold is AnyDecisionThreshold & {
        normalizedGapPct: number;
        requiredChange: number;
        normalizationBasisValue: number;
      } =>
        threshold.status === "change_required" &&
        threshold.rechecked &&
        threshold.normalizedGapPct != null &&
        threshold.requiredChange != null &&
        threshold.normalizationBasisValue != null
    )
    .map((threshold) => ({
      id: threshold.id,
      normalizedGapPct: threshold.normalizedGapPct,
      requiredChange: threshold.requiredChange,
      normalizationBasisValue: threshold.normalizationBasisValue,
      formula: DECISION_GAP_NORMALIZATION_FORMULA,
    }))
    .sort((a, b) => a.normalizedGapPct - b.normalizedGapPct);
}

/**
 * Build every one-variable decision boundary against one complete target.
 * Returns null only when the canonical analysis itself cannot run.
 */
export function buildWhatNeedsToBeTrue(
  values: InvestmentFormValues,
  target: MaoTarget,
  options: DecisionThresholdOptions = {}
): WhatNeedsToBeTrueResult | null {
  const current = safeCalc(values);
  if (!current) return null;

  const targetIsEmpty = !hasAnyTarget(target);
  const targetAlreadyMet = !targetIsEmpty && meetsTarget(current, target);
  if (targetIsEmpty) {
    const n = (args: {
      id: DecisionThresholdId;
      label: string;
      direction: DecisionThresholdDirection;
      unit: DecisionThresholdUnit;
      currentValue: number | null;
    }) =>
      unavailableThreshold({
        ...args,
        status: "not_applicable",
        reason: "No decision target was provided.",
        target,
      });
    const maxPrice = n({
      id: "max_purchase_price",
      label: "Maximum purchase price",
      direction: "maximum",
      unit: "usd",
      currentValue: values.purchasePrice,
    });
    const requiredRent = n({
      id: "required_monthly_rent",
      label: "Required monthly rent",
      direction: "minimum",
      unit: "usd_per_month",
      currentValue: current.monthlyRentalIncome,
    });
    const maxInterestRate = n({
      id: "max_interest_rate",
      label: "Maximum interest rate",
      direction: "maximum",
      unit: "percent",
      currentValue: current.monthlyPayment > 0 ? values.interestRate : null,
    });
    const cashBase = n({
      id: "cash_needed_reduction",
      label: "Required reduction in modeled cash needed",
      direction: "reduction",
      unit: "usd",
      currentValue: current.totalCashRequired,
    });
    const cashNeededReduction: CashNeededReductionThreshold = {
      ...cashBase,
      id: "cash_needed_reduction",
      requiredCashReduction: null,
      maximumTotalCashRequired: null,
      sellerCreditFramingSupportedByModel: false,
      sellerCreditAmount: null,
    };
    const rehabBase = n({
      id: "max_rehab_budget",
      label: "Maximum rehab budget",
      direction: "maximum",
      unit: "usd",
      currentValue: Math.max(0, Number(values.rehabBudget) || 0),
    });
    const maxRehabBudget: RehabBudgetThreshold = {
      ...rehabBase,
      id: "max_rehab_budget",
      maximumRehabBudget: null,
    };
    const opexBase = n({
      id: "max_total_recurring_expenses",
      label: "Maximum modeled recurring expenses per month",
      direction: "maximum",
      unit: "usd_per_month",
      currentValue: current.totalOperatingExpenses,
    });
    const operatingExpenses: OperatingExpenseThreshold = {
      ...opexBase,
      id: "max_total_recurring_expenses",
      maximumTotalRecurringExpensesMonthly: null,
      requiredOpexReductionMonthly: null,
      capexReserveHeldFixedMonthly: current.capex,
    };
    const thresholds: AnyDecisionThreshold[] = [
      maxPrice,
      requiredRent,
      maxInterestRate,
      cashNeededReduction,
      maxRehabBudget,
      operatingExpenses,
    ];
    return {
      currentAnalysis: current,
      target,
      targetAlreadyMet: false,
      maxPrice,
      requiredRent,
      maxInterestRate,
      cashNeededReduction,
      maxRehabBudget,
      operatingExpenses,
      thresholds,
      rankedGaps: [],
      smallestNormalizedGap: null,
    };
  }

  const maxPrice = solveMaxPrice(values, current, target, targetAlreadyMet, options);
  const requiredRent = solveRent(values, current, target, targetAlreadyMet, options);
  const maxInterestRate = solveMaxRate(values, current, target, targetAlreadyMet, options);
  const cashNeededReduction = solveCashNeededReduction(
    values,
    current,
    target,
    targetAlreadyMet
  );
  const maxRehabBudget = solveMaxRehabBudget(
    values,
    current,
    target,
    targetAlreadyMet
  );
  const operatingExpenses = solveOperatingExpenses(
    values,
    current,
    target,
    targetAlreadyMet,
    options
  );
  const thresholds: AnyDecisionThreshold[] = [
    maxPrice,
    requiredRent,
    maxInterestRate,
    cashNeededReduction,
    maxRehabBudget,
    operatingExpenses,
  ];
  const rankedGaps = rankThresholdGaps(thresholds);

  return {
    currentAnalysis: current,
    target,
    targetAlreadyMet,
    maxPrice,
    requiredRent,
    maxInterestRate,
    cashNeededReduction,
    maxRehabBudget,
    operatingExpenses,
    thresholds,
    rankedGaps,
    smallestNormalizedGap: rankedGaps[0] ?? null,
  };
}

/** Alias for consumers that prefer calculator naming. */
export const calculateDecisionThresholds = buildWhatNeedsToBeTrue;
