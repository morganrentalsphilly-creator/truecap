import "server-only";

import type { AnalysisResult } from "@/lib/calc-analysis";

/**
 * The complete result-field allowlist for a free public share.
 *
 * This is intentionally a positive projection rather than a list of fields to
 * delete. If AnalysisResult gains a new tax, projection, exit, or other paid
 * field, that field stays server-side until it is deliberately reviewed and
 * added here. Public share pages are capability URLs, but the creator's live
 * plan still controls which analysis surfaces the recipient may receive.
 */
export const PUBLIC_SHARE_CORE_RESULT_FIELDS = [
  "methodologyVersion",
  "analysisDate",
  "operatingScenario",
  "rentBasis",
  "scenarioRentMonthly",
  "recurringOtherIncomeMonthly",
  "recurringOtherIncomeAnnual",
  "recurringOtherExpenseMonthly",
  "recurringOtherExpenseAnnual",
  "turnoverReserveMonthly",
  "leasingReserveMonthly",
  "landscapingMonthly",
  "pestControlMonthly",
  "administrativeMonthly",
  "renovationIncomeLossAnnual",
  "renovationStartMonth",
  "renovationDurationMonths",
  "renovationRentLossPct",
  "currentPropertyValue",
  "stabilizedPropertyValue",
  "financingMode",
  "closingCostsInputMode",
  "acquisitionCredits",
  "loanFees",
  "initialReserve",
  "loanPointsPct",
  "loanPointsAmount",
  "originationFee",
  "lenderEscrowDeposit",
  "lenderReserveDeposit",
  "amortizationTermYears",
  "loanMaturityTermYears",
  "interestOnlyMonths",
  "initialMonthlyLoanPayment",
  "amortizingMonthlyLoanPayment",
  "balloonPayment",
  "balloonMonth",
  "cashRepairs",
  "propertyAgeKnown",
  "unitCount",
  "monthlyRentalIncome",
  "grossScheduledIncomeAnnual",
  "vacancyAllowanceAnnual",
  "effectiveGrossIncomeAnnual",
  "propertyTax",
  "propertyTaxPctEffective",
  "insurance",
  "insuranceInputMode",
  "insurancePctInput",
  "insurancePctEffective",
  "hoa",
  "utilities",
  "maintenance",
  "vacancy",
  "management",
  "capex",
  "maintenancePctInput",
  "capexPctInput",
  "maintenancePctEffective",
  "capexPctEffective",
  "maintenanceAgeAdjusted",
  "capexAgeAdjusted",
  "totalOperatingExpenses",
  "operatingExpensesAnnual",
  "noiAnnual",
  "loanAmount",
  "monthlyPayment",
  "annualDebtService",
  "loanPrincipalAndInterest",
  "pmiMonthly",
  "propertyTaxMonthly",
  "insuranceMonthly",
  "hoaMonthly",
  "totalMonthlyPaymentDebug",
  "netCashFlow",
  "annualCashFlow",
  "cocReturn",
  "capRate",
  "dscr",
  "downPaymentPct",
  "closingCostsPct",
  "downPayment",
  "closingCosts",
  "totalCashRequired",
  "propertyAge",
] as const satisfies readonly (keyof AnalysisResult)[];

export type PublicShareCoreResultField =
  (typeof PUBLIC_SHARE_CORE_RESULT_FIELDS)[number];

export type PublicShareCoreAnalysisResult = Pick<
  AnalysisResult,
  PublicShareCoreResultField
>;

/**
 * The only analysis-result shape allowed to cross into the public client view.
 * The discriminant makes it impossible for a free renderer to accidentally
 * read a paid field without first proving the server granted Pro access.
 */
export type PublicShareAnalysisPayload =
  | {
      access: "core";
      result: PublicShareCoreAnalysisResult;
    }
  | {
      access: "pro";
      result: AnalysisResult;
    };

export function buildPublicShareAnalysisPayload(
  result: AnalysisResult,
  includePaidAnalysis: boolean,
): PublicShareAnalysisPayload {
  if (includePaidAnalysis) {
    return { access: "pro", result };
  }

  // Copy only reviewed fields into a fresh object. Never spread `result` here:
  // an unreviewed future field must remain absent even when it is enumerable.
  const core: Record<string, unknown> = {};
  for (const field of PUBLIC_SHARE_CORE_RESULT_FIELDS) {
    if (Object.prototype.hasOwnProperty.call(result, field)) {
      core[field] = result[field];
    }
  }

  return {
    access: "core",
    result: core as PublicShareCoreAnalysisResult,
  };
}
