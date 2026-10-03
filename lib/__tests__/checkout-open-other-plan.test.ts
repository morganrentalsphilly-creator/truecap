import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type Stripe from "stripe";
import type { SubscriptionCheckoutIntent } from "@/lib/stripe/subscription-checkout-intent";

/**
 * A signed-in buyer who opens Stripe Checkout, goes back and picks another
 * plan or billing period used to be refused until Stripe expired the first
 * Session (24 hours). createCheckoutSessionAction now tells the caller an
 * open checkout for other terms exists, and on `startOver: true` expires
 * that Session, marks its intent expired and reserves a new one.
 *
 * Everything here is mocked: no request reaches Stripe or Supabase.
 */

const USER_ID = "9ebd77d1-16f5-4e45-8c31-21ff8e401351";
const OLD_INTENT_ID = "ad2e82b7-157c-4d7f-b952-700b1122e21d";
const NEW_INTENT_ID = "bd2e82b7-157c-4d7f-b952-700b1122e21d";

const mocks = vi.hoisted(() => ({
  acquire: vi.fn(),
  bind: vi.fn(),
  markOpen: vi.fn(),
  complete: vi.fn(),
  expireIntent: vi.fn(),
  fail: vi.fn(),
  claim: vi.fn(),
  replace: vi.fn(),
  sessionRetrieve: vi.fn(),
  sessionExpire: vi.fn(),
  sessionCreate: vi.fn(),
  sessionList: vi.fn(),
  subscriptionsList: vi.fn(),
  customerRetrieve: vi.fn(),
  captureMessage: vi.fn(),
  captureException: vi.fn(),
  captureServerEvent: vi.fn(),
}));

vi.mock("next/headers", () => ({ cookies: async () => ({ get: vi.fn(), set: vi.fn() }) }));
vi.mock("@sentry/nextjs", () => ({
  captureException: mocks.captureException,
  captureMessage: mocks.captureMessage,
}));
vi.mock("@/lib/posthog-server", () => ({ captureServerEvent: mocks.captureServerEvent }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminSupabaseClient: () => ({ admin: true }) }));
vi.mock("@/lib/supabase/server", () => ({
  createServerSupabaseClient: async () => ({
    auth: { getUser: async () => ({ data: { user: { id: USER_ID, email: "buyer@example.test" } } }) },
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
      sessions: {
        retrieve: mocks.sessionRetrieve,
        expire: mocks.sessionExpire,
        create: mocks.sessionCreate,
        list: mocks.sessionList,
      },
    },
  }),
}));
// The pure policies (configuration match, exact Session binding, lease
// staleness) stay real; only the database transitions are mocked.
vi.mock("@/lib/stripe/subscription-checkout-intent", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/stripe/subscription-checkout-intent")>()),
  acquireSubscriptionCheckoutIntent: mocks.acquire,
  bindSubscriptionCheckoutCustomer: mocks.bind,
  markSubscriptionCheckoutIntentOpen: mocks.markOpen,
  completeSubscriptionCheckoutIntentFromWebhook: mocks.complete,
  expireSubscriptionCheckoutIntentFromWebhook: mocks.expireIntent,
  failSubscriptionCheckoutIntent: mocks.fail,
  claimStaleSubscriptionCheckoutIntentForReplacement: mocks.claim,
  replaceStaleSubscriptionCheckoutIntent: mocks.replace,
}));

import { createCheckoutSessionAction } from "@/app/actions/billing";

function intent(overrides: Partial<SubscriptionCheckoutIntent> = {}): SubscriptionCheckoutIntent {
  return {
    id: OLD_INTENT_ID,
    user_id: USER_ID,
    plan_slug: "pro_monthly",
    stripe_price_id: "price_pro_monthly",
    stripe_discount_coupon_id: null,
    trial_days: 0,
    status: "open",
    lease_expires_at: "2099-01-01T00:00:00.000Z",
    stripe_customer_id: "cus_truecap_1",
    stripe_checkout_session_id: "cs_old_monthly",
    stripe_expires_at: "2099-01-01T00:00:00.000Z",
    pack_credit_claim_id: null,
    created_at: "2026-10-03T00:00:00.000Z",
    updated_at: "2026-10-03T00:00:00.000Z",
    ...overrides,
  };
}

/** A hosted Session exactly bound to `forIntent`, as Stripe would return it. */
function session(
  forIntent: SubscriptionCheckoutIntent,
  overrides: Record<string, unknown> = {},
): Stripe.Checkout.Session {
  const id = forIntent.stripe_checkout_session_id ?? "cs_new_annual";
  return {
    id,
    object: "checkout.session",
    mode: "subscription",
    status: "open",
    url: `https://checkout.stripe.test/c/pay/${id}`,
    customer: "cus_truecap_1",
    client_reference_id: USER_ID,
    expires_at: 4070908800,
    metadata: {
      checkout_intent_id: forIntent.id,
      checkout_price_id: forIntent.stripe_price_id,
      checkout_discount_coupon_id: "none",
      checkout_trial_days: "0",
      user_id: USER_ID,
      plan_slug: forIntent.plan_slug,
    },
    line_items: { object: "list", data: [{ price: { id: forIntent.stripe_price_id }, quantity: 1 }] },
    discounts: [],
    ...overrides,
  } as unknown as Stripe.Checkout.Session;
}

