import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type Stripe from "stripe";
import type { PaidPlanSlug } from "@/lib/stripe/plan-prices";

/**
 * A short lease protects the only non-durable part of checkout construction:
 * the interval between reserving a DB intent and persisting Stripe's Session
 * id. A retry may steal an expired lease, but it reuses the same Stripe
 * idempotency key, so both attempts converge on one Customer and one Session.
 */
export const SUBSCRIPTION_CHECKOUT_CREATING_LEASE_MS = 5 * 60 * 1000;

const INTENT_COLUMNS = [
  "id",
  "user_id",
  "plan_slug",
  "stripe_price_id",
  "stripe_discount_coupon_id",
  "trial_days",
  "status",
  "lease_expires_at",
  "stripe_customer_id",
  "stripe_checkout_session_id",
  "stripe_expires_at",
  "pack_credit_claim_id",
  "created_at",
  "updated_at",
].join(", ");

export type SubscriptionCheckoutIntentStatus =
  | "creating"
  | "open"
  | "completed"
  | "expired"
  | "failed";

export type SubscriptionCheckoutIntent = {
  id: string;
  user_id: string;
  plan_slug: PaidPlanSlug;
  stripe_price_id: string;
  stripe_discount_coupon_id: string | null;
  trial_days: number;
  status: SubscriptionCheckoutIntentStatus;
  lease_expires_at: string;
  stripe_customer_id: string | null;
  stripe_checkout_session_id: string | null;
  stripe_expires_at: string | null;
  pack_credit_claim_id: string | null;
  created_at: string;
  updated_at: string;
};

export type AcquireSubscriptionCheckoutIntentResult =
  | { acquired: true; intent: SubscriptionCheckoutIntent }
  | { acquired: false; intent: SubscriptionCheckoutIntent };

type AcquireSubscriptionCheckoutIntentInput = {
  userId: string;
  planSlug: PaidPlanSlug;
  stripePriceId: string;
  stripeDiscountCouponId: string | null;
  trialDays: number;
  packCreditClaimId: string | null;
  now?: Date;
};

export type SubscriptionCheckoutConfiguration = Omit<
  AcquireSubscriptionCheckoutIntentInput,
  "userId" | "now"
>;

function isUniqueViolation(error: { code?: string } | null): boolean {
  return error?.code === "23505";
}

function customerId(session: Stripe.Checkout.Session): string | null {
  if (typeof session.customer === "string") return session.customer;
  return session.customer?.id ?? null;
}

type CheckoutSessionDiscount = NonNullable<Stripe.Checkout.Session["discounts"]>[number];

function couponId(discount: CheckoutSessionDiscount): string | null {
  if (typeof discount.coupon === "string") return discount.coupon;
  return discount.coupon?.id ?? null;
}

export function subscriptionCheckoutIntentMatchesConfiguration(
  intent: SubscriptionCheckoutIntent,
  configuration: SubscriptionCheckoutConfiguration
): boolean {
  return (
    intent.plan_slug === configuration.planSlug &&
    intent.stripe_price_id === configuration.stripePriceId &&
    intent.stripe_discount_coupon_id === configuration.stripeDiscountCouponId &&
    intent.trial_days === configuration.trialDays &&
    intent.pack_credit_claim_id === configuration.packCreditClaimId
  );
}

/**
 * Exact binding required before an existing hosted Checkout URL can be
 * returned. Pre-ledger Sessions are deliberately not reusable: without an
 * intent stamp their completion/expiry webhook cannot close the new ledger
 * row or release its Pack-credit reservation.
 */
