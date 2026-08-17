import { afterEach, describe, expect, it } from "vitest";
import {
  HOMEPAGE_HEADLINES,
  getMarketingOfferConfig,
} from "@/lib/marketing-offer-config";

const ORIGINAL = {
  headline: process.env.NEXT_PUBLIC_TRUECAP_HOMEPAGE_HEADLINE,
  proName: process.env.NEXT_PUBLIC_TRUECAP_PRO_NAME,
  singleDeal: process.env.NEXT_PUBLIC_SINGLE_DEAL_PRICE_VARIANT,
  newHomepage: process.env.NEXT_PUBLIC_TRUECAP_NEW_HOMEPAGE_POSITIONING,
  guaranteeDisabled: process.env.NEXT_PUBLIC_TRUECAP_GUARANTEE_DISABLED,
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
  restore("NEXT_PUBLIC_TRUECAP_NEW_HOMEPAGE_POSITIONING", ORIGINAL.newHomepage);
  restore("NEXT_PUBLIC_TRUECAP_GUARANTEE_DISABLED", ORIGINAL.guaranteeDisabled);
  restore("NEXT_PUBLIC_TRUECAP_GUARANTEE_TERMS_URL", ORIGINAL.guaranteeTerms);
});

describe("marketing offer configuration", () => {
  it("keeps production-compatible defaults when switches are missing or invalid", () => {
    delete process.env.NEXT_PUBLIC_TRUECAP_HOMEPAGE_HEADLINE;
    process.env.NEXT_PUBLIC_TRUECAP_PRO_NAME = "invalid";
    delete process.env.NEXT_PUBLIC_SINGLE_DEAL_PRICE_VARIANT;
    delete process.env.NEXT_PUBLIC_TRUECAP_NEW_HOMEPAGE_POSITIONING;
    delete process.env.NEXT_PUBLIC_TRUECAP_GUARANTEE_DISABLED;
    delete process.env.NEXT_PUBLIC_TRUECAP_GUARANTEE_TERMS_URL;

    const config = getMarketingOfferConfig();

    expect(config.homepageHeadline).toBe(HOMEPAGE_HEADLINES.never_overpay);
    expect(config.proOfferName).toBe("TrueCap Pro");
    expect(config.singleDeal).toMatchObject({ amount: 5, priceLabel: "$5" });
    // The Never Overpay Guarantee defaults ON with the in-repo /guarantee
    // terms page — the published-terms invariant holds structurally because
    // the route ships in the same deploy as this config.
    expect(config.guaranteeEnabled).toBe(true);
    expect(config.guaranteeTermsUrl).toBe("/guarantee");
  });

  it("selects the documented offer experiments without touching subscription billing", () => {
    process.env.NEXT_PUBLIC_TRUECAP_HOMEPAGE_HEADLINE = "b";
    process.env.NEXT_PUBLIC_TRUECAP_PRO_NAME = "offer_engine";
    process.env.NEXT_PUBLIC_SINGLE_DEAL_PRICE_VARIANT = "p19";

    const config = getMarketingOfferConfig();

    expect(config.homepageHeadline).toBe(HOMEPAGE_HEADLINES.b);
    expect(config.proOfferName).toBe("TrueCap Offer Engine");
    expect(config.singleDeal).toMatchObject({
      amount: 19,
      priceLabel: "$19",
      stripeEnvKey: "STRIPE_PRICE_SINGLE_DEAL_19",
    });
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

  it("honors the guarantee kill switch and keeps the terms link safe", () => {
    // Kill switch turns every guarantee surface off in one env var.
    process.env.NEXT_PUBLIC_TRUECAP_GUARANTEE_DISABLED = "1";
    expect(getMarketingOfferConfig().guaranteeEnabled).toBe(false);
    delete process.env.NEXT_PUBLIC_TRUECAP_GUARANTEE_DISABLED;

    // An unsafe terms override can never replace the in-repo terms page.
    process.env.NEXT_PUBLIC_TRUECAP_GUARANTEE_TERMS_URL = "javascript:alert(1)";
    expect(getMarketingOfferConfig().guaranteeTermsUrl).toBe("/guarantee");

    // A valid override is respected.
    process.env.NEXT_PUBLIC_TRUECAP_GUARANTEE_TERMS_URL = "/legal/never-overpay-guarantee";
    expect(getMarketingOfferConfig()).toMatchObject({
      guaranteeEnabled: true,
      guaranteeTermsUrl: "/legal/never-overpay-guarantee",
    });
  });
});
