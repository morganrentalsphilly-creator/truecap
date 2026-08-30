import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import {
  ANALYTICS_EVENT_DICTIONARY,
  DEPRECATED_PASSIVE_GROWTH_EVENT_NAMES,
  PRIVACY_SAFE_FUNNEL_EVENTS,
  sanitizeAnalyticsEventProperties,
} from "@/lib/analytics-event-dictionary";

const read = (path: string) => readFileSync(join(process.cwd(), path), "utf8");

const ALLOWED_FUNNEL_PROPERTIES = new Set([
  "route_category",
  "content_type",
  "calculator_slug",
  "plan_identifier",
  "referral_source",
]);

function occurrences(source: string, marker: string): number {
  return source.split(marker).length - 1;
}

describe("privacy-safe passive-growth analytics", () => {
  it("documents the canonical ordered vocabulary", () => {
    expect(PRIVACY_SAFE_FUNNEL_EVENTS).toEqual([
      "analysis_started",
      "analysis_completed",
      "account_created",
      "product_evaluation_started",
      "upgrade_started",
      "subscription_started",
      "content_cta_clicked",
      "embed_cta_clicked",
      "shared_analysis_opened",
      "shared_analysis_copied",
    ]);
    for (const event of PRIVACY_SAFE_FUNNEL_EVENTS) {
      expect(ANALYTICS_EVENT_DICTIONARY[event]).toBeDefined();
      expect(
        ANALYTICS_EVENT_DICTIONARY[event].allowedProperties.every((key) =>
          ALLOWED_FUNNEL_PROPERTIES.has(key),
        ),
        event,
      ).toBe(true);
    }
  });

  it("fails closed for unknown events and rejects identifiers and deal data", () => {
    expect(
      sanitizeAnalyticsEventProperties("unknown_future_event", {
        route_category: "content",
        property_address: "private",
        listing_url: "https://example.com/private",
        monthly_rent: 2400,
        stripe_session_id: "cs_private",
      }),
    ).toBeUndefined();
    expect(
      sanitizeAnalyticsEventProperties("analysis_completed", {
        route_category: "analyzer",
        calculator_slug: "rental-property",
        address: "private",
        listing_url: "https://example.com/private",
        purchase_price: 300_000,
        financing_inputs: "private",
        verdict: "buy",
      }),
    ).toEqual({
      route_category: "analyzer",
      calculator_slug: "rental-property",
    });
    expect(
      sanitizeAnalyticsEventProperties("max_offer_unlock_clicked", {
        placement: "post_analysis",
        offer: 325_000,
      }),
    ).toEqual({ placement: "post_analysis" });
  });

  it("emits one canonical event at each analysis and billing transition", () => {
    const calculator = read("components/investcalc/investcalc-page.tsx");
    const billing = read("app/actions/billing.ts");
    const webhook = read("app/api/stripe/webhooks/route.ts");

    expect(calculator).toContain('trackEvent("analysis_started", {');
    expect(calculator).toContain('trackEvent("analysis_completed", {');
    expect(occurrences(calculator, 'trackEvent("analysis_started"')).toBe(1);
    expect(occurrences(calculator, 'trackEvent("analysis_completed"')).toBe(1);
    for (const alias of [
      "analyzer_started",
      "analysis_run",
      "analyzer_completed",
      "instant_screen_generated",
    ]) {
      expect(calculator).not.toContain(`trackEvent("${alias}", {`);
    }
    expect(billing).toContain('event: "upgrade_started"');
    expect(webhook).toContain('event: "subscription_started"');
    expect(occurrences(billing, 'event: "upgrade_started"')).toBe(1);
    expect(occurrences(webhook, 'event: "subscription_started"')).toBe(1);
    const canonicalSources = [calculator, billing, webhook].join("\n");
    for (const deprecated of DEPRECATED_PASSIVE_GROWTH_EVENT_NAMES) {
      expect(canonicalSources).not.toContain(`trackEvent("${deprecated}"`);
      expect(canonicalSources).not.toContain(`event: "${deprecated}"`);
    }
  });

  it("uses one account/evaluation pair per successful signup method", () => {
    const emailSignup = read("components/auth/sign-up-form.tsx");
    const oauthCallback = read("app/auth/callback/route.ts");

    for (const source of [emailSignup, oauthCallback]) {
      expect(
        occurrences(source, 'event: "account_created"') +
          occurrences(source, 'trackEvent("account_created"'),
      ).toBe(1);
      expect(
        occurrences(source, 'event: "product_evaluation_started"') +
          occurrences(source, 'trackEvent("product_evaluation_started"'),
      ).toBe(1);
      expect(source).not.toContain('trackEvent("signup_completed"');
      expect(source).not.toContain('event: "signup_completed"');
    }
  });

  it("wires content, embed, and share entry points without identity fields", () => {
    const content = read("components/analytics/tracked-content-cta-link.tsx");
    const embed = read("components/embed/embed-referral-tracker.tsx");
    const share = read("components/analytics/track-shared-deal-view.tsx");

    expect(content).toContain('trackEvent("content_cta_clicked"');
    expect(embed).toContain('trackEvent("embed_cta_clicked"');
    expect(share).toContain('trackEvent("shared_analysis_opened"');
    expect(occurrences(content, 'trackEvent("content_cta_clicked"')).toBe(1);
    expect(occurrences(embed, 'trackEvent("embed_cta_clicked"')).toBe(1);
    expect(occurrences(share, 'trackEvent("shared_analysis_opened"')).toBe(1);
    for (const source of [content, embed, share]) {
      expect(source).not.toMatch(
        /ownerId|dealId|share_token|address\s*:|email\s*:/,
      );
    }
  });
});
