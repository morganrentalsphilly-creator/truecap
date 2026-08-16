import { afterEach, describe, expect, it } from "vitest";
import {
  HOMEPAGE_HEADLINES,
  getMarketingOfferConfig,
} from "@/lib/marketing-offer-config";

const ORIGINAL = {
  headline: process.env.NEXT_PUBLIC_TRUECAP_HOMEPAGE_HEADLINE,
  proName: process.env.NEXT_PUBLIC_TRUECAP_PRO_NAME,
  singleDeal: process.env.NEXT_PUBLIC_SINGLE_DEAL_PRICE_VARIANT,
  guarantee: process.env.NEXT_PUBLIC_FIVE_DEAL_GUARANTEE,
  newHomepage: process.env.NEXT_PUBLIC_TRUECAP_NEW_HOMEPAGE_POSITIONING,
  threeDealGuarantee: process.env.NEXT_PUBLIC_TRUECAP_THREE_DEAL_GUARANTEE,
  guaranteeTerms: process.env.NEXT_PUBLIC_TRUECAP_GUARANTEE_TERMS_URL,
};

function restore(name: string, value: string | undefined) {
  if (value === undefined) delete process.env[name];
  else process.env[name] = value;
}

afterEach(() => {
  restore("NEXT_PUBLIC_TRUECAP_HOMEPAGE_HEADLINE", ORIGINAL.headline);
  restore("NEXT_PUBLIC_TRUECAP_PRO_NAME", ORIGINAL.proName);
  restore("NEXT_PUBLIC_SINGLE_DEAL_PRICE_VARIANT", ORIGINAL.singleDeal);
  restore("NEXT_PUBLIC_FIVE_DEAL_GUARANTEE", ORIGINAL.guarantee);
  restore("NEXT_PUBLIC_TRUECAP_NEW_HOMEPAGE_POSITIONING", ORIGINAL.newHomepage);
  restore("NEXT_PUBLIC_TRUECAP_THREE_DEAL_GUARANTEE", ORIGINAL.threeDealGuarantee);
  restore("NEXT_PUBLIC_TRUECAP_GUARANTEE_TERMS_URL", ORIGINAL.guaranteeTerms);
});

describe("marketing offer configuration", () => {
  it("keeps production-compatible defaults when switches are missing or invalid", () => {
    delete process.env.NEXT_PUBLIC_TRUECAP_HOMEPAGE_HEADLINE;
    process.env.NEXT_PUBLIC_TRUECAP_PRO_NAME = "invalid";
    delete process.env.NEXT_PUBLIC_SINGLE_DEAL_PRICE_VARIANT;
    delete process.env.NEXT_PUBLIC_FIVE_DEAL_GUARANTEE;
    delete process.env.NEXT_PUBLIC_TRUECAP_NEW_HOMEPAGE_POSITIONING;
    delete process.env.NEXT_PUBLIC_TRUECAP_THREE_DEAL_GUARANTEE;
    delete process.env.NEXT_PUBLIC_TRUECAP_GUARANTEE_TERMS_URL;

    const config = getMarketingOfferConfig();

    expect(config.homepageHeadline).toBe(HOMEPAGE_HEADLINES.a);
    expect(config.proOfferName).toBe("TrueCap Pro");
    expect(config.singleDeal).toMatchObject({ amount: 5, priceLabel: "$5" });
    expect(config.fiveDealGuaranteeEnabled).toBe(false);
    expect(config.threeDealGuaranteeEnabled).toBe(false);
  });

  it("selects the documented offer experiments without touching subscription billing", () => {
    process.env.NEXT_PUBLIC_TRUECAP_HOMEPAGE_HEADLINE = "b";
    process.env.NEXT_PUBLIC_TRUECAP_PRO_NAME = "offer_engine";
    process.env.NEXT_PUBLIC_SINGLE_DEAL_PRICE_VARIANT = "p19";
    process.env.NEXT_PUBLIC_FIVE_DEAL_GUARANTEE = "true";

    const config = getMarketingOfferConfig();

    expect(config.homepageHeadline).toBe(HOMEPAGE_HEADLINES.b);
    expect(config.proOfferName).toBe("TrueCap Offer Engine");
    expect(config.singleDeal).toMatchObject({
      amount: 19,
      priceLabel: "$19",
      stripeEnvKey: "STRIPE_PRICE_SINGLE_DEAL_19",
    });
    expect(config.fiveDealGuaranteeEnabled).toBe(true);
  });

  it("supports the prepared $15 Decision Pack test without making it the default", () => {
    process.env.NEXT_PUBLIC_SINGLE_DEAL_PRICE_VARIANT = "p15";

    expect(getMarketingOfferConfig().singleDeal).toEqual({
      amount: 15,
      priceLabel: "$15",
      stripeEnvKey: "STRIPE_PRICE_SINGLE_DEAL_15",
    });
  });

  it("keeps the new walk-away positioning dark until its rollout flag is enabled", () => {
    process.env.NEXT_PUBLIC_TRUECAP_HOMEPAGE_HEADLINE = "b";
    process.env.NEXT_PUBLIC_TRUECAP_NEW_HOMEPAGE_POSITIONING = "true";

    const config = getMarketingOfferConfig();

    expect(config.newHomepagePositioningEnabled).toBe(true);
    expect(config.homepageHeadlineVariant).toBe("walkaway");
    expect(config.homepageHeadline).toBe(HOMEPAGE_HEADLINES.walkaway);
  });

  it("requires both the guarantee flag and published HTTPS or local terms", () => {
    process.env.NEXT_PUBLIC_TRUECAP_THREE_DEAL_GUARANTEE = "true";
    delete process.env.NEXT_PUBLIC_TRUECAP_GUARANTEE_TERMS_URL;
    expect(getMarketingOfferConfig().threeDealGuaranteeEnabled).toBe(false);

    process.env.NEXT_PUBLIC_TRUECAP_GUARANTEE_TERMS_URL = "javascript:alert(1)";
    expect(getMarketingOfferConfig().threeDealGuaranteeEnabled).toBe(false);

    process.env.NEXT_PUBLIC_TRUECAP_GUARANTEE_TERMS_URL = "/legal/three-deal-guarantee";
    expect(getMarketingOfferConfig()).toMatchObject({
      threeDealGuaranteeEnabled: true,
      threeDealGuaranteeTermsUrl: "/legal/three-deal-guarantee",
    });
  });
});
