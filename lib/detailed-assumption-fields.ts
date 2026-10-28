import type { InvestmentFormValues } from "@/lib/investcalc-schema";

/** Fields in the optional detailed editor, which is mounted on first use. */
export const DETAILED_ASSUMPTION_FIELDS = [
  "operatingScenario",
  "stabilizedMonthlyRent",
  "recurringOtherIncomeMonthly",
  "currentPropertyValue",
  "stabilizedPropertyValue",
  "recurringOtherExpenseMonthly",
  "turnoverReserveMonthly",
  "leasingReserveMonthly",
  "landscapingMonthly",
  "pestControlMonthly",
  "administrativeMonthly",
  "loanPointsPct",
  "originationFee",
  "loanFees",
  "interestOnlyMonths",
  "amortizationTermYears",
  "lenderEscrowDeposit",
  "lenderReserveDeposit",
  "initialReserve",
  "acquisitionCredits",
  "renovationStartMonth",
  "renovationDurationMonths",
  "renovationRentLossPct",
  "sellingCostPct",
] as const satisfies readonly (keyof InvestmentFormValues)[];

const detailedFields = new Set<string>(DETAILED_ASSUMPTION_FIELDS);

export function isDetailedAssumptionField(path: string): boolean {
  return detailedFields.has(path) || /^units\.\d+\.stabilizedMonthlyRent$/.test(path);
}
