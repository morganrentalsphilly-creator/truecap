/**
 * Dormant policy engine for crediting a one-time Deal Decision Pack purchase
 * toward a future Pro checkout. This module NEVER mutates Stripe or the DB;
 * a caller must supply an explicitly approved policy before it can return an
 * eligible credit.
 */
export const ONE_TIME_PDF_PRO_CREDIT_POLICY_VERSION = "launch-v2" as const;

export type OneTimePdfProCreditPolicy = {
  enabled: boolean;
  eligibilityWindowDays: number;
  creditPercent: 100;
  allowedCurrency: string;
};

export type OneTimePdfPurchaseForCredit = {
  paidAt: string | null;
  purchaseAmountCents: number | null;
  purchaseCurrency: string | null;
  creditAppliedAt?: string | null;
};

export type OneTimePdfProCreditDecision =
  | { status: "not-configured" }
  | { status: "invalid-purchase" }
  | { status: "currency-mismatch" }
  | { status: "expired"; eligibleUntil: string }
  | { status: "already-applied" }
  | {
      status: "eligible";
      amountCents: number;
      currency: string;
      eligibleUntil: string;
      policyVersion: typeof ONE_TIME_PDF_PRO_CREDIT_POLICY_VERSION;
    };

export function evaluateOneTimePdfProCredit(input: {
  purchase: OneTimePdfPurchaseForCredit;
  policy: OneTimePdfProCreditPolicy;
  now?: Date;
}): OneTimePdfProCreditDecision {
  const { purchase, policy } = input;
  if (!policy.enabled) return { status: "not-configured" };
  if (purchase.creditAppliedAt) return { status: "already-applied" };
  if (
    !purchase.paidAt ||
    !Number.isInteger(purchase.purchaseAmountCents) ||
    (purchase.purchaseAmountCents ?? 0) <= 0 ||
    !Number.isFinite(policy.eligibilityWindowDays) ||
    policy.eligibilityWindowDays <= 0 ||
    policy.creditPercent !== 100
  ) {
    return { status: "invalid-purchase" };
  }

  const paidAtMs = Date.parse(purchase.paidAt);
  if (!Number.isFinite(paidAtMs)) return { status: "invalid-purchase" };

  const purchaseCurrency = purchase.purchaseCurrency?.trim().toLowerCase();
  const allowedCurrency = policy.allowedCurrency.trim().toLowerCase();
  if (!purchaseCurrency || purchaseCurrency !== allowedCurrency) {
    return { status: "currency-mismatch" };
  }

  const eligibleUntilMs =
    paidAtMs + Math.round(policy.eligibilityWindowDays * 24 * 60 * 60 * 1000);
  const eligibleUntil = new Date(eligibleUntilMs).toISOString();
  if ((input.now ?? new Date()).getTime() > eligibleUntilMs) {
    return { status: "expired", eligibleUntil };
  }

  return {
    status: "eligible",
    amountCents: purchase.purchaseAmountCents as number,
    currency: purchaseCurrency,
    eligibleUntil,
    policyVersion: ONE_TIME_PDF_PRO_CREDIT_POLICY_VERSION,
  };
}
