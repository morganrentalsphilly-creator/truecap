import { isPaidPlanSlug, type PaidPlanSlug } from "@/lib/stripe/plan-prices";

export const CHECKOUT_RETURN_MAX_AGE_MS = 24 * 60 * 60 * 1000;

export type CheckoutReturnCandidate = {
  mode: string | null;
  status: string | null;
  clientReferenceId: string | null;
  metadataUserId: string | null;
  metadataPlanSlug: string | null;
  priceId: string | null;
  unitAmount: number | null;
  currency: string | null;
  createdAtSeconds: number;
  hasSubscription: boolean;
};

export type VerifiedCheckoutReturn = {
  purchasedPlanSlug: PaidPlanSlug;
  conversionValue?: number;
};

/**
 * Pure, fail-closed policy for the post-Checkout success landing.
 *
 * Query parameters are attacker-controlled. A banner, conversion, or
 * entitlement poll may start only after Stripe confirms a recent, completed
 * subscription Checkout bound to the signed-in user and the exact current
 * Price for the plan recorded by our own checkout action.
 */
export function verifyCheckoutReturnCandidate(input: {
  candidate: CheckoutReturnCandidate;
  expectedUserId: string;
  expectedPriceId: string;
  nowMs?: number;
}): VerifiedCheckoutReturn | null {
  const { candidate } = input;
  const nowMs = input.nowMs ?? Date.now();
  const ageMs = nowMs - candidate.createdAtSeconds * 1000;

  if (
    candidate.mode !== "subscription" ||
    candidate.status !== "complete" ||
    !candidate.hasSubscription ||
    candidate.clientReferenceId !== input.expectedUserId ||
    candidate.metadataUserId !== input.expectedUserId ||
    !isPaidPlanSlug(candidate.metadataPlanSlug) ||
    candidate.priceId !== input.expectedPriceId ||
    candidate.currency?.toLowerCase() !== "usd" ||
    ageMs < 0 ||
    ageMs > CHECKOUT_RETURN_MAX_AGE_MS
  ) {
    return null;
  }

  const conversionValue =
    candidate.unitAmount != null &&
    Number.isInteger(candidate.unitAmount) &&
    candidate.unitAmount >= 0
      ? candidate.unitAmount / 100
      : undefined;

  return {
    purchasedPlanSlug: candidate.metadataPlanSlug,
    ...(conversionValue != null ? { conversionValue } : {}),
  };
}