export function isReusableSubscriptionCheckoutSession(args: {
  session: Stripe.Checkout.Session;
  intent: SubscriptionCheckoutIntent;
}): boolean {
  const { session, intent } = args;
  const stampedIntentId = session.metadata?.checkout_intent_id ?? null;
  const expectedPackClaim = intent.pack_credit_claim_id ?? null;
  const stampedPackClaim = session.metadata?.pack_credit_claim_id ?? null;
  const lineItems = session.line_items?.data ?? [];
  const actualDiscounts = session.discounts ?? [];
  const priceMatches =
    lineItems.length === 1 &&
    lineItems[0]?.price?.id === intent.stripe_price_id &&
    lineItems[0]?.quantity === 1;
  const discountMatches = intent.stripe_discount_coupon_id
    ? actualDiscounts.length === 1 &&
      couponId(actualDiscounts[0]) === intent.stripe_discount_coupon_id
    : actualDiscounts.length === 0;

  return (
    session.mode === "subscription" &&
    session.status === "open" &&
    typeof session.url === "string" &&
    session.url.length > 0 &&
    customerId(session) === intent.stripe_customer_id &&
    session.client_reference_id === intent.user_id &&
    session.metadata?.user_id === intent.user_id &&
    session.metadata?.plan_slug === intent.plan_slug &&
    session.metadata?.checkout_price_id === intent.stripe_price_id &&
    session.metadata?.checkout_discount_coupon_id ===
      (intent.stripe_discount_coupon_id ?? "none") &&
    session.metadata?.checkout_trial_days === String(intent.trial_days) &&
    stampedPackClaim === expectedPackClaim &&
    priceMatches &&
    discountMatches &&
    stampedIntentId === intent.id
  );
}

async function loadActiveIntent(
  admin: SupabaseClient,
  userId: string
): Promise<SubscriptionCheckoutIntent | null> {
  const { data, error } = await admin
    .from("subscription_checkout_intents")
    .select(INTENT_COLUMNS)
    .eq("user_id", userId)
    .in("status", ["creating", "open"])
    .limit(1)
    .maybeSingle();

  if (error) throw new Error(`checkout-intent load failed: ${error.code ?? "unknown"}`);
  return (data as unknown as SubscriptionCheckoutIntent | null) ?? null;
}

/**
 * Atomically reserves the user's sole active subscription checkout. The
 * partial UNIQUE index is the serialization point. A stale creator can be
 * taken over with a compare-and-swap lease update; importantly, it keeps the
 * same intent id and therefore the same Stripe idempotency keys.
 */
export async function acquireSubscriptionCheckoutIntent(
  admin: SupabaseClient,
  input: AcquireSubscriptionCheckoutIntentInput
): Promise<AcquireSubscriptionCheckoutIntentResult> {
  const now = input.now ?? new Date();
  const leaseExpiresAt = new Date(
    now.getTime() + SUBSCRIPTION_CHECKOUT_CREATING_LEASE_MS
  ).toISOString();

  const { data: inserted, error: insertError } = await admin
    .from("subscription_checkout_intents")
    .insert({
      user_id: input.userId,
      plan_slug: input.planSlug,
      stripe_price_id: input.stripePriceId,
      stripe_discount_coupon_id: input.stripeDiscountCouponId,
      trial_days: input.trialDays,
      status: "creating",
      lease_expires_at: leaseExpiresAt,
      pack_credit_claim_id: input.packCreditClaimId,
    })
    .select(INTENT_COLUMNS)
    .maybeSingle();

  if (!insertError && inserted) {
    return { acquired: true, intent: inserted as unknown as SubscriptionCheckoutIntent };
  }
  if (!isUniqueViolation(insertError)) {
    throw new Error(`checkout-intent reservation failed: ${insertError?.code ?? "unknown"}`);
  }

  // The conflict can be either the one-active-intent guard or the permanent
  // Pack-credit reservation. Only the former has a row to reuse. A Pack
  // conflict without an active row fails closed so we never silently charge
  // full price after promising the credit.
  const active = await loadActiveIntent(admin, input.userId);
  if (!active) {
    throw new Error("checkout-intent Pack credit is already reserved");
  }

  const leaseIsStale =
    active.status === "creating" &&
    Number.isFinite(Date.parse(active.lease_expires_at)) &&
    Date.parse(active.lease_expires_at) <= now.getTime();
  if (!leaseIsStale) return { acquired: false, intent: active };

  // Never steal a stale lease for a different commercial promise. Reusing
  // the same Stripe idempotency key with changed price/coupon/trial params
  // would either return the old offer or be rejected as a parameter mismatch.
  if (
    !subscriptionCheckoutIntentMatchesConfiguration(active, {
      planSlug: input.planSlug,
      stripePriceId: input.stripePriceId,
      stripeDiscountCouponId: input.stripeDiscountCouponId,
      trialDays: input.trialDays,
      packCreditClaimId: input.packCreditClaimId,
    })
  ) {
    return { acquired: false, intent: active };
  }

  const { data: renewed, error: renewError } = await admin
    .from("subscription_checkout_intents")
    .update({ lease_expires_at: leaseExpiresAt })
    .eq("id", active.id)
    .eq("status", "creating")
    .lte("lease_expires_at", now.toISOString())
    .select(INTENT_COLUMNS)
    .maybeSingle();
  if (renewError) {
    throw new Error(`checkout-intent lease renewal failed: ${renewError.code ?? "unknown"}`);
  }
  if (renewed) {
    return { acquired: true, intent: renewed as unknown as SubscriptionCheckoutIntent };
  }

  const winner = await loadActiveIntent(admin, input.userId);
  if (!winner) throw new Error("checkout-intent lease winner could not be loaded");
  return { acquired: false, intent: winner };
}

