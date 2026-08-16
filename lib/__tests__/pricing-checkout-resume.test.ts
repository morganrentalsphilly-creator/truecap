import { describe, expect, it } from "vitest";
import {
  buildCheckoutReturnPath,
  isCheckoutPlanSlug,
  resolveCheckoutResume,
  resolveCheckoutResumeForSlot,
} from "../pricing-checkout-resume";

describe("isCheckoutPlanSlug", () => {
  it("accepts exactly the four known plan keys", () => {
    expect(isCheckoutPlanSlug("pro_monthly")).toBe(true);
    expect(isCheckoutPlanSlug("pro_annual")).toBe(true);
    expect(isCheckoutPlanSlug("agent_pro_monthly")).toBe(true);
    expect(isCheckoutPlanSlug("agent_pro_annual")).toBe(true);
  });

  it("rejects anything else", () => {
    expect(isCheckoutPlanSlug("free")).toBe(false);
    expect(isCheckoutPlanSlug("pro_lifetime")).toBe(false);
    expect(isCheckoutPlanSlug("PRO_MONTHLY")).toBe(false);
    expect(isCheckoutPlanSlug("")).toBe(false);
    expect(isCheckoutPlanSlug(null)).toBe(false);
  });
});

describe("resolveCheckoutResumeForSlot", () => {
  it.each([
    ["pro_monthly", "pro_monthly"],
    ["pro_annual", "pro_monthly"],
    ["agent_pro_monthly", "agent_pro_monthly"],
    ["agent_pro_annual", "agent_pro_monthly"],
  ] as const)(
    "lets exactly one of the simultaneously mounted tier cards claim %s",
    (requestedPlan, expectedOwner) => {
      // /pricing defaults both cards back to Monthly after signup. The owning
      // tier card must still resume an Annual choice, while the other card must
      // not start a second Stripe session.
      const mountedSlots = ["pro_monthly", "agent_pro_monthly"] as const;
      const claimants = mountedSlots.filter((slot) =>
        resolveCheckoutResumeForSlot(`?checkout=${requestedPlan}`, slot)
      );

      expect(claimants).toEqual([expectedOwner]);
      expect(
        resolveCheckoutResumeForSlot(`?checkout=${requestedPlan}`, expectedOwner)?.plan
      ).toBe(requestedPlan);
    }
  );
});

describe("buildCheckoutReturnPath", () => {
  it("encodes the chosen plan with the #plans scroll target", () => {
    expect(buildCheckoutReturnPath("pro_monthly", "")).toBe(
      "/pricing?checkout=pro_monthly#plans"
    );
    expect(buildCheckoutReturnPath("pro_annual", "")).toBe(
      "/pricing?checkout=pro_annual#plans"
    );
  });

  it("preserves a campaign coupon, URL-encoded", () => {
    expect(buildCheckoutReturnPath("pro_annual", "ANALYZE20")).toBe(
      "/pricing?checkout=pro_annual&coupon=ANALYZE20#plans"
    );
    // URLSearchParams handles characters that need escaping.
    expect(buildCheckoutReturnPath("pro_monthly", "50% off")).toBe(
      "/pricing?checkout=pro_monthly&coupon=50%25+off#plans"
    );
  });
});

describe("resolveCheckoutResume", () => {
  it("resumes a valid plan and strips only the checkout param", () => {
    expect(resolveCheckoutResume("?checkout=pro_monthly")).toEqual({
      plan: "pro_monthly",
      coupon: undefined,
      strippedSearch: "",
    });
    expect(resolveCheckoutResume("?checkout=pro_annual&coupon=ANALYZE20")).toEqual({
      plan: "pro_annual",
      coupon: "ANALYZE20",
      strippedSearch: "?coupon=ANALYZE20",
    });
  });

  it("ignores unknown or missing plan values silently", () => {
    expect(resolveCheckoutResume("")).toBeNull();
    expect(resolveCheckoutResume("?coupon=ANALYZE20")).toBeNull();
    expect(resolveCheckoutResume("?checkout=")).toBeNull();
    expect(resolveCheckoutResume("?checkout=free")).toBeNull();
    expect(resolveCheckoutResume("?checkout=pro_weekly")).toBeNull();
    expect(resolveCheckoutResume("?checkout=pro_monthly%20")).toBeNull();
  });

  it("never fires on a Stripe cancel return, even if both params coexist", () => {
    // cancel_url (app/actions/billing.ts) — no checkout param present.
    expect(resolveCheckoutResume("?billing=checkout_cancelled")).toBeNull();
    // Stale / hand-edited URL carrying both: the cancel signal wins,
    // otherwise the user bounces straight back into the Stripe session
    // they just abandoned.
    expect(
      resolveCheckoutResume("?checkout=pro_monthly&billing=checkout_cancelled")
    ).toBeNull();
    // Other billing values (e.g. success) don't block a resume.
    expect(resolveCheckoutResume("?checkout=pro_monthly&billing=success")).not.toBeNull();
  });

  it("preserves unrelated params in strippedSearch", () => {
    const resume = resolveCheckoutResume("?utm_source=ads&checkout=pro_annual&ref=x");
    expect(resume?.plan).toBe("pro_annual");
    expect(resume?.strippedSearch).toBe("?utm_source=ads&ref=x");
  });
});
