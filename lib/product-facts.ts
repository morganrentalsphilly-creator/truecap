/**
 * Machine-readable and marketing-safe product facts.
 *
 * Numeric underwriting defaults are derived from the same schema object the
 * analyzer initializes. Public reference routes import this module instead of
 * copying numbers into prose, which previously left llms-full.txt years out of
 * date. Recurring prices deliberately do not live here: Stripe is their source
 * of truth and /pricing resolves them at request time.
 */
import { defaultValues } from "@/lib/investcalc-schema";
import { TRIAL_DAYS } from "@/lib/trial";

const pct = (value: unknown) => `${Number(value)}%`;

export const PRODUCT_POSITIONING =
  "TrueCap is a rental acquisition decision engine: Analyze → Decide → Offer.";

export const FOUR_ACQUISITION_ANSWERS = [
  "Pursue or pass",
  "What to offer",
  "What could break",
  "How to present it",
] as const;

export const CURRENT_DEFAULT_FACTS = {
  vacancy: pct(defaultValues.vacancyPct),
  maintenance: pct(defaultValues.maintenancePct),
  capex: pct(defaultValues.capexPct),
  management: pct(defaultValues.mgmtPct),
  rentGrowth: pct(defaultValues.rentGrowthPct),
  expenseGrowth: pct(defaultValues.expenseGrowthPct),
  fallbackInterestRate: pct(defaultValues.interestRate),
} as const;

export const PLAN_FACTS = {
  free: "No-signup first-pass screen with editable assumptions, core metrics, Deal Score, and verdict.",
  singleDeal: "One paid report with Max Offer, Deal Doctor thresholds, downside, projections, tax, and exit views; no subscription.",
  pro: "Repeat decision workflow with Buy Box, interactive Max Offer, downside, saved opportunities, comparisons, and reports.",
  agentPro: "Investor Client Operating System with client rosters, per-client Buy Boxes, deal assignment, co-branding, portals, and Pro tools.",
  trialDays: TRIAL_DAYS,
  pricingSource: "/pricing",
} as const;

export const DATA_SOURCE_FACTS = {
  rent: "HUD Fair Market Rent by county or ZIP when available",
  mortgageRate: "FRED 30-year fixed mortgage series",
  propertyTax: "state-level effective property-tax benchmark",
  editable:
    "Every starting assumption is editable and must be independently verified before an investment decision.",
} as const;
