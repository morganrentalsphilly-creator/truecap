import "server-only";

import type Stripe from "stripe";

/**
 * Stripe is the current authority for historical Decision Pack access.
 *
 * Checkout Sessions remain `paid` after a refund, so checking the Session
 * alone is insufficient. Every recovery/export reads the Session plus all
 * Charges and Disputes for its PaymentIntent and fails closed if that current
 * state cannot be represented safely.
 */

export type DecisionPackAccessDecision =
  | {
      state: "allowed";
      session: Stripe.Checkout.Session;
      paymentIntentId: string;
    }
  | {
      state: "not_paid" | "suspended" | "revoked" | "invalid" | "unavailable";
      reason:
        | "claim_binding"
        | "payment_not_complete"
        | "payment_intent_missing"
        | "refund_recorded"
        | "dispute_open"
        | "dispute_lost"
        | "dispute_state_unresolved"
        | "stripe_history_incomplete"
        | "successful_charge_missing";
    };

export type DecisionPackStripeReader = Pick<
  Stripe,
  "checkout" | "charges" | "disputes"
>;

type CurrentPaymentFacts = {
  session: Stripe.Checkout.Session;
  charges: readonly Stripe.Charge[];
  disputes: readonly Stripe.Dispute[];
  chargeHistoryComplete: boolean;
  disputeHistoryComplete: boolean;
};

const OPEN_DISPUTE_STATUSES = new Set<Stripe.Dispute.Status>([
  "warning_needs_response",
  "warning_under_review",
  "needs_response",
  "under_review",
]);

function paymentIntentId(
  paymentIntent: Stripe.Checkout.Session["payment_intent"]
): string | null {
  if (typeof paymentIntent === "string") return paymentIntent;
  return paymentIntent?.id ?? null;
}

export function classifyDecisionPackStripeAccess(
  facts: CurrentPaymentFacts,
  expectedClaimId: string
): DecisionPackAccessDecision {
  const { session, charges, disputes } = facts;

  if (
    session.metadata?.purpose !== "one_time_pdf" ||
    session.metadata?.claim_id !== expectedClaimId ||
    session.client_reference_id !== expectedClaimId
  ) {
    return { state: "invalid", reason: "claim_binding" };
  }

  if (session.payment_status !== "paid" || session.status !== "complete") {
    return { state: "not_paid", reason: "payment_not_complete" };
  }

  const intentId = paymentIntentId(session.payment_intent);
  if (!intentId) {
    return { state: "unavailable", reason: "payment_intent_missing" };
  }

  // A truncated Stripe list could hide the refund or dispute that revokes
  // access. Historical Pack payments cannot legitimately have 100+ records,
  // so this is an operational anomaly and must fail closed.
  if (!facts.chargeHistoryComplete || !facts.disputeHistoryComplete) {
    return { state: "unavailable", reason: "stripe_history_incomplete" };
  }

  if (charges.some((charge) => charge.refunded || charge.amount_refunded > 0)) {
    return { state: "revoked", reason: "refund_recorded" };
  }

  if (disputes.some((dispute) => dispute.status === "lost")) {
    return { state: "revoked", reason: "dispute_lost" };
  }

  if (disputes.some((dispute) => OPEN_DISPUTE_STATUSES.has(dispute.status))) {
    return { state: "suspended", reason: "dispute_open" };
  }

  // Only a current `won` status is a recognized restoration state. Stripe
  // also exposes warning_closed/prevented; neither is silently treated as a
  // win because the approved policy requires a won + paid + no-refund check.
  if (disputes.some((dispute) => dispute.status !== "won")) {
    return { state: "suspended", reason: "dispute_state_unresolved" };
  }

  // If Stripe marks a Charge disputed but returns no corresponding Dispute,
  // the current state is internally incomplete. Suspend rather than guessing.
  if (disputes.length === 0 && charges.some((charge) => charge.disputed)) {
    return { state: "suspended", reason: "dispute_state_unresolved" };
  }

  const hasSuccessfulCharge = charges.some(
    (charge) =>
      charge.paid &&
      charge.status === "succeeded" &&
      charge.captured &&
      charge.amount_captured > 0
  );
  if (!hasSuccessfulCharge) {
    return { state: "unavailable", reason: "successful_charge_missing" };
  }

  return { state: "allowed", session, paymentIntentId: intentId };
}

export async function retrieveDecisionPackStripeAccess(
  stripe: DecisionPackStripeReader,
  checkoutSessionId: string,
  expectedClaimId: string
): Promise<DecisionPackAccessDecision> {
  const session = await stripe.checkout.sessions.retrieve(checkoutSessionId);
  const intentId = paymentIntentId(session.payment_intent);

  // Let the classifier produce the precise fail-closed result without making
  // unrelated Stripe list calls for an invalid/unpaid Session.
  if (
    session.metadata?.purpose !== "one_time_pdf" ||
    session.metadata?.claim_id !== expectedClaimId ||
    session.client_reference_id !== expectedClaimId ||
    session.payment_status !== "paid" ||
    session.status !== "complete" ||
    !intentId
  ) {
    return classifyDecisionPackStripeAccess(
      {
        session,
        charges: [],
        disputes: [],
        chargeHistoryComplete: true,
        disputeHistoryComplete: true,
      },
      expectedClaimId
    );
  }

  const [chargePage, disputePage] = await Promise.all([
    stripe.charges.list({ payment_intent: intentId, limit: 100 }),
    stripe.disputes.list({ payment_intent: intentId, limit: 100 }),
  ]);

  return classifyDecisionPackStripeAccess(
    {
      session,
      charges: chargePage.data,
      disputes: disputePage.data,
      chargeHistoryComplete: !chargePage.has_more,
      disputeHistoryComplete: !disputePage.has_more,
    },
    expectedClaimId
  );
}
