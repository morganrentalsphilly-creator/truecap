import { beforeEach, describe, expect, it, vi } from "vitest";
import type Stripe from "stripe";

/**
 * Stripe ↔ user binding through the real webhook sync functions, driven by
 * hand-built Stripe payloads and the in-memory admin fake. Every resolution
 * path, the unresolved path (table present and table missing), duplicates,
 * and the shared-account foreign-app skip.
 */

const mocks = vi.hoisted(() => ({
  subscriptionsRetrieve: vi.fn(),
  customersRetrieve: vi.fn(),
}));

vi.mock("@sentry/nextjs", () => ({
  captureMessage: vi.fn(),
  captureException: vi.fn(),
}));

vi.mock("@/lib/stripe/client", () => ({
  getStripe: () => ({
    subscriptions: { retrieve: mocks.subscriptionsRetrieve },
    customers: { retrieve: mocks.customersRetrieve },
  }),
}));

import * as Sentry from "@sentry/nextjs";
import { createFakeAdmin } from "./helpers/fake-supabase-admin";
import {
  handleCheckoutSessionCompleted,
  upsertSubscriptionFromStripe,
} from "@/lib/stripe/subscription-sync";

const U1 = "11111111-1111-4111-8111-111111111111";
const U2 = "22222222-2222-4222-8222-222222222222";
const CONFIRMED = "2026-01-01T00:00:00.000Z";

const CHECKOUT_EVENT = {
  eventId: "evt_checkout_1",
  eventType: "checkout.session.completed",
  payload: { id: "evt_checkout_1", type: "checkout.session.completed" },
};
const SUBSCRIPTION_EVENT = {
  eventId: "evt_sub_1",
  eventType: "customer.subscription.updated",
  payload: { id: "evt_sub_1", type: "customer.subscription.updated" },
};

function makeSubscription(overrides: Record<string, unknown> = {}): Stripe.Subscription {
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
  } as unknown as Stripe.Subscription;
}

function makeSession(overrides: Record<string, unknown> = {}): Stripe.Checkout.Session {
  return {
    id: "cs_1",
    object: "checkout.session",
    mode: "subscription",
    customer: "cus_1",
    client_reference_id: null,
    metadata: {},
    customer_details: { email: null },
    customer_email: null,
    payment_status: "paid",
    amount_total: 2999,
    currency: "usd",
    subscription: "sub_1",
    ...overrides,
  } as unknown as Stripe.Checkout.Session;
}

function setup(extra: { users?: Array<{ id: string; email: string; email_confirmed_at: string | null }>; profiles?: Array<{ id: string; stripe_customer_id: string | null }>; missingTables?: string[] } = {}) {
  return createFakeAdmin({
    tables: {
      profiles: extra.profiles ?? [
        { id: U1, stripe_customer_id: null },
        { id: U2, stripe_customer_id: null },
      ],
      plans: [{ id: "plan-pro", slug: "pro_monthly", stripe_price_id: "price_pro_m", is_active: true }],
      stripe_webhook_events: [
        { stripe_event_id: "evt_checkout_1", type: "checkout.session.completed", processed_at: null, error_message: null },
        { stripe_event_id: "evt_sub_1", type: "customer.subscription.updated", processed_at: null, error_message: null },
      ],
    },
    users: extra.users ?? [
      { id: U1, email: "Alice@Example.com", email_confirmed_at: CONFIRMED },
      { id: U2, email: "bob@example.com", email_confirmed_at: CONFIRMED },
    ],
    missingTables: extra.missingTables,
  });
}

function sentryMessages(): string[] {
  return vi.mocked(Sentry.captureMessage).mock.calls.map((call) => String(call[0]));
}

beforeEach(() => {
  vi.mocked(Sentry.captureMessage).mockClear();
  mocks.subscriptionsRetrieve.mockReset();
  mocks.customersRetrieve.mockReset();
  mocks.customersRetrieve.mockResolvedValue({ id: "cus_1", email: null });
  process.env.STRIPE_PRICE_PRO_MONTHLY = "price_pro_m";
  process.env.STRIPE_PRICE_PRO_ANNUAL = "price_pro_a";
});

