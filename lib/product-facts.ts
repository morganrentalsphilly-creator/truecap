/**
 * Machine-readable, typed product facts for public copy.
 *
 * This module does not replace executable authorities. It assembles them:
 * schema defaults, product-access limits, the entitlement catalog, the public
 * billing catalog, release flags, and Stripe-price configuration. Marketing,
 * structured data, email copy, and AI-facing routes should consume these facts
 * instead of restating product behavior.
 *
 * Recurring checkout still retrieves the configured Stripe Price and verifies
 * it against lib/public-pricing.ts. Nothing here changes billing, plan gates,
 * or entitlement behavior.
 */
import { defaultValues } from "@/lib/investcalc-schema";
import {
  PRODUCT_EVALUATION_COMPARISON_LIMIT,
  PRODUCT_EVALUATION_DEAL_LIMIT,
  PRODUCT_EVALUATION_DAYS,
} from "@/lib/product-access";
import { CALCULATOR_COUNT, EMBEDDABLE_COUNT } from "@/lib/calculator-registry";
import { MARKET_COUNT } from "@/lib/markets/cities";
import { STATE_COUNT } from "@/lib/states";
import {
  FEATURE_CATALOG,
  featureLimit,
  featuresForTier,
  isFeatureReleased,
  type FeatureKey,
} from "@/lib/entitlements-catalog";
import { INVESTOR_STRATEGIES } from "@/lib/investor-strategies";
import { isSpecialistStrategyEnabled } from "@/lib/feature-flags";
import { PLAN_CATALOG, formatPublicUsd } from "@/lib/public-pricing";
import {
  getPrimaryPlanPriceId,
  isAgentProConfigured,
} from "@/lib/stripe/plan-prices";
import { decisionPackCheckoutEnabled } from "@/lib/decision-pack-checkout-gate";
import { getMarketingOfferConfig } from "@/lib/marketing-offer-config";

const pct = (value: unknown) => `${Number(value)}%`;

export const PRODUCT_POSITIONING =
  "TrueCap turns an address or supported listing into a rental screen with editable assumptions and an Offer Ceiling — the highest price that still meets your targets.";

export const FOUR_ACQUISITION_ANSWERS = [
  "Buy Box fit at asking",
  "Offer Ceiling for your targets",
  "What could break",
  "What to verify",
] as const;

export const CURRENT_DEFAULT_FACTS = {
  downPayment: pct(defaultValues.downPaymentPct),
  vacancy: pct(defaultValues.vacancyPct),
  maintenance: pct(defaultValues.maintenancePct),
  capex: pct(defaultValues.capexPct),
  management: pct(defaultValues.mgmtPct),
  rentGrowth: pct(defaultValues.rentGrowthPct),
  expenseGrowth: pct(defaultValues.expenseGrowthPct),
  fallbackInterestRate: pct(defaultValues.interestRate),
  loanTermYears: defaultValues.loanTermYears,
  propertyTaxFallback: "1.1% of entered purchase price",
} as const;

export const PROPERTY_TAX_FACTS = {
  behavior: "manual" as const,
  acceptedInputs: [
    "local annual bill",
    "reviewed local effective rate",
  ] as const,
  blankFieldBehavior:
    "A blank property-tax field uses a TrueCap default of 1.1% of purchase price — replace it with your local number.",
  notAutoFilled:
    "TrueCap does not auto-fill property tax from a state average or parcel source.",
} as const;

export const FINANCIAL_PRODUCT_DISCLAIMERS = [
  "TrueCap is a preliminary underwriting model, not an appraisal, inspection, lender approval, tax opinion, legal opinion, offer recommendation, or investment advice.",
  "The Offer Ceiling is the highest price that still meets your targets under the assumptions shown; it is not a recommended offer.",
  "HUD rent and FRED mortgage-rate values are editable screening benchmarks, not property-specific rent comps or investor loan quotes.",
  "Replace every material assumption with property-specific evidence before relying on a result.",
] as const;

export const RELEASED_ANALYSIS_STRATEGIES = INVESTOR_STRATEGIES.filter(
  (strategy) => isSpecialistStrategyEnabled(strategy.key),
).map(({ key, label, productStage, limitation }) => ({
  key,
  label,
  productStage,
  limitation: limitation ?? null,
})) as ReadonlyArray<{
  key: (typeof INVESTOR_STRATEGIES)[number]["key"];
  label: string;
  productStage: (typeof INVESTOR_STRATEGIES)[number]["productStage"];
  limitation: string | null;
}>;

const releasedFeature = (key: FeatureKey) => ({
  key,
  label: FEATURE_CATALOG[key].label,
  released: isFeatureReleased(key),
});

export const RELEASED_WORKFLOW_FACTS = {
  reports: [
    releasedFeature("pdf_export"),
    releasedFeature("custom_branding"),
  ].filter((feature) => feature.released),
  comparison: releasedFeature("compare_deals"),
  projections: releasedFeature("projections"),
  withheld: [
    releasedFeature("tax_strategy"),
    releasedFeature("exit_scenarios"),
    releasedFeature("agent_portal"),
    releasedFeature("embed_whitelabel"),
  ].filter((feature) => !feature.released),
} as const;

export type ProductAvailabilityFacts = {
  investorPro: boolean;
  agentPro: boolean;
  oneTimePurchase: boolean;
};

/** Deployment-specific availability. The same predicates guard the matching
 * checkout surfaces; a public fact can never claim a tier that has no price or
 * a Decision Pack whose two independent release switches are not both on. */
