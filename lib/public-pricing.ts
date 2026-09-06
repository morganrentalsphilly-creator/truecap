/**
 * Public catalog fallbacks used only when Stripe cannot resolve a display
 * price for the current request. Stripe Price IDs and live subscription data
 * remain authoritative for checkout, entitlements, and customer billing.
 *
 * Keep these values aligned with the published catalog and update them only as
 * part of an approved pricing release. They never reprice an existing customer.
 *
 * These four MUST equal the amounts the live Stripe Prices actually charge.
 * stripePriceMatchesCatalog fails closed on any mismatch, so a drift here does
 * not show the wrong price — it kills checkout outright while /pricing keeps
 * advertising. Moving a number means creating the new Stripe Price and
 * repointing its STRIPE_PRICE_* env var in the same release.
 */
export const PUBLIC_PRO_MONTHLY_USD = 29.99;
export const PUBLIC_PRO_ANNUAL_USD = 300;
export const PUBLIC_AGENT_PRO_MONTHLY_USD = 59.99;
export const PUBLIC_AGENT_PRO_ANNUAL_USD = 590;
export const PUBLIC_DECISION_PACK_USD = 9;

export const PLAN_CATALOG = {
  pro_monthly: {
    name: "Investor Pro",
    cadence: "monthly",
    unitAmountUsd: PUBLIC_PRO_MONTHLY_USD,
    stripeInterval: "month",
  },
  pro_annual: {
    name: "Investor Pro",
    cadence: "annual",
    unitAmountUsd: PUBLIC_PRO_ANNUAL_USD,
    stripeInterval: "year",
  },
  agent_pro_monthly: {
    name: "Agent Pro",
    cadence: "monthly",
    unitAmountUsd: PUBLIC_AGENT_PRO_MONTHLY_USD,
    stripeInterval: "month",
  },
  agent_pro_annual: {
    name: "Agent Pro",
    cadence: "annual",
    unitAmountUsd: PUBLIC_AGENT_PRO_ANNUAL_USD,
    stripeInterval: "year",
  },
  decision_pack: {
    name: "Decision Pack",
    cadence: "one-time",
    unitAmountUsd: PUBLIC_DECISION_PACK_USD,
    stripeInterval: null,
  },
} as const;

export type CatalogPaidPlanSlug = Exclude<keyof typeof PLAN_CATALOG, "decision_pack">;

export function expectedPlanAmountCents(slug: CatalogPaidPlanSlug): number {
  return Math.round(PLAN_CATALOG[slug].unitAmountUsd * 100);
}

/**
 * Fail-closed check between committed offer terms and the Stripe Price a
 * deployment is about to display or sell. A stale environment Price ID must
 * never show one amount and charge another.
 */
export function stripePriceMatchesCatalog(
  slug: CatalogPaidPlanSlug,
  price: {
    active?: boolean;
    currency?: string | null;
    type?: string | null;
    unit_amount?: number | null;
    recurring?: { interval?: string | null } | null;
  }
): boolean {
  const catalog = PLAN_CATALOG[slug];
  return (
    price.active === true &&
    price.type === "recurring" &&
    price.currency?.toLowerCase() === "usd" &&
    price.unit_amount === expectedPlanAmountCents(slug) &&
    price.recurring?.interval === catalog.stripeInterval
  );
}

export function formatPublicUsd(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: Number.isInteger(amount) ? 0 : 2,
  }).format(amount);
}

/**
 * Pricing-page copy facts (docs/site-overhaul.md Phase 9). Amounts live here,
 * never in JSX: the outcome line is arithmetic (3% of $250,000), the
 * DealCheck figures are the competitor's published tiers as stated on
 * /vs/dealcheck.
 */
export const PRICING_OUTCOME_EXAMPLE = {
  purchasePriceUsd: 250_000,
  overpayPct: 3,
  get overpayUsd(): number {
    return Math.round((this.purchasePriceUsd * this.overpayPct) / 100);
  },
} as const;

export const DEALCHECK_COMPARISON = {
  plusMonthlyUsd: 10,
  proMonthlyUsd: 20,
  href: "/vs/dealcheck",
} as const;

export function formatUsdWhole(amount: number): string {
  return `$${amount.toLocaleString("en-US")}`;
}
