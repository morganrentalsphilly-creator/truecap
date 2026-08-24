import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type Stripe from "stripe";
import {
  retrieveDecisionPackStripeAccess,
  type DecisionPackStripeReader,
} from "@/lib/stripe/decision-pack-access";

type DecisionPackRiskObject = Stripe.Charge | Stripe.Dispute | Stripe.Refund;

export type DecisionPackRiskReconciliation = {
  matchedSessions: number;
  suspendedSessions: number;
  revokedSessions: number;
  creditRowsRevoked: number;
};

function linkedPaymentIntentId(object: DecisionPackRiskObject): string | null {
  const intent = object.payment_intent;
  if (typeof intent === "string") return intent;
  return intent?.id ?? null;
}

async function revokePackCreditForSession(
  admin: SupabaseClient,
  checkoutSessionId: string
): Promise<number> {
  const { data, error } = await admin
    .from("one_time_pdf_purchase_claims")
    .select("id, pro_credit_status")
    .eq("checkout_session_id", checkoutSessionId)
    .maybeSingle();
  if (error) throw error;
  if (!data) {
    throw new Error("Decision Pack risk event has no matching claim ledger row");
  }

  const currentStatus = data.pro_credit_status as string | null;
  const nextStatus =
    currentStatus === "applied"
      ? "reversed"
      : currentStatus === "not_configured" || currentStatus === "eligible"
        ? "denied"
        : null;
  if (!nextStatus) return 0;

  // Compare-and-swap keeps repeated/reordered Stripe events idempotent and
  // stays inside the claim ledger's trigger-enforced credit state machine.
  const { data: updated, error: updateError } = await admin
    .from("one_time_pdf_purchase_claims")
    .update({ pro_credit_status: nextStatus })
    .eq("id", data.id as string)
    .eq("pro_credit_status", currentStatus)
    .select("id")
    .maybeSingle();
  if (updateError) throw updateError;
  return updated ? 1 : 0;
}

/**
 * Reconcile refund/dispute webhooks against current Stripe truth.
 *
 * The signed webhook event is only a wake-up signal: out-of-order deliveries
 * are normal, so access is classified from fresh Session/Charge/Dispute reads.
 * Report gates independently perform the same fresh read on every request;
 * this handler additionally makes Pack-credit revocation durable using the
 * existing trigger-protected claim ledger (no schema or Price mutation).
 */
export async function reconcileDecisionPackRiskEvent(
  admin: SupabaseClient,
  stripe: DecisionPackStripeReader,
  object: DecisionPackRiskObject
): Promise<DecisionPackRiskReconciliation> {
  const summary: DecisionPackRiskReconciliation = {
    matchedSessions: 0,
    suspendedSessions: 0,
    revokedSessions: 0,
    creditRowsRevoked: 0,
  };
  const intentId = linkedPaymentIntentId(object);
  if (!intentId) return summary;

  const sessions = await stripe.checkout.sessions.list({
    payment_intent: intentId,
    limit: 100,
  });
  if (sessions.has_more) {
    throw new Error("Decision Pack Checkout Session history is incomplete");
  }

  for (const session of sessions.data) {
    if (session.metadata?.purpose !== "one_time_pdf") continue;
    const claimId = session.metadata.claim_id;
    if (!claimId || session.client_reference_id !== claimId) {
      throw new Error("Decision Pack Checkout Session claim binding is invalid");
    }
    summary.matchedSessions += 1;

    const decision = await retrieveDecisionPackStripeAccess(
      stripe,
      session.id,
      claimId
    );
    if (decision.state === "revoked") {
      summary.revokedSessions += 1;
      summary.creditRowsRevoked += await revokePackCreditForSession(
        admin,
        session.id
      );
      continue;
    }
    if (decision.state === "suspended") {
      summary.suspendedSessions += 1;
      continue;
    }
    if (decision.state !== "allowed") {
      // A refund/dispute event tied to a Pack but not to a safely classifiable
      // current payment is an operational inconsistency. Throw so Stripe
      // retries and the existing webhook ledger/Sentry path records it.
      throw new Error(`Decision Pack risk reconciliation failed: ${decision.reason}`);
    }
  }

  return summary;
}
