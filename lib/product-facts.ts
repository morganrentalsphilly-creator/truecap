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
  "TrueCap turns an address or supported listing into a preliminary rental screen with editable assumptions and a modeled price threshold under explicit user targets.";

export const FOUR_ACQUISITION_ANSWERS = [
  "Selected-rule fit at asking",
  "Offer Ceiling under your rules",
  "What could break",
  "What to verify",
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
  free: "No-signup preliminary screen with editable assumptions, core modeled metrics, and selected-rule context.",
  singleDeal: "New one-property purchases are temporarily unavailable; existing paid report claims remain recoverable.",
  pro: "Repeat underwriting workflow with reusable target profiles, interactive Offer Ceiling, saved opportunities, comparisons, and reports.",
  // No "portals" here: agent_portal is shipped:false (bearer links lack
  // expiry/revocation) and must not be marketed anywhere — including the
  // llms.txt routes that render this string publicly.
  agentPro: "A separate professional tier for client workflows; it is not part of the primary Buy & Hold analyzer path.",
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
