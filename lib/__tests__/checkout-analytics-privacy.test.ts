import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(__dirname, "..", "..");
const billing = readFileSync(join(ROOT, "app/actions/billing.ts"), "utf8");
const webhook = readFileSync(join(ROOT, "app/api/stripe/webhooks/route.ts"), "utf8");
const returned = readFileSync(
  join(ROOT, "components/marketing/billing-success-banner.tsx"),
  "utf8"
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
  it("emits the requested funnel names through the existing provider", () => {
    expect(eventCall(billing, "checkout_started")).toContain("plan_slug");
    expect(returned).toContain('trackEvent("checkout_returned"');
    expect(eventCall(webhook, "subscription_activated")).toContain("trial_granted");
  });

  it.each([
    ["checkout_started", billing],
    ["pro_checkout_started", billing],
    ["subscription_activated", webhook],
    ["pro_subscribed", webhook],
  ] as const)("keeps %s free of Stripe ids, amounts, and personal fields", (event, source) => {
    expect(eventCall(source, event)).not.toMatch(forbiddenPostHogProperties);
  });

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
});
