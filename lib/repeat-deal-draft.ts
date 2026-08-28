import {
  getDefaultUnitsForPropertyType,
  type InvestmentFormValues,
} from "@/lib/investcalc-schema";

/**
 * Build the editable starting point for "Analyze another like this" and the
 * saved-deal Duplicate action.
 *
 * Reusable financing and underwriting-policy percentages carry forward.
 * Address/listing facts and property-specific dollar quotes do not. The
 * source is never mutated so the saved historical record remains frozen.
 */
export function buildRepeatDealDraft(
  source: InvestmentFormValues,
): Partial<InvestmentFormValues> {
  return {
    ...source,
    address: "",
    purchasePrice: undefined,
    yearBuilt: undefined,
    bedrooms: undefined,
    bathrooms: undefined,
    sqft: undefined,
    monthlyRent: undefined,
    stabilizedMonthlyRent: undefined,
    currentPropertyValue: undefined,
    stabilizedPropertyValue: undefined,
    operatingScenario: "current",
    recurringOtherIncomeMonthly: undefined,
    recurringOtherExpenseMonthly: undefined,
    turnoverReserveMonthly: undefined,
    leasingReserveMonthly: undefined,
    landscapingMonthly: undefined,
    pestControlMonthly: undefined,
    administrativeMonthly: undefined,
    // Unit count and per-unit facts are listing facts too. Keep the selected
    // property model, but return to its blank minimum structure.
    units: getDefaultUnitsForPropertyType(source.propertyType).map((unit) => ({
      ...unit,
      bedrooms: undefined,
      bathrooms: undefined,
      sqft: undefined,
      monthlyRent: undefined,
      stabilizedMonthlyRent: undefined,
    })),

    // STR revenue and setup costs describe the prior property, not the user's
    // reusable acquisition policy.
    avgDailyRate: undefined,
    occupancyPct: undefined,
    strFurnishingCost: undefined,
    rehabBudget: undefined,
    strategyArv: undefined,
    // Timing, refinance terms, selling-cost policy, and acquisition leverage
    // are reusable strategy assumptions—the action explicitly promises the
    // next deal will keep them. Property-specific dollar estimates do not.
    fixFlipCarryMonthly: undefined,
    acquisitionCredits: undefined,
    closingCostsInputMode: "percent",
    closingCostsFixed: undefined,
    originationFee: undefined,
    loanFees: undefined,
    initialReserve: undefined,
    lenderEscrowDeposit: undefined,
    lenderReserveDeposit: undefined,

    // Tax and insurance may have been derived from the prior address even
    // when represented as percentages. Clear both forms so the next property
    // never inherits an address-specific benchmark or quote without review.
    propertyTaxInputMode: "percent",
    propertyTaxPct: undefined,
    propertyTaxAnnual: undefined,
    insuranceInputMode: "percent",
    insurancePct: undefined,
    insuranceMonthly: undefined,
    hoaMonthly: undefined,
    utilitiesMonthly: undefined,

    // A template link and its provenance belong to the source deal. The
    // copied values remain, but the next property must review them directly.
    templateId: undefined,
  };
}