export async function bindSubscriptionCheckoutCustomer(
  admin: SupabaseClient,
  intentId: string,
  customerIdValue: string
): Promise<SubscriptionCheckoutIntent> {
  const { data, error } = await admin
    .from("subscription_checkout_intents")
    .update({ stripe_customer_id: customerIdValue })
    .eq("id", intentId)
    .eq("status", "creating")
    .is("stripe_checkout_session_id", null)
    .select(INTENT_COLUMNS)
    .maybeSingle();
  if (error || !data) {
    throw new Error(`checkout-intent customer bind failed: ${error?.code ?? "no-row"}`);
  }
  return data as unknown as SubscriptionCheckoutIntent;
}

export async function markSubscriptionCheckoutIntentOpen(
  admin: SupabaseClient,
  intentId: string,
  session: Stripe.Checkout.Session
): Promise<SubscriptionCheckoutIntent> {
  const sessionCustomerId = customerId(session);
  if (!sessionCustomerId || !session.expires_at) {
    throw new Error("checkout-intent cannot bind a Session without customer and expiry");
  }
  const stripeExpiresAt = new Date(session.expires_at * 1000).toISOString();
  const { data, error } = await admin
    .from("subscription_checkout_intents")
    .update({
      status: "open",
      stripe_customer_id: sessionCustomerId,
      stripe_checkout_session_id: session.id,
      stripe_expires_at: stripeExpiresAt,
      lease_expires_at: stripeExpiresAt,
    })
    .eq("id", intentId)
    .eq("status", "creating")
    .select(INTENT_COLUMNS)
    .maybeSingle();
  if (error) {
    throw new Error(`checkout-intent Session bind failed: ${error.code ?? "unknown"}`);
  }
  if (data) return data as unknown as SubscriptionCheckoutIntent;

  // Two expired-lease workers can receive Stripe's same idempotent Session.
  // If the other worker persisted it first, treat that exact binding as
  // success instead of surfacing a false checkout error.
  const { data: existing, error: existingError } = await admin
    .from("subscription_checkout_intents")
    .select(INTENT_COLUMNS)
    .eq("id", intentId)
    .maybeSingle();
  if (existingError || !existing) {
    throw new Error(
      `checkout-intent Session bind winner load failed: ${existingError?.code ?? "no-row"}`
    );
  }
  const winner = existing as unknown as SubscriptionCheckoutIntent;
  if (
    winner.status === "open" &&
    winner.stripe_customer_id === sessionCustomerId &&
    winner.stripe_checkout_session_id === session.id &&
    winner.stripe_expires_at === stripeExpiresAt
  ) {
    return winner;
  }
  throw new Error("checkout-intent Session was bound by a different transition");
}

/** Release a reservation only when no Checkout Session was created for it. */
export async function failSubscriptionCheckoutIntent(
  admin: SupabaseClient,
  intentId: string
): Promise<void> {
  const { error } = await admin
    .from("subscription_checkout_intents")
    .update({ status: "failed", pack_credit_claim_id: null })
    .eq("id", intentId)
    .eq("status", "creating")
    .is("stripe_checkout_session_id", null);
  if (error) {
    throw new Error(`checkout-intent release failed: ${error.code ?? "unknown"}`);
  }
}

/**
 * Completes the intent only when every Stripe-signed identity binding agrees.
 * The creating→completed transition covers the legitimate race where Stripe's
 * webhook arrives before the action persists its open Session response.
 */
