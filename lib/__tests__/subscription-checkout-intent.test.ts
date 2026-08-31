import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";
import type Stripe from "stripe";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  SUBSCRIPTION_CHECKOUT_CREATING_LEASE_MS,
  claimStaleSubscriptionCheckoutIntentForReplacement,
  isReusableSubscriptionCheckoutSession,
  replaceStaleSubscriptionCheckoutIntent,
  subscriptionCheckoutIntentLeaseIsStale,
  subscriptionCheckoutIntentMatchesConfiguration,
  type SubscriptionCheckoutIntent,
} from "@/lib/stripe/subscription-checkout-intent";

const ROOT = join(__dirname, "..", "..");
const USER_ID = "9ebd77d1-16f5-4e45-8c31-21ff8e401351";

function indexOfPattern(
  source: string,
  pattern: RegExp,
  fromIndex = 0,
): number {
  const relativeIndex = source.slice(fromIndex).search(pattern);
  return relativeIndex < 0 ? -1 : fromIndex + relativeIndex;
}

function intent(
  overrides: Partial<SubscriptionCheckoutIntent> = {},
): SubscriptionCheckoutIntent {
  return {
    id: "ad2e82b7-157c-4d7f-b952-700b1122e21d",
    user_id: USER_ID,
    plan_slug: "pro_monthly",
    stripe_price_id: "price_current_pro",
    stripe_discount_coupon_id: "coupon_pack",
    trial_days: 14,
    status: "open",
    lease_expires_at: "2026-08-24T00:00:00.000Z",
    stripe_customer_id: "cus_truecap_1",
    stripe_checkout_session_id: "cs_truecap_1",
    stripe_expires_at: "2026-08-24T00:00:00.000Z",
    pack_credit_claim_id: "84cc5799-309a-431d-8dfa-a6b3613434c3",
    created_at: "2026-08-23T00:00:00.000Z",
    updated_at: "2026-08-23T00:00:00.000Z",
    ...overrides,
  };
}

function session(
  overrides: Record<string, unknown> = {},
): Stripe.Checkout.Session {
  return {
    id: "cs_truecap_1",
    object: "checkout.session",
    mode: "subscription",
    status: "open",
    url: "https://checkout.stripe.test/c/pay/cs_truecap_1",
    customer: "cus_truecap_1",
    client_reference_id: USER_ID,
    expires_at: Math.floor(Date.parse("2026-08-24T00:00:00.000Z") / 1000),
    metadata: {
      checkout_intent_id: "ad2e82b7-157c-4d7f-b952-700b1122e21d",
      checkout_price_id: "price_current_pro",
      checkout_discount_coupon_id: "coupon_pack",
      checkout_trial_days: "14",
      user_id: USER_ID,
      plan_slug: "pro_monthly",
      pack_credit_claim_id: "84cc5799-309a-431d-8dfa-a6b3613434c3",
    },
    line_items: {
      object: "list",
      data: [
        {
          price: { id: "price_current_pro" },
          quantity: 1,
        },
      ],
      has_more: false,
      url: "/v1/checkout/sessions/cs_truecap_1/line_items",
    },
    discounts: [{ coupon: "coupon_pack", promotion_code: null }],
    ...overrides,
  } as unknown as Stripe.Checkout.Session;
}

