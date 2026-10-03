import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * The Stripe account is shared with another product. The three billing-portal
 * sessions opened from /profile pass a TrueCap-only portal configuration when
 * STRIPE_BILLING_PORTAL_CONFIGURATION_ID is set. Unset, the request to Stripe
 * is exactly what it was before the variable existed.
 *
 * Stripe and Supabase are mocked: nothing leaves the process.
 */

const USER_ID = "9ebd77d1-16f5-4e45-8c31-21ff8e401351";

const mocks = vi.hoisted(() => ({
  portalCreate: vi.fn(),
  captureMessage: vi.fn(),
}));

vi.mock("next/headers", () => ({ cookies: async () => ({ get: vi.fn(), set: vi.fn() }) }));
vi.mock("@sentry/nextjs", () => ({ captureException: vi.fn(), captureMessage: mocks.captureMessage }));
vi.mock("@/lib/posthog-server", () => ({ captureServerEvent: vi.fn() }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminSupabaseClient: () => ({}) }));
vi.mock("@/lib/supabase/server", () => ({
  createServerSupabaseClient: async () => ({
    auth: { getUser: async () => ({ data: { user: { id: USER_ID } } }) },
    from: (table: string) => {
      const row =
        table === "profiles"
          ? { stripe_customer_id: "cus_truecap_1" }
          : { stripe_subscription_id: "sub_truecap_1", plans: { slug: "pro_monthly" } };
      const query = {
        select: () => query,
        eq: () => query,
        in: () => query,
        order: () => query,
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
    subscriptions: { retrieve: async () => ({ items: { data: [{ id: "si_truecap_1" }] } }) },
    billingPortal: { sessions: { create: mocks.portalCreate } },
  }),
}));
vi.mock("@/lib/stripe/subscription-checkout-intent", () => ({}));

import {
  createBillingPortalSessionAction,
  createCancelSubscriptionPortalSessionAction,
  createSwitchPlanPortalSessionAction,
} from "@/app/actions/billing";

const SITE = "https://app.example.test";

/** The exact request each action sent before the variable existed. */
const BEFORE = {
  portal: { customer: "cus_truecap_1", return_url: `${SITE}/profile` },
  cancel: {
    customer: "cus_truecap_1",
    return_url: `${SITE}/profile`,
    flow_data: {
      type: "subscription_cancel",
      subscription_cancel: { subscription: "sub_truecap_1" },
      after_completion: {
        type: "redirect",
        redirect: { return_url: `${SITE}/profile?billing=subscription_cancelled` },
      },
    },
  },
  switch: {
    customer: "cus_truecap_1",
    return_url: `${SITE}/profile?billing=plan_switched#billing`,
    flow_data: {
      type: "subscription_update_confirm",
      subscription_update_confirm: {
        subscription: "sub_truecap_1",
        items: [{ id: "si_truecap_1", price: "price_pro_annual", quantity: 1 }],
      },
      after_completion: {
        type: "redirect",
        redirect: { return_url: `${SITE}/profile?billing=plan_switched#billing` },
      },
    },
  },
};

async function openAllThree() {
  mocks.portalCreate.mockClear();
  const results = [
    await createBillingPortalSessionAction(),
    await createCancelSubscriptionPortalSessionAction(),
    await createSwitchPlanPortalSessionAction({ targetPlanSlug: "pro_annual" }),
  ];
  for (const result of results) {
    expect(result).toEqual({ ok: true, url: "https://billing.stripe.test/p/session" });
  }
  expect(mocks.portalCreate).toHaveBeenCalledTimes(3);
  return mocks.portalCreate.mock.calls.map(([params]) => params);
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("NEXT_PUBLIC_SITE_URL", SITE);
  vi.stubEnv("STRIPE_PRICE_PRO_ANNUAL", "price_pro_annual");
  mocks.portalCreate.mockResolvedValue({ url: "https://billing.stripe.test/p/session" });
});
afterEach(() => vi.unstubAllEnvs());

describe("billing portal configuration id", () => {
  it.each([undefined, "", "   "])("unset (%j): the three requests are exactly the old ones", async (value) => {
    vi.stubEnv("STRIPE_BILLING_PORTAL_CONFIGURATION_ID", value);
    const [portal, cancel, switchPlan] = await openAllThree();
    expect(portal).toStrictEqual(BEFORE.portal);
    expect(cancel).toStrictEqual(BEFORE.cancel);
    expect(switchPlan).toStrictEqual(BEFORE.switch);
    expect(mocks.captureMessage).not.toHaveBeenCalled();
  });

  it("set: all three sessions name the TrueCap configuration and change nothing else", async () => {
    vi.stubEnv("STRIPE_BILLING_PORTAL_CONFIGURATION_ID", " bpc_TrueCapOnly123 ");
    const [portal, cancel, switchPlan] = await openAllThree();
    expect(portal).toStrictEqual({ ...BEFORE.portal, configuration: "bpc_TrueCapOnly123" });
    expect(cancel).toStrictEqual({ ...BEFORE.cancel, configuration: "bpc_TrueCapOnly123" });
    expect(switchPlan).toStrictEqual({ ...BEFORE.switch, configuration: "bpc_TrueCapOnly123" });
  });

  it("a value that is not a bpc_ id is reported and not sent to Stripe", async () => {
    vi.stubEnv("STRIPE_BILLING_PORTAL_CONFIGURATION_ID", "prod_notAPortalConfig");
    const [portal, cancel, switchPlan] = await openAllThree();
    expect(portal).toStrictEqual(BEFORE.portal);
    expect(cancel).toStrictEqual(BEFORE.cancel);
    expect(switchPlan).toStrictEqual(BEFORE.switch);
    expect(mocks.captureMessage).toHaveBeenCalledWith(
      expect.stringContaining("STRIPE_BILLING_PORTAL_CONFIGURATION_ID"),
      expect.objectContaining({ level: "error" }),
    );
  });
});
