import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  getPostAnalysisOfferConfig,
  resolvePostAnalysisOfferCoupon,
} from "@/lib/post-analysis-offer";

describe("post-analysis campaign offer", () => {
  it("allows promotional email only when code and Stripe coupon are explicit", () => {
    expect(
      getPostAnalysisOfferConfig({
        POST_ANALYSIS_COUPON_CODE: "WELCOME",
        POST_ANALYSIS_COUPON_ID: "coupon_123",
      })
    ).toEqual({ code: "WELCOME", couponId: "coupon_123", canSendPromotion: true });

    expect(
      getPostAnalysisOfferConfig({ POST_ANALYSIS_COUPON_CODE: "WELCOME" })
        .canSendPromotion
    ).toBe(false);
  });

  it("resolves configured codes case-insensitively", () => {
    expect(
      resolvePostAnalysisOfferCoupon("welcome", {
        POST_ANALYSIS_COUPON_CODE: "WELCOME",
        POST_ANALYSIS_COUPON_ID: "coupon_123",
      })
    ).toEqual({ kind: "configured", code: "WELCOME", couponId: "coupon_123" });
  });

  it("fail-closes a recognized code when its Stripe coupon is missing", () => {
    expect(
      resolvePostAnalysisOfferCoupon("WELCOME", {
        POST_ANALYSIS_COUPON_CODE: "WELCOME",
      })
    ).toEqual({ kind: "misconfigured", code: "WELCOME" });

    // Protect already-emailed legacy ANALYZE20 links even if both env vars
    // disappear: they must not silently create a full-price checkout.
    expect(resolvePostAnalysisOfferCoupon("ANALYZE20", {})).toEqual({
      kind: "misconfigured",
      code: "ANALYZE20",
    });
  });

  it("ignores unrelated query-string values", () => {
    expect(resolvePostAnalysisOfferCoupon("NOT_A_CAMPAIGN", {})).toEqual({ kind: "none" });
  });

  it("wires the send gate and checkout fail-closed branch before Stripe checkout", () => {
    const root = process.cwd();
    const capture = readFileSync(
      join(root, "app/actions/post-analysis-email-capture.ts"),
      "utf8"
    );
    const billing = readFileSync(join(root, "app/actions/billing.ts"), "utf8");

    expect(capture).toContain("requiresConfiguredOffer: true");
    expect(capture).toContain("postAnalysisOffer.canSendPromotion");
    expect(billing).toContain('offerResolution.kind === "misconfigured"');
    expect(billing.indexOf('offerResolution.kind === "misconfigured"')).toBeLessThan(
      billing.indexOf("stripe.checkout.sessions.create")
    );
  });
});
