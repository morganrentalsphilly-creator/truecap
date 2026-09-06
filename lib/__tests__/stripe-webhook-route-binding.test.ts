import { beforeEach, describe, expect, it, vi } from "vitest";
import type Stripe from "stripe";

/**
 * Route-level contract for the money path: signature-verified events are
 * claimed once, duplicates return 200 without re-running the handler, a
 * previously failed event is retried, a foreign-product event is stamped
 * `skipped: foreign_app`, and an unbindable PAID event lands a durable
 * billing_unresolved_events row before the route returns 200.
 */

const mocks = vi.hoisted(() => ({
  constructEvent: vi.fn(),
  subscriptionsRetrieve: vi.fn(),
  customersRetrieve: vi.fn(),
  admin: null as unknown,
}));

vi.mock("@sentry/nextjs", () => ({ captureMessage: vi.fn(), captureException: vi.fn() }));
vi.mock("next/headers", () => ({
  headers: async () => ({ get: (name: string) => (name === "stripe-signature" ? "sig_test" : null) }),
}));
vi.mock("@/lib/stripe/client", () => ({
  getStripe: () => ({
    webhooks: { constructEvent: mocks.constructEvent },
    subscriptions: { retrieve: mocks.subscriptionsRetrieve },
    customers: { retrieve: mocks.customersRetrieve },
  }),
}));
vi.mock("@/lib/supabase/admin", () => ({ createAdminSupabaseClient: () => mocks.admin }));
vi.mock("@/lib/posthog-server", () => ({ captureServerEvent: vi.fn(async () => true) }));
vi.mock("@/lib/email/trial-emails", () => ({ scheduleTrialOnboardingEmails: vi.fn() }));
vi.mock("@/lib/stripe/subscription-checkout-intent", () => ({
  completeSubscriptionCheckoutIntentFromWebhook: vi.fn(async () => null),
  expireSubscriptionCheckoutIntentFromWebhook: vi.fn(async () => null),
}));
vi.mock("@/lib/stripe/decision-pack-risk-webhook", () => ({ reconcileDecisionPackRiskEvent: vi.fn() }));
vi.mock("@/lib/analytics/canonical-event-claim", () => ({
  canonicalAnalyticsEventId: () => "00000000-0000-4000-8000-00000000abcd",
  claimCanonicalAnalyticsEvent: vi.fn(async () => true),
  releaseCanonicalAnalyticsEventClaim: vi.fn(),
}));

import * as Sentry from "@sentry/nextjs";
import { createFakeAdmin } from "./helpers/fake-supabase-admin";
import { POST } from "@/app/api/stripe/webhooks/route";

const U1 = "11111111-1111-4111-8111-111111111111";
const U2 = "22222222-2222-4222-8222-222222222222";
const CONFIRMED = "2026-01-01T00:00:00.000Z";

function subscriptionObject(overrides: Record<string, unknown> = {}) {
  return {
    id: "sub_1",
    object: "subscription",
    customer: "cus_1",
    status: "active",
    currency: "usd",
    metadata: {},
    items: { data: [{ price: { id: "price_pro_m", unit_amount: 2999 }, quantity: 1 }] },
    cancel_at_period_end: false,
    ...overrides,
  };
}

function subscriptionEvent(id: string, object: Record<string, unknown>) {
  return { id, object: "event", type: "customer.subscription.updated", data: { object } };
}

function checkoutEvent(id: string, session: Record<string, unknown>) {
  return {
    id,
    object: "event",
    type: "checkout.session.completed",
    data: {
      object: {
        id: "cs_1",
        object: "checkout.session",
        mode: "subscription",
        customer: "cus_1",
        client_reference_id: null,
        metadata: {},
        customer_details: { email: null },
        payment_status: "paid",
        amount_total: 2999,
        currency: "usd",
        subscription: "sub_1",
        ...session,
      },
    },
  };
}

async function deliver(event: unknown) {
  const request = new Request("https://usetruecap.com/api/stripe/webhooks", {
    method: "POST",
    body: JSON.stringify(event),
  });
  const response = await POST(request);
  return { status: response.status, body: (await response.json()) as Record<string, unknown> };
}

function makeFake(extra: { ledger?: Record<string, unknown>[]; users?: Array<{ id: string; email: string; email_confirmed_at: string | null }> } = {}) {
  const fake = createFakeAdmin({
    tables: {
      profiles: [
        { id: U1, stripe_customer_id: null },
        { id: U2, stripe_customer_id: null },
      ],
      plans: [{ id: "plan-pro", slug: "pro_monthly", stripe_price_id: "price_pro_m", is_active: true }],
      stripe_webhook_events: extra.ledger ?? [],
    },
    users: extra.users ?? [
      { id: U1, email: "alice@example.com", email_confirmed_at: CONFIRMED },
      { id: U2, email: "bob@example.com", email_confirmed_at: CONFIRMED },
    ],
  });
  mocks.admin = fake.admin;
  return fake;
}

