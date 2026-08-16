/**
 * Assumption source + confidence metadata — the "where did this number come
 * from, and how much should I trust it" layer that pairs with the impact
 * ranking in lib/assumption-impact.ts. Keys match ImpactDriver.key so the
 * analyzer can show source + confidence right next to each driver's impact.
 *
 * Confidence is about how safe the DEFAULT is to rely on WITHOUT verifying:
 *   high   — a real current figure, or the user's own entered number
 *   medium — a reasonable data-backed default that still varies locally
 *   low    — a rough estimate that should be replaced with a real quote
 *
 * Pure data + lookups — no calc, no React. Tested in lib/__tests__.
 */

export type AssumptionConfidence = "high" | "medium" | "low";

export type AssumptionMeta = {
  /** Where the pre-filled value comes from. */
  source: string;
  confidence: AssumptionConfidence;
  /** The one action that firms this assumption up. */
  verify: string;
};

/** Keyed by lib/assumption-impact.ts ImpactDriver.key. */
export const ASSUMPTION_META: Record<string, AssumptionMeta> = {
  rent: { source: "HUD rent benchmark", confidence: "medium", verify: "Check recent local rent comps for this property." },
  interestRate: { source: "FRED owner-occupied benchmark", confidence: "medium", verify: "Replace with an actual investor lender quote." },
  purchasePrice: { source: "Your input", confidence: "high", verify: "The contract or asking price you entered." },
  vacancyPct: { source: "Smart default", confidence: "medium", verify: "Adjust to your submarket's real vacancy." },
  mgmtPct: { source: "Smart default", confidence: "medium", verify: "Set to 0% if you self-manage." },
  maintenancePct: { source: "Smart default", confidence: "medium", verify: "Older properties run higher." },
  capexPct: { source: "Smart default", confidence: "medium", verify: "Reserve for roof, HVAC, and big systems." },
  propertyTaxPct: { source: "State tax benchmark", confidence: "medium", verify: "Confirm the parcel's bill with the county assessor." },
  insurance: { source: "Estimate", confidence: "low", verify: "Get a real quote — premiums vary widely." },
};

export function assumptionMeta(key: string): AssumptionMeta | null {
  return ASSUMPTION_META[key] ?? null;
}

export const CONFIDENCE_LABEL: Record<AssumptionConfidence, string> = {
  high: "High confidence",
  medium: "Medium confidence",
  low: "Low confidence — verify",
};
