import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import type Stripe from "stripe";
import {
  SUBSCRIPTION_CHECKOUT_CREATING_LEASE_MS,
  isReusableSubscriptionCheckoutSession,
  subscriptionCheckoutIntentMatchesConfiguration,
  type SubscriptionCheckoutIntent,
} from "@/lib/stripe/subscription-checkout-intent";

const ROOT = join(__dirname, "..", "..");
const USER_ID = "9ebd77d1-16f5-4e45-8c31-21ff8e401351";

function intent(
  overrides: Partial<SubscriptionCheckoutIntent> = {}
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

function session(overrides: Record<string, unknown> = {}): Stripe.Checkout.Session {
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
    expect(isReusableSubscriptionCheckoutSession({ session: session(), intent: intent() })).toBe(
      true
    );
  });

  it.each([
    ["closed", { status: "complete" }],
    ["no URL", { url: null }],
    ["wrong customer", { customer: "cus_other" }],
    ["wrong client reference", { client_reference_id: "other-user" }],
    ["wrong metadata user", { metadata: { ...session().metadata, user_id: "other-user" } }],
    ["wrong plan", { metadata: { ...session().metadata, plan_slug: "pro_annual" } }],
    [
      "wrong intent",
      { metadata: { ...session().metadata, checkout_intent_id: "another-intent" } },
    ],
    [
      "wrong Pack claim",
      { metadata: { ...session().metadata, pack_credit_claim_id: "another-claim" } },
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
    ["wrong actual coupon", { discounts: [{ coupon: "coupon_other", promotion_code: null }] }],
    [
      "wrong trial stamp",
      { metadata: { ...session().metadata, checkout_trial_days: "0" } },
    ],
  ])("rejects %s", (_label, overrides) => {
    expect(
      isReusableSubscriptionCheckoutSession({
        session: session(overrides as Record<string, unknown>),
        intent: intent(),
      })
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
      isReusableSubscriptionCheckoutSession({ session: legacySession, intent: intent() })
    ).toBe(false);
  });

  it("uses a bounded takeover lease", () => {
    expect(SUBSCRIPTION_CHECKOUT_CREATING_LEASE_MS).toBe(5 * 60 * 1000);
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
        }
      )
    ).toBe(false);
  });
});

describe("subscription Checkout atomicity contract", () => {
  const migration = readFileSync(
    join(ROOT, "supabase/migrations/20260823190000_subscription_checkout_intents.sql"),
    "utf8"
  );
  const billing = readFileSync(join(ROOT, "app/actions/billing.ts"), "utf8");
  const webhook = readFileSync(join(ROOT, "app/api/stripe/webhooks/route.ts"), "utf8");

  it("serializes one active checkout and one Pack-credit reservation in PostgreSQL", () => {
    expect(migration).toContain("subscription_checkout_intents_one_active_per_user_idx");
    expect(migration).toMatch(/unique index[\s\S]*\(user_id\)[\s\S]*status in \('creating', 'open'\)/i);
    expect(migration).toContain("subscription_checkout_intents_one_pack_credit_idx");
    expect(migration).toMatch(/unique index[\s\S]*\(pack_credit_claim_id\)/i);
  });

  it("keeps the ledger unavailable to browser-authenticated roles", () => {
    expect(migration).toContain("force row level security");
    expect(migration).toContain(
      "revoke all on table public.subscription_checkout_intents from public, anon, authenticated"
    );
    expect(migration).toContain(
      "grant select, insert, update on table public.subscription_checkout_intents to service_role"
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

  it("applies only the DB-reserved Pack claim and releases it on expiry", () => {
    expect(webhook).toContain("completedIntent.pack_credit_claim_id");
    expect(webhook).toContain("expireSubscriptionCheckoutIntentFromWebhook(admin, session)");
    expect(webhook).toContain('.select("id")');
    expect(webhook).toContain("else if (appliedCredit && creditedUserId)");
  });
});
