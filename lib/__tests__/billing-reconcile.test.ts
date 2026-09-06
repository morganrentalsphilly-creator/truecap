import { beforeEach, describe, expect, it, vi } from "vitest";
import type Stripe from "stripe";

vi.mock("@sentry/nextjs", () => ({ captureMessage: vi.fn(), captureException: vi.fn() }));

import { createFakeAdmin } from "./helpers/fake-supabase-admin";
import {
  resolveBillingReconcileMode,
  runBillingReconcile,
  subscriptionIdFromUnresolvedPayload,
} from "@/lib/billing/reconcile";
import type { recordUnresolvedBillingEvent as defaultRecord } from "@/lib/stripe/billing-user-resolution";
import type { upsertSubscriptionFromStripe as defaultUpsert } from "@/lib/stripe/subscription-sync";

const U1 = "11111111-1111-4111-8111-111111111111";
const U2 = "22222222-2222-4222-8222-222222222222";
const CONFIRMED = "2026-01-01T00:00:00.000Z";

function sub(id: string, overrides: Record<string, unknown> = {}): Stripe.Subscription {
  return {
    id,
    object: "subscription",
    customer: `cus_${id}`,
    status: "active",
    currency: "usd",
    metadata: {},
    items: { data: [{ price: { id: "price_pro_m", unit_amount: 2999 }, quantity: 1 }] },
    ...overrides,
  } as unknown as Stripe.Subscription;
}

function makeStripe(subs: Stripe.Subscription[], emails: Record<string, string | null>) {
  const list = vi.fn(() => ({
    async *[Symbol.asyncIterator]() {
      for (const s of subs) yield s;
    },
  }));
  const retrieve = vi.fn(async (id: string) => {
    const found = subs.find((s) => s.id === id);
    if (!found) throw Object.assign(new Error("No such subscription"), { code: "resource_missing" });
    return found;
  });
  const customersRetrieve = vi.fn(async (id: string) => ({ id, email: emails[id] ?? null }));
  return {
    stripe: { subscriptions: { list, retrieve }, customers: { retrieve: customersRetrieve } } as unknown as Stripe,
    list,
    retrieve,
    customersRetrieve,
  };
}

const SUBS = [
  sub("sub_bound"),
  sub("sub_prc", { items: { data: [{ price: { id: "price_prc_annual" } }] } }),
  sub("sub_canceled", { status: "canceled" }),
  sub("sub_email"),
  sub("sub_lost"),
];
const EMAILS = { cus_sub_email: "Bob@example.com", cus_sub_lost: "stranger@example.com" };

function makeAdmin(extra: { openRows?: Record<string, unknown>[]; missingTables?: string[] } = {}) {
  return createFakeAdmin({
    tables: {
      profiles: [
        { id: U1, stripe_customer_id: "cus_sub_bound" },
        { id: U2, stripe_customer_id: null },
      ],
      plans: [{ id: "plan-pro", slug: "pro_monthly", stripe_price_id: "price_pro_m" }],
      subscriptions: [{ id: "row-1", user_id: U1, stripe_subscription_id: "sub_bound", status: "active", plan_id: "plan-pro" }],
      billing_unresolved_events: extra.openRows ?? [],
    },
    users: [
      { id: U1, email: "alice@example.com", email_confirmed_at: CONFIRMED },
      { id: U2, email: "bob@example.com", email_confirmed_at: CONFIRMED },
    ],
    missingTables: extra.missingTables,
  });
}

beforeEach(() => {
  process.env.STRIPE_PRICE_PRO_MONTHLY = "price_pro_m";
  process.env.STRIPE_PRICE_PRO_ANNUAL = "price_pro_a";
});

describe("resolveBillingReconcileMode", () => {
  it("defaults to dry, honors apply/live and off", () => {
    expect(resolveBillingReconcileMode(undefined)).toBe("dry");
    expect(resolveBillingReconcileMode("")).toBe("dry");
    expect(resolveBillingReconcileMode("banana")).toBe("dry");
    expect(resolveBillingReconcileMode("apply")).toBe("apply");
    expect(resolveBillingReconcileMode("LIVE")).toBe("apply");
    expect(resolveBillingReconcileMode("off")).toBe("off");
  });
});

describe("subscriptionIdFromUnresolvedPayload", () => {
  it("reads checkout, subscription-event, and raw-subscription payloads", () => {
    expect(subscriptionIdFromUnresolvedPayload({ data: { object: { object: "checkout.session", subscription: "sub_a" } } })).toBe("sub_a");
    expect(subscriptionIdFromUnresolvedPayload({ data: { object: { object: "checkout.session", subscription: { id: "sub_b" } } } })).toBe("sub_b");
    expect(subscriptionIdFromUnresolvedPayload({ data: { object: { object: "subscription", id: "sub_c" } } })).toBe("sub_c");
    expect(subscriptionIdFromUnresolvedPayload({ object: "subscription", id: "sub_d" })).toBe("sub_d");
    expect(subscriptionIdFromUnresolvedPayload({ data: { object: { object: "invoice" } } })).toBeNull();
    expect(subscriptionIdFromUnresolvedPayload(null)).toBeNull();
  });
});

