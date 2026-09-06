import "server-only";

import * as Sentry from "@sentry/nextjs";

import type { SupabaseClient } from "@supabase/supabase-js";
import type Stripe from "stripe";
import { getStripe } from "@/lib/stripe/client";
import { planSlugFromPriceId } from "@/lib/stripe/plan-prices";
import {
  isForeignAppMetadata,
  isForeignSubscription,
  recordUnresolvedBillingEvent,
  resolveBillingUser,
  type BillingEventContext,
} from "@/lib/stripe/billing-user-resolution";

type ProfileBindingRow = {
  id: string;
  stripe_customer_id: string | null;
};

/**
 * Result of a webhook → DB sync attempt.
 *
 * `{ synced: false }` means the handler intentionally SKIPPED applying the
 * event (a user-binding security rejection — retrying won't help, so the
 * route still 200s to Stripe), as opposed to throwing, which means "transient
 * failure, 500 so Stripe retries". The route uses `reason` to stamp
 * `error_message = 'skipped: <reason>'` on the stripe_webhook_events row so
 * skips stay queryable, and to suppress success-only side effects (the
 * pro_subscribed PostHog funnel event).
 */
export type SubscriptionSyncResult =
  | { synced: true }
  | { synced: false; reason: string };

const SYNCED: SubscriptionSyncResult = { synced: true };

/**
 * The Stripe account is SHARED with another product. Its events reach this
 * endpoint too and are not ours to bind: skip quietly (no Sentry alarm, no
 * unresolved row). Stamped as `skipped: foreign_app` on the ledger row.
 */
export const FOREIGN_APP_SKIP_REASON = "foreign_app";
const FOREIGN_SKIP: SubscriptionSyncResult = {
  synced: false,
  reason: FOREIGN_APP_SKIP_REASON,
};

/**
 * User-binding rejections are intentional security decisions — we refuse to
 * attach a Stripe subscription/checkout to a user we can't verify — so they
 * must NOT throw (a throw would make Stripe retry a genuinely unbindable
 * event forever). But they involve real money, so they must be LOUD:
 * console.error is invisible in prod (CLAUDE.md pitfall #6). This is the one
 * shared alarm for every binding-rejection path in this file; it fires at the
 * two central skip points (upsertSubscriptionFromStripe /
 * handleCheckoutSessionCompleted) so a paying user whose subscription never
 * lands pages someone instead of vanishing.
 *
 * `extra` must contain bounded categorical context only — never Stripe ids,
 * user ids, emails, or addresses (CLAUDE.md pitfall #4).
 */
function reportUserBindingSkip(
  context: "subscription_sync" | "checkout_completed",
  extra: Record<string, string | boolean | null | undefined>,
): void {
  Sentry.captureMessage(
    `Stripe webhook sync skipped: user/customer binding could not be verified (${context})`,
    {
      level: "error",
      tags: { feature: "stripe-webhook", failure: "user_binding" },
      extra,
    },
  );
}

async function getProfileById(
  admin: SupabaseClient,
  userId: string,
): Promise<ProfileBindingRow | null> {
  const { data, error } = await admin
    .from("profiles")
    .select("id, stripe_customer_id")
    .eq("id", userId)
    .maybeSingle();
  if (error) throw error;
  return (data as ProfileBindingRow | null) ?? null;
}

function getSubscriptionCustomerId(
  subscription: Stripe.Subscription,
): string | null {
  return typeof subscription.customer === "string"
    ? subscription.customer
    : (subscription.customer?.id ?? null);
}

function getCheckoutCustomerId(
  session: Stripe.Checkout.Session,
): string | null {
  return typeof session.customer === "string"
    ? session.customer
    : (session.customer?.id ?? null);
}

type SubscriptionUserResolution =
  | { userId: string; bindCustomer: boolean }
  | { userId: null; reason: string };

/**
 * Ordered resolver for subscription-level events (see
 * lib/stripe/billing-user-resolution.ts for the order and the reasoning).
 * `fallbackUserId` is a user id ALREADY verified by the caller for this same
 * event (checkout → subscription) and ranks with the explicit checkout stamps.
 */
async function resolveVerifiedUserIdForSubscription(
  admin: SupabaseClient,
  subscription: Stripe.Subscription,
  fallbackUserId?: string | null,
): Promise<SubscriptionUserResolution> {
  const customerId = getSubscriptionCustomerId(subscription);
  const metadata = subscription.metadata ?? {};
  const resolution = await resolveBillingUser(admin, {
    trustedUserId: fallbackUserId ?? null,
    metadataUserId: metadata.supabase_user_id ?? null,
    customerId,
    loadCustomerEmail: customerId
      ? () => loadStripeCustomerEmail(customerId)
      : undefined,
    subscriptionMetadataUserId: metadata.user_id ?? null,
  });
  if (resolution.userId === null) {
    console.error(
      `[billing] Skipping subscription sync: user binding could not be verified (${resolution.reason})`,
    );
    return resolution;
  }
  return { userId: resolution.userId, bindCustomer: resolution.bindCustomer };
}

