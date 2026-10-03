import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type Stripe from "stripe";
import type { SubscriptionCheckoutIntent } from "@/lib/stripe/subscription-checkout-intent";
import { FIRST_TOUCH_REFERRAL_SOURCES } from "@/lib/first-touch";
import {
  firstTouchSubscriptionMetadata,
  readStoredFirstTouchSource,
} from "@/lib/first-touch-server";

/**
 * Audit row P2-117: the subscription created by Checkout carries the coarse
 * first-touch source stored on the account at sign-up, so revenue can be
 * split by channel in Stripe. One key, `first_touch_source`, whose value is
 * one of the nine source tokens or the key is absent.
 *
 * Everything here is mocked: no request reaches Stripe or Supabase.
 */

const USER_ID = "9ebd77d1-16f5-4e45-8c31-21ff8e401351";
const INTENT_ID = "bd2e82b7-157c-4d7f-b952-700b1122e21d";

const mocks = vi.hoisted(() => ({
  appMetadata: undefined as unknown,
  acquire: vi.fn(),
  bind: vi.fn(),
  markOpen: vi.fn(),
  sessionCreate: vi.fn(),
  sessionList: vi.fn(),
  subscriptionsList: vi.fn(),
  customerRetrieve: vi.fn(),
  captureServerEvent: vi.fn(),
}));

vi.mock("next/headers", () => ({ cookies: async () => ({ get: vi.fn(), set: vi.fn() }) }));
vi.mock("@sentry/nextjs", () => ({ captureException: vi.fn(), captureMessage: vi.fn() }));
vi.mock("@/lib/posthog-server", () => ({ captureServerEvent: mocks.captureServerEvent }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminSupabaseClient: () => ({ admin: true }) }));
vi.mock("@/lib/supabase/server", () => ({
  createServerSupabaseClient: async () => ({
    auth: {
      getUser: async () => ({
        data: {
          user: { id: USER_ID, email: "buyer@example.test", app_metadata: mocks.appMetadata },
        },
      }),
    },
    from: (table: string) => {
      const row =
        table === "subscriptions"
          ? null
          : table === "profiles"
            ? { stripe_customer_id: "cus_truecap_1", display_name: null, first_name: null, last_name: null }
            : { slug: "any" };
      const query = {
        select: () => query,
        eq: () => query,
        in: () => query,
        limit: () => query,
        maybeSingle: async () => ({ data: row, error: null }),
      };
      return query;
    },
  }),
}));
vi.mock("@/lib/public-pricing", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/public-pricing")>()),
  stripePriceMatchesCatalog: () => true,
}));
vi.mock("@/lib/stripe/client", () => ({
  getStripe: () => ({
    prices: { retrieve: async (id: string) => ({ id }) },
    subscriptions: { list: mocks.subscriptionsList },
    customers: { retrieve: mocks.customerRetrieve, update: vi.fn(), create: vi.fn() },
    checkout: {
      sessions: { create: mocks.sessionCreate, list: mocks.sessionList },
    },
  }),
}));
vi.mock("@/lib/stripe/subscription-checkout-intent", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/stripe/subscription-checkout-intent")>()),
  acquireSubscriptionCheckoutIntent: mocks.acquire,
  bindSubscriptionCheckoutCustomer: mocks.bind,
  markSubscriptionCheckoutIntentOpen: mocks.markOpen,
}));

import { createCheckoutSessionAction } from "@/app/actions/billing";

const newIntent: SubscriptionCheckoutIntent = {
  id: INTENT_ID,
  user_id: USER_ID,
  plan_slug: "pro_monthly",
  stripe_price_id: "price_pro_monthly",
  stripe_discount_coupon_id: null,
  trial_days: 0,
  status: "creating",
  lease_expires_at: "2099-01-01T00:00:00.000Z",
  stripe_customer_id: null,
  stripe_checkout_session_id: null,
  stripe_expires_at: null,
  pack_credit_claim_id: null,
  created_at: "2026-10-03T00:00:00.000Z",
  updated_at: "2026-10-03T00:00:00.000Z",
};

