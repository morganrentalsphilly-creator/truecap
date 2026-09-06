import { beforeEach, describe, expect, it, vi } from "vitest";
import type Stripe from "stripe";

vi.mock("@sentry/nextjs", () => ({
  captureMessage: vi.fn(),
  captureException: vi.fn(),
}));

import * as Sentry from "@sentry/nextjs";
import { createFakeAdmin } from "./helpers/fake-supabase-admin";
import {
  findConfirmedUserIdsByEmail,
  isForeignAppMetadata,
  isForeignSubscription,
  isTrueCapPriceId,
  recordUnresolvedBillingEvent,
  resolveBillingUser,
} from "@/lib/stripe/billing-user-resolution";

const U1 = "11111111-1111-4111-8111-111111111111";
const U2 = "22222222-2222-4222-8222-222222222222";
const U3 = "33333333-3333-4333-8333-333333333333";
const CONFIRMED = "2026-01-01T00:00:00.000Z";

function subscription(overrides: Record<string, unknown> = {}): Stripe.Subscription {
  return {
    id: "sub_1",
    object: "subscription",
    customer: "cus_1",
    status: "active",
    metadata: {},
    items: { data: [{ price: { id: "price_pro_m", unit_amount: 2999 }, quantity: 1 }] },
    ...overrides,
  } as unknown as Stripe.Subscription;
}

beforeEach(() => {
  vi.mocked(Sentry.captureMessage).mockClear();
  process.env.STRIPE_PRICE_PRO_MONTHLY = "price_pro_m";
  process.env.STRIPE_PRICE_PRO_ANNUAL = "price_pro_a,price_pro_a_legacy";
  delete process.env.STRIPE_PRICE_AGENT_PRO_MONTHLY;
  delete process.env.STRIPE_PRICE_AGENT_PRO_ANNUAL;
});

describe("foreign-app guard (the Stripe account is shared with another product)", () => {
  it("treats absent or blank metadata.app as ours (TrueCap never stamped one before)", () => {
    expect(isForeignAppMetadata(undefined)).toBe(false);
    expect(isForeignAppMetadata({})).toBe(false);
    expect(isForeignAppMetadata({ app: " " })).toBe(false);
    expect(isForeignAppMetadata({ app: "truecap" })).toBe(false);
    expect(isForeignAppMetadata({ app: "TrueCap" })).toBe(false);
  });

  it("flags another product's stamp", () => {
    expect(isForeignAppMetadata({ app: "philly_rental_compliance" })).toBe(true);
  });

  it("recognizes TrueCap prices from env (comma lists) and from plans rows", async () => {
    const { admin } = createFakeAdmin({
      tables: { plans: [{ id: "plan-x", slug: "pro_monthly", stripe_price_id: "price_db_only" }] },
    });
    expect(await isTrueCapPriceId(admin, "price_pro_m")).toBe(true);
    expect(await isTrueCapPriceId(admin, "price_pro_a_legacy")).toBe(true);
    expect(await isTrueCapPriceId(admin, "price_db_only")).toBe(true);
    expect(await isTrueCapPriceId(admin, "price_prc_annual")).toBe(false);
    expect(await isTrueCapPriceId(admin, null)).toBe(true);
  });

  it("skips the other product's subscription: unknown price, no marker, unbound customer", async () => {
    const { admin } = createFakeAdmin();
    const prc = subscription({
      id: "sub_prc",
      customer: "cus_prc",
      items: { data: [{ price: { id: "price_prc_annual" } }] },
    });
    expect(await isForeignSubscription(admin, prc)).toBe(true);
    expect(await isForeignSubscription(admin, subscription({ metadata: { app: "philly_rental_compliance" } }))).toBe(true);
  });

  it("keeps the unmapped-price incident class OURS (marker or bound customer)", async () => {
    const { admin } = createFakeAdmin({
      tables: { profiles: [{ id: U1, stripe_customer_id: "cus_bound" }] },
    });
    const unknownPrice = { data: [{ price: { id: "price_not_yet_wired" } }] };
    expect(
      await isForeignSubscription(admin, subscription({ items: unknownPrice, metadata: { plan_slug: "pro_monthly" } })),
    ).toBe(false);
    expect(
      await isForeignSubscription(admin, subscription({ items: unknownPrice, customer: "cus_bound" })),
    ).toBe(false);
    expect(await isForeignSubscription(admin, subscription())).toBe(false);
  });
});

