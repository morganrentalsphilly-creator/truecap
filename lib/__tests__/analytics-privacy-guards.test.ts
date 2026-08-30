import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = join(import.meta.dirname, "../..");

describe("analytics privacy guards", () => {
  it("does not use broad DOM autocapture or page-leave URL capture", () => {
    const source = readFileSync(join(root, "lib/analytics.ts"), "utf8");
    expect(source).toContain("autocapture: false");
    expect(source).toContain("capture_pageleave: false");
  });

  it("tracks route-only pageviews and never identifies with email", () => {
    const source = readFileSync(
      join(root, "components/analytics/posthog-provider.tsx"),
      "utf8",
    );
    expect(source).toContain(
      "trackPageview(`${window.location.origin}${pathname}`)",
    );
    expect(source).not.toContain("email: data.user.email");
    expect(source).not.toContain("email: session.user.email");
    expect(source).not.toContain("searchParams?.toString()");
  });

  it("classifies first-touch attribution without persisting raw campaign or referrer data", () => {
    const analytics = readFileSync(join(root, "lib/analytics.ts"), "utf8");
    const provider = readFileSync(
      join(root, "components/analytics/posthog-provider.tsx"),
      "utf8",
    );
    expect(analytics).toContain("FIRST_TOUCH_REFERRAL_SOURCES");
    expect(analytics).toContain("setFirstTouchAttribution");
    expect(analytics).toContain("{ ...attribution, ...properties }");
    expect(provider).toContain("classifyFirstTouchReferralSource");
    expect(provider).toContain("route_category: routeCategory(pathname)");
    expect(provider).not.toContain("referrer_host:");
    expect(provider).not.toContain("landing_page:");
    expect(provider).not.toContain("attribution_medium:");
  });

  it("never uses a newsletter email as a product-analytics identity", () => {
    const source = readFileSync(
      join(root, "app/actions/newsletter.ts"),
      "utf8",
    );
    expect(source).toContain('distinctId: "$newsletter"');
    expect(source).not.toContain("distinctId: parsed.data.email");
  });
});