describe("subscription Checkout Session reuse policy", () => {
  it("reuses only an exact open user/plan/customer/intent/Pack binding", () => {
    expect(
      isReusableSubscriptionCheckoutSession({
        session: session(),
        intent: intent(),
      }),
    ).toBe(true);
  });

  it.each([
    ["closed", { status: "complete" }],
    ["no URL", { url: null }],
    ["wrong customer", { customer: "cus_other" }],
    ["wrong client reference", { client_reference_id: "other-user" }],
    [
      "wrong metadata user",
      { metadata: { ...session().metadata, user_id: "other-user" } },
    ],
    [
      "wrong plan",
      { metadata: { ...session().metadata, plan_slug: "pro_annual" } },
    ],
    [
      "wrong intent",
      {
        metadata: {
          ...session().metadata,
          checkout_intent_id: "another-intent",
        },
      },
    ],
    [
      "wrong Pack claim",
      {
        metadata: {
          ...session().metadata,
          pack_credit_claim_id: "another-claim",
        },
      },
    ],
    [
      "wrong actual Price",
      {
        line_items: {
          ...session().line_items,
          data: [{ price: { id: "price_other" }, quantity: 1 }],
        },
      },
    ],
    [
      "wrong actual coupon",
      { discounts: [{ coupon: "coupon_other", promotion_code: null }] },
    ],
    [
      "wrong trial stamp",
      { metadata: { ...session().metadata, checkout_trial_days: "0" } },
    ],
  ])("rejects %s", (_label, overrides) => {
    expect(
      isReusableSubscriptionCheckoutSession({
        session: session(overrides as Record<string, unknown>),
        intent: intent(),
      }),
    ).toBe(false);
  });

  it("rejects a pre-ledger Session even when its visible commercial terms match", () => {
    const legacySession = session({
      metadata: {
        checkout_price_id: "price_current_pro",
        checkout_discount_coupon_id: "coupon_pack",
        checkout_trial_days: "14",
        user_id: USER_ID,
        plan_slug: "pro_monthly",
        pack_credit_claim_id: "84cc5799-309a-431d-8dfa-a6b3613434c3",
      },
    });
    expect(
      isReusableSubscriptionCheckoutSession({
        session: legacySession,
        intent: intent(),
      }),
    ).toBe(false);
  });

  it("uses a bounded takeover lease", () => {
    expect(SUBSCRIPTION_CHECKOUT_CREATING_LEASE_MS).toBe(5 * 60 * 1000);
  });

  it("treats only creating intents at or beyond the lease boundary as stale", () => {
    const now = new Date("2026-08-24T00:00:00.000Z");
    expect(
      subscriptionCheckoutIntentLeaseIsStale(
        intent({ status: "creating", lease_expires_at: now.toISOString() }),
        now,
      ),
    ).toBe(true);
    expect(
      subscriptionCheckoutIntentLeaseIsStale(
        intent({
          status: "creating",
          lease_expires_at: "2026-08-24T00:00:00.001Z",
        }),
        now,
      ),
    ).toBe(false);
    expect(
      subscriptionCheckoutIntentLeaseIsStale(
        intent({
          status: "open",
          lease_expires_at: "2026-08-23T23:59:59.999Z",
        }),
        now,
      ),
    ).toBe(false);
    expect(
      subscriptionCheckoutIntentLeaseIsStale(
        intent({ status: "creating", lease_expires_at: "not-a-date" }),
        now,
      ),
    ).toBe(false);
  });

  it("never reuses a full-price Pro intent for a later ANALYZE20 request", () => {
    expect(
      subscriptionCheckoutIntentMatchesConfiguration(
        intent({ stripe_discount_coupon_id: null, pack_credit_claim_id: null }),
        {
          planSlug: "pro_monthly",
          stripePriceId: "price_current_pro",
          stripeDiscountCouponId: "coupon_analyze20",
          trialDays: 14,
          packCreditClaimId: null,
        },
      ),
    ).toBe(false);
  });
});

