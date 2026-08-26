import "server-only";

import * as Sentry from "@sentry/nextjs";
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
  creditAdjustmentsCreated: number;
};

function linkedPaymentIntentId(object: DecisionPackRiskObject): string | null {
  const intent = object.payment_intent;
  if (typeof intent === "string") return intent;
  return intent?.id ?? null;
}

type PackCreditRevocationReason = "refund_recorded" | "dispute_lost";

async function ensureCreditAdjustment(
  admin: SupabaseClient,
  input: {
    claimId: string;
    checkoutSessionId: string;
    reason: PackCreditRevocationReason;
  },
): Promise<number> {
  // `ignoreDuplicates` is load-bearing: webhook retries, reordered Stripe
  // events, and concurrent deliveries must never reset a completed/waived row
  // back to pending. A unique claim_id makes the queue exactly-once.
  const { data, error } = await admin
    .from("decision_pack_credit_adjustments")
    .upsert(
      {
        claim_id: input.claimId,
        checkout_session_id: input.checkoutSessionId,
        reason: input.reason,
        status: "pending",
      },
      { onConflict: "claim_id", ignoreDuplicates: true },
    )
    .select("id")
    .maybeSingle();
  if (error) throw error;
  if (!data) return 0;

  // One alert per newly-created queue row. No email, customer id, Checkout
  // Session id, price, or financial input is sent to telemetry.
  Sentry.captureMessage(
    "Decision Pack reversed credit requires operational adjustment",
    {
      level: "warning",
      tags: {
        feature: "decision-pack-credit-adjustment",
        reason: input.reason,
      },
      extra: { adjustment_id: data.id },
    },
  );
  return 1;
}

async function revokePackCreditForSession(
  admin: SupabaseClient,
  checkoutSessionId: string,
  reason: PackCreditRevocationReason,
): Promise<{ creditRowsRevoked: number; creditAdjustmentsCreated: number }> {
  // Credit status can advance concurrently with this webhook:
  // not_configured -> eligible -> applied. A single failed CAS is not a safe
  // no-op: the competing writer may just have APPLIED the credit after this
  // handler read "eligible". Re-read and converge on a terminal denied or
  // reversed state. The database transition graph is forward-only and has at
  // most three competing advances; the bounded fifth attempt is defensive.
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const { data, error } = await admin
      .from("one_time_pdf_purchase_claims")
      .select("id, pro_credit_status")
      .eq("checkout_session_id", checkoutSessionId)
      .maybeSingle();
    if (error) throw error;
    if (!data) {
      throw new Error(
        "Decision Pack risk event has no matching claim ledger row",
      );
    }

    const claimId = data.id as string;
    const currentStatus = data.pro_credit_status as string | null;
    if (currentStatus === "reversed") {
      return {
        creditRowsRevoked: 0,
        creditAdjustmentsCreated: await ensureCreditAdjustment(admin, {
          claimId,
          checkoutSessionId,
          reason,
        }),
      };
    }

    const nextStatus =
      currentStatus === "applied"
        ? "reversed"
        : currentStatus === "not_configured" || currentStatus === "eligible"
          ? "denied"
          : null;
    if (!nextStatus) {
      return { creditRowsRevoked: 0, creditAdjustmentsCreated: 0 };
    }

    // Compare-and-swap keeps repeated/reordered Stripe events idempotent and
    // stays inside the claim ledger's trigger-enforced credit state machine.
    const { data: updated, error: updateError } = await admin
      .from("one_time_pdf_purchase_claims")
      .update({ pro_credit_status: nextStatus })
      .eq("id", claimId)
      .eq("pro_credit_status", currentStatus)
      .select("id")
      .maybeSingle();
    if (updateError) throw updateError;
    if (!updated) continue;

    // An eligible/not-configured credit was never financially applied, so its
    // denied ledger status is sufficient. An applied credit requires a
    // separate human-controlled financial disposition.
    return {
      creditRowsRevoked: 1,
      creditAdjustmentsCreated:
        currentStatus === "applied"
          ? await ensureCreditAdjustment(admin, {
              claimId,
              checkoutSessionId,
              reason,
            })
          : 0,
    };
  }

  throw new Error(
    "Decision Pack credit status did not converge during risk reconciliation",
  );
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
  object: DecisionPackRiskObject,
): Promise<DecisionPackRiskReconciliation> {
  const summary: DecisionPackRiskReconciliation = {
    matchedSessions: 0,
    suspendedSessions: 0,
    revokedSessions: 0,
    creditRowsRevoked: 0,
    creditAdjustmentsCreated: 0,
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
      throw new Error(
        "Decision Pack Checkout Session claim binding is invalid",
      );
    }
    summary.matchedSessions += 1;

    const decision = await retrieveDecisionPackStripeAccess(
      stripe,
      session.id,
      claimId,
    );
    if (decision.state === "revoked") {
      if (
        decision.reason !== "refund_recorded" &&
        decision.reason !== "dispute_lost"
      ) {
        // The access-decision type intentionally models all fail-closed
        // reasons in one non-allowed branch. A future classifier change must
        // not silently turn an unrelated denial into a financial obligation.
        throw new Error(
          `Unexpected Decision Pack revocation reason: ${decision.reason}`,
        );
      }
      summary.revokedSessions += 1;
      const creditRevocation = await revokePackCreditForSession(
        admin,
        session.id,
        decision.reason,
      );
      summary.creditRowsRevoked += creditRevocation.creditRowsRevoked;
      summary.creditAdjustmentsCreated +=
        creditRevocation.creditAdjustmentsCreated;
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
      throw new Error(
        `Decision Pack risk reconciliation failed: ${decision.reason}`,
      );
    }
  }

  return summary;
}