describe("runBillingReconcile", () => {
  it("dry run: classifies every paid subscription and writes nothing", async () => {
    const { stripe, customersRetrieve } = makeStripe(SUBS, EMAILS);
    const fake = makeAdmin();
    const upsert = vi.fn(async () => ({ synced: true as const }));
    const record = vi.fn(async () => "table" as const);

    const summary = await runBillingReconcile({
      stripe,
      admin: fake.admin,
      mode: "dry",
      upsertSubscriptionFromStripe: upsert,
      recordUnresolvedBillingEvent: record,
    });

    expect(summary).toMatchObject({
      mode: "dry",
      stripe_subscriptions_scanned: 5,
      skipped_not_paid: 1,
      skipped_foreign_app: 1,
      already_bound: 1,
      resolvable_by: { email: 1 },
      unresolved: 1,
      unresolved_by_reason: { email_no_confirmed_match: 1 },
      applied: 0,
      unresolved_recorded: 0,
      errors: 0,
      unresolved_table_available: true,
    });
    expect(upsert).not.toHaveBeenCalled();
    expect(record).not.toHaveBeenCalled();
    // The foreign subscription's customer is never even looked up.
    expect(customersRetrieve).not.toHaveBeenCalledWith("cus_sub_prc");
    expect(fake.rows("subscriptions")).toHaveLength(1);
  });

  it("apply: backfills resolvable subscriptions through the webhook path and records the rest", async () => {
    const { stripe } = makeStripe(SUBS, EMAILS);
    const fake = makeAdmin();
    const upsert = vi.fn<typeof defaultUpsert>(async () => ({ synced: true as const }));
    const record = vi.fn<typeof defaultRecord>(async () => "table" as const);

    const summary = await runBillingReconcile({
      stripe,
      admin: fake.admin,
      mode: "apply",
      upsertSubscriptionFromStripe: upsert,
      recordUnresolvedBillingEvent: record,
    });

    expect(summary).toMatchObject({ applied: 1, apply_failures: 0, unresolved: 1, unresolved_recorded: 1 });
    expect(upsert).toHaveBeenCalledTimes(1);
    expect(upsert.mock.calls[0][1]).toMatchObject({ id: "sub_email" });
    expect(upsert.mock.calls[0][3]).toMatchObject({ eventId: "reconcile:sub_email", eventType: "reconcile.subscription" });
    expect(record).toHaveBeenCalledTimes(1);
    expect(record.mock.calls[0][1]).toMatchObject({ eventId: "reconcile:sub_lost", reason: "email_no_confirmed_match", customerId: "cus_sub_lost" });
  });

  it("re-checks open unresolved rows and closes the ones that resolve now (apply only)", async () => {
    const { stripe } = makeStripe(SUBS, EMAILS);
    const openRow = {
      id: "unres-1",
      stripe_event_id: "evt_old",
      stripe_customer_id: "cus_sub_email",
      payload: { id: "evt_old", data: { object: { object: "checkout.session", subscription: "sub_email" } } },
      created_at: "2026-09-01T00:00:00.000Z",
      resolved_at: null,
    };
    const upsert = vi.fn<typeof defaultUpsert>(async () => ({ synced: true as const }));

    const dryFake = makeAdmin({ openRows: [openRow] });
    const dry = await runBillingReconcile({ stripe, admin: dryFake.admin, mode: "dry", upsertSubscriptionFromStripe: upsert, recordUnresolvedBillingEvent: vi.fn(async () => "table" as const) });
    expect(dry).toMatchObject({ open_unresolved_rows_checked: 1, open_unresolved_rows_resolved: 1 });
    expect(dryFake.rows("billing_unresolved_events")[0].resolved_at).toBeNull();
    expect(upsert).not.toHaveBeenCalled();

    const applyFake = makeAdmin({ openRows: [openRow] });
    const applied = await runBillingReconcile({ stripe, admin: applyFake.admin, mode: "apply", upsertSubscriptionFromStripe: upsert, recordUnresolvedBillingEvent: vi.fn(async () => "table" as const) });
    expect(applied).toMatchObject({ open_unresolved_rows_checked: 1, open_unresolved_rows_resolved: 1 });
    expect(applyFake.rows("billing_unresolved_events")[0]).toMatchObject({ resolved_user_id: U2, resolution_note: "billing-reconcile via email" });
    expect(applyFake.rows("billing_unresolved_events")[0].resolved_at).toBeTruthy();
    expect(upsert.mock.calls.some((call) => call[3]?.eventType === "reconcile.replay")).toBe(true);
  });

  it("tolerates a missing billing_unresolved_events table", async () => {
    const { stripe } = makeStripe(SUBS, EMAILS);
    const fake = makeAdmin({ missingTables: ["billing_unresolved_events"] });
    const summary = await runBillingReconcile({
      stripe,
      admin: fake.admin,
      mode: "dry",
      upsertSubscriptionFromStripe: vi.fn(async () => ({ synced: true as const })),
      recordUnresolvedBillingEvent: vi.fn(async () => "fallback" as const),
    });
    expect(summary).toMatchObject({ unresolved_table_available: false, errors: 0, open_unresolved_rows_checked: 0 });
  });

  it("caps the Stripe listing and reports truncation", async () => {
    const { stripe } = makeStripe(SUBS, EMAILS);
    const fake = makeAdmin();
    const summary = await runBillingReconcile({ stripe, admin: fake.admin, mode: "dry", listCap: 2, upsertSubscriptionFromStripe: vi.fn(), recordUnresolvedBillingEvent: vi.fn() });
    expect(summary).toMatchObject({ stripe_subscriptions_scanned: 2, stripe_listing_truncated: true });
  });
});
