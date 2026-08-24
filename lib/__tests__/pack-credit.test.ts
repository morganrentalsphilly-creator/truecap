import type { SupabaseClient } from "@supabase/supabase-js";
import type Stripe from "stripe";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  PACK_CREDIT_REDEEMABLE_AMOUNT_CENTS,
  PACK_CREDIT_WINDOW_DAYS,
  buildPackCreditPolicy,
  findEligiblePackCredit,
  getPackCreditCouponId,
  isPackCreditConfigured,
} from "@/lib/pack-credit";
import { evaluateOneTimePdfProCredit } from "@/lib/one-time-pdf-credit";
import type { DecisionPackStripeReader } from "@/lib/stripe/decision-pack-access";

const ORIGINAL_COUPON = process.env.STRIPE_PACK_CREDIT_COUPON_ID;
const CLAIM_ID = "11111111-1111-4111-8111-111111111111";

function eligibleCreditAdmin() {
  const builder = {
    select: vi.fn(() => builder),
    eq: vi.fn(() => builder),
    gt: vi.fn(() => builder),
    or: vi.fn(() => builder),
    order: vi.fn(() => builder),
    limit: vi.fn(() => builder),
    maybeSingle: vi.fn(async () => ({
      data: {
        id: CLAIM_ID,
        checkout_session_id: "cs_test_pack_credit",
        pro_credit_amount_cents: 500,
        pro_credit_eligible_until: "2026-08-30T00:00:00.000Z",
      },
      error: null,
    })),
  };
  return {
    from: vi.fn(() => builder),
  } as unknown as SupabaseClient;
}

function currentStripe(input: {
  paymentStatus?: Stripe.Checkout.Session["payment_status"];
  amountRefunded?: number;
  disputeStatus?: Stripe.Dispute.Status;
  charges?: Stripe.Charge[];
} = {}) {
  const session = {
    id: "cs_test_pack_credit",
    object: "checkout.session",
    client_reference_id: CLAIM_ID,
    metadata: { purpose: "one_time_pdf", claim_id: CLAIM_ID },
    payment_intent: "pi_test_pack_credit",
    payment_status: input.paymentStatus ?? "paid",
    status: "complete",
  } as unknown as Stripe.Checkout.Session;
  const charges = input.charges ?? [
    {
      id: "ch_test_pack_credit",
      object: "charge",
      amount_captured: 500,
      amount_refunded: input.amountRefunded ?? 0,
      captured: true,
      disputed: Boolean(input.disputeStatus),
      paid: true,
      refunded: (input.amountRefunded ?? 0) >= 500,
      status: "succeeded",
      payment_intent: "pi_test_pack_credit",
    } as unknown as Stripe.Charge,
  ];
  const disputes = input.disputeStatus
    ? [
        {
          id: "dp_test_pack_credit",
          object: "dispute",
          payment_intent: "pi_test_pack_credit",
          status: input.disputeStatus,
        } as unknown as Stripe.Dispute,
      ]
    : [];
  return {
    checkout: {
      sessions: {
        retrieve: vi.fn(async () => session),
      },
    },
    charges: {
      list: vi.fn(async () => ({
        object: "list" as const,
        data: charges,
        has_more: false,
        url: "/v1/charges",
      })),
    },
    disputes: {
      list: vi.fn(async () => ({
        object: "list" as const,
        data: disputes,
        has_more: false,
        url: "/v1/disputes",
      })),
    },
  } as unknown as DecisionPackStripeReader;
}

afterEach(() => {
  if (ORIGINAL_COUPON === undefined) delete process.env.STRIPE_PACK_CREDIT_COUPON_ID;
  else process.env.STRIPE_PACK_CREDIT_COUPON_ID = ORIGINAL_COUPON;
});

