import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  FIRST_TOUCH_REFERRAL_SOURCES,
  LANDING_SECTIONS,
  classifyFirstTouchReferralSource,
  landingSection,
  serializeFirstTouchCookie,
} from "@/lib/first-touch";

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

  it("never lets a raw referrer, path, query or UTM value reach the tc_ft cookie", () => {
    // The provider's pipeline, run on hostile inputs: whatever the page URL,
    // referrer and campaign carry, the cookie holds two enum tokens only.
    const hostile = [
      {
        referrer: "https://www.google.com/search?q=123+Main+St+owner%40example.com",
        path: "/blog/private-slug-owner@example.com",
        utm: "",
      },
      {
        referrer: "https://chatgpt.com/c/secret-conversation-id",
        path: "/tools/cap-rate-calculator",
        utm: "",
      },
      {
        referrer: "https://partner.example/leak?token=abc",
        path: "/d/eyJ2IjoxLCJ2YWx1ZXMiOnt9fQ",
        utm: "private-campaign-name",
      },
      { referrer: "", path: "/markets/philadelphia?utm_source=newsletter-42", utm: "newsletter" },
      { referrer: "https://mail.google.com/mail/u/0/#inbox/abc", path: "/", utm: "" },
    ];
    const tokens = new Set<string>([...FIRST_TOUCH_REFERRAL_SOURCES, ...LANDING_SECTIONS]);
    for (const input of hostile) {
      const referrerHost = input.referrer ? new URL(input.referrer).hostname : "";
      const source = classifyFirstTouchReferralSource({
        referrerHost,
        currentHost: "usetruecap.com",
        campaignMedium: input.utm,
      });
      const value = serializeFirstTouchCookie({ source, section: landingSection(input.path) });
      expect(value).not.toBeNull();
      const [a, b, ...rest] = (value ?? "").split(".");
      expect(rest).toEqual([]);
      expect(tokens.has(a) && tokens.has(b)).toBe(true);
      expect(value).not.toContain("/");
      expect(value).not.toContain("?");
      expect(value).not.toContain("@");
      expect(value).not.toContain("private");
      expect(value).not.toContain(referrerHost || "\u0000");
      expect(value).not.toContain(input.utm || "\u0000");
    }
    // Raw inputs never reach the serializer as-is.
    expect(serializeFirstTouchCookie({ source: "https://www.google.com/", section: "/blog/x" })).toBeNull();
    expect(serializeFirstTouchCookie({ source: "organic_search", section: "/blog/x?utm_source=a" })).toBeNull();

    // The module that owns the cookie reads no page URL or referrer itself; the
    // provider hands it only the classifier's output and the landing section.
    const firstTouchModule = readFileSync(join(root, "lib/first-touch.ts"), "utf8");
    for (const raw of ["document.referrer", "location.pathname", "location.href", "location.search", "searchParams"]) {
      expect(firstTouchModule, raw).not.toContain(raw);
    }
    expect(firstTouchModule.match(/document\.cookie\s*=/g)).toHaveLength(1);
    const provider = readFileSync(
      join(root, "components/analytics/posthog-provider.tsx"),
      "utf8",
    );
    expect(provider).toContain("landing_section: landingSection(pathname)");
    expect(provider).not.toMatch(/landing_section:\s*pathname/);
    expect(provider).not.toMatch(/setFirstTouchAttribution\(\{[^}]*referrer/);
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
