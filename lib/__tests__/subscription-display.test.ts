import { describe, expect, it } from "vitest";
import { buildSubscriptionDisplay, type SubscriptionDisplayInput } from "@/lib/subscription-display";

const monthly = {
  amountLabel: "$29.99",
  period: "month",
  currency: "USD",
  unitAmount: 29.99,
};

function input(overrides: Partial<SubscriptionDisplayInput> = {}): SubscriptionDisplayInput {
  return {
    status: "active",
    planSlug: "pro_monthly",
    cancelAtPeriodEnd: false,
    subscribedPrice: monthly,
    standardMonthlyPrice: monthly,
    ...overrides,
  };
}

describe("buildSubscriptionDisplay", () => {
  it("shows the actual standard monthly rate", () => {
    expect(buildSubscriptionDisplay(input())).toMatchObject({
      state: "active",
      rateHeadline: "$29.99/month",
      isGrandfatheredTwenty: false,
    });
  });

  it("shows the actual annual rate and cadence", () => {
    expect(buildSubscriptionDisplay(input({
      planSlug: "pro_annual",
      subscribedPrice: { amountLabel: "$300", period: "year", currency: "USD", unitAmount: 300 },
    }))).toMatchObject({ state: "active", rateHeadline: "$300/year" });
  });

  it("keeps the actual rate visible while trialing", () => {
    expect(buildSubscriptionDisplay(input({ status: "trialing" }))).toMatchObject({
      state: "trialing",
      rateHeadline: "$29.99/month",
    });
  });

  it("renders the required grandfathered $20 protection copy", () => {
    expect(buildSubscriptionDisplay(input({
      subscribedPrice: { amountLabel: "$20", period: "month", currency: "USD", unitAmount: 20 },
    }))).toEqual({
      state: "active",
      rateHeadline: "Grandfathered $20/month rate",
      detailLines: [
        "Standard price: $29.99/month",
        "Your rate remains active while this subscription remains active.",
        "Changing plans ends this protected rate.",
      ],
      isGrandfatheredTwenty: true,
    });
  });

  it("keeps the mandated standard-price copy if the current catalog lookup is temporarily unavailable", () => {
    expect(buildSubscriptionDisplay(input({
      subscribedPrice: { amountLabel: "$20", period: "month", currency: "USD", unitAmount: 20 },
      standardMonthlyPrice: null,
    })).detailLines[0]).toBe("Standard price: $29.99/month");
  });

  it("labels a live subscription scheduled to cancel", () => {
    expect(buildSubscriptionDisplay(input({ cancelAtPeriodEnd: true }))).toMatchObject({
      state: "canceling",
      rateHeadline: "$29.99/month",
    });
  });

  it("distinguishes past-due and inactive subscriptions", () => {
    expect(buildSubscriptionDisplay(input({ status: "past_due" })).state).toBe("past_due");
    expect(buildSubscriptionDisplay(input({ status: "canceled" }))).toMatchObject({
      state: "inactive",
      rateHeadline: "$29.99/month",
      detailLines: ["This was the rate on your previous subscription."],
    });
  });

  it("degrades safely when Stripe price display is unavailable", () => {
    expect(buildSubscriptionDisplay(input({ subscribedPrice: null }))).toMatchObject({
      state: "active",
      rateHeadline: null,
      isGrandfatheredTwenty: false,
    });
  });
});