beforeEach(() => {
  vi.clearAllMocks();
  mocks.appMetadata = undefined;
  vi.stubEnv("STRIPE_PRICE_PRO_MONTHLY", "price_pro_monthly");
  vi.stubEnv("STRIPE_PRICE_PRO_ANNUAL", "price_pro_annual");
  vi.stubEnv("STRIPE_ANNUAL_DISCOUNT_COUPON_ID", undefined);
  vi.stubEnv("STRIPE_PACK_CREDIT_900_COUPON_ID", undefined);
  vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://app.example.test");
  vi.spyOn(console, "error").mockImplementation(() => {});

  mocks.acquire.mockResolvedValue({ acquired: true, intent: newIntent });
  mocks.subscriptionsList.mockResolvedValue({ data: [] });
  mocks.sessionList.mockResolvedValue({ data: [] });
  mocks.customerRetrieve.mockResolvedValue({ id: "cus_truecap_1", metadata: { user_id: USER_ID } });
  mocks.bind.mockImplementation(async (_admin, _id, customerId: string) => ({
    ...newIntent,
    stripe_customer_id: customerId,
  }));
  mocks.markOpen.mockImplementation(async (_admin, _id, created: Stripe.Checkout.Session) => ({
    ...newIntent,
    status: "open",
    stripe_customer_id: "cus_truecap_1",
    stripe_checkout_session_id: created.id,
  }));
  mocks.sessionCreate.mockImplementation(async (params: Stripe.Checkout.SessionCreateParams) => ({
    id: "cs_new_monthly",
    object: "checkout.session",
    mode: params.mode,
    status: "open",
    url: "https://checkout.stripe.test/c/pay/cs_new_monthly",
    customer: params.customer,
    client_reference_id: params.client_reference_id,
    expires_at: 4070908800,
    metadata: params.metadata,
    line_items: { object: "list", data: [{ price: { id: params.line_items?.[0]?.price }, quantity: 1 }] },
    discounts: [],
  }));
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

const BASE_SUBSCRIPTION_METADATA = {
  user_id: USER_ID,
  supabase_user_id: USER_ID,
  app: "truecap",
  plan_slug: "pro_monthly",
};

async function createdParams(): Promise<Stripe.Checkout.SessionCreateParams> {
  const result = await createCheckoutSessionAction({ planSlug: "pro_monthly" });
  expect(result).toEqual({ ok: true, url: "https://checkout.stripe.test/c/pay/cs_new_monthly" });
  expect(mocks.sessionCreate).toHaveBeenCalledTimes(1);
  return mocks.sessionCreate.mock.calls[0][0];
}

describe("readStoredFirstTouchSource", () => {
  it("returns each of the nine stored source tokens and nothing else from the record", () => {
    for (const source of FIRST_TOUCH_REFERRAL_SOURCES) {
      expect(
        readStoredFirstTouchSource({ tc_first_touch: { source, section: "pricing", v: 1 } }),
      ).toBe(source);
      expect(
        firstTouchSubscriptionMetadata({ tc_first_touch: { source, section: "pricing", v: 1 } }),
      ).toEqual({ first_touch_source: source });
    }
  });

  it("is null, and adds no key, when there is no record", () => {
    for (const appMetadata of [
      undefined,
      null,
      "paid_search",
      42,
      {},
      { provider: "google", providers: ["google"] },
      { tc_first_touch: null },
      { tc_first_touch: "paid_search" },
      { tc_first_touch: ["paid_search"] },
      { tc_first_touch: { section: "pricing", v: 1 } },
    ]) {
      expect(readStoredFirstTouchSource(appMetadata)).toBeNull();
      expect(firstTouchSubscriptionMetadata(appMetadata)).toEqual({});
    }
  });

  it("drops a malformed or oversized stored value", () => {
    for (const source of [
      "",
      "Paid_Search",
      "paid_search ",
      "paid-search",
      "gclid=Cj0KCQjw",
      "https://usetruecap.com/pricing?gclid=Cj0KCQjw",
      "utm_campaign=jane.doe@example.com",
      "paid_search.pricing",
      "x".repeat(600),
      `paid_search${"x".repeat(600)}`,
      7,
      true,
      null,
      { source: "paid_search" },
      ["paid_search"],
    ]) {
      const appMetadata = { tc_first_touch: { source, section: "pricing", v: 1 } };
      expect(readStoredFirstTouchSource(appMetadata)).toBeNull();
      expect(firstTouchSubscriptionMetadata(appMetadata)).toEqual({});
    }
  });
});

describe("the subscription Checkout Session carries the first-touch source", () => {
  it("adds first_touch_source to the subscription metadata when the account has a known source", async () => {
    mocks.appMetadata = {
      provider: "email",
      tc_first_touch: { source: "paid_search", section: "for_agents", v: 1 },
    };
    const params = await createdParams();
    expect(params.subscription_data?.metadata).toEqual({
      ...BASE_SUBSCRIPTION_METADATA,
      first_touch_source: "paid_search",
    });
    // The Session's own metadata, which the exact-binding check and the
    // webhook read, is unchanged: the source is on the subscription only.
    expect(params.metadata).not.toHaveProperty("first_touch_source");
    // The landing section and version never leave the account record.
    expect(JSON.stringify(params)).not.toContain("for_agents");
    expect(JSON.stringify(params)).not.toContain("tc_first_touch");
  });

  it("leaves the key out when the account has no first-touch record", async () => {
    for (const appMetadata of [undefined, {}, { provider: "google" }]) {
      mocks.sessionCreate.mockClear();
      mocks.appMetadata = appMetadata;
      const params = await createdParams();
      expect(params.subscription_data?.metadata).toEqual(BASE_SUBSCRIPTION_METADATA);
    }
  });

  it("leaves the key out when the stored value is malformed or oversized", async () => {
    for (const source of [
      "https://usetruecap.com/?gclid=Cj0KCQjw",
      "x".repeat(600),
      "",
      42,
    ]) {
      mocks.sessionCreate.mockClear();
      mocks.appMetadata = { tc_first_touch: { source, section: "pricing", v: 1 } };
      const params = await createdParams();
      expect(params.subscription_data?.metadata).toEqual(BASE_SUBSCRIPTION_METADATA);
      expect(JSON.stringify(params)).not.toContain("gclid");
    }
  });

  it("is read from the account record, not from a cookie, the request or the client", () => {
    const billing = readFileSync(join(__dirname, "..", "..", "app/actions/billing.ts"), "utf8");
    expect(billing).toContain("...firstTouchSubscriptionMetadata(args.appMetadata),");
    expect(billing.match(/appMetadata: user\.app_metadata,/g)).toHaveLength(2);
    expect(billing.match(/firstTouchSubscriptionMetadata/g)).toHaveLength(2);
    expect(billing).not.toMatch(/tc_ft|FIRST_TOUCH_COOKIE|user_metadata\.tc_first_touch/);
    // Stripe only: the source is not forwarded to Google or PostHog here.
    expect(billing).not.toMatch(/first_touch_source/);
  });
});