describe("pack credit configuration", () => {
  it("fails closed while the Stripe coupon env is unset or blank", () => {
    delete process.env.STRIPE_PACK_CREDIT_COUPON_ID;
    expect(getPackCreditCouponId()).toBeNull();
    expect(isPackCreditConfigured()).toBe(false);
    expect(buildPackCreditPolicy().enabled).toBe(false);

    process.env.STRIPE_PACK_CREDIT_COUPON_ID = "   ";
    expect(getPackCreditCouponId()).toBeNull();
    expect(isPackCreditConfigured()).toBe(false);
  });

  it("enables the 7-day, 100%-of-purchase policy once the coupon exists", () => {
    process.env.STRIPE_PACK_CREDIT_COUPON_ID = " coup_pack5 ";
    expect(getPackCreditCouponId()).toBe("coup_pack5");
    expect(buildPackCreditPolicy()).toEqual({
      enabled: true,
      eligibilityWindowDays: PACK_CREDIT_WINDOW_DAYS,
      creditPercent: 100,
      allowedCurrency: "usd",
    });
    expect(PACK_CREDIT_WINDOW_DAYS).toBe(7);
  });
});

describe("pack credit end-to-end policy decision", () => {
  it("grants a $5 credit with a 7-day window on a fresh paid claim", () => {
    process.env.STRIPE_PACK_CREDIT_COUPON_ID = "coup_pack5";
    const paidAt = "2026-08-17T12:00:00.000Z";
    const decision = evaluateOneTimePdfProCredit({
      purchase: {
        paidAt,
        purchaseAmountCents: PACK_CREDIT_REDEEMABLE_AMOUNT_CENTS,
        purchaseCurrency: "usd",
      },
      policy: buildPackCreditPolicy(),
      now: new Date("2026-08-18T12:00:00.000Z"),
    });
    expect(decision).toEqual({
      status: "eligible",
      amountCents: 500,
      currency: "usd",
      eligibleUntil: "2026-08-24T12:00:00.000Z",
      policyVersion: "draft-v1",
    });
  });

  it("expires the credit exactly after the window and stays dormant unconfigured", () => {
    process.env.STRIPE_PACK_CREDIT_COUPON_ID = "coup_pack5";
    const paidAt = "2026-08-01T00:00:00.000Z";
    const expired = evaluateOneTimePdfProCredit({
      purchase: { paidAt, purchaseAmountCents: 500, purchaseCurrency: "usd" },
      policy: buildPackCreditPolicy(),
      now: new Date("2026-08-09T00:00:00.001Z"),
    });
    expect(expired.status).toBe("expired");

    delete process.env.STRIPE_PACK_CREDIT_COUPON_ID;
    const dormant = evaluateOneTimePdfProCredit({
      purchase: { paidAt, purchaseAmountCents: 500, purchaseCurrency: "usd" },
      policy: buildPackCreditPolicy(),
      now: new Date("2026-08-02T00:00:00.000Z"),
    });
    expect(dormant.status).toBe("not-configured");
  });
});

describe("pack credit checkout-time Stripe revalidation", () => {
  const now = new Date("2026-08-24T12:00:00.000Z");

  it("returns a candidate only when current Stripe state is explicitly allowed", async () => {
    await expect(
      findEligiblePackCredit(eligibleCreditAdmin(), CLAIM_ID, now, currentStripe())
    ).resolves.toEqual({
      claimId: CLAIM_ID,
      amountCents: 500,
      eligibleUntil: "2026-08-30T00:00:00.000Z",
    });
  });

  it.each([
    ["open dispute", currentStripe({ disputeStatus: "under_review" })],
    ["lost dispute", currentStripe({ disputeStatus: "lost" })],
    ["partial refund", currentStripe({ amountRefunded: 100 })],
    ["unpaid", currentStripe({ paymentStatus: "unpaid" })],
    ["incomplete payment history", currentStripe({ charges: [] })],
  ])("does not attach credit for %s", async (_label, stripe) => {
    await expect(
      findEligiblePackCredit(eligibleCreditAdmin(), CLAIM_ID, now, stripe)
    ).resolves.toBeNull();
  });

  it("throws on Stripe transport failure so billing's catch uses normal checkout", async () => {
    const stripe = currentStripe();
    vi.mocked(stripe.checkout.sessions.retrieve).mockRejectedValueOnce(
      new Error("Stripe unavailable")
    );
    await expect(
      findEligiblePackCredit(eligibleCreditAdmin(), CLAIM_ID, now, stripe)
    ).rejects.toThrow("Stripe unavailable");
  });
});