beforeEach(() => {
  vi.mocked(Sentry.captureMessage).mockClear();
  vi.mocked(Sentry.captureException).mockClear();
  mocks.constructEvent.mockReset();
  mocks.constructEvent.mockImplementation((body: string) => JSON.parse(body) as Stripe.Event);
  mocks.subscriptionsRetrieve.mockReset();
  mocks.customersRetrieve.mockReset();
  mocks.customersRetrieve.mockResolvedValue({ id: "cus_1", email: null });
  process.env.STRIPE_WEBHOOK_SECRET = "whsec_test";
  process.env.STRIPE_PRICE_PRO_MONTHLY = "price_pro_m";
  process.env.STRIPE_PRICE_PRO_ANNUAL = "price_pro_a";
});

describe("POST /api/stripe/webhooks — claim, duplicate, retry", () => {
  it("processes an event once and answers a redelivery as a duplicate without re-running the handler", async () => {
    const fake = makeFake();
    mocks.subscriptionsRetrieve.mockResolvedValue(subscriptionObject({ metadata: { user_id: U1 } }));
    const event = subscriptionEvent("evt_dup_1", subscriptionObject());

    const first = await deliver(event);
    expect(first.status).toBe(200);
    expect(first.body.duplicate).toBeUndefined();
    expect(fake.rows("subscriptions")).toMatchObject([{ user_id: U1, stripe_subscription_id: "sub_1" }]);
    const ledger = fake.rows("stripe_webhook_events").find((r) => r.stripe_event_id === "evt_dup_1");
    expect(ledger?.processed_at).toBeTruthy();
    expect(ledger?.error_message).toBeNull();

    const second = await deliver(event);
    expect(second.status).toBe(200);
    expect(second.body).toMatchObject({ duplicate: true });
    expect(mocks.subscriptionsRetrieve).toHaveBeenCalledTimes(1);
    expect(fake.rows("subscriptions")).toHaveLength(1);
  });

  it("retries an event whose earlier attempt failed (processed_at null, stale claim)", async () => {
    const fake = makeFake({
      ledger: [
        {
          stripe_event_id: "evt_retry_1",
          type: "customer.subscription.updated",
          processed_at: null,
          claimed_at: new Date(Date.now() - 5 * 60_000).toISOString(),
          error_message: "boom",
        },
      ],
    });
    mocks.subscriptionsRetrieve.mockResolvedValue(subscriptionObject({ metadata: { user_id: U1 } }));

    const result = await deliver(subscriptionEvent("evt_retry_1", subscriptionObject()));
    expect(result.status).toBe(200);
    expect(result.body.duplicate).toBeUndefined();
    expect(mocks.subscriptionsRetrieve).toHaveBeenCalledTimes(1);
    expect(fake.rows("subscriptions")).toHaveLength(1);
    expect(fake.rows("stripe_webhook_events")[0]).toMatchObject({ error_message: null });
    expect(fake.rows("stripe_webhook_events")[0].processed_at).toBeTruthy();
  });

  it("stamps the other product's event as skipped: foreign_app with no alarm", async () => {
    const fake = makeFake();
    mocks.subscriptionsRetrieve.mockResolvedValue(
      subscriptionObject({ id: "sub_prc", customer: "cus_prc", items: { data: [{ price: { id: "price_prc_annual" } }] } }),
    );
    const result = await deliver(subscriptionEvent("evt_prc_1", subscriptionObject({ id: "sub_prc", customer: "cus_prc" })));
    expect(result.status).toBe(200);
    const ledger = fake.rows("stripe_webhook_events").find((r) => r.stripe_event_id === "evt_prc_1");
    expect(ledger).toMatchObject({ error_message: "skipped: foreign_app" });
    expect(ledger?.processed_at).toBeTruthy();
    expect(Sentry.captureMessage).not.toHaveBeenCalled();
    expect(fake.rows("subscriptions")).toHaveLength(0);
  });

  it("writes an unbindable PAID checkout to billing_unresolved_events before returning 200", async () => {
    const fake = makeFake({
      users: [
        { id: U1, email: "alice@example.com", email_confirmed_at: CONFIRMED },
        { id: U2, email: "Alice@example.com", email_confirmed_at: CONFIRMED },
      ],
    });
    mocks.subscriptionsRetrieve.mockResolvedValue(subscriptionObject());
    const result = await deliver(checkoutEvent("evt_unres_1", { customer_details: { email: "alice@example.com" } }));

    expect(result.status).toBe(200);
    expect(fake.rows("billing_unresolved_events")).toMatchObject([
      { stripe_event_id: "evt_unres_1", event_type: "checkout.session.completed", reason: "email_ambiguous", amount_cents: 2999 },
    ]);
    const ledger = fake.rows("stripe_webhook_events").find((r) => r.stripe_event_id === "evt_unres_1");
    expect(String(ledger?.error_message)).toMatch(/^skipped: checkout user\/customer binding could not be verified \(email_ambiguous\)$/);
    expect(ledger?.processed_at).toBeTruthy();
    expect(fake.rows("subscriptions")).toHaveLength(0);
    const alarm = vi.mocked(Sentry.captureMessage).mock.calls.find((call) => String(call[0]).includes("could not be bound"));
    expect(alarm?.[1]).toMatchObject({ level: "error", extra: { stripe_event_id: "evt_unres_1" } });
  });
});