describe("subscription Checkout atomicity contract", () => {
  const migration = readFileSync(
    join(
      ROOT,
      "supabase/migrations/20260823190000_subscription_checkout_intents.sql",
    ),
    "utf8",
  );
  const billing = readFileSync(join(ROOT, "app/actions/billing.ts"), "utf8");
  const webhook = readFileSync(
    join(ROOT, "app/api/stripe/webhooks/route.ts"),
    "utf8",
  );

  it("serializes one active checkout and one Pack-credit reservation in PostgreSQL", () => {
    expect(migration).toContain(
      "subscription_checkout_intents_one_active_per_user_idx",
    );
    expect(migration).toMatch(
      /unique index[\s\S]*\(user_id\)[\s\S]*status in \('creating', 'open'\)/i,
    );
    expect(migration).toContain(
      "subscription_checkout_intents_one_pack_credit_idx",
    );
    expect(migration).toMatch(/unique index[\s\S]*\(pack_credit_claim_id\)/i);
  });

  it("atomically fences, retires, and replaces a stale changed-configuration creator", () => {
    const replacementFunction = migration.match(
      /create or replace function public\.replace_stale_subscription_checkout_intent[\s\S]*?\$\$;/i,
    )?.[0];
    expect(replacementFunction).toBeTruthy();
    expect(replacementFunction).toContain("p_expected_lease_expires_at");
    expect(replacementFunction).toContain("p_expected_stripe_customer_id");
    expect(replacementFunction).toContain("p_replacement_stripe_customer_id");
    expect(replacementFunction).toMatch(
      /status = 'creating'[\s\S]*stripe_checkout_session_id is null/i,
    );
    expect(replacementFunction).toMatch(
      /lease_expires_at = p_expected_lease_expires_at[\s\S]*lease_expires_at > clock_timestamp\(\)/i,
    );
    expect(replacementFunction).toContain(
      "stripe_customer_id is not distinct from p_expected_stripe_customer_id",
    );
    expect(replacementFunction).toMatch(
      /status = 'failed'[\s\S]*pack_credit_claim_id = null[\s\S]*if not found then[\s\S]*return null[\s\S]*insert into public\.subscription_checkout_intents/i,
    );
    expect(replacementFunction).toMatch(
      /stripe_customer_id,[\s\S]*p_replacement_stripe_customer_id,[\s\S]*p_pack_credit_claim_id/i,
    );
    expect(replacementFunction).toContain("p_pack_credit_claim_id");
  });

  it("replays the old Stripe idempotency key before replacing a customer-bound stale row", () => {
    const changedConfigurationBranch = indexOfPattern(
      billing,
      /if\s*\(\s*!configurationMatches\s*&&\s*existingIntent\.status\s*===\s*"creating"\s*\)/,
    );
    const leaseClaim = indexOfPattern(
      billing,
      /claimStaleSubscriptionCheckoutIntentForReplacement\s*\(\s*admin,\s*existingIntent,?\s*\)/,
      changedConfigurationBranch,
    );
    const customerReplay = indexOfPattern(
      billing,
      /getOrCreateStripeCustomer\s*\(\s*\{\s*intentId:\s*existingIntent\.id,/,
      changedConfigurationBranch,
    );
    const customerBind = indexOfPattern(
      billing,
      /existingIntent\s*=\s*await\s+bindSubscriptionCheckoutCustomer\s*\(\s*admin,\s*existingIntent\.id,\s*recoveredCustomerId,?\s*\)/,
      changedConfigurationBranch,
    );
    const replay = indexOfPattern(
      billing,
      /stripe\.checkout\.sessions\.create\s*\(\s*buildSubscriptionCheckoutSessionParams\s*\(\s*\{/,
      changedConfigurationBranch,
    );
    const replacement = indexOfPattern(
      billing,
      /replaceStaleSubscriptionCheckoutIntent\s*\(\s*admin,/,
      changedConfigurationBranch,
    );
    expect(changedConfigurationBranch).toBeGreaterThan(-1);
    expect(leaseClaim).toBeGreaterThan(changedConfigurationBranch);
    expect(customerReplay).toBeGreaterThan(leaseClaim);
    expect(customerReplay).toBeGreaterThan(changedConfigurationBranch);
    expect(customerBind).toBeGreaterThan(customerReplay);
    expect(replay).toBeGreaterThan(customerBind);
    expect(replay).toBeGreaterThan(changedConfigurationBranch);
    expect(replacement).toBeGreaterThan(replay);
    expect(billing).toContain(
      "idempotencyKey: `truecap-subscription-checkout:${existingIntent.id}`",
    );
    expect(billing).toContain('code === "resource_missing"');
    expect(billing).toContain("stripe.customers.retrieve(");
    expect(billing).toContain("replacementStripeCustomerId = null");
    expect(billing).toMatch(
      /stripe\.checkout\.sessions\.expire\s*\(\s*staleSession\.id,?\s*\)/,
    );
  });

  it("keeps the ledger unavailable to browser-authenticated roles", () => {
    expect(migration).toContain("force row level security");
    expect(migration).toContain(
      "revoke all on table public.subscription_checkout_intents from public, anon, authenticated",
    );
    expect(migration).toContain(
      "grant select, insert, update on table public.subscription_checkout_intents to service_role",
    );
  });

  it("uses the durable intent for Customer and Session idempotency", () => {
    expect(billing).toContain("truecap-subscription-customer:${args.intentId}");
    expect(billing).toContain("truecap-subscription-checkout:${intent.id}");
    expect(billing).toContain("checkout_intent_id: intent.id");
    expect(billing).toContain("stripe.checkout.sessions.list({");
    expect(billing).toContain("created: { gte:");
    expect(billing).toContain('recentSession.status === "open"');
  });

  it("requires the exact deployment Price for new checkout without a DB sales fallback", () => {
    const checkoutStart = billing.indexOf(
      "export async function createCheckoutSessionAction",
    );
    const returnStart = billing.indexOf(
      "export async function verifyCheckoutReturnAction",
      checkoutStart,
    );
    const checkoutAction = billing.slice(checkoutStart, returnStart);

    expect(checkoutStart).toBeGreaterThan(-1);
    expect(returnStart).toBeGreaterThan(checkoutStart);
    expect(checkoutAction).toContain(
      "const priceId = getCheckoutPlanPriceId(parsed.data.planSlug);",
    );
    expect(checkoutAction).not.toContain("plan.stripe_price_id");
    expect(checkoutAction).not.toContain("?? dbPriceId");

    const priceResolution = checkoutAction.indexOf(
      "const priceId = getCheckoutPlanPriceId(parsed.data.planSlug);",
    );
    expect(priceResolution).toBeLessThan(
      checkoutAction.indexOf("stripe.subscriptions.list({"),
    );
    expect(priceResolution).toBeLessThan(
      checkoutAction.indexOf("getStripe().prices.retrieve(priceId)"),
    );
    expect(priceResolution).toBeLessThan(
      checkoutAction.indexOf("acquireSubscriptionCheckoutIntent("),
    );
  });

  it("keeps the persisted Price fallback verification-only for an existing return", () => {
    const returnStart = billing.indexOf(
      "export async function verifyCheckoutReturnAction",
    );
    const returnAction = billing.slice(returnStart);

    expect(returnAction).toContain(
      "getCheckoutReturnPlanPriceId(\n      metadataPlanSlug,\n      plan?.stripe_price_id,",
    );
  });

  it("keeps mutable email/name out of the idempotent Customer CREATE replay", () => {
    const createStart = billing.indexOf(
      "const customer = await stripe.customers.create(",
    );
    const createEnd = billing.indexOf(
      "const admin = createAdminSupabaseClient();",
      createStart,
    );
    const createAndEnrich = billing.slice(createStart, createEnd);
    const createCallEnd = createAndEnrich.indexOf(
      "await stripe.customers.update",
    );
    const stableCreate = createAndEnrich.slice(0, createCallEnd);
    expect(createStart).toBeGreaterThan(-1);
    expect(createCallEnd).toBeGreaterThan(-1);
    expect(stableCreate).toContain("metadata:");
    expect(stableCreate).toContain("user_id: args.userId");
    expect(stableCreate).not.toContain("email: args.email");
    expect(stableCreate).not.toContain("name: args.name");
    expect(createAndEnrich).toContain("email: args.email ?? undefined");
    expect(createAndEnrich).toContain("name: args.name");
  });

  it("closes a new intent on the verified return path during a mixed-version webhook rollout", () => {
    const verification = billing.indexOf(
      "const verified = verifyCheckoutReturnCandidate",
    );
    const rejection = billing.indexOf("if (!verified)", verification);
    const closure = billing.indexOf(
      "completeSubscriptionCheckoutIntentFromWebhook(",
      rejection,
    );
    expect(verification).toBeGreaterThan(-1);
    expect(rejection).toBeGreaterThan(verification);
    expect(closure).toBeGreaterThan(rejection);
  });

  it("applies only the DB-reserved Pack claim and releases it on expiry", () => {
    expect(webhook).toContain("completedIntent.pack_credit_claim_id");
    expect(webhook).toContain(
      "expireSubscriptionCheckoutIntentFromWebhook(admin, session)",
    );
    expect(webhook).toContain('.select("id")');
    expect(webhook).toContain("else if (appliedCredit && creditedUserId)");
  });
});

describe("stale checkout replacement RPC mapping", () => {
  it("CAS-claims the exact stale lease and null Customer before Stripe recovery", async () => {
    const staleIntent = intent({
      status: "creating",
      lease_expires_at: "2026-08-23T23:00:00.000Z",
      stripe_customer_id: null,
      stripe_checkout_session_id: null,
      stripe_expires_at: null,
    });
    const claimedIntent = intent({
      ...staleIntent,
      lease_expires_at: "2026-08-24T00:05:00.000Z",
    });
    const maybeSingle = vi
      .fn()
      .mockResolvedValue({ data: claimedIntent, error: null });
    const builder = {
      update: vi.fn(),
      eq: vi.fn(),
      lte: vi.fn(),
      is: vi.fn(),
      select: vi.fn(),
      maybeSingle,
    };
    builder.update.mockReturnValue(builder);
    builder.eq.mockReturnValue(builder);
    builder.lte.mockReturnValue(builder);
    builder.is.mockReturnValue(builder);
    builder.select.mockReturnValue(builder);
    const from = vi.fn().mockReturnValue(builder);
    const admin = { from } as unknown as SupabaseClient;

    const result = await claimStaleSubscriptionCheckoutIntentForReplacement(
      admin,
      staleIntent,
      new Date("2026-08-24T00:00:00.000Z"),
    );

    expect(result).toEqual({ acquired: true, intent: claimedIntent });
    expect(from).toHaveBeenCalledWith("subscription_checkout_intents");
    expect(builder.eq).toHaveBeenCalledWith("id", staleIntent.id);
    expect(builder.eq).toHaveBeenCalledWith(
      "lease_expires_at",
      staleIntent.lease_expires_at,
    );
    expect(builder.lte).toHaveBeenCalledWith(
      "lease_expires_at",
      "2026-08-24T00:00:00.000Z",
    );
    expect(builder.is).toHaveBeenCalledWith("stripe_customer_id", null);
  });

  it("passes both observed fencing values and the replacement Pack reservation", async () => {
    const staleIntent = intent({
      status: "creating",
      lease_expires_at: "2026-08-23T23:00:00.000Z",
      stripe_customer_id: "cus_truecap_1",
      stripe_checkout_session_id: null,
      stripe_expires_at: null,
    });
    const replacement = intent({
      id: "bd2e82b7-157c-4d7f-b952-700b1122e21d",
      status: "creating",
      plan_slug: "pro_annual",
      stripe_price_id: "price_new_annual",
      stripe_discount_coupon_id: null,
      trial_days: 0,
      lease_expires_at: "2026-08-24T00:05:00.000Z",
      stripe_customer_id: staleIntent.stripe_customer_id,
      stripe_checkout_session_id: null,
      stripe_expires_at: null,
    });
    const rpc = vi.fn().mockResolvedValue({ data: replacement, error: null });
    const admin = { rpc } as unknown as SupabaseClient;

    const result = await replaceStaleSubscriptionCheckoutIntent(admin, {
      staleIntent,
      replacementStripeCustomerId: staleIntent.stripe_customer_id,
      userId: USER_ID,
      planSlug: "pro_annual",
      stripePriceId: "price_new_annual",
      stripeDiscountCouponId: null,
      trialDays: 0,
      packCreditClaimId: staleIntent.pack_credit_claim_id,
    });

    expect(result).toEqual({ acquired: true, intent: replacement });
    expect(rpc).toHaveBeenCalledWith(
      "replace_stale_subscription_checkout_intent",
      {
        p_stale_intent_id: staleIntent.id,
        p_expected_lease_expires_at: staleIntent.lease_expires_at,
        p_expected_stripe_customer_id: staleIntent.stripe_customer_id,
        p_replacement_stripe_customer_id: staleIntent.stripe_customer_id,
        p_user_id: USER_ID,
        p_plan_slug: "pro_annual",
        p_stripe_price_id: "price_new_annual",
        p_stripe_discount_coupon_id: null,
        p_trial_days: 0,
        p_pack_credit_claim_id: staleIntent.pack_credit_claim_id,
      },
    );
  });

  it("keeps the missing old Customer as the fence while clearing it on the successor", async () => {
    const staleIntent = intent({
      status: "creating",
      lease_expires_at: "2026-08-23T23:00:00.000Z",
      stripe_customer_id: "cus_deleted_old",
      stripe_checkout_session_id: null,
      stripe_expires_at: null,
    });
    const replacement = intent({
      ...staleIntent,
      id: "cd2e82b7-157c-4d7f-b952-700b1122e21d",
      stripe_customer_id: null,
      lease_expires_at: "2026-08-24T00:05:00.000Z",
    });
    const rpc = vi.fn().mockResolvedValue({ data: replacement, error: null });
    const admin = { rpc } as unknown as SupabaseClient;

    const result = await replaceStaleSubscriptionCheckoutIntent(admin, {
      staleIntent,
      replacementStripeCustomerId: null,
      userId: USER_ID,
      planSlug: staleIntent.plan_slug,
      stripePriceId: staleIntent.stripe_price_id,
      stripeDiscountCouponId: staleIntent.stripe_discount_coupon_id,
      trialDays: staleIntent.trial_days,
      packCreditClaimId: staleIntent.pack_credit_claim_id,
    });

    expect(result).toEqual({ acquired: true, intent: replacement });
    expect(rpc).toHaveBeenCalledWith(
      "replace_stale_subscription_checkout_intent",
      expect.objectContaining({
        p_expected_stripe_customer_id: "cus_deleted_old",
        p_replacement_stripe_customer_id: null,
      }),
    );
  });
});
