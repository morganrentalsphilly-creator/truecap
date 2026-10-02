import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  FIRST_TOUCH_REFERRAL_SOURCES,
  LANDING_SECTIONS,
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
    expect(analytics).toContain("classifyFirstTouchReferralSource(");
    expect(provider).toContain("recordFirstTouchLanding(");
    expect(provider).toContain("route_category: routeCategory(pathname)");
    expect(provider).not.toContain("referrer_host:");
    expect(provider).not.toContain("landing_page:");
    expect(provider).not.toContain("attribution_medium:");
  });

  describe("the tc_ft cookie and the tab's session record", () => {
    afterEach(() => {
      vi.unstubAllGlobals();
    });

    /**
     * The provider's real pipeline (lib/analytics.ts recordFirstTouchLanding)
     * in a stubbed browser with consent granted: returns everything it wrote
     * to the cookie jar and to sessionStorage.
     */
    async function land(input: { referrer: string; path: string; search: string }) {
      const session = new Map<string, string>();
      const cookieWrites: string[] = [];
      vi.stubGlobal("window", {
        location: { protocol: "https:", hostname: "usetruecap.com" },
        localStorage: {
          getItem: (key: string) => (key === "truecap_cookie_consent_v1" ? "granted" : null),
          setItem: () => undefined,
          removeItem: () => undefined,
        },
        sessionStorage: {
          getItem: (key: string) => session.get(key) ?? null,
          setItem: (key: string, value: string) => session.set(key, value),
          removeItem: (key: string) => session.delete(key),
        },
      });
      vi.stubGlobal("document", {
        get cookie() {
          return "";
        },
        set cookie(value: string) {
          cookieWrites.push(value);
        },
      });
      vi.resetModules();
      const { recordFirstTouchLanding } = await import("@/lib/analytics");
      recordFirstTouchLanding({
        referrer: input.referrer,
        currentHost: "usetruecap.com",
        query: new URLSearchParams(input.search),
        pathname: input.path,
      });
      return { session: [...session.values()], cookieWrites };
    }

    it("never lets a raw referrer, path, query, UTM or ad click-id value reach the cookie or storage", async () => {
      // Whatever the page URL, referrer and campaign carry, the cookie holds
      // two enum tokens only and the session record two enum values.
      const hostile = [
        {
          referrer: "https://www.google.com/search?q=123+Main+St+owner%40example.com",
          path: "/blog/private-slug-owner@example.com",
          search: "",
          secrets: ["123+Main", "owner", "private-slug", "search?q"],
          expected: "organic_search.blog",
        },
        {
          referrer: "https://chatgpt.com/c/secret-conversation-id",
          path: "/tools/cap-rate-calculator",
          search: "",
          secrets: ["secret-conversation-id", "chatgpt.com", "cap-rate-calculator"],
          expected: "organic_ai.tools",
        },
        {
          referrer: "https://partner.example/leak?token=abc",
          path: "/d/eyJ2IjoxLCJ2YWx1ZXMiOnt9fQ",
          search: "utm_medium=private-campaign-name",
          secrets: ["partner.example", "token=abc", "eyJ2", "private-campaign-name"],
          expected: "campaign.other",
        },
        {
          referrer: "",
          path: "/markets/philadelphia",
          search: "utm_source=newsletter-42&utm_medium=newsletter&utm_campaign=owner%40example.com",
          secrets: ["philadelphia", "newsletter-42", "owner", "utm_"],
          expected: "email.markets",
        },
        {
          referrer: "https://mail.google.com/mail/u/0/#inbox/abc",
          path: "/",
          search: "",
          secrets: ["mail.google.com", "inbox"],
          expected: "email.home",
        },
        {
          // An auto-tagged Google Ads click: the click id is a per-click value.
          referrer: "https://www.google.com/",
          path: "/tools/cap-rate-calculator",
          search: "gclid=Cj0KCQjw-private-click-id&gbraid=0AAAAA-private&msclkid=private-msclkid",
          secrets: ["Cj0K", "click-id", "0AAAAA", "msclkid", "gclid"],
          // Paid, not organic: the ads' Final URLs carry no UTM parameters.
          expected: "paid_search.tools",
        },
        {
          // Audit row P2-112: a paid click to the agent page has its own
          // section token; the hyphenated path segment is never written.
          referrer: "https://www.google.com/",
          path: "/for-agents",
          search: "gclid=TEST_AUDIT_ONLY_DO_NOT_COUNT",
          secrets: ["TEST_AUDIT", "gclid", "for-agents"],
          expected: "paid_search.for_agents",
        },
      ];
      const tokens = new Set<string>([...FIRST_TOUCH_REFERRAL_SOURCES, ...LANDING_SECTIONS]);
      for (const input of hostile) {
        const { session, cookieWrites } = await land(input);
        expect(cookieWrites, input.path).toHaveLength(1);
        const value = /^tc_ft=([^;]*);/.exec(cookieWrites[0])?.[1] ?? "";
        expect(value, input.path).toBe(input.expected);
        const [a, b, ...rest] = value.split(".");
        expect(rest, value).toEqual([]);
        expect(tokens.has(a) && tokens.has(b), value).toBe(true);
        expect(session, input.path).toEqual([JSON.stringify({ referral_source: a, landing_section: b })]);
        const written = JSON.stringify([...session, ...cookieWrites]);
        for (const secret of [...input.secrets, "/blog", "/tools", "?", "@", "http"]) {
          expect(written, `${input.path} → ${secret}`).not.toContain(secret);
        }
      }
    });

    it("the serializer and the cookie module never accept a raw value", () => {
      expect(serializeFirstTouchCookie({ source: "https://www.google.com/", section: "/blog/x" })).toBeNull();
      expect(serializeFirstTouchCookie({ source: "organic_search", section: "/blog/x?utm_source=a" })).toBeNull();
      expect(serializeFirstTouchCookie({ source: "paid_search", section: "tools?gclid=Cj0K" })).toBeNull();

      // The module that owns the cookie reads no page URL or referrer itself;
      // lib/analytics.ts hands it only the classifier's output and the section.
      const firstTouchModule = readFileSync(join(root, "lib/first-touch.ts"), "utf8");
      for (const raw of ["document.referrer", "location.pathname", "location.href", "location.search", "searchParams", ".get("]) {
        expect(firstTouchModule, raw).not.toContain(raw);
      }
      expect(firstTouchModule.match(/document\.cookie\s*=/g)).toHaveLength(1);
      const provider = readFileSync(
        join(root, "components/analytics/posthog-provider.tsx"),
        "utf8",
      );
      expect(provider).not.toMatch(/landing_section:\s*pathname/);
      expect(provider).not.toContain("setFirstTouchAttribution(");
    });
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