describe("checkout.session.completed — every resolution path lands the subscription", () => {
  it("binds via metadata.supabase_user_id alone (no client_reference_id)", async () => {
    const fake = setup();
    mocks.subscriptionsRetrieve.mockResolvedValue(makeSubscription({ metadata: { user_id: U1, supabase_user_id: U1, plan_slug: "pro_monthly" } }));

    const result = await handleCheckoutSessionCompleted(fake.admin, makeSession({ metadata: { supabase_user_id: U1 } }), CHECKOUT_EVENT);

    expect(result).toEqual({ synced: true });
    expect(fake.rows("profiles").find((p) => p.id === U1)?.stripe_customer_id).toBe("cus_1");
    expect(fake.rows("subscriptions")).toMatchObject([{ user_id: U1, stripe_subscription_id: "sub_1", plan_id: "plan-pro", status: "active" }]);
    expect(fake.rows("billing_unresolved_events")).toHaveLength(0);
  });

  it("binds via client_reference_id alone", async () => {
    const fake = setup();
    mocks.subscriptionsRetrieve.mockResolvedValue(makeSubscription());
    const result = await handleCheckoutSessionCompleted(fake.admin, makeSession({ client_reference_id: U2 }), CHECKOUT_EVENT);
    expect(result).toEqual({ synced: true });
    expect(fake.rows("subscriptions")).toMatchObject([{ user_id: U2 }]);
  });

  it("binds via the existing stripe_customer_id mapping alone", async () => {
    const fake = setup({ profiles: [{ id: U1, stripe_customer_id: "cus_1" }, { id: U2, stripe_customer_id: null }] });
    mocks.subscriptionsRetrieve.mockResolvedValue(makeSubscription());
    const result = await handleCheckoutSessionCompleted(fake.admin, makeSession(), CHECKOUT_EVENT);
    expect(result).toEqual({ synced: true });
    expect(fake.rows("subscriptions")).toMatchObject([{ user_id: U1 }]);
  });

  it("binds via the customer email when it matches exactly one CONFIRMED account (case-insensitive)", async () => {
    const fake = setup();
    mocks.subscriptionsRetrieve.mockResolvedValue(makeSubscription());
    const result = await handleCheckoutSessionCompleted(
      fake.admin,
      makeSession({ customer_details: { email: "alice@example.com" } }),
      CHECKOUT_EVENT,
    );
    expect(result).toEqual({ synced: true });
    expect(fake.rows("profiles").find((p) => p.id === U1)?.stripe_customer_id).toBe("cus_1");
    expect(fake.rows("subscriptions")).toMatchObject([{ user_id: U1, status: "active" }]);
  });

  it("records an ambiguous email durably, pages Sentry with the event id, links nothing, and stays 200-safe", async () => {
    const fake = setup({
      users: [
        { id: U1, email: "alice@example.com", email_confirmed_at: CONFIRMED },
        { id: U2, email: "ALICE@example.com", email_confirmed_at: CONFIRMED },
      ],
    });
    mocks.subscriptionsRetrieve.mockResolvedValue(makeSubscription());
    const session = makeSession({ customer_details: { email: "alice@example.com" } });

    const result = await handleCheckoutSessionCompleted(fake.admin, session, CHECKOUT_EVENT);
    // A Stripe retry of the same event must not create a second row.
    const again = await handleCheckoutSessionCompleted(fake.admin, session, CHECKOUT_EVENT);

    expect(result).toEqual({ synced: false, reason: "checkout user/customer binding could not be verified (email_ambiguous)" });
    expect(again).toEqual(result);
    expect(fake.rows("billing_unresolved_events")).toHaveLength(1);
    expect(fake.rows("billing_unresolved_events")[0]).toMatchObject({
      stripe_event_id: "evt_checkout_1",
      event_type: "checkout.session.completed",
      stripe_customer_id: "cus_1",
      customer_email: "alice@example.com",
      amount_cents: 2999,
      currency: "usd",
      reason: "email_ambiguous",
      payload: CHECKOUT_EVENT.payload,
    });
    expect(fake.rows("profiles").every((p) => p.stripe_customer_id === null)).toBe(true);
    expect(fake.rows("subscriptions")).toHaveLength(0);
    const unresolvedCall = vi.mocked(Sentry.captureMessage).mock.calls.find((call) => String(call[0]).includes("could not be bound"));
    expect(unresolvedCall?.[1]).toMatchObject({ level: "error", extra: { stripe_event_id: "evt_checkout_1" } });
  });

  it("stamps the ledger row instead when billing_unresolved_events is not applied yet", async () => {
    const fake = setup({
      users: [
        { id: U1, email: "alice@example.com", email_confirmed_at: CONFIRMED },
        { id: U2, email: "alice@example.com", email_confirmed_at: CONFIRMED },
      ],
      missingTables: ["billing_unresolved_events"],
    });
    mocks.subscriptionsRetrieve.mockResolvedValue(makeSubscription());
    const result = await handleCheckoutSessionCompleted(fake.admin, makeSession({ customer_details: { email: "alice@example.com" } }), CHECKOUT_EVENT);
    expect(result.synced).toBe(false);
    expect(fake.rows("stripe_webhook_events").find((r) => r.stripe_event_id === "evt_checkout_1")?.error_message).toBe("unresolved: email_ambiguous");
  });

  it("skips the other product's checkout quietly — no alarm, no unresolved row, no Stripe calls", async () => {
    const fake = setup();
    const result = await handleCheckoutSessionCompleted(
      fake.admin,
      makeSession({ metadata: { app: "philly_rental_compliance" }, customer_details: { email: "alice@example.com" } }),
      CHECKOUT_EVENT,
    );
    expect(result).toEqual({ synced: false, reason: "foreign_app" });
    expect(mocks.subscriptionsRetrieve).not.toHaveBeenCalled();
    expect(sentryMessages()).toEqual([]);
    expect(fake.rows("billing_unresolved_events")).toHaveLength(0);
    expect(fake.rows("profiles").every((p) => p.stripe_customer_id === null)).toBe(true);
  });

  it("checks the subscription's product BEFORE binding, so an unstamped foreign checkout cannot claim a user by email", async () => {
    const fake = setup();
    mocks.subscriptionsRetrieve.mockResolvedValue(
      makeSubscription({ id: "sub_prc", customer: "cus_prc", items: { data: [{ price: { id: "price_prc_annual" } }] } }),
    );
    const result = await handleCheckoutSessionCompleted(
      fake.admin,
      makeSession({ customer: "cus_prc", subscription: "sub_prc", customer_details: { email: "alice@example.com" } }),
      CHECKOUT_EVENT,
    );
    expect(result).toEqual({ synced: false, reason: "foreign_app" });
    expect(fake.rows("profiles").every((p) => p.stripe_customer_id === null)).toBe(true);
    expect(sentryMessages()).toEqual([]);
  });
});