export function getProductAvailabilityFacts(): ProductAvailabilityFacts {
  const singleDeal = getMarketingOfferConfig().singleDeal;
  return {
    investorPro:
      getPrimaryPlanPriceId("pro_monthly") != null ||
      getPrimaryPlanPriceId("pro_annual") != null,
    agentPro: isAgentProConfigured(),
    oneTimePurchase:
      decisionPackCheckoutEnabled() &&
      Boolean(process.env[singleDeal.stripeEnvKey]?.trim()),
  };
}

export function getOneTimePurchaseFacts() {
  const configured = getMarketingOfferConfig().singleDeal;
  return {
    name: PLAN_CATALOG.decision_pack.name,
    displayPrice: configured.priceLabel,
    amountUsd: configured.amount,
    cardRequiredAtCheckout: true,
    autoRenews: false,
  } as const;
}

export const PRODUCT_PLAN_FACTS = {
  free: {
    name: "Free",
    displayPrice: "$0",
    savedDealLimit: featureLimit("save_deal", "free") ?? "limited",
    cardRequired: false,
    autoRenews: false,
  },
  evaluation: {
    name: "Free trial (no card)",
    durationDays: PRODUCT_EVALUATION_DAYS,
    dealLimit: PRODUCT_EVALUATION_DEAL_LIMIT,
    comparisonLimit: PRODUCT_EVALUATION_COMPARISON_LIMIT,
    cardRequired: false,
    autoRenews: false,
  },
  investorPro: {
    name: PLAN_CATALOG.pro_monthly.name,
    monthlyDisplayPrice: formatPublicUsd(
      PLAN_CATALOG.pro_monthly.unitAmountUsd,
    ),
    annualDisplayPrice: formatPublicUsd(PLAN_CATALOG.pro_annual.unitAmountUsd),
    cardRequiredAtCheckout: true,
    autoRenewsUntilCanceled: true,
    features: featuresForTier("pro").map(({ key, label }) => ({ key, label })),
  },
  agentPro: {
    name: PLAN_CATALOG.agent_pro_monthly.name,
    monthlyDisplayPrice: formatPublicUsd(
      PLAN_CATALOG.agent_pro_monthly.unitAmountUsd,
    ),
    annualDisplayPrice: formatPublicUsd(
      PLAN_CATALOG.agent_pro_annual.unitAmountUsd,
    ),
    cardRequiredAtCheckout: true,
    autoRenewsUntilCanceled: true,
    features: featuresForTier("agent_pro").map(({ key, label }) => ({
      key,
      label,
    })),
  },
  oneTimePurchase: {
    name: PLAN_CATALOG.decision_pack.name,
    catalogDefaultDisplayPrice: formatPublicUsd(
      PLAN_CATALOG.decision_pack.unitAmountUsd,
    ),
    cardRequiredAtCheckout: true,
    autoRenews: false,
  },
} as const;

/** Compatibility prose for existing consumers. Every sentence is assembled
 * from the typed facts above or deployment-specific availability. */
export function getPlanFacts() {
  const availability = getProductAvailabilityFacts();
  const oneTimePurchase = getOneTimePurchaseFacts();
  return {
    free: `No-signup screen with editable assumptions, core modeled metrics, Buy Box context, and ${PRODUCT_PLAN_FACTS.free.savedDealLimit} saved deals after account creation.`,
    singleDeal: availability.oneTimePurchase
      ? `${oneTimePurchase.name} is available as a non-renewing ${oneTimePurchase.displayPrice} one-time purchase.`
      : "New one-property purchases are temporarily unavailable; existing paid report claims remain recoverable.",
    pro: availability.investorPro
      ? "Investor Pro is available on this deployment with reusable target profiles, interactive Offer Ceiling, saved opportunities, comparisons, and reports."
      : "Investor Pro checkout is not configured on this deployment.",
    agentPro: availability.agentPro
      ? "Agent Pro is available on this deployment and adds client-roster and client Buy Box workflows to Investor Pro."
      : "Agent Pro checkout is not configured on this deployment.",
    evaluationDays: PRODUCT_PLAN_FACTS.evaluation.durationDays,
    evaluationDealLimit: PRODUCT_PLAN_FACTS.evaluation.dealLimit,
    evaluationComparisonLimit: PRODUCT_PLAN_FACTS.evaluation.comparisonLimit,
    cardRequired: PRODUCT_PLAN_FACTS.evaluation.cardRequired,
    autoRenews: PRODUCT_PLAN_FACTS.evaluation.autoRenews,
    pricingSource: "/pricing",
  } as const;
}

/** Retained for imports that do not need deployment-specific availability. */
export const PLAN_FACTS = {
  free: "No-signup screen with editable assumptions, core modeled metrics, and Buy Box context.",
  singleDeal:
    "New one-property purchases are temporarily unavailable; existing paid report claims remain recoverable.",
  pro: "Repeat underwriting workflow with reusable target profiles, interactive Offer Ceiling, saved opportunities, comparisons, and reports.",
  agentPro:
    "Availability is deployment-specific and follows configured, catalog-verified Stripe prices.",
  evaluationDays: PRODUCT_PLAN_FACTS.evaluation.durationDays,
  evaluationDealLimit: PRODUCT_PLAN_FACTS.evaluation.dealLimit,
  evaluationComparisonLimit: PRODUCT_PLAN_FACTS.evaluation.comparisonLimit,
  cardRequired: PRODUCT_PLAN_FACTS.evaluation.cardRequired,
  autoRenews: PRODUCT_PLAN_FACTS.evaluation.autoRenews,
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
  propertyTax: `${PROPERTY_TAX_FACTS.acceptedInputs.join(" or ")}; ${PROPERTY_TAX_FACTS.blankFieldBehavior}`,
  editable:
    "Every starting assumption is editable and must be independently verified before an investment decision.",
} as const;
