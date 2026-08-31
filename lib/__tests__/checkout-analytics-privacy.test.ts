import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(__dirname, "..", "..");
const billing = readFileSync(join(ROOT, "app/actions/billing.ts"), "utf8");
const webhook = readFileSync(
  join(ROOT, "app/api/stripe/webhooks/route.ts"),
  "utf8",
);
const returned = readFileSync(
  join(ROOT, "components/marketing/billing-success-banner.tsx"),
  "utf8",
);
const conversion = readFileSync(
  join(ROOT, "lib/analytics/track-conversion.ts"),
  "utf8",
);
const claim = readFileSync(
  join(ROOT, "lib/analytics/canonical-event-claim.ts"),
  "utf8",
);
const claimMigration = readFileSync(
  join(
    ROOT,
    "supabase/migrations/20260829113000_canonical_analytics_event_claims.sql",
  ),
  "utf8",
);

function eventCall(source: string, event: string): string {
  const marker = `event: "${event}"`;
  const start = source.indexOf(marker);
  expect(start, `${event} event missing`).toBeGreaterThanOrEqual(0);
  const end = source.indexOf("});", start);
  expect(end, `${event} call is incomplete`).toBeGreaterThan(start);
  return source.slice(start, end + 3);
}

const forbiddenPostHogProperties =
  /stripe_(?:session|customer|subscription)_id|amount_total|purchase_price|address|email/i;

describe("canonical checkout analytics", () => {
  it("emits exactly one canonical event for each requested billing stage", () => {
    expect(eventCall(billing, "upgrade_started")).toContain("plan_identifier");
    expect(returned).toContain('trackEvent("checkout_returned"');
    expect(eventCall(webhook, "subscription_started")).toContain(
      "plan_identifier",
    );
    for (const alias of [
      "pro_checkout_started",
      "checkout_started",
      "subscription_checkout_started",
      "agent_pro_checkout_started",
    ]) {
      expect(billing).not.toContain(`event: "${alias}"`);
    }
    for (const alias of [
      "pro_subscribed",
      "subscription_activated",
      "pro_subscription_started",
      "pro_trial_started",
      "trial_started",
      "paid_conversion",
    ]) {
      expect(webhook).not.toContain(`event: "${alias}"`);
    }
  });

  it.each([
    ["upgrade_started", billing],
    ["subscription_started", webhook],
  ] as const)(
    "keeps %s free of Stripe ids, amounts, and personal fields",
    (event, source) => {
      expect(eventCall(source, event)).not.toMatch(forbiddenPostHogProperties);
    },
  );

  it("keeps the browser return payload coarse and PII-free", () => {
    const start = returned.indexOf('trackEvent("checkout_returned"');
    const end = returned.indexOf(");", start);
    const payload = returned.slice(start, end + 2);
    expect(payload).toContain("plan_tier");
    expect(payload).not.toMatch(forbiddenPostHogProperties);
  });

  it("never uses a Stripe customer id as the PostHog identity", () => {
    expect(webhook).toContain("SUPABASE_USER_ID_RE.test(candidate)");
    expect(webhook).not.toMatch(/distinctId[\s\S]{0,260}session\.customer/);
  });

  it("waits for successful payment and claims one event per Checkout session", () => {
    const handler = webhook.indexOf(
      "const checkoutSyncResult = await handleCheckoutSessionCompleted",
    );
    const paymentGate = webhook.indexOf("const paymentReady =", 0);
    const claimCall = webhook.indexOf(
      "await claimCanonicalAnalyticsEvent",
      handler,
    );
    const event = webhook.indexOf('event: "subscription_started"', claimCall);

    expect(paymentGate).toBeGreaterThan(-1);
    expect(paymentGate).toBeLessThan(handler);
    expect(webhook.slice(paymentGate, handler)).toContain(
      'session.payment_status === "paid"',
    );
    expect(webhook.slice(paymentGate, handler)).toContain(
      'session.payment_status === "no_payment_required"',
    );
    expect(webhook.slice(paymentGate, handler)).not.toContain("break;");
    expect(webhook.slice(handler, claimCall)).toContain(
      "paymentReady && distinctId && checkoutSyncResult.synced",
    );
    expect(claimCall).toBeGreaterThan(handler);
    expect(event).toBeGreaterThan(claimCall);
    expect(claim).toContain('createHash("sha256")');
    expect(claim).toContain('error.code === "23505"');
    expect(claimMigration).toContain(
      "primary key (event_name, dedupe_key_hash)",
    );
    expect(claimMigration).toContain("force row level security");
    expect(claimMigration).toContain("to service_role");
    expect(claimMigration).toContain("select, insert, delete");
    expect(webhook.slice(handler, event)).toContain(
      'subscriptionClaim = "unavailable"',
    );
    expect(webhook.slice(handler)).toContain("canonicalAnalyticsEventId(");
    expect(webhook.slice(handler)).toContain(
      "releaseCanonicalAnalyticsEventClaim(",
    );
    const lifecycleSchedule = webhook.indexOf(
      "await scheduleTrialOnboardingEmails",
      event,
    );
    const analyticsCapture = webhook.indexOf(
      "const analyticsCaptured = await captureServerEvent",
      claimCall,
    );
    expect(analyticsCapture).toBeGreaterThan(claimCall);
    expect(lifecycleSchedule).toBeGreaterThan(analyticsCapture);
    expect(webhook.slice(analyticsCapture, lifecycleSchedule)).toContain(
      "releaseCanonicalAnalyticsEventClaim(",
    );
    expect(webhook.slice(analyticsCapture, lifecycleSchedule)).toContain(
      "lifecycle_email_log idempotency",
    );
  });

  it("uses Stripe ids only for local deduplication, never Google payloads", () => {
    expect(conversion).not.toContain("transaction_id:");
    expect(conversion).toContain("Local-only deduplication key");
  });
});