const openMonthlyIntent = intent();
const newAnnualIntent = intent({
  id: NEW_INTENT_ID,
  plan_slug: "pro_annual",
  stripe_price_id: "price_pro_annual",
  status: "creating",
  stripe_customer_id: null,
  stripe_checkout_session_id: null,
  stripe_expires_at: null,
});

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("STRIPE_PRICE_PRO_MONTHLY", "price_pro_monthly");
  vi.stubEnv("STRIPE_PRICE_PRO_ANNUAL", "price_pro_annual");
  // Unset, as in production: no coupon is attached to a subscription checkout.
  vi.stubEnv("STRIPE_ANNUAL_DISCOUNT_COUPON_ID", undefined);
  vi.stubEnv("STRIPE_PACK_CREDIT_900_COUPON_ID", undefined);
  vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://app.example.test");
  vi.spyOn(console, "error").mockImplementation(() => {});

  mocks.subscriptionsList.mockResolvedValue({ data: [] });
  mocks.customerRetrieve.mockResolvedValue({ id: "cus_truecap_1", metadata: { user_id: USER_ID } });
  mocks.bind.mockImplementation(async (_admin, _id, customerId: string) => ({
    ...newAnnualIntent,
    stripe_customer_id: customerId,
  }));
  mocks.markOpen.mockImplementation(async (_admin, _id, created: Stripe.Checkout.Session) => ({
    ...newAnnualIntent,
    status: "open",
    stripe_customer_id: "cus_truecap_1",
    stripe_checkout_session_id: created.id,
  }));
  // Stripe echoes the request: the created Session carries exactly the
  // metadata, customer and line item the action asked for.
  mocks.sessionCreate.mockImplementation(async (params: Stripe.Checkout.SessionCreateParams) => ({
    id: "cs_new_annual",
    object: "checkout.session",
    mode: params.mode,
    status: "open",
    url: "https://checkout.stripe.test/c/pay/cs_new_annual",
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

describe("a checkout request while another one is open", () => {
  it("resumes the open Session when the request matches it, with or without startOver", async () => {
    mocks.acquire.mockResolvedValue({ acquired: false, intent: openMonthlyIntent });
    mocks.sessionRetrieve.mockResolvedValue(session(openMonthlyIntent));

    for (const input of [{ planSlug: "pro_monthly" }, { planSlug: "pro_monthly", startOver: true }]) {
      expect(await createCheckoutSessionAction(input)).toEqual({
        ok: true,
        url: "https://checkout.stripe.test/c/pay/cs_old_monthly",
      });
    }
    expect(mocks.sessionExpire).not.toHaveBeenCalled();
    expect(mocks.sessionCreate).not.toHaveBeenCalled();
    expect(mocks.expireIntent).not.toHaveBeenCalled();
  });

  it("changes nothing and offers both ways out when the request differs and startOver is not set", async () => {
    mocks.acquire.mockResolvedValue({ acquired: false, intent: openMonthlyIntent });
    mocks.sessionRetrieve.mockResolvedValue(session(openMonthlyIntent));

    expect(await createCheckoutSessionAction({ planSlug: "pro_annual" })).toEqual({
      ok: false,
      code: "CHECKOUT_OPEN_OTHER_PLAN",
      message: "A checkout you started earlier is still open. Resume it, or start over with this plan.",
      openPlanSlug: "pro_monthly",
      resumeUrl: "https://checkout.stripe.test/c/pay/cs_old_monthly",
    });
    expect(mocks.acquire).toHaveBeenCalledTimes(1);
    expect(mocks.sessionExpire).not.toHaveBeenCalled();
    expect(mocks.expireIntent).not.toHaveBeenCalled();
    expect(mocks.sessionCreate).not.toHaveBeenCalled();
  });

  it("on startOver expires the old Session, marks its intent expired and opens a new Session for the new terms", async () => {
    const expiredOld = session(openMonthlyIntent, { status: "expired", url: null });
    mocks.acquire
      .mockResolvedValueOnce({ acquired: false, intent: openMonthlyIntent })
      .mockResolvedValueOnce({ acquired: true, intent: newAnnualIntent });
    mocks.sessionRetrieve.mockResolvedValue(session(openMonthlyIntent));
    mocks.sessionExpire.mockResolvedValue(expiredOld);
    mocks.sessionList.mockResolvedValue({ data: [expiredOld] });

    const result = await createCheckoutSessionAction({ planSlug: "pro_annual", startOver: true });

    expect(result).toEqual({ ok: true, url: "https://checkout.stripe.test/c/pay/cs_new_annual" });
    expect(mocks.sessionExpire).toHaveBeenCalledTimes(1);
    expect(mocks.sessionExpire).toHaveBeenCalledWith("cs_old_monthly");
    expect(mocks.expireIntent).toHaveBeenCalledTimes(1);
    expect(mocks.expireIntent).toHaveBeenCalledWith({ admin: true }, expiredOld);
    // The old intent is expired BEFORE the new one is reserved, and the new
    // Session is created only after both.
    expect(mocks.expireIntent.mock.invocationCallOrder[0]).toBeLessThan(
      mocks.acquire.mock.invocationCallOrder[1],
    );
    expect(mocks.acquire.mock.invocationCallOrder[1]).toBeLessThan(
      mocks.sessionCreate.mock.invocationCallOrder[0],
    );
    // New terms, new intent, new idempotency key: the old Session is never reused.
    expect(mocks.sessionCreate).toHaveBeenCalledTimes(1);
    const [params, options] = mocks.sessionCreate.mock.calls[0];
    expect(params.line_items).toEqual([{ price: "price_pro_annual", quantity: 1 }]);
    expect(params.metadata).toMatchObject({ checkout_intent_id: NEW_INTENT_ID, plan_slug: "pro_annual" });
    expect(options).toEqual({ idempotencyKey: `truecap-subscription-checkout:${NEW_INTENT_ID}` });
    expect(mocks.markOpen).toHaveBeenCalledTimes(1);
    expect(mocks.complete).not.toHaveBeenCalled();
  });

  it("honours a Session that completes while it is being expired and opens no second checkout", async () => {
    const completedOld = session(openMonthlyIntent, { status: "complete", url: null });
    mocks.acquire.mockResolvedValue({ acquired: false, intent: openMonthlyIntent });
    mocks.sessionRetrieve
      .mockResolvedValueOnce(session(openMonthlyIntent))
      .mockResolvedValueOnce(completedOld);
    mocks.sessionExpire.mockRejectedValue(new Error("This Session is not in an expireable state"));

    expect(await createCheckoutSessionAction({ planSlug: "pro_annual", startOver: true })).toMatchObject({
      ok: false,
      code: "ALREADY_SUBSCRIBED",
    });
    expect(mocks.complete).toHaveBeenCalledWith({ admin: true }, completedOld);
    expect(mocks.expireIntent).not.toHaveBeenCalled();
    expect(mocks.acquire).toHaveBeenCalledTimes(1);
    expect(mocks.sessionCreate).not.toHaveBeenCalled();
  });

  it("fails closed when the expire request fails and Stripe still reports the Session open", async () => {
    mocks.acquire.mockResolvedValue({ acquired: false, intent: openMonthlyIntent });
    mocks.sessionRetrieve.mockResolvedValue(session(openMonthlyIntent));
    mocks.sessionExpire.mockRejectedValue(new Error("Stripe is unavailable"));

    expect(await createCheckoutSessionAction({ planSlug: "pro_annual", startOver: true })).toMatchObject({
      ok: false,
      code: "SERVER_ERROR",
    });
    expect(mocks.expireIntent).not.toHaveBeenCalled();
    expect(mocks.acquire).toHaveBeenCalledTimes(1);
    expect(mocks.sessionCreate).not.toHaveBeenCalled();
  });

  it("never expires or hands out an open Session that is not bound to the ledger row", async () => {
    mocks.acquire.mockResolvedValue({ acquired: false, intent: openMonthlyIntent });
    mocks.sessionRetrieve.mockResolvedValue(session(openMonthlyIntent, { customer: "cus_someone_else" }));

    for (const input of [{ planSlug: "pro_annual" }, { planSlug: "pro_annual", startOver: true }]) {
      const result = await createCheckoutSessionAction(input);
      expect(result).toMatchObject({ ok: false, code: "SERVER_ERROR" });
      expect(result).not.toHaveProperty("resumeUrl");
    }
    expect(mocks.sessionExpire).not.toHaveBeenCalled();
    expect(mocks.expireIntent).not.toHaveBeenCalled();
    expect(mocks.sessionCreate).not.toHaveBeenCalled();
  });

  it("needs no choice when Stripe already expired the old Session: the intent is closed and the new plan opens", async () => {
    const expiredOld = session(openMonthlyIntent, { status: "expired", url: null });
    mocks.acquire
      .mockResolvedValueOnce({ acquired: false, intent: openMonthlyIntent })
      .mockResolvedValueOnce({ acquired: true, intent: newAnnualIntent });
    mocks.sessionRetrieve.mockResolvedValue(expiredOld);
    mocks.sessionList.mockResolvedValue({ data: [expiredOld] });

    expect(await createCheckoutSessionAction({ planSlug: "pro_annual" })).toEqual({
      ok: true,
      url: "https://checkout.stripe.test/c/pay/cs_new_annual",
    });
    expect(mocks.sessionExpire).not.toHaveBeenCalled();
    expect(mocks.expireIntent).toHaveBeenCalledWith({ admin: true }, expiredOld);
    expect(mocks.sessionCreate).toHaveBeenCalledTimes(1);
  });

  it("rejects a startOver value that is not a boolean", async () => {
    expect(
      await createCheckoutSessionAction({ planSlug: "pro_annual", startOver: "yes" }),
    ).toMatchObject({ ok: false, code: "PLAN_NOT_FOUND" });
    expect(mocks.acquire).not.toHaveBeenCalled();
  });
});
