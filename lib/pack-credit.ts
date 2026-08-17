import "server-only";

/**
 * Deal Decision Pack → Pro credit configuration (founder-approved
 * 2026-08-17 Grand Slam Offer rollout).
 *
 * A pack purchase is credited toward the buyer's first Pro invoice when they
 * upgrade within PACK_CREDIT_WINDOW_DAYS. Mechanics:
 *
 *   1. verifyOneTimePdfPaymentAction (app/actions/one-time-pdf.ts) marks the
 *      consumed claim pro_credit_status='eligible' via the dormant columns on
 *      one_time_pdf_purchase_claims — best-effort, never blocking the PDF.
 *   2. createCheckoutSessionAction (app/actions/billing.ts) looks up the
 *      signed-in user's eligible claim and attaches the configured Stripe
 *      coupon to Pro checkout (Pro tiers only, one discount max).
 *   3. The Stripe webhook transitions the claim eligible→'applied' when the
 *      checkout completes (session.metadata.pack_credit_claim_id).
 *
 * FAIL-CLOSED: everything gates on STRIPE_PACK_CREDIT_COUPON_ID — a Stripe
 * coupon Morgan creates once ($5 off, duration "once", USD). Until that env
 * var is set, claims stay 'not_configured' (today's dormant behavior) and no
 * surface may promise a credit. This mirrors the POST_ANALYSIS_COUPON_ID
 * pattern in lib/post-analysis-offer.ts.
 *
 * SCOPE GUARD: the single configured coupon is priced for the $5 'current'
 * pack variant, so only claims whose credit amount is exactly $5 (500 cents)
 * are redeemable. If a $9/$15/$19 price experiment goes live, mint a matching
 * coupon and extend this module before promising those buyers a credit.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { OneTimePdfProCreditPolicy } from "@/lib/one-time-pdf-credit";

export const PACK_CREDIT_WINDOW_DAYS = 7;

/** Cents the configured Stripe coupon refunds — the $5 'current' pack. */
export const PACK_CREDIT_REDEEMABLE_AMOUNT_CENTS = 500;

export function getPackCreditCouponId(): string | null {
  const value = process.env.STRIPE_PACK_CREDIT_COUPON_ID?.trim();
  return value ? value : null;
}

export function isPackCreditConfigured(): boolean {
  return getPackCreditCouponId() !== null;
}

export function buildPackCreditPolicy(): OneTimePdfProCreditPolicy {
  return {
    enabled: isPackCreditConfigured(),
    eligibilityWindowDays: PACK_CREDIT_WINDOW_DAYS,
    creditPercent: 100,
    allowedCurrency: "usd",
  };
}

export type EligiblePackCredit = {
  claimId: string;
  amountCents: number;
  eligibleUntil: string;
};

/**
 * The signed-in user's redeemable pack credit, if any. Claims qualify when
 * bound to this user (at pack checkout, consumption, or credit grant), still
 * inside their window, and worth exactly the configured coupon amount.
 * Anonymous purchases that were never bound to an account cannot be located
 * here — the claim-secret browser binding is the only link, and it is not
 * available to a server-side checkout action.
 */
export async function findEligiblePackCredit(
  admin: SupabaseClient,
  userId: string,
  now: Date = new Date()
): Promise<EligiblePackCredit | null> {
  const { data, error } = await admin
    .from("one_time_pdf_purchase_claims")
    .select("id, pro_credit_amount_cents, pro_credit_eligible_until")
    .eq("pro_credit_status", "eligible")
    .eq("pro_credit_amount_cents", PACK_CREDIT_REDEEMABLE_AMOUNT_CENTS)
    .gt("pro_credit_eligible_until", now.toISOString())
    .or(`user_id.eq.${userId},pro_credit_user_id.eq.${userId}`)
    .order("pro_credit_eligible_until", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error) throw new Error(`pack-credit lookup failed: ${error.code ?? "unknown"}`);
  if (!data?.pro_credit_amount_cents || !data.pro_credit_eligible_until) return null;
  return {
    claimId: data.id as string,
    amountCents: data.pro_credit_amount_cents as number,
    eligibleUntil: data.pro_credit_eligible_until as string,
  };
}