describe("resolveBillingUser — ordered resolution", () => {
  function setup() {
    return createFakeAdmin({
      tables: {
        profiles: [
          { id: U1, stripe_customer_id: null },
          { id: U2, stripe_customer_id: "cus_2" },
          { id: U3, stripe_customer_id: null },
        ],
      },
      users: [
        { id: U1, email: "Alice@Example.com", email_confirmed_at: CONFIRMED },
        { id: U2, email: "bob@example.com", email_confirmed_at: CONFIRMED },
        { id: U3, email: "carol@example.com", email_confirmed_at: null },
      ],
    });
  }

  it("1. metadata.supabase_user_id wins and asks to bind the customer", async () => {
    const { admin } = setup();
    const result = await resolveBillingUser(admin, {
      metadataUserId: U1,
      customerId: "cus_new",
      customerEmail: "bob@example.com", // would point elsewhere — must not be consulted
    });
    expect(result).toEqual({ userId: U1, via: "metadata", bindCustomer: true });
  });

  it("2. client_reference_id is accepted on its own", async () => {
    const { admin } = setup();
    const result = await resolveBillingUser(admin, { clientReferenceId: U1, customerId: "cus_new" });
    expect(result).toEqual({ userId: U1, via: "client_reference_id", bindCustomer: true });
  });

  it("rejects contradicting explicit ids instead of picking one", async () => {
    const { admin } = setup();
    const result = await resolveBillingUser(admin, {
      metadataUserId: U1,
      clientReferenceId: U3,
      customerId: "cus_new",
    });
    expect(result).toEqual({ userId: null, reason: "conflicting_user_ids" });
  });

  it("3. an existing profiles.stripe_customer_id mapping resolves without binding again", async () => {
    const { admin } = setup();
    const result = await resolveBillingUser(admin, { customerId: "cus_2" });
    expect(result).toEqual({ userId: U2, via: "customer_mapping", bindCustomer: false });
  });

  it("refuses an explicit id whose customer is bound to someone else", async () => {
    const { admin } = setup();
    const result = await resolveBillingUser(admin, { metadataUserId: U1, customerId: "cus_2" });
    expect(result).toEqual({ userId: null, reason: "customer_bound_to_other_user" });
  });

  it("refuses an explicit id whose profile is bound to a different customer", async () => {
    const { admin } = setup();
    const result = await resolveBillingUser(admin, { metadataUserId: U2, customerId: "cus_other" });
    expect(result).toEqual({ userId: null, reason: "profile_bound_to_other_customer" });
  });

  it("4. a confirmed email that matches exactly one user resolves, case-insensitively", async () => {
    const { admin } = setup();
    const result = await resolveBillingUser(admin, {
      customerId: "cus_new",
      customerEmail: "alice@example.com",
    });
    expect(result).toEqual({ userId: U1, via: "email", bindCustomer: true });
  });

  it("4. loads the customer email lazily only when the earlier steps found nothing", async () => {
    const { admin } = setup();
    const loadCustomerEmail = vi.fn(async () => "alice@example.com");
    const early = await resolveBillingUser(admin, { customerId: "cus_2", loadCustomerEmail });
    expect(early).toMatchObject({ userId: U2 });
    expect(loadCustomerEmail).not.toHaveBeenCalled();

    const late = await resolveBillingUser(admin, { customerId: "cus_new", loadCustomerEmail });
    expect(late).toEqual({ userId: U1, via: "email", bindCustomer: true });
    expect(loadCustomerEmail).toHaveBeenCalledTimes(1);
  });

  it("4. never binds by an UNCONFIRMED email", async () => {
    const { admin } = setup();
    const result = await resolveBillingUser(admin, { customerId: "cus_new", customerEmail: "carol@example.com" });
    expect(result).toEqual({ userId: null, reason: "email_no_confirmed_match" });
  });

  it("4. never binds an ambiguous email (two confirmed accounts)", async () => {
    const fake = setup();
    fake.users.push({ id: U3, email: "ALICE@example.com", email_confirmed_at: CONFIRMED });
    const result = await resolveBillingUser(fake.admin, { customerId: "cus_new", customerEmail: "alice@example.com" });
    expect(result).toEqual({ userId: null, reason: "email_ambiguous" });
  });

  it("5. subscription metadata is the last resort", async () => {
    const { admin } = setup();
    const result = await resolveBillingUser(admin, {
      customerId: "cus_new",
      customerEmail: "nobody@example.com",
      subscriptionMetadataUserId: U1,
    });
    expect(result).toEqual({ userId: U1, via: "subscription_metadata", bindCustomer: true });
  });

  it("5. subscription metadata naming a different user than the bound customer is a contradiction", async () => {
    const { admin } = setup();
    const result = await resolveBillingUser(admin, { customerId: "cus_2", subscriptionMetadataUserId: U1 });
    expect(result).toEqual({ userId: null, reason: "customer_bound_to_other_user" });
  });

  it("ignores malformed ids and reports no signal when nothing usable is present", async () => {
    const { admin } = setup();
    const result = await resolveBillingUser(admin, {
      metadataUserId: "not-a-uuid",
      clientReferenceId: "42",
      customerId: "cus_new",
    });
    expect(result).toEqual({ userId: null, reason: "no_identity_signal" });
  });
});

