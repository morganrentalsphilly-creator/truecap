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
    expect(billing).toContain('event: "subscription_checkout_started"');
    expect(billing).toContain("plan: parsed.data.planSlug");
    expect(webhook).toContain('event: "subscription_started"');
    expect(webhook).toContain('event: "subscription_activated"');
    expect(webhook).toContain("plan: session.metadata?.plan_slug");
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
    expect(shortlist).toContain('trackEvent("shortlist_item_promoted", { source: "triage" })');
    for (const event of [
      "data_lookup_started",
      "data_lookup_succeeded",
      "data_lookup_failed",
    ]) {
      expect(comps).toContain(`event: "${event}"`);
    }
    expect(comps).not.toContain("properties: { address:");
  });

  it("wires the real Pack paywall/purchase and input-readiness workflows", () => {
    const calculator = read("components/investcalc/investcalc-page.tsx");
    expect(calculator).toContain('trackEvent("paywall_viewed", {');
    expect(calculator).toContain(
      'trackEvent("complete_decision_checkout_started", {'
    );
    expect(calculator).toContain(
      'trackEvent("complete_decision_purchased", {})'
    );
    expect(calculator).toContain('trackEvent("material_input_verified", {');
    expect(calculator).toContain(
      'trackEvent("decision_readiness_changed", {'
    );
    expect(calculator).not.toContain(
      'trackEvent("complete_decision_trial_started"'
    );
    expect(calculator).not.toContain(
      'trackEvent("complete_decision_trial_completed"'
    );
  });

  it("drops undocumented and sensitive fields at runtime", () => {
    expect(ANALYTICS_EVENT_DICTIONARY.subscription_activated).toBeDefined();
    expect(
      sanitizeAnalyticsEventProperties("subscription_activated", {
        plan: "pro_monthly",
        interval: "monthly",
        trial_granted: false,
        plan_slug: "legacy-key",
        email: "private@example.com",
      })
    ).toEqual({ plan: "pro_monthly", interval: "monthly", trial_granted: false });
    expect(
      sanitizeAnalyticsEventProperties("legacy_billing_event", {
        claim_id: "claim-secret",
        stripe_session_id: "cs_secret",
        customer_id: "cus_secret",
        share_token: "share-secret",
        plan: "pro_monthly",
      })
    ).toEqual({ plan: "pro_monthly" });
  });
});
