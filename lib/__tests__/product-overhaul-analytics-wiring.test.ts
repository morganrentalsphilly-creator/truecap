import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import {
  ANALYTICS_EVENT_DICTIONARY,
  sanitizeAnalyticsEventProperties,
} from "@/lib/analytics-event-dictionary";

const read = (path: string) => readFileSync(join(process.cwd(), path), "utf8");

describe("Product Overhaul analytics wiring", () => {
  it("wires subscription funnel events with the documented property names", () => {
    const billing = read("app/actions/billing.ts");
    const webhook = read("app/api/stripe/webhooks/route.ts");
    expect(billing).toContain('event: "upgrade_started"');
    expect(billing).toContain("plan_identifier: parsed.data.planSlug");
    expect(webhook).toContain('event: "subscription_started"');
    expect(webhook).not.toContain('event: "subscription_activated"');
    expect(webhook).toContain("plan_identifier: session.metadata?.plan_slug");
    expect(webhook).toContain('event: "subscription_cancelled"');
    expect(webhook).toContain('event: "upgrade_credit_applied"');
    expect(webhook).toContain("destination_plan: session.metadata?.plan_slug");
    expect(webhook).not.toContain('event: "pack_credit_applied"');
  });

  it("wires privacy-minimized share, decision, and provider outcomes", () => {
    const shares = read("app/actions/public-shares.ts");
    const deals = read("app/actions/saved-analyses.ts");
    const comps = read("app/actions/property-comps.ts");
    const shortlist = read("components/investcalc/batch-triage-client.tsx");
    expect(shares).toContain('event: "share_revoked"');
    expect(deals).toContain('event: "decision_recorded"');
    expect(deals).toContain('event: "client_decision_assigned"');
    const promotionCalls = shortlist.match(
      /trackEvent\s*\(\s*"shortlist_item_promoted"\s*,/g,
    );
    const privacySafePromotionCalls = shortlist.match(
      /trackEvent\s*\(\s*"shortlist_item_promoted"\s*,\s*\{\s*source:\s*"triage",?\s*\}\s*\)/g,
    );
    expect(promotionCalls?.length).toBeGreaterThan(0);
    expect(privacySafePromotionCalls).toHaveLength(promotionCalls?.length ?? 0);
    for (const event of [
      "data_lookup_started",
      "data_lookup_succeeded",
      "data_lookup_failed",
    ]) {
      expect(comps).toContain(`event: "${event}"`);
    }
    expect(comps).not.toContain("properties: { address:");
  });

  it("wires launch activation and cumulative retention milestones", () => {
    const calculator = read("components/investcalc/investcalc-page.tsx");
    const signup = read("components/auth/sign-up-form.tsx");
    const provider = read("components/analytics/posthog-provider.tsx");
    const callback = read("app/auth/callback/route.ts");
    const queryPlan = read("docs/launch-analytics-query-plan.md");
    expect(calculator).toContain('trackEvent("first_analysis_completed", {');
    expect(calculator).toContain('trackEvent("evaluation_deal_completed", {');
    expect(calculator).toContain('trackEvent("second_deal_completed", {');
    expect(signup).toContain('trackEvent("account_created")');
    expect(signup).toContain('trackEvent("product_evaluation_started")');
    expect(callback).toContain('event: "account_created"');
    expect(callback).toContain('referral_source: "google_oauth"');
    expect(callback).toContain('event: "product_evaluation_started"');
    expect(provider).toContain('event: "retained_30d" as const');
    expect(provider).toContain('event: "retained_90d" as const');
    expect(provider).toContain('activity: "authenticated_visit"');
    expect(queryPlan).toContain("days 30–59");
    expect(queryPlan).toContain("days 90–119");
  });

  it("wires the Pro paywall, paid-claim recovery, and input-readiness workflows", () => {
    const calculator = read("components/investcalc/investcalc-page.tsx");
    expect(calculator).toContain('trackEvent("paywall_viewed", {');
    expect(calculator).not.toContain("createOneTimePdfCheckoutAction");
    expect(calculator).not.toContain("handleBuyOneTimePdf");
    expect(calculator).not.toContain(
      'trackEvent("complete_decision_checkout_started", {',
    );
    expect(calculator).toContain(
      'trackEvent("complete_decision_purchased", {})',
    );
    expect(calculator).toContain("if (!verified.recovered) {");
    expect(calculator).toContain("verifyOneTimePdfPaymentAction({");
    expect(calculator).toContain('trackEvent("material_input_verified", {');
    expect(calculator).toContain('trackEvent("decision_readiness_changed", {');
    expect(calculator).not.toContain(
      'trackEvent("complete_decision_trial_started"',
    );
    expect(calculator).not.toContain(
      'trackEvent("complete_decision_trial_completed"',
    );
  });

  it("drops undocumented and sensitive fields at runtime", () => {
    expect(ANALYTICS_EVENT_DICTIONARY.subscription_started).toBeDefined();
    expect(
      sanitizeAnalyticsEventProperties("subscription_started", {
        plan_identifier: "pro_monthly",
        referral_source: "stripe_checkout",
        plan_slug: "legacy-key",
        email: "private@example.com",
      }),
    ).toEqual({
      plan_identifier: "pro_monthly",
      referral_source: "stripe_checkout",
    });
    expect(
      sanitizeAnalyticsEventProperties("legacy_billing_event", {
        claim_id: "claim-secret",
        stripe_session_id: "cs_secret",
        customer_id: "cus_secret",
        share_token: "share-secret",
        plan: "pro_monthly",
      }),
    ).toBeUndefined();
    expect(
      sanitizeAnalyticsEventProperties("retained_30d", {
        activity: "authenticated_visit",
        user_id: "private-user-id",
        purchase_price: 300_000,
      }),
    ).toEqual({ activity: "authenticated_visit" });
  });
});
