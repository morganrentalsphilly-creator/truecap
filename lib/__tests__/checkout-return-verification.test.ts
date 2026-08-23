import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  CHECKOUT_RETURN_MAX_AGE_MS,
  verifyCheckoutReturnCandidate,
  type CheckoutReturnCandidate,
} from "@/lib/stripe/checkout-return";

const NOW = Date.UTC(2026, 7, 23, 16, 0, 0);

function candidate(
  overrides: Partial<CheckoutReturnCandidate> = {}
): CheckoutReturnCandidate {
  return {
    mode: "subscription",
    status: "complete",
    clientReferenceId: "user-123",
    metadataUserId: "user-123",
    metadataPlanSlug: "pro_monthly",
    priceId: "price_current_pro",
    unitAmount: 2_999,
    currency: "usd",
    createdAtSeconds: Math.floor((NOW - 5 * 60 * 1000) / 1000),
    hasSubscription: true,
    ...overrides,
  };
}

function verify(overrides: Partial<CheckoutReturnCandidate> = {}) {
  return verifyCheckoutReturnCandidate({
    candidate: candidate(overrides),
    expectedUserId: "user-123",
    expectedPriceId: "price_current_pro",
    nowMs: NOW,
  });
}

describe("post-checkout return verification", () => {
  it("accepts a recent completed subscription Checkout bound to the user and Price", () => {
    expect(verify()).toEqual({
      purchasedPlanSlug: "pro_monthly",
      conversionValue: 29.99,
    });
  });

  it.each([
    ["wrong mode", { mode: "payment" }],
    ["not complete", { status: "open" }],
    ["missing subscription", { hasSubscription: false }],
    ["wrong client reference", { clientReferenceId: "other-user" }],
    ["wrong metadata user", { metadataUserId: "other-user" }],
    ["unknown plan", { metadataPlanSlug: "free" }],
    ["wrong Price", { priceId: "price_other" }],
    ["wrong currency", { currency: "eur" }],
  ] as const)("rejects %s", (_label, override) => {
    expect(verify(override)).toBeNull();
  });

  it("rejects stale and future sessions", () => {
    expect(
      verify({
        createdAtSeconds: Math.floor((NOW - CHECKOUT_RETURN_MAX_AGE_MS - 1_000) / 1000),
      })
    ).toBeNull();
    expect(verify({ createdAtSeconds: Math.floor((NOW + 60_000) / 1000) })).toBeNull();
  });
});

describe("post-checkout browser integration", () => {
  const root = join(__dirname, "..", "..");
  const action = readFileSync(join(root, "app/actions/billing.ts"), "utf8");
  const banner = readFileSync(
    join(root, "components/marketing/billing-success-banner.tsx"),
    "utf8"
  );

  it("routes the URL through the fail-closed server verifier", () => {
    expect(action).toContain("verifyCheckoutReturnCandidate");
    expect(action).toContain('session.client_reference_id');
    expect(action).toContain('session.metadata?.user_id');
    expect(action).toContain('session.metadata?.plan_slug');
    expect(banner).toContain("verifyCheckoutReturnAction({ sessionId })");
  });

  it("gates success analytics, conversion, banner, and polling on verification", () => {
    expect(banner).toContain('if (!verifiedReturn) return;');
    expect(banner).toContain('billingStatus={verifiedReturn ? "success" : undefined}');
    expect(banner).toContain('value={verifiedReturn?.conversionValue}');
    expect(banner).not.toContain('billingStatus={billing ?? undefined}');
  });
});
