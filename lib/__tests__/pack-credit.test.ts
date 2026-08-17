import { afterEach, describe, expect, it } from "vitest";
import {
  PACK_CREDIT_REDEEMABLE_AMOUNT_CENTS,
  PACK_CREDIT_WINDOW_DAYS,
  buildPackCreditPolicy,
  getPackCreditCouponId,
  isPackCreditConfigured,
} from "@/lib/pack-credit";
import { evaluateOneTimePdfProCredit } from "@/lib/one-time-pdf-credit";

const ORIGINAL_COUPON = process.env.STRIPE_PACK_CREDIT_COUPON_ID;

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
