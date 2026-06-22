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
 *   income    → the rentable unit(s): beds + rent (SFR uses bedrooms+monthlyRent,
 *               MF/owner-occupant use the units array)
 *   financing → down payment % / rate / term (ships with smart defaults)
 *   expenses  → operating %s + tax/insurance (defaults + coercion = always runnable)
 *   decision  → the result (verdict / Deal Score / MAO), reachable after a run
 *
 * Kept pure + dependency-light so it's unit-testable and safe to call on
 * every keystroke from the (large) analyzer component.
 */

import { isValidRentalUnit, type UnitValues } from "@/lib/investcalc-schema";

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
  opts: { hasResults: boolean }
): AnalyzerStep[] {
  // Property — address + purchase price. Year/baths/sqft are optional accuracy
  // boosters and don't gate the step.
  const hasAddress = typeof v.address === "string" && v.address.trim().length >= 5;
  const hasPrice = isNum(v.purchasePrice) && v.purchasePrice >= 10000;
  const property: StepStatus =
    hasAddress && hasPrice ? "complete" : hasAddress || hasPrice ? "partial" : "empty";

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
    const hasBeds = isNum(v.bedrooms);
    const hasRent = isNum(v.monthlyRent) && v.monthlyRent > 0;
    income = hasBeds && hasRent ? "complete" : hasBeds || hasRent ? "partial" : "empty";
  }

  // Financing — required down/rate/term ship with smart defaults, so this is
  // "complete" out of the box and only drops to "partial" if a field is cleared.
  const financing: StepStatus =
    isNum(v.downPaymentPct) && isNum(v.interestRate) && isNum(v.loanTermYears)
      ? "complete"
      : "partial";

  // Expenses — operating %s default and coerce to a runnable set (empty → 0),
  // so the deal can always be run on defaults.
  const expenses: StepStatus = "complete";

  const decision: StepStatus = opts.hasResults ? "complete" : "pending";

  return [
    { id: "property", label: "Property", status: property },
    { id: "income", label: "Income", status: income },
    { id: "financing", label: "Financing", status: financing },
    { id: "expenses", label: "Expenses", status: expenses },
    { id: "decision", label: "Decision", status: decision },
  ];
}