/** Email on the Stripe Customer object — the step-4 signal. Never logged. */
async function loadStripeCustomerEmail(
  customerId: string,
): Promise<string | null> {
  const stripe = getStripe();
  const customer = await stripe.customers.retrieve(customerId);
  if (!customer || customer.deleted) return null;
  return customer.email ?? null;
}

type CheckoutBindingResolution =
  | { userId: string; customerId: string; bindCustomer: boolean }
  | { userId: null; reason: string };

async function resolveVerifiedCheckoutBinding(
  admin: SupabaseClient,
  session: Stripe.Checkout.Session,
): Promise<CheckoutBindingResolution> {
  const customerId = getCheckoutCustomerId(session);
  if (!customerId) {
    console.error("[billing] checkout.session.completed missing customer id");
    return { userId: null, reason: "missing_customer_id" };
  }
  const metadata = session.metadata ?? {};
  const resolution = await resolveBillingUser(admin, {
    metadataUserId: metadata.supabase_user_id ?? metadata.user_id ?? null,
    clientReferenceId: session.client_reference_id ?? null,
    customerId,
    customerEmail:
      session.customer_details?.email ?? session.customer_email ?? null,
    loadCustomerEmail: () => loadStripeCustomerEmail(customerId),
  });
  if (resolution.userId === null) {
    console.error(
      `[billing] checkout.session.completed user/customer binding could not be verified (${resolution.reason})`,
    );
    return resolution;
  }
  return {
    userId: resolution.userId,
    customerId,
    bindCustomer: resolution.bindCustomer,
  };
}

function isSubscriptionScheduledToCancel(
  subscription: Stripe.Subscription,
): boolean {
  const subscriptionWithCancelAt = subscription as Stripe.Subscription & {
    cancel_at?: number | null;
  };

  return Boolean(
    subscription.cancel_at_period_end || subscriptionWithCancelAt.cancel_at,
  );
}

async function resolvePlanIdBySlug(
  admin: SupabaseClient,
  slug: string | null,
): Promise<string | null> {
  if (!slug) return null;

  // Throw on query errors instead of falling through to null (see
  // resolvePlanIdForPrice) — a DB blip must 500, not silently downgrade.
  const { data: planBySlug, error: slugLookupError } = await admin
    .from("plans")
    .select("id")
    .eq("slug", slug)
    .maybeSingle();
  if (slugLookupError) throw slugLookupError;

  return planBySlug?.id ?? null;
}

async function resolvePlanIdForPrice(
  admin: SupabaseClient,
  priceId: string | null,
): Promise<string | null> {
  if (!priceId) return null;

  // Throw on query errors instead of falling through to null: a transient
  // DB blip here must surface as a 500 (→ Sentry + Stripe retry), not write
  // plan_id=null and permanently downgrade a paying user to FREE. Every
  // other DB call in this file already throws — these two were the only
  // fail-open lookups.
  const { data: planByPrice, error: priceLookupError } = await admin
    .from("plans")
    .select("id")
    .eq("stripe_price_id", priceId)
    .maybeSingle();
  if (priceLookupError) throw priceLookupError;

  if (planByPrice?.id) return planByPrice.id;

  return resolvePlanIdBySlug(admin, planSlugFromPriceId(priceId));
}

/**
 * The plan_id currently stored on this subscription's row, or null if we've
 * never synced it. Used as the last rung of the unmapped-price recovery
 * ladder: if a still-active subscription's price can't be resolved to a plan
 * by price OR by plan_slug metadata, we PRESERVE whatever plan the user
 * already has rather than overwriting it with null (→ FREE). Throws on query
 * errors so a DB blip 500s + retries instead of downgrading.
 */
async function getExistingSubscriptionPlanId(
  admin: SupabaseClient,
  stripeSubscriptionId: string,
): Promise<string | null> {
  const { data, error } = await admin
    .from("subscriptions")
    .select("plan_id")
    .eq("stripe_subscription_id", stripeSubscriptionId)
    .maybeSingle();
  if (error) throw error;
  return (data as { plan_id: string | null } | null)?.plan_id ?? null;
}

function isPaidSubscriptionStatus(status: string): boolean {
  return ["active", "trialing", "past_due"].includes(status);
}

