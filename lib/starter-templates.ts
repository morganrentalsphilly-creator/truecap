/**
 * Prebuilt strategy templates that users can clone into their own
 * editable analysis template. Each one represents the default
 * assumption set a working investor would use as a starting point for
 * that strategy — the values come from talking to operators in each
 * category plus published benchmarks (insurance, MIP, typical mgmt
 * fees, etc.).
 *
 * Shape conforms to AnalysisTemplateInput (lib/analysis-template-schema.ts)
 * — every numeric field must be strictly positive (the schema enforces
 * `gt(0)` for most percent fields), so where a strategy "would" want 0
 * (e.g. self-managed house hack has 0% mgmt fee) we use a token value
 * of 1% that the user can edit down or out from their own copy.
 *
 * Adding a new strategy: append an entry below with the same shape.
 * The starter section on /dashboard/templates renders the array in
 * order. No DB changes required.
 */
import type { AnalysisTemplateInput } from "@/lib/analysis-template-schema";

export type StarterTemplate = {
  /** URL-safe slug — used for analytics and as a stable identifier
   *  even if templateName ever changes. */
  key:
    | "long-term-rental"
    | "house-hack"
    | "fha-owner-occupant"
    | "brrrr"
    | "short-term-rental";
  /** Long-form description shown on the starter card before clone. */
  cardDescription: string;
  /** 1-3 word strategy tag. */
  tag: string;
  /** The full template payload — used as-is when cloning. */
  template: AnalysisTemplateInput;
};

export const STARTER_TEMPLATES: StarterTemplate[] = [
  {
    key: "long-term-rental",
    tag: "Buy & hold",
    cardDescription:
      "Single-family or small multi-family held for cash flow + appreciation. The reference strategy — balanced assumptions across financing, vacancy, mgmt, CapEx.",
    template: {
      templateName: "Starter — Long-term rental",
      templateDescription: "Buy-and-hold starter defaults",
      propertyTaxPct: 1.5,
      insuranceInputMode: "percent",
      insurancePct: 0.5,
      maintenancePct: 8,
      vacancyPct: 5,
      managementPct: 8,
      capexPct: 5,
      closingCostsPct: 3,
      interestRatePct: 6.75,
      downPaymentPct: 20,
      expenseGrowthPct: 2.5,
      rentGrowthPct: 2.5,
      appreciationRatePct: 3,
      sellingCostPct: 6,
      buildingValuePct: 85,
      depreciationYears: 27.5,
      includeInterestDeduction: true,
      taxRatePct: 24,
    },
  },
  {
    key: "house-hack",
    tag: "Owner-occupied",
    cardDescription:
      "2-4 unit owner-occupant — you live in one, rent the rest. FHA-eligible, low down. Self-managed (mgmt fee starts at 1% — edit to 0 from your copy).",
    template: {
      templateName: "Starter — House hack",
      templateDescription: "2-4 unit owner-occupied, self-managed",
      propertyTaxPct: 1.5,
      insuranceInputMode: "percent",
      insurancePct: 0.5,
      maintenancePct: 7,
      vacancyPct: 4,
      managementPct: 1,
      capexPct: 5,
      closingCostsPct: 3,
      interestRatePct: 6.5,
      downPaymentPct: 5,
      expenseGrowthPct: 2.5,
      rentGrowthPct: 2.5,
      appreciationRatePct: 3,
      sellingCostPct: 6,
      buildingValuePct: 85,
      depreciationYears: 27.5,
      includeInterestDeduction: true,
      taxRatePct: 24,
    },
  },
  {
    key: "fha-owner-occupant",
    tag: "Primary residence",
    cardDescription:
      "FHA 3.5% down primary residence. Insurance pct is bumped to model the FHA MIP. Plan to live there at least 1 year before renting out.",
    template: {
      templateName: "Starter — FHA 3.5% owner-occupant",
      templateDescription: "FHA low-down primary residence",
      propertyTaxPct: 1.5,
      insuranceInputMode: "percent",
      // 0.5% baseline + ~0.55% MIP rolled in
      insurancePct: 1.05,
      maintenancePct: 8,
      vacancyPct: 1,
      managementPct: 1,
      capexPct: 5,
      closingCostsPct: 3,
      interestRatePct: 6.5,
      downPaymentPct: 3.5,
      expenseGrowthPct: 2.5,
      rentGrowthPct: 2.5,
      appreciationRatePct: 3,
      sellingCostPct: 6,
      buildingValuePct: 85,
      depreciationYears: 27.5,
      includeInterestDeduction: true,
      taxRatePct: 24,
    },
  },
  {
    key: "brrrr",
    tag: "Capital recycler",
    cardDescription:
      "Buy, Rehab, Rent, Refinance, Repeat. Higher CapEx + maint reserves for the value-add property. Initial rate models hard-money — drop to your refi rate after stabilization.",
    template: {
      templateName: "Starter — BRRRR",
      templateDescription: "Value-add buy/rehab/rent/refi",
      propertyTaxPct: 1.5,
      insuranceInputMode: "percent",
      insurancePct: 0.55,
      maintenancePct: 9,
      vacancyPct: 6,
      managementPct: 8,
      capexPct: 7,
      closingCostsPct: 4,
      // Initial hard-money rate — user re-runs at refi rate after stabilization
      interestRatePct: 9.5,
      downPaymentPct: 15,
      expenseGrowthPct: 2.5,
      rentGrowthPct: 2.5,
      appreciationRatePct: 3,
      sellingCostPct: 6,
      buildingValuePct: 85,
      depreciationYears: 27.5,
      includeInterestDeduction: true,
      taxRatePct: 24,
    },
  },
  {
    key: "short-term-rental",
    tag: "Airbnb / VRBO",
    cardDescription:
      "Short-term rental defaults. High vacancy/'unoccupied' assumption (annualized), STR insurance premium, higher mgmt fees, and 39-year commercial depreciation.",
    template: {
      templateName: "Starter — Short-term rental",
      templateDescription: "Airbnb / VRBO operator defaults",
      propertyTaxPct: 1.5,
      insuranceInputMode: "percent",
      // STR insurance is materially higher — often 2-3x long-term landlord policy
      insurancePct: 1.5,
      maintenancePct: 10,
      // 35% annualized "vacancy" approximates an ~65% occupancy book
      vacancyPct: 35,
      // STR management is typically 15-25% of revenue
      managementPct: 18,
      capexPct: 8,
      closingCostsPct: 3,
      // Non-QM / DSCR loan rates run higher than conforming
      interestRatePct: 7.5,
      downPaymentPct: 25,
      expenseGrowthPct: 3,
      rentGrowthPct: 3,
      appreciationRatePct: 3,
      sellingCostPct: 6,
      buildingValuePct: 80,
      // STRs are typically classified as commercial / non-residential rental
      depreciationYears: 39,
      includeInterestDeduction: true,
      taxRatePct: 24,
    },
  },
];

/** Lookup helper — fetch a single starter by its stable key. */
export function getStarterTemplate(key: StarterTemplate["key"]): StarterTemplate | undefined {
  return STARTER_TEMPLATES.find((s) => s.key === key);
}
