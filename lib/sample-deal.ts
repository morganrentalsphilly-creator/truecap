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
 * The inputs below are synthetic and run through the REAL engine at ≈$554/mo cash flow,
 * ≈9.33% cap rate, and ≈1.52 DSCR: $265k purchase, $3,050 rent, 20% down
 * at 6.6%. The $265k asking price intentionally sits above the $236k price
 * ceiling produced by the visible $750/mo cash-flow + 1.25 DSCR targets, so
 * the first experience demonstrates both positive base economics and a miss
 * against stricter selected rules. The address is intentionally a non-property
 * label; never replace it with a customer or private-property address. If any
 * input changes, update the pinned regression snapshot and verify every sample
 * surface together.
 */

import type { InvestmentFormValues } from "@/lib/investcalc-schema";
import type { MaoTarget } from "@/lib/max-allowable-offer";

/** The product lens and exact acquisition criteria demonstrated by the sample. */
export const SAMPLE_DEAL_STRATEGY_KEY = "buy-hold" as const;
export const SAMPLE_DEAL_FIXTURE_VERSION = "synthetic-rental-v2" as const;
/** A synthetic fixture is historical test data, not a live property lookup.
 * Pinning its as-of date keeps every preview and opened-demo surface identical
 * after the calendar year changes. */
export const SAMPLE_DEAL_ANALYSIS_DATE = "2026-08-25" as const;
export const SAMPLE_DEAL_MAO_TARGET: MaoTarget = {
  monthlyCashFlow: 750,
  dscr: 1.25,
};
export const SAMPLE_DEAL_TARGET_PROFILE = {
  id: "truecap-synthetic-sample-target",
  name: "Synthetic sample targets",
  version: "1.0",
  source: "selected-targets",
} as const;

export const SAMPLE_DEAL_VALUES = {
  analysisDate: SAMPLE_DEAL_ANALYSIS_DATE,
  propertyType: "single-family",
  address: "TrueCap Synthetic Sample, Philadelphia, PA 19140, USA",
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
  shortAddress: "Synthetic sample · Philadelphia",
  subtitle: `Single Family · $${SAMPLE_DEAL_VALUES.purchasePrice.toLocaleString("en-US")} · Built ${SAMPLE_DEAL_VALUES.yearBuilt}`,
} as const;

/**
 * Complete sample contract. Keep the legacy named exports above for existing
 * callers, but new sample surfaces should consume this object so inputs,
 * strategy, and target criteria cannot drift independently.
 */
export const SAMPLE_DEAL_FIXTURE = {
  fixtureVersion: SAMPLE_DEAL_FIXTURE_VERSION,
  synthetic: true,
  values: SAMPLE_DEAL_VALUES,
  strategyKey: SAMPLE_DEAL_STRATEGY_KEY,
  maoTarget: SAMPLE_DEAL_MAO_TARGET,
  targetProfile: SAMPLE_DEAL_TARGET_PROFILE,
  display: SAMPLE_DEAL_DISPLAY,
} as const;