describe("findConfirmedUserIdsByEmail", () => {
  it("paginates past the first Admin API page", async () => {
    const users = Array.from({ length: 230 }, (_, i) => ({
      id: `00000000-0000-4000-8000-${String(i).padStart(12, "0")}`,
      email: `user${i}@example.com`,
      email_confirmed_at: CONFIRMED,
    }));
    const { admin } = createFakeAdmin({ users });
    expect(await findConfirmedUserIdsByEmail(admin, "USER225@example.com")).toEqual([users[225].id]);
    expect(await findConfirmedUserIdsByEmail(admin, "   ")).toEqual([]);
  });
});

describe("recordUnresolvedBillingEvent — a paid event is never dropped", () => {
  const input = {
    eventId: "evt_1",
    eventType: "checkout.session.completed",
    payload: { id: "evt_1", type: "checkout.session.completed" },
    customerId: "cus_1",
    customerEmail: "alice@example.com",
    amountCents: 2999,
    currency: "usd",
    reason: "email_ambiguous",
  };

  it("writes one durable row, idempotently, and reports the event id to Sentry", async () => {
    const fake = createFakeAdmin({
      tables: { stripe_webhook_events: [{ stripe_event_id: "evt_1", type: "checkout.session.completed", error_message: null }] },
    });
    expect(await recordUnresolvedBillingEvent(fake.admin, input)).toBe("table");
    expect(await recordUnresolvedBillingEvent(fake.admin, input)).toBe("table");
    const rows = fake.rows("billing_unresolved_events");
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      stripe_event_id: "evt_1",
      event_type: "checkout.session.completed",
      stripe_customer_id: "cus_1",
      customer_email: "alice@example.com",
      amount_cents: 2999,
      reason: "email_ambiguous",
    });
    const call = vi.mocked(Sentry.captureMessage).mock.calls.at(-1);
    expect(call?.[1]).toMatchObject({
      level: "error",
      tags: { failure: "unresolved_binding", stored: "table" },
      extra: { stripe_event_id: "evt_1", reason: "email_ambiguous" },
    });
    // The ledger row is untouched when the table is available.
    expect(fake.rows("stripe_webhook_events")[0].error_message).toBeNull();
  });

  it("falls back to stamping the ledger row when the migration is not applied yet", async () => {
    const fake = createFakeAdmin({
      tables: { stripe_webhook_events: [{ stripe_event_id: "evt_1", type: "checkout.session.completed", error_message: null }] },
      missingTables: ["billing_unresolved_events"],
    });
    expect(await recordUnresolvedBillingEvent(fake.admin, input)).toBe("fallback");
    expect(fake.rows("stripe_webhook_events")[0].error_message).toBe("unresolved: email_ambiguous");
    const call = vi.mocked(Sentry.captureMessage).mock.calls.at(-1);
    expect(call?.[1]).toMatchObject({ tags: { stored: "fallback" }, extra: { stripe_event_id: "evt_1" } });
  });

  it("rethrows any other database failure so the webhook returns 500 and Stripe retries", async () => {
    const admin = {
      from: () => ({
        upsert: () => Promise.resolve({ error: { code: "57P01", message: "terminating connection" } }),
      }),
    } as unknown as Parameters<typeof recordUnresolvedBillingEvent>[0];
    await expect(recordUnresolvedBillingEvent(admin, input)).rejects.toMatchObject({ code: "57P01" });
  });
});
