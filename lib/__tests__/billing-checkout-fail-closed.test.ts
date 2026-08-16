import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createServerSupabaseClient: vi.fn(),
  createAdminSupabaseClient: vi.fn(),
  getStripe: vi.fn(),
  getPrimaryPlanPriceId: vi.fn(() => "price_pro_monthly"),
  captureServerEvent: vi.fn(),
  resolvePostAnalysisOfferCoupon: vi.fn(() => ({ kind: "none" as const })),
  captureException: vi.fn(),
  captureMessage: vi.fn(),
  stripeSubscriptionsList: vi.fn(),
  stripeCustomersRetrieve: vi.fn(),
  stripeCustomersUpdate: vi.fn(),
  stripeCustomersCreate: vi.fn(),
  stripeCheckoutCreate: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createServerSupabaseClient: mocks.createServerSupabaseClient,
}));
vi.mock("@/lib/supabase/admin", () => ({
  createAdminSupabaseClient: mocks.createAdminSupabaseClient,
}));
vi.mock("@/lib/entitlements", () => ({
  hasPaidPlanSubscription: vi.fn(),
}));
vi.mock("@/lib/stripe/client", () => ({ getStripe: mocks.getStripe }));
vi.mock("@/lib/stripe/plan-prices", () => ({
  getPrimaryPlanPriceId: mocks.getPrimaryPlanPriceId,
}));
vi.mock("@/lib/posthog-server", () => ({ captureServerEvent: mocks.captureServerEvent }));
vi.mock("@/lib/post-analysis-offer", () => ({
  resolvePostAnalysisOfferCoupon: mocks.resolvePostAnalysisOfferCoupon,
}));
vi.mock("@/lib/trial", () => ({ TRIAL_DAYS: 7 }));
vi.mock("@sentry/nextjs", () => ({
  captureException: mocks.captureException,
  captureMessage: mocks.captureMessage,
}));

import { createCheckoutSessionAction } from "@/app/actions/billing";

type QueryResult = { data: unknown; error: unknown };

function query(result: QueryResult) {
  const builder = {
    select: vi.fn(() => builder),
    eq: vi.fn(() => builder),
    in: vi.fn(() => builder),
    limit: vi.fn(() => builder),
    maybeSingle: vi.fn(() => Promise.resolve(result)),
  };
  return builder;
}

function arrangeCheckout(overrides: {
  liveSubscription?: QueryResult;
  priorSubscription?: QueryResult;
  profile?: QueryResult;
  plan?: QueryResult;
} = {}) {
  const subscriptionResults = [
    overrides.liveSubscription ?? { data: null, error: null },
    overrides.priorSubscription ?? { data: null, error: null },
  ];
  const profile =
    overrides.profile ??
    ({
      data: {
        stripe_customer_id: "cus_existing",
        display_name: "True Cap",
        first_name: null,
        last_name: null,
      },
      error: null,
    } satisfies QueryResult);
  const plan =
    overrides.plan ??
    ({
      data: { id: "plan-pro", slug: "pro_monthly", stripe_price_id: "price_db" },
      error: null,
    } satisfies QueryResult);

  mocks.createServerSupabaseClient.mockResolvedValue({
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: "user-1", email: "investor@example.com" } },
      }),
    },
    from: vi.fn((table: string) => {
      if (table === "subscriptions") {
        return query(subscriptionResults.shift() ?? { data: null, error: null });
      }
      if (table === "profiles") return query(profile);
      if (table === "plans") return query(plan);
      throw new Error(`Unexpected table: ${table}`);
    }),
  });
}

async function expectCheckoutBlocked() {
  const result = await createCheckoutSessionAction({ planSlug: "pro_monthly" });
  expect(result).toMatchObject({ ok: false, code: "SERVER_ERROR" });
  expect(mocks.stripeCheckoutCreate).not.toHaveBeenCalled();
}

