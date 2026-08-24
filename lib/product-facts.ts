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
import { CALCULATOR_COUNT, EMBEDDABLE_COUNT } from "@/lib/calculator-registry";
import { MARKET_COUNT } from "@/lib/markets/cities";
import { STATE_COUNT } from "@/lib/states";

const pct = (value: unknown) => `${Number(value)}%`;

export const PRODUCT_POSITIONING =
  "TrueCap is the Rental Acquisition Decision System: analyze the economics, know the Offer Ceiling under explicit targets, verify material assumptions, then pursue, negotiate, or pass.";

export const FOUR_ACQUISITION_ANSWERS = [
  "Selected-rule fit at asking",
  "Offer Ceiling under your rules",
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
  free: "No-signup first-pass screen with editable assumptions, core metrics, Screening Index, and rule-fit context.",
  singleDeal: "One paid report with an Offer Ceiling, Deal Doctor thresholds, downside, projections, tax, and exit views; no subscription.",
  pro: "Repeat decision workflow with Buy Box, interactive Offer Ceiling, downside, saved opportunities, comparisons, and reports.",
  // No "portals" here: agent_portal is shipped:false (bearer links lack
  // expiry/revocation) and must not be marketed anywhere — including the
  // llms.txt routes that render this string publicly.
  agentPro: "Investor Client Operating System with client rosters, per-client Buy Boxes, deal assignment, co-branding, and Pro tools.",
  trialDays: TRIAL_DAYS,
  pricingSource: "/pricing",
} as const;

export const PUBLIC_CATALOG_FACTS = {
  calculators: CALCULATOR_COUNT,
  embeddableCalculators: EMBEDDABLE_COUNT,
  markets: MARKET_COUNT,
  states: STATE_COUNT,
} as const;

export const DATA_SOURCE_FACTS = {
  rent: "HUD Fair Market Rent by county or ZIP when available",
  mortgageRate: "FRED 30-year fixed mortgage series",
  propertyTax: "state-level effective property-tax benchmark",
  editable:
    "Every starting assumption is editable and must be independently verified before an investment decision.",
} as const;
