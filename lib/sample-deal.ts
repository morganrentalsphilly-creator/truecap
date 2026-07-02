/**
 * THE sample deal — single source of truth.
 *
 * Used by BOTH:
 *   - the homepage hero mock card (components/marketing/marketing-hero.tsx),
 *     which COMPUTES its displayed numbers from these values via
 *     calculateAnalysis + computeDealScore at render time, and
 *   - the "Try a sample deal" button (investcalc-page.tsx), which loads
 *     these values into the form and runs the real analysis.
 *
 * WHY (Jun 2026 mobile audit): the hero previously hard-coded
 * "Strong Buy · Score 84 · +$510" while the actual sample inputs ran
 * through the engine produced "Risky · Score 20 · +$162" — the demo
 * directly contradicted the marketing card on the same property, on a
 * product whose pitch is "stop losing deals to bad math." With the
 * hero computing from this shared constant, the two can never diverge
 * again.
 *
 * The inputs below are tuned so the demo is a genuinely strong deal
 * under the REAL engine (≈$555/mo cash flow, ≈8.6% cap, DSCR ≈1.41,
 * CoC ≈11%): $265k purchase, $3,050 rent, 20% down at 6.6%. If you
 * edit any value, the hero updates itself — but sanity-check that the
 * verdict tier stays Strong/Solid, because this deal IS the first
 * impression of the product.
 */

import type { InvestmentFormValues } from "@/lib/investcalc-schema";

export const SAMPLE_DEAL_VALUES = {
  propertyType: "single-family",
  address: "1700 W Erie Ave, Philadelphia, PA 19140, USA",
  purchasePrice: 265_000,
  yearBuilt: 1942,
  bedrooms: 3,
  bathrooms: 1,
  sqft: 1450,
  monthlyRent: 3_050,
  units: [],
  downPaymentPct: 20,
  interestRate: 6.6,
  loanTermYears: 30,
  closingCostsPct: 3,
  propertyTaxPct: 1.49,
  propertyTaxInputMode: "percent",
  insuranceInputMode: "percent",
  insurancePct: 0.5,
  hoaMonthly: 0,
  utilitiesMonthly: 0,
  maintenancePct: 5,
  vacancyPct: 5,
  mgmtPct: 8,
  capexPct: 5,
  buildingValuePct: 85,
  depreciationYears: 27.5,
  includeInterestDeduction: true,
  taxRatePct: 24,
  rentGrowthPct: 2.5,
  expenseGrowthPct: 2.5,
  appreciationRatePct: 3,
  sellingCostPct: 6,
} as InvestmentFormValues;

/** Short display strings shared by the hero card. */
export const SAMPLE_DEAL_DISPLAY = {
  shortAddress: "1700 W Erie · Philadelphia",
  subtitle: `Single Family · $${SAMPLE_DEAL_VALUES.purchasePrice.toLocaleString("en-US")} · Built ${SAMPLE_DEAL_VALUES.yearBuilt}`,
} as const;