describe("createCheckoutSessionAction fail-closed guards", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getPrimaryPlanPriceId.mockReturnValue("price_pro_monthly");
    mocks.resolvePostAnalysisOfferCoupon.mockReturnValue({ kind: "none" });
    mocks.stripeSubscriptionsList.mockResolvedValue({ data: [] });
    mocks.stripeCustomersRetrieve.mockResolvedValue({
      id: "cus_existing",
      metadata: { user_id: "user-1" },
    });
    mocks.stripeCustomersUpdate.mockResolvedValue({});
    mocks.stripeCustomersCreate.mockResolvedValue({ id: "cus_new" });
    mocks.stripeCheckoutCreate.mockResolvedValue({ id: "cs_test", url: "https://stripe.test" });
    mocks.getStripe.mockReturnValue({
      subscriptions: { list: mocks.stripeSubscriptionsList },
      customers: {
        retrieve: mocks.stripeCustomersRetrieve,
        update: mocks.stripeCustomersUpdate,
        create: mocks.stripeCustomersCreate,
      },
      checkout: { sessions: { create: mocks.stripeCheckoutCreate } },
    });
    mocks.createAdminSupabaseClient.mockReturnValue({
      from: vi.fn(() => ({
        update: vi.fn(() => ({ eq: vi.fn().mockResolvedValue({ error: null }) })),
      })),
    });
  });

  it("does not create Checkout when the live-subscription lookup fails", async () => {
    arrangeCheckout({ liveSubscription: { data: null, error: new Error("subscriptions down") } });
    await expectCheckoutBlocked();
    expect(mocks.getStripe).not.toHaveBeenCalled();
  });

  it("does not create Checkout when the prior-subscription lookup fails", async () => {
    arrangeCheckout({ priorSubscription: { data: null, error: new Error("history down") } });
    await expectCheckoutBlocked();
    expect(mocks.getStripe).not.toHaveBeenCalled();
  });

  it("does not create Checkout when the billing-profile lookup errors", async () => {
    arrangeCheckout({ profile: { data: null, error: new Error("profiles down") } });
    await expectCheckoutBlocked();
    expect(mocks.getStripe).not.toHaveBeenCalled();
  });

  it("does not create Checkout when the billing profile is missing", async () => {
    arrangeCheckout({ profile: { data: null, error: null } });
    await expectCheckoutBlocked();
    expect(mocks.getStripe).not.toHaveBeenCalled();
  });

  it("does not create Checkout when Stripe cannot verify subscriptions", async () => {
    arrangeCheckout();
    mocks.stripeSubscriptionsList.mockRejectedValue(new Error("Stripe unavailable"));
    await expectCheckoutBlocked();
    expect(mocks.stripeCustomersRetrieve).not.toHaveBeenCalled();
  });

  it("repairs a confirmed missing Stripe customer before creating Checkout", async () => {
    arrangeCheckout();
    const missingCustomer = Object.assign(new Error("No such customer"), {
      code: "resource_missing",
    });
    mocks.stripeSubscriptionsList.mockRejectedValueOnce(missingCustomer);
    mocks.stripeCustomersRetrieve.mockRejectedValueOnce(missingCustomer);

    const result = await createCheckoutSessionAction({ planSlug: "pro_monthly" });

    expect(result).toEqual({ ok: true, url: "https://stripe.test" });
    expect(mocks.stripeCustomersRetrieve).toHaveBeenCalledWith("cus_existing");
    expect(mocks.stripeCustomersCreate).toHaveBeenCalledWith({
      email: "investor@example.com",
      name: "True Cap",
      metadata: { user_id: "user-1" },
    });
    expect(mocks.stripeCheckoutCreate).toHaveBeenCalledWith(
      expect.objectContaining({ customer: "cus_new" })
    );
  });

  it("does not create Checkout when the stored Stripe customer lookup fails", async () => {
    arrangeCheckout();
    mocks.stripeCustomersRetrieve.mockRejectedValue(new Error("Stripe unavailable"));
    await expectCheckoutBlocked();
  });
});
