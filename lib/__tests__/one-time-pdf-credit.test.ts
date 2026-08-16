import { describe, expect, it } from "vitest";
import {
  ONE_TIME_PDF_PRO_CREDIT_POLICY_VERSION,
  evaluateOneTimePdfProCredit,
} from "@/lib/one-time-pdf-credit";

const purchase = {
  paidAt: "2026-08-01T00:00:00.000Z",
  purchaseAmountCents: 500,
  purchaseCurrency: "usd",
};

describe("dormant one-time purchase → Pro credit policy", () => {
  it("cannot promise eligibility unless an explicit policy is enabled", () => {
    expect(
      evaluateOneTimePdfProCredit({
        purchase,
        policy: {
          enabled: false,
          eligibilityWindowDays: 30,
          creditPercent: 100,
          allowedCurrency: "usd",
        },
      })
    ).toEqual({ status: "not-configured" });
  });

  it("computes an exact 100% credit inside an approved configurable window", () => {
    expect(
      evaluateOneTimePdfProCredit({
        purchase,
        policy: {
          enabled: true,
          eligibilityWindowDays: 30,
          creditPercent: 100,
          allowedCurrency: "USD",
        },
        now: new Date("2026-08-15T00:00:00.000Z"),
      })
    ).toEqual({
      status: "eligible",
      amountCents: 500,
      currency: "usd",
      eligibleUntil: "2026-08-31T00:00:00.000Z",
      policyVersion: ONE_TIME_PDF_PRO_CREDIT_POLICY_VERSION,
    });
  });

  it("rejects expired, currency-mismatched, invalid, and already-applied purchases", () => {
    const policy = {
      enabled: true,
      eligibilityWindowDays: 7,
      creditPercent: 100 as const,
      allowedCurrency: "usd",
    };
    expect(
      evaluateOneTimePdfProCredit({
        purchase,
        policy,
        now: new Date("2026-08-10T00:00:00.000Z"),
      }).status
    ).toBe("expired");
    expect(
      evaluateOneTimePdfProCredit({
        purchase: { ...purchase, purchaseCurrency: "eur" },
        policy,
      }).status
    ).toBe("currency-mismatch");
    expect(
      evaluateOneTimePdfProCredit({
        purchase: { ...purchase, purchaseAmountCents: 0 },
        policy,
      }).status
    ).toBe("invalid-purchase");
    expect(
      evaluateOneTimePdfProCredit({
        purchase: { ...purchase, creditAppliedAt: "2026-08-02T00:00:00.000Z" },
        policy,
      }).status
    ).toBe("already-applied");
  });
});
