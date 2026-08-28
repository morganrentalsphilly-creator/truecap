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

import { isFeatureReleased, type FeatureKey } from "@/lib/entitlements-catalog";
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

/**
 * Stable identity for disposable demo drafts across fixture revisions.
 *
 * Older releases persisted the synthetic sample before its analysis date and
 * several assumptions were version-pinned. Comparing the entire form therefore
 * misses exactly those historical drafts and makes the demo look like the
 * investor's unfinished work. The sentinel address is deliberately not a real
 * property, so it is the safe backwards-compatible identity boundary.
 */
export function isTrueCapSyntheticSampleAddress(value: unknown): boolean {
  if (typeof value !== "string") return false;
  const normalize = (address: string) =>
    address.trim().replace(/\s+/g, " ").toLocaleLowerCase("en-US");
  return normalize(value) === normalize(SAMPLE_DEAL_VALUES.address);
}

export type SampleProPreviewCapabilities = {
  canUseProjections: boolean;
  canUseTaxStrategy: boolean;
  canUseExitScenarios: boolean;
  canUseDealScore: boolean;
};

/**
 * What the one-shot sample Pro preview can actually demonstrate, paired with
 * the entitlement that makes it redundant. Keep this list in step with the
 * panels `sampleProPreview` really unlocks in the analyzer — an entry here
 * claims the preview shows something a visitor without that entitlement
 * cannot otherwise see.
 */
const SAMPLE_PRO_PREVIEW_FEATURES = [
  ["projections", "canUseProjections"],
  ["tax_strategy", "canUseTaxStrategy"],
  ["exit_scenarios", "canUseExitScenarios"],
  ["deal_score", "canUseDealScore"],
] as const satisfies ReadonlyArray<
  readonly [FeatureKey, keyof SampleProPreviewCapabilities]
>;

/**
 * Does an armed sample run still have anything to preview for this visitor?
 *
 * The preview is a marketing demo for someone who does NOT already have the
 * paid report, and it costs the viewer their own framing: the property is
 * relabelled SAMPLE_DEAL_DISPLAY.shortAddress and the criteria are presented
 * as product examples. A subscriber who already has every panel it can show
 * must therefore keep the real analysis — including after a Save/Share
 * sign-in resumes the sample they were already looking at.
 *
 * An UNRELEASED feature (`shipped: false` in the entitlement catalog) is
 * false for every plan AND is not unlocked by the preview, so it can never be
 * evidence that this visitor is missing something. Counting one made the
 * "already has it all" test unsatisfiable and silently demoted paid users
 * into demo framing.
 */
export function sampleProPreviewAddsCapability(
  capabilities: SampleProPreviewCapabilities,
): boolean {
  return SAMPLE_PRO_PREVIEW_FEATURES.some(
    ([feature, capability]) =>
      isFeatureReleased(feature) && !capabilities[capability],
  );
}

/** Short display strings shared by the hero card. */
export const SAMPLE_DEAL_DISPLAY = {
  shortAddress: "Philadelphia rental example",
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
