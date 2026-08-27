/**
 * Pure step-status logic for the analyzer's guided step rail (AN-1).
 *
 * The rail is an ADDITIVE navigation/orientation layer over the existing
 * single-scroll form — it does not change the form, its validation, the
 * manual "Run analysis" flow, or the localStorage draft. It just tells the
 * user where they are, what's done, and lets them jump between sections.
 *
 * Steps map to the form's real sections:
 *   property  → property type + address + purchase price
 *   income    → the rentable unit(s): rent (bedrooms are an optional fact,
 *               MF/owner-occupant use the units array)
 *   financing → down payment % / rate / term (ships with smart defaults)
 *   expenses  → the four required operating percentages
 *   decision  → the result, with target readiness distinguished when supplied
 *
 * Kept pure + dependency-light so it's unit-testable and safe to call on
 * every keystroke from the (large) analyzer component.
 */

import {
  MAX_MONTHLY_RENT,
  MAX_PURCHASE_PRICE,
  MIN_PURCHASE_PRICE,
  isValidRentalUnit,
  type UnitValues,
} from "@/lib/investcalc-schema";

export type AnalyzerStepId =
  | "property"
  | "income"
  | "financing"
  | "expenses"
  | "decision";

/** complete = ready, partial = some inputs, empty = nothing yet, pending = awaiting a run (decision). */
export type StepStatus = "empty" | "partial" | "complete" | "pending";

export interface AnalyzerStep {
  id: AnalyzerStepId;
  label: string;
  status: StepStatus;
}

/** Loose subset of the form values the rail reads (RHF fields may be undefined). */
export interface AnalyzerStepInput {
  propertyType?: "single-family" | "multi-family" | "owner-occupant";
  address?: string;
  purchasePrice?: number;
  bedrooms?: number;
  monthlyRent?: number;
  units?: (UnitValues | undefined)[];
  downPaymentPct?: number;
  interestRate?: number;
  loanTermYears?: number;
  maintenancePct?: number;
  vacancyPct?: number;
  mgmtPct?: number;
  capexPct?: number;
}

export interface AnalyzerStepOptions {
  hasResults: boolean;
  /**
   * Whether the result has adopted decision criteria for an Offer Ceiling.
   * Omit when the caller has no target concept; `false` keeps Decision in
   * progress even though the base operating analysis exists.
   */
  hasDecisionCriteria?: boolean;
}

const isNum = (n: unknown): n is number =>
  typeof n === "number" && Number.isFinite(n);

export const ANALYZER_STEP_IDS: AnalyzerStepId[] = [
  "property",
  "income",
  "financing",
  "expenses",
  "decision",
];

export function isAnalyzerStepId(value: string): value is AnalyzerStepId {
  return (ANALYZER_STEP_IDS as string[]).includes(value);
}

export function computeAnalyzerSteps(
  v: AnalyzerStepInput,
  opts: AnalyzerStepOptions
): AnalyzerStep[] {
  // Property — address + purchase price. Year/baths/sqft are optional accuracy
  // boosters and don't gate the step.
  const addressLength = typeof v.address === "string" ? v.address.trim().length : 0;
  const hasAddress = addressLength >= 5 && addressLength <= 200;
  const hasPrice =
    isNum(v.purchasePrice) &&
    v.purchasePrice >= MIN_PURCHASE_PRICE &&
    v.purchasePrice <= MAX_PURCHASE_PRICE;
  const hasAnyAddress = addressLength > 0;
  const hasAnyPrice = isNum(v.purchasePrice);
  const property: StepStatus =
    hasAddress && hasPrice
      ? "complete"
      : hasAnyAddress || hasAnyPrice
        ? "partial"
        : "empty";

  // Income — the rentable unit(s).
  let income: StepStatus;
  if (v.propertyType === "multi-family" || v.propertyType === "owner-occupant") {
    const units = (v.units ?? []).filter((u): u is UnitValues => Boolean(u));
    const rentals = units.filter(
      (u) => !(v.propertyType === "owner-occupant" && u.isOwnerOccupied)
    );
    const allComplete = rentals.length > 0 && rentals.every((u) => isValidRentalUnit(u));
    const anyEntry = units.some((u) => isNum(u.monthlyRent) || isNum(u.bedrooms));
    income = allComplete ? "complete" : anyEntry ? "partial" : "empty";
  } else {
    const bedrooms = v.bedrooms;
    const monthlyRent = v.monthlyRent;
    const hasBeds = isNum(bedrooms);
    const bedsAreValid = !hasBeds || (bedrooms >= 0 && bedrooms <= 20);
    const hasRent = isNum(monthlyRent);
    const rentIsValid =
      hasRent && monthlyRent > 0 && monthlyRent <= MAX_MONTHLY_RENT;
    income = rentIsValid && bedsAreValid
      ? "complete"
      : hasBeds || hasRent
        ? "partial"
        : "empty";
  }

  // Financing — mirror the schema ranges instead of treating any three finite
  // numbers (including impossible rates/terms) as complete.
  const financingValues = [
    v.downPaymentPct,
    v.interestRate,
    v.loanTermYears,
  ];
  const hasAnyFinancing = financingValues.some(isNum);
  const financingIsValid =
    isNum(v.downPaymentPct) &&
    v.downPaymentPct >= 0 &&
    v.downPaymentPct <= 100 &&
    isNum(v.interestRate) &&
    v.interestRate >= 0 &&
    v.interestRate <= 30 &&
    isNum(v.loanTermYears) &&
    Number.isInteger(v.loanTermYears) &&
    v.loanTermYears >= 1 &&
    v.loanTermYears <= 50;
  const financing: StepStatus = financingIsValid
    ? "complete"
    : hasAnyFinancing
      ? "partial"
      : "empty";

  // Expenses — these four percentages are required by the schema. Explicit 0
  // is valid; a cleared or out-of-range value is not complete.
  const expenseValues = [
    v.maintenancePct,
    v.vacancyPct,
    v.mgmtPct,
    v.capexPct,
  ];
  const hasAnyExpense = expenseValues.some(isNum);
  const expensesAreValid = expenseValues.every(
    (value) => isNum(value) && value >= 0 && value <= 50,
  );
  const expenses: StepStatus = expensesAreValid
    ? "complete"
    : hasAnyExpense
      ? "partial"
      : "empty";

  const decision: StepStatus = !opts.hasResults
    ? "pending"
    : opts.hasDecisionCriteria === false
      ? "partial"
      : "complete";

  return [
    { id: "property", label: "Property", status: property },
    { id: "income", label: "Income", status: income },
    { id: "financing", label: "Financing", status: financing },
    { id: "expenses", label: "Expenses", status: expenses },
    { id: "decision", label: "Decision", status: decision },
  ];
}