/** Recurring amount of the primary item (unit_amount × quantity), if known. */
function subscriptionAmountCents(
  subscription: Stripe.Subscription,
): number | null {
  const item = subscription.items?.data?.[0];
  const price = item?.price;
  if (!price || typeof price === "string") return null;
  if (typeof price.unit_amount !== "number") return null;
  return price.unit_amount * (item?.quantity ?? 1);
}

export async function upsertSubscriptionFromStripe(
  admin: SupabaseClient,
  subscription: Stripe.Subscription,
  fallbackUserId?: string | null,
  eventContext?: BillingEventContext | null,
): Promise<SubscriptionSyncResult> {
  // Shared-account guard FIRST: another product's subscription must never
  // reach the email step and bind to one of our users.
  if (await isForeignSubscription(admin, subscription)) {
    return FOREIGN_SKIP;
  }

  const resolution = await resolveVerifiedUserIdForSubscription(
    admin,
    subscription,
    fallbackUserId,
  );
  if (resolution.userId === null) {
    reportUserBindingSkip("subscription_sync", {
      subscription_status: subscription.status,
      has_customer_binding: Boolean(getSubscriptionCustomerId(subscription)),
      has_metadata_user_id: Boolean(subscription.metadata?.user_id),
      has_trusted_fallback: Boolean(fallbackUserId),
      reason: resolution.reason,
    });
    // A PAID subscription we cannot bind is money without an entitlement.
    // Never let it evaporate: record it durably before the route 200s.
    if (eventContext && isPaidSubscriptionStatus(subscription.status)) {
      await recordUnresolvedBillingEvent(admin, {
        ...eventContext,
        customerId: getSubscriptionCustomerId(subscription),
        customerEmail: null,
        amountCents: subscriptionAmountCents(subscription),
        currency: subscription.currency ?? null,
        reason: resolution.reason,
      });
    }
    return {
      synced: false,
      reason: `user binding could not be verified (${resolution.reason})`,
    };
  }
  const userId = resolution.userId;
  const customerIdToBind = getSubscriptionCustomerId(subscription);
  if (resolution.bindCustomer && customerIdToBind) {
    await linkStripeCustomerToProfile(admin, userId, customerIdToBind);
  }

  const primaryItem = subscription.items.data[0];
  const priceId =
    primaryItem?.price && typeof primaryItem.price === "object"
      ? primaryItem.price.id
      : typeof primaryItem?.price === "string"
        ? primaryItem.price
        : null;

  let planId = await resolvePlanIdForPrice(admin, priceId);

  // UNMAPPED-PRICE RECOVERY LADDER for a still-paying subscription. A price
  // that maps to no plan row would upsert plan_id=null, and
  // getEntitlementsForUser then silently resolves the PAYING user to the FREE
  // plan. This is exactly how the 2026-07 Stripe-account switch locked two
  // paid accounts out of Pro for days with zero signal — plans.stripe_price_id
  // was never populated for the new account and the env fallback was stale.
  //
  // resolvePlanIdForPrice already tried the two PRICE-derived paths above
  // (plans.stripe_price_id, then plans.slug via planSlugFromPriceId). Before
  // EVER accepting a FREE downgrade on an active/trialing/past_due sub:
  //   1. FIRST SYNC ONLY — recover from the subscription's plan_slug metadata,
  //      which checkout stamps on subscription_data.metadata
  //      (app/actions/billing.ts) and which matches plans.slug 1:1. This
  //      rescues a brand-new sub whose price row simply isn't wired up yet.
  //      CRUCIAL SCOPE: that stamp is written once at checkout and is NOT
  //      refreshed when a subscriber changes plans through the Customer Portal,
  //      so on an already-synced sub it can still name the OLD plan and would
  //      MIS-map a portal plan switch. We therefore consult it only when there
  //      is NO existing subscription row; for an existing sub the price-derived
  //      slug (the rung above) is the source of truth.
  //   2. If we still have no plan, PRESERVE the plan already stored on this
  //      subscription's row rather than overwriting it with null — never strip
  //      Pro from someone actively paying — and page LOUD (ids only, no PII,
  //      pitfall #4). A genuinely unresolvable FIRST sync has no row to
  //      preserve and correctly falls through to null (the FREE result).
  // A canceled/incomplete/etc. sub legitimately resolves to null (→ FREE) and
  // needs no rescue — the guard is scoped to the paid status set.
  const isActivePaidStatus = ["active", "trialing", "past_due"].includes(
    subscription.status,
  );
  if (planId === null && isActivePaidStatus) {
    const existingPlanId = await getExistingSubscriptionPlanId(
      admin,
      subscription.id,
    );

    // Trust the checkout-time plan_slug stamp ONLY on a first sync (no row yet).
    // A Customer-Portal plan switch never updates it, so for an existing sub it
    // can point at the old plan — prefer the price-derived slug and, failing
    // that, the preserved existing plan below.
    if (existingPlanId === null) {
      planId = await resolvePlanIdBySlug(
        admin,
        subscription.metadata?.plan_slug ?? null,
      );
    }

    if (planId === null) {
      Sentry.captureMessage(
        "Paid subscription has UNMAPPED price — preserving existing plan to avoid FREE downgrade",
        {
          level: "error",
          tags: { feature: "billing", kind: "entitlement-mismatch" },
          extra: {
            has_stripe_price_id: Boolean(priceId),
            subscription_status: subscription.status,
            plan_slug_metadata: subscription.metadata?.plan_slug ?? null,
            preserved_plan_id: existingPlanId,
            hint: "Populate plans.stripe_price_id for this price (and verify STRIPE_PRICE_PRO_MONTHLY/ANNUAL env).",
          },
        },
      );
      planId = existingPlanId;
    }
  }

  const subscriptionWithPeriods = subscription as Stripe.Subscription & {
    current_period_start?: number | null;
    current_period_end?: number | null;
  };
  const primaryItemWithPeriods = primaryItem as
    | (Stripe.SubscriptionItem & {
        current_period_start?: number | null;
        current_period_end?: number | null;
      })
    | undefined;
  const periodStartSec =
    subscriptionWithPeriods.current_period_start ??
    primaryItemWithPeriods?.current_period_start ??
    null;
  const periodEndSec =
    subscriptionWithPeriods.current_period_end ??
    primaryItemWithPeriods?.current_period_end ??
    null;

  const row = {
    user_id: userId,
    plan_id: planId,
    stripe_subscription_id: subscription.id,
    stripe_price_id: priceId,
    status: subscription.status,
    current_period_start:
      periodStartSec != null
        ? new Date(periodStartSec * 1000).toISOString()
        : null,
    current_period_end:
      periodEndSec != null ? new Date(periodEndSec * 1000).toISOString() : null,
    cancel_at_period_end: isSubscriptionScheduledToCancel(subscription),
    updated_at: new Date().toISOString(),
  };

  if (
    ["active", "trialing", "past_due", "unpaid", "paused"].includes(
      subscription.status,
    )
  ) {
    const { error: deactivateError } = await admin
      .from("subscriptions")
      .update({
        status: "canceled",
        cancel_at_period_end: false,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", userId)
      .neq("stripe_subscription_id", subscription.id)
      .in("status", ["active", "trialing", "past_due", "unpaid", "paused"]);
    if (deactivateError) throw deactivateError;
  }

  const { error } = await admin
    .from("subscriptions")
    .upsert(row, { onConflict: "stripe_subscription_id" });
  if (error) throw error;

  return SYNCED;
}

export async function markSubscriptionCanceled(
  admin: SupabaseClient,
  subscription: Stripe.Subscription,
): Promise<SubscriptionSyncResult> {
  const { data: existing, error: lookupError } = await admin
    .from("subscriptions")
    .select("id")
    .eq("stripe_subscription_id", subscription.id)
    .maybeSingle();
  if (lookupError) throw lookupError;

  if (!existing) {
    // No row to cancel — create one, but force status to canceled. The
    // payload we were handed can be a STALE snapshot (e.g. a redelivered
    // customer.subscription.updated whose live subscription turned out to be
    // resource_missing); upserting its old status (possibly "active") for a
    // subscription that no longer exists in Stripe would grant Pro forever,
    // since a deleted subscription emits no further events to correct it.
    return upsertSubscriptionFromStripe(admin, {
      ...subscription,
      status: "canceled",
    } as Stripe.Subscription);
  }

  const { error } = await admin
    .from("subscriptions")
    .update({
      status: "canceled",
      cancel_at_period_end: isSubscriptionScheduledToCancel(subscription),
      updated_at: new Date().toISOString(),
    })
    .eq("stripe_subscription_id", subscription.id);
  if (error) throw error;

  return SYNCED;
}

function getInvoiceSubscriptionId(invoice: Stripe.Invoice): string | null {
  const flexibleInvoice = invoice as Stripe.Invoice & {
    subscription?: string | Stripe.Subscription | null;
    parent?: {
      subscription_details?: {
        subscription?: string | Stripe.Subscription | null;
      } | null;
    } | null;
  };
  const subscription =
    flexibleInvoice.subscription ??
    flexibleInvoice.parent?.subscription_details?.subscription ??
    null;
  if (typeof subscription === "string") return subscription;
  return subscription?.id ?? null;
}

export async function upsertSubscriptionFromInvoice(
  admin: SupabaseClient,
  invoice: Stripe.Invoice,
  eventContext?: BillingEventContext | null,
): Promise<SubscriptionSyncResult> {
  const subscriptionId = getInvoiceSubscriptionId(invoice);
  // Not a subscription invoice (e.g. a one-off charge) — nothing to sync.
  if (!subscriptionId) return SYNCED;

  const stripe = getStripe();
  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  return upsertSubscriptionFromStripe(admin, subscription, null, eventContext);
}

export async function upsertSubscriptionFromInvoicePayment(
  admin: SupabaseClient,
  invoicePayment: Stripe.InvoicePayment,
  eventContext?: BillingEventContext | null,
): Promise<SubscriptionSyncResult> {
  let invoice: Stripe.Invoice | null = null;

  if (typeof invoicePayment.invoice === "string") {
    invoice = await getStripe().invoices.retrieve(invoicePayment.invoice);
  } else if (!("deleted" in invoicePayment.invoice)) {
    invoice = invoicePayment.invoice;
  }

  if (!invoice) return SYNCED;

  return upsertSubscriptionFromInvoice(admin, invoice, eventContext);
}

export async function linkStripeCustomerToProfile(
  admin: SupabaseClient,
  userId: string,
  customerId: string,
): Promise<void> {
  const profile = await getProfileById(admin, userId);
  if (!profile) {
    throw new Error(`Profile not found for user ${userId}`);
  }
  if (profile.stripe_customer_id && profile.stripe_customer_id !== customerId) {
    throw new Error("Existing Stripe customer id mismatch for profile");
  }
  if (profile.stripe_customer_id === customerId) return;

  const { error } = await admin
    .from("profiles")
    .update({ stripe_customer_id: customerId })
    .eq("id", userId);
  if (error) throw error;
}

export async function handleCheckoutSessionCompleted(
  admin: SupabaseClient,
  session: Stripe.Checkout.Session,
  eventContext?: BillingEventContext | null,
): Promise<SubscriptionSyncResult> {
  // Shared-account guard, BEFORE any binding: the other product's Checkout
  // Sessions carry their own `metadata.app`, and their subscriptions fail the
  // price/marker test. Checking the subscription first matters — once
  // linkStripeCustomerToProfile has run, a bound customer would read as ours.
  if (isForeignAppMetadata(session.metadata)) {
    return FOREIGN_SKIP;
  }
  const subscriptionId =
    typeof session.subscription === "string"
      ? session.subscription
      : session.subscription?.id;
  let checkoutSubscription: Stripe.Subscription | null = null;
  if (subscriptionId) {
    checkoutSubscription = await getStripe().subscriptions.retrieve(subscriptionId);
    if (await isForeignSubscription(admin, checkoutSubscription)) {
      return FOREIGN_SKIP;
    }
  }

  const verifiedBinding = await resolveVerifiedCheckoutBinding(admin, session);
  if (verifiedBinding.userId === null) {
    reportUserBindingSkip("checkout_completed", {
      has_customer_binding: Boolean(getCheckoutCustomerId(session)),
      has_subscription: Boolean(session.subscription),
      has_metadata_user_id: Boolean(session.metadata?.user_id),
      has_client_reference_id: Boolean(session.client_reference_id),
      reason: verifiedBinding.reason,
    });
    // Paid money with no owner: record it durably (table, or the ledger row
    // + Sentry until the migration is applied) BEFORE the route returns 200.
    const paid =
      session.payment_status === "paid" ||
      session.payment_status === "no_payment_required";
    if (eventContext && paid) {
      await recordUnresolvedBillingEvent(admin, {
        ...eventContext,
        customerId: getCheckoutCustomerId(session),
        customerEmail:
          session.customer_details?.email ?? session.customer_email ?? null,
        amountCents: session.amount_total ?? null,
        currency: session.currency ?? null,
        reason: verifiedBinding.reason,
      });
    }
    return {
      synced: false,
      reason: `checkout user/customer binding could not be verified (${verifiedBinding.reason})`,
    };
  }

  await linkStripeCustomerToProfile(
    admin,
    verifiedBinding.userId,
    verifiedBinding.customerId,
  );

  if (checkoutSubscription) {
    return upsertSubscriptionFromStripe(
      admin,
      checkoutSubscription,
      verifiedBinding.userId,
      eventContext,
    );
  }

  return SYNCED;
}
