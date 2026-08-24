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
    | "short-term-rental"
    | "medium-term-rental"
    | "section-8"
    | "small-multifamily"
    | "seller-finance"
    | "subject-to"
    | "hard-money-flip"
    | "wholesaler-mao"
    | "portfolio-refi"
    | "mixed-use"
    | "turnkey-rental";
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
      "FHA 3.5% down primary residence. FHA MIP is modeled as mortgage insurance (~0.55%/yr, for the life of the loan), separate from hazard insurance. Plan to live there at least 1 year before renting out.",
    template: {
      templateName: "Starter — FHA 3.5% owner-occupant",
      templateDescription: "FHA low-down primary residence",
      propertyTaxPct: 1.5,
      insuranceInputMode: "percent",
      // Hazard insurance only — FHA MIP is modeled ONCE via the PMI line below
      // (was previously double-counted: ~0.55% MIP rolled into insurance AND
      // the default 0.8% conventional PMI applied on top of the 3.5%-down loan).
      insurancePct: 0.5,
      // FHA annual MIP ≈ 0.55% of the loan, and with <10% down it runs for the
      // life of the loan (never cancels at 80% LTV).
      pmiAnnualRatePct: 0.55,
      pmiNoCancel: true,
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
      "Short-term rental defaults. Income is modeled directly as nightly rate × occupancy, an STR insurance premium, higher mgmt fees, and 39-year commercial depreciation.",
    template: {
      templateName: "Starter — Short-term rental",
      templateDescription: "Airbnb / VRBO operator defaults",
      propertyTaxPct: 1.5,
      insuranceInputMode: "percent",
      // STR insurance is materially higher — often 2-3x long-term landlord policy
      insurancePct: 1.5,
      maintenancePct: 10,
      // Vacancy is 0 here because the STR income model captures unbooked nights
      // directly via the occupancy input (revenue = ADR × 365 × occupancy / 12).
      // Applying a vacancy haircut on top would double-count empty nights.
      vacancyPct: 0,
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
  {
    key: "medium-term-rental",
    tag: "Furnished MTR",
    cardDescription:
      "Furnished 1-3 month stays (travel nurses, relocations, insurance housing). Higher rent than long-term, far less turnover than Airbnb — mid-range management + a furnishing-driven CapEx bump.",
    template: {
      templateName: "Starter — Medium-term rental",
      templateDescription: "Furnished 30+ day rental defaults",
      propertyTaxPct: 1.5,
      insuranceInputMode: "percent",
      insurancePct: 0.7,
      maintenancePct: 9,
      vacancyPct: 12,
      managementPct: 12,
      capexPct: 7,
      closingCostsPct: 3,
      interestRatePct: 7,
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
    key: "section-8",
    tag: "Voucher",
    cardDescription:
      "HUD Housing Choice Voucher tenants. Near-zero vacancy (rent paid directly by the PHA), standard management, with inspection-driven maintenance.",
    template: {
      templateName: "Starter — Section 8 / voucher",
      templateDescription: "Housing Choice Voucher defaults",
      propertyTaxPct: 1.5,
      insuranceInputMode: "percent",
      insurancePct: 0.5,
      maintenancePct: 10,
      vacancyPct: 2,
      managementPct: 8,
      capexPct: 6,
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
    key: "small-multifamily",
    tag: "5+ units",
    cardDescription:
      "5+ unit apartment building — commercial financing, residential depreciation. Professional management, higher reserves, and commercial loan terms.",
    template: {
      templateName: "Starter — Small multifamily (5+)",
      templateDescription: "5+ unit commercial-financed defaults",
      propertyTaxPct: 1.6,
      insuranceInputMode: "percent",
      insurancePct: 0.6,
      maintenancePct: 9,
      vacancyPct: 7,
      managementPct: 9,
      capexPct: 7,
      closingCostsPct: 4,
      interestRatePct: 7.25,
      downPaymentPct: 25,
      expenseGrowthPct: 2.5,
      rentGrowthPct: 2.5,
      appreciationRatePct: 3,
      sellingCostPct: 5,
      buildingValuePct: 80,
      depreciationYears: 27.5,
      includeInterestDeduction: true,
      taxRatePct: 24,
    },
  },
  {
    key: "seller-finance",
    tag: "Owner carry",
    cardDescription:
      "Seller carries the financing. Lower down + a negotiated rate (set to a typical mid-point — edit to your terms), with minimal bank closing overhead.",
    template: {
      templateName: "Starter — Seller finance",
      templateDescription: "Owner-carry / seller-financed defaults",
      propertyTaxPct: 1.5,
      insuranceInputMode: "percent",
      insurancePct: 0.5,
      maintenancePct: 8,
      vacancyPct: 5,
      managementPct: 8,
      capexPct: 5,
      closingCostsPct: 2,
      interestRatePct: 7,
      downPaymentPct: 10,
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
    key: "subject-to",
    tag: "Sub-to",
    cardDescription:
      "Take title subject to the existing mortgage. Minimal cash in (token down — set your real cash to close) at the seller's inherited, often below-market rate.",
    template: {
      templateName: "Starter — Subject-to",
      templateDescription: "Subject-to / creative finance defaults",
      propertyTaxPct: 1.5,
      insuranceInputMode: "percent",
      insurancePct: 0.5,
      maintenancePct: 8,
      vacancyPct: 5,
      managementPct: 8,
      capexPct: 5,
      closingCostsPct: 1,
      interestRatePct: 4.5,
      downPaymentPct: 1,
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
    key: "hard-money-flip",
    tag: "Fix & flip",
    cardDescription:
      "Short-term flip on hard money — high rate + points, larger down, heavy holding costs during rehab. Re-run at sale; hold/appreciation assumptions don't drive a flip.",
    template: {
      templateName: "Starter — Hard-money flip",
      templateDescription: "Fix-and-flip / hard-money defaults",
      propertyTaxPct: 1.5,
      insuranceInputMode: "percent",
      insurancePct: 0.8,
      maintenancePct: 12,
      vacancyPct: 1,
      managementPct: 1,
      capexPct: 1,
      closingCostsPct: 5,
      interestRatePct: 10.5,
      downPaymentPct: 15,
      expenseGrowthPct: 2.5,
      rentGrowthPct: 2.5,
      appreciationRatePct: 3,
      sellingCostPct: 7,
      buildingValuePct: 85,
      depreciationYears: 27.5,
      includeInterestDeduction: true,
      taxRatePct: 24,
    },
  },
  {
    key: "wholesaler-mao",
    tag: "Wholesale",
    cardDescription:
      "Wholesaling — screen contracts against a target-dependent Offer Ceiling before assigning to an end buyer. Verify buyer demand, costs, condition, and every material assumption before acting.",
    template: {
      templateName: "Starter — Wholesale Offer Ceiling",
      templateDescription: "Wholesale / assignment screening",
      propertyTaxPct: 1.5,
      insuranceInputMode: "percent",
      insurancePct: 0.5,
      maintenancePct: 10,
      vacancyPct: 6,
      managementPct: 8,
      capexPct: 7,
      closingCostsPct: 3,
      interestRatePct: 7,
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
    key: "portfolio-refi",
    tag: "Refinance",
    cardDescription:
      "Refinance / cash-out on a property you own. Lower stabilized rate and reset terms — model the post-refi cash flow before you pull the trigger.",
    template: {
      templateName: "Starter — Portfolio refinance",
      templateDescription: "Refi / cash-out scenario defaults",
      propertyTaxPct: 1.5,
      insuranceInputMode: "percent",
      insurancePct: 0.5,
      maintenancePct: 8,
      vacancyPct: 5,
      managementPct: 8,
      capexPct: 5,
      closingCostsPct: 2,
      interestRatePct: 6.5,
      downPaymentPct: 25,
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
    key: "mixed-use",
    tag: "Mixed-use",
    cardDescription:
      "Ground-floor commercial with residential units above. Commercial financing + 39-year depreciation, with blended vacancy and higher reserves.",
    template: {
      templateName: "Starter — Mixed-use",
      templateDescription: "Commercial + residential blend defaults",
      propertyTaxPct: 1.7,
      insuranceInputMode: "percent",
      insurancePct: 0.8,
      maintenancePct: 9,
      vacancyPct: 8,
      managementPct: 9,
      capexPct: 7,
      closingCostsPct: 4,
      interestRatePct: 7.5,
      downPaymentPct: 30,
      expenseGrowthPct: 2.5,
      rentGrowthPct: 2.5,
      appreciationRatePct: 3,
      sellingCostPct: 5,
      buildingValuePct: 80,
      depreciationYears: 39,
      includeInterestDeduction: true,
      taxRatePct: 24,
    },
  },
  {
    key: "turnkey-rental",
    tag: "Turnkey",
    cardDescription:
      "Fully renovated, tenant-in-place, professionally managed. Lower near-term maintenance + CapEx, a full management fee, and conforming financing.",
    template: {
      templateName: "Starter — Turnkey rental",
      templateDescription: "Renovated, managed turnkey defaults",
      propertyTaxPct: 1.5,
      insuranceInputMode: "percent",
      insurancePct: 0.5,
      maintenancePct: 5,
      vacancyPct: 5,
      managementPct: 10,
      capexPct: 4,
      closingCostsPct: 3,
      interestRatePct: 6.75,
      downPaymentPct: 25,
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
];

/** Lookup helper — fetch a single starter by its stable key. */
export function getStarterTemplate(key: StarterTemplate["key"]): StarterTemplate | undefined {
  return STARTER_TEMPLATES.find((s) => s.key === key);
}