export async function completeSubscriptionCheckoutIntentFromWebhook(
  admin: SupabaseClient,
  session: Stripe.Checkout.Session
): Promise<SubscriptionCheckoutIntent | null> {
  const intentId = session.metadata?.checkout_intent_id;
  if (!intentId) return null; // rolling-deploy compatibility for old Sessions

  const { data: existing, error: loadError } = await admin
    .from("subscription_checkout_intents")
    .select(INTENT_COLUMNS)
    .eq("id", intentId)
    .maybeSingle();
  if (loadError || !existing) {
    throw new Error(`checkout-intent webhook load failed: ${loadError?.code ?? "no-row"}`);
  }
  const intent = existing as unknown as SubscriptionCheckoutIntent;
  const sessionCustomerId = customerId(session);
  const expectedPackClaim = intent.pack_credit_claim_id ?? null;
  const stampedPackClaim = session.metadata?.pack_credit_claim_id ?? null;
  const bindingMatches =
    session.mode === "subscription" &&
    session.status === "complete" &&
    sessionCustomerId !== null &&
    session.client_reference_id === intent.user_id &&
    session.metadata?.user_id === intent.user_id &&
    session.metadata?.plan_slug === intent.plan_slug &&
    session.metadata?.checkout_price_id === intent.stripe_price_id &&
    session.metadata?.checkout_discount_coupon_id ===
      (intent.stripe_discount_coupon_id ?? "none") &&
    session.metadata?.checkout_trial_days === String(intent.trial_days) &&
    stampedPackClaim === expectedPackClaim &&
    (intent.stripe_customer_id === null || intent.stripe_customer_id === sessionCustomerId) &&
    (intent.stripe_checkout_session_id === null ||
      intent.stripe_checkout_session_id === session.id);
  if (!bindingMatches) throw new Error("checkout-intent webhook binding mismatch");
  if (intent.status === "completed") return intent;
  if (intent.status !== "creating" && intent.status !== "open") {
    throw new Error(`checkout-intent cannot complete from ${intent.status}`);
  }

  const stripeExpiresAt = session.expires_at
    ? new Date(session.expires_at * 1000).toISOString()
    : intent.stripe_expires_at;
  const { data: completed, error: completeError } = await admin
    .from("subscription_checkout_intents")
    .update({
      status: "completed",
      stripe_customer_id: sessionCustomerId,
      stripe_checkout_session_id: session.id,
      ...(stripeExpiresAt ? { stripe_expires_at: stripeExpiresAt } : {}),
    })
    .eq("id", intent.id)
    .in("status", ["creating", "open"])
    .select(INTENT_COLUMNS)
    .maybeSingle();
  if (completeError || !completed) {
    throw new Error(`checkout-intent completion failed: ${completeError?.code ?? "no-row"}`);
  }
  return completed as unknown as SubscriptionCheckoutIntent;
}

export async function expireSubscriptionCheckoutIntentFromWebhook(
  admin: SupabaseClient,
  session: Stripe.Checkout.Session
): Promise<void> {
  const intentId = session.metadata?.checkout_intent_id;
  if (!intentId) return;
  const sessionCustomerId = customerId(session);
  const { data: existing, error: loadError } = await admin
    .from("subscription_checkout_intents")
    .select(INTENT_COLUMNS)
    .eq("id", intentId)
    .maybeSingle();
  if (loadError || !existing) {
    throw new Error(`checkout-intent expiry load failed: ${loadError?.code ?? "no-row"}`);
  }
  const intent = existing as unknown as SubscriptionCheckoutIntent;
  const bindingMatches =
    session.mode === "subscription" &&
    session.status === "expired" &&
    sessionCustomerId !== null &&
    session.client_reference_id === intent.user_id &&
    session.metadata?.user_id === intent.user_id &&
    session.metadata?.plan_slug === intent.plan_slug &&
    (intent.stripe_customer_id === null || intent.stripe_customer_id === sessionCustomerId) &&
    (intent.stripe_checkout_session_id === null ||
      intent.stripe_checkout_session_id === session.id);
  if (!bindingMatches) throw new Error("checkout-intent expiry binding mismatch");
  if (intent.status === "expired") return;
  if (intent.status !== "creating" && intent.status !== "open") return;

  const { error: expireError } = await admin
    .from("subscription_checkout_intents")
    .update({
      status: "expired",
      stripe_customer_id: sessionCustomerId,
      stripe_checkout_session_id: session.id,
      stripe_expires_at: session.expires_at
        ? new Date(session.expires_at * 1000).toISOString()
        : intent.stripe_expires_at,
      pack_credit_claim_id: null,
    })
    .eq("id", intent.id)
    .in("status", ["creating", "open"]);
  if (expireError) {
    throw new Error(`checkout-intent expiry failed: ${expireError.code ?? "unknown"}`);
  }
}