describe("customer.subscription.* — subscription-level binding", () => {
  it("skips the other product's renewal quietly instead of paging (the 2026-08-31 noise)", async () => {
    const fake = setup();
    const result = await upsertSubscriptionFromStripe(
      fake.admin,
      makeSubscription({ id: "sub_prc", customer: "cus_prc", items: { data: [{ price: { id: "price_prc_annual" } }] } }),
      null,
      SUBSCRIPTION_EVENT,
    );
    expect(result).toEqual({ synced: false, reason: "foreign_app" });
    expect(mocks.customersRetrieve).not.toHaveBeenCalled();
    expect(sentryMessages()).toEqual([]);
    expect(fake.rows("subscriptions")).toHaveLength(0);
    expect(fake.rows("billing_unresolved_events")).toHaveLength(0);
  });

  it("binds a legacy subscription by its metadata.user_id stamp and persists the customer mapping", async () => {
    const fake = setup();
    const result = await upsertSubscriptionFromStripe(fake.admin, makeSubscription({ customer: "cus_9", metadata: { user_id: U1 } }), null, SUBSCRIPTION_EVENT);
    expect(result).toEqual({ synced: true });
    expect(fake.rows("profiles").find((p) => p.id === U1)?.stripe_customer_id).toBe("cus_9");
    expect(fake.rows("subscriptions")).toMatchObject([{ user_id: U1, stripe_subscription_id: "sub_1" }]);
  });

  it("binds by the Stripe customer's email when nothing else identifies the owner", async () => {
    const fake = setup();
    mocks.customersRetrieve.mockResolvedValue({ id: "cus_1", email: "BOB@example.com" });
    const result = await upsertSubscriptionFromStripe(fake.admin, makeSubscription(), null, SUBSCRIPTION_EVENT);
    expect(result).toEqual({ synced: true });
    expect(mocks.customersRetrieve).toHaveBeenCalledWith("cus_1");
    expect(fake.rows("subscriptions")).toMatchObject([{ user_id: U2 }]);
    expect(fake.rows("profiles").find((p) => p.id === U2)?.stripe_customer_id).toBe("cus_1");
  });

  it("records a PAID subscription it cannot bind, and refuses to guess between a stamp and a bound customer", async () => {
    const fake = setup({ profiles: [{ id: U1, stripe_customer_id: null }, { id: U2, stripe_customer_id: "cus_1" }] });
    const result = await upsertSubscriptionFromStripe(fake.admin, makeSubscription({ metadata: { user_id: U1 } }), null, SUBSCRIPTION_EVENT);
    expect(result).toEqual({ synced: false, reason: "user binding could not be verified (customer_bound_to_other_user)" });
    expect(fake.rows("billing_unresolved_events")).toMatchObject([
      { stripe_event_id: "evt_sub_1", event_type: "customer.subscription.updated", stripe_customer_id: "cus_1", amount_cents: 2999, reason: "customer_bound_to_other_user" },
    ]);
    expect(fake.rows("subscriptions")).toHaveLength(0);
  });

  it("does not record a canceled (unpaid) subscription it cannot bind — nothing was paid for", async () => {
    const fake = setup();
    mocks.customersRetrieve.mockResolvedValue({ id: "cus_1", email: "nobody@example.com" });
    const result = await upsertSubscriptionFromStripe(fake.admin, makeSubscription({ status: "canceled" }), null, SUBSCRIPTION_EVENT);
    expect(result.synced).toBe(false);
    expect(fake.rows("billing_unresolved_events")).toHaveLength(0);
  });

  it("still applies the unmapped-price recovery ladder for OUR subscription (never a silent FREE downgrade)", async () => {
    const fake = setup({ profiles: [{ id: U1, stripe_customer_id: "cus_1" }, { id: U2, stripe_customer_id: null }] });
    const result = await upsertSubscriptionFromStripe(
      fake.admin,
      makeSubscription({ items: { data: [{ price: { id: "price_not_wired" } }] }, metadata: { user_id: U1, plan_slug: "pro_monthly" } }),
      null,
      SUBSCRIPTION_EVENT,
    );
    expect(result).toEqual({ synced: true });
    expect(fake.rows("subscriptions")).toMatchObject([{ user_id: U1, plan_id: "plan-pro" }]);
  });
});
