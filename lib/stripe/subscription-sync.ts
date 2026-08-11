import "server-only";

import * as Sentry from "@sentry/nextjs";

import type { SupabaseClient } from "@supabase/supabase-js";
import type Stripe from "stripe";
import { getStripe } from "@/lib/stripe/client";
import { planSlugFromPriceId } from "@/lib/stripe/plan-prices";

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
export type SubscriptionSyncResult = { synced: true } | { synced: false; reason: string };

const SYNCED: SubscriptionSyncResult = { synced: true };

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
 * `extra` must contain opaque Stripe/user ids ONLY — never emails or
 * addresses (sendDefaultPii is on, CLAUDE.md pitfall #4).
 */
function reportUserBindingSkip(
  context: "subscription_sync" | "checkout_completed",
  extra: Record<string, string | null | undefined>
): void {
  Sentry.captureMessage(
    `Stripe webhook sync skipped: user/customer binding could not be verified (${context})`,
    {
      level: "error",
      tags: { feature: "stripe-webhook", failure: "user_binding" },
      extra,
    }
  );
}

async function getProfileById(
  admin: SupabaseClient,
  userId: string
): Promise<ProfileBindingRow | null> {
  const { data, error } = await admin
    .from("profiles")
    .select("id, stripe_customer_id")
    .eq("id", userId)
    .maybeSingle();
  if (error) throw error;
  return (data as ProfileBindingRow | null) ?? null;
}

async function getProfileByStripeCustomerId(
  admin: SupabaseClient,
  customerId: string
): Promise<ProfileBindingRow | null> {
  const { data, error } = await admin
    .from("profiles")
    .select("id, stripe_customer_id")
    .eq("stripe_customer_id", customerId)
    .maybeSingle();
  if (error) throw error;
  return (data as ProfileBindingRow | null) ?? null;
}

function getSubscriptionCustomerId(subscription: Stripe.Subscription): string | null {
  return typeof subscription.customer === "string" ? subscription.customer : subscription.customer?.id ?? null;
}

function getCheckoutCustomerId(session: Stripe.Checkout.Session): string | null {
  return typeof session.customer === "string" ? session.customer : session.customer?.id ?? null;
}

async function resolveVerifiedUserIdForSubscription(
  admin: SupabaseClient,
  subscription: Stripe.Subscription,
  fallbackUserId?: string | null
): Promise<string | null> {
  const customerId = getSubscriptionCustomerId(subscription);
  const metadataUserId = subscription.metadata?.user_id ?? null;
  const trustedFallbackUserId = fallbackUserId ?? null;

  if (metadataUserId && trustedFallbackUserId && metadataUserId !== trustedFallbackUserId) {
    console.error(
      `[billing] Rejecting subscription sync for ${subscription.id}: metadata.user_id does not match fallback user id`
    );
    return null;
  }

  const candidateUserId = trustedFallbackUserId ?? metadataUserId ?? null;

  if (customerId) {
    const profileByCustomer = await getProfileByStripeCustomerId(admin, customerId);
    if (profileByCustomer) {
      if (candidateUserId && candidateUserId !== profileByCustomer.id) {
        console.error(
          `[billing] Rejecting subscription sync for ${subscription.id}: candidate user does not own Stripe customer`
        );
        return null;
      }
      return profileByCustomer.id;
    }
  }

  if (!candidateUserId) {
    console.error(
      `[billing] Skipping subscription sync for ${subscription.id}: cannot resolve verified user for unbound customer`
    );
    return null;
  }

  const profileByUser = await getProfileById(admin, candidateUserId);
  if (!profileByUser) {
    console.error(`[billing] Skipping subscription sync for ${subscription.id}: candidate user not found`);
    return null;
  }

  if (profileByUser.stripe_customer_id) {
    if (!customerId || profileByUser.stripe_customer_id !== customerId) {
      console.error(
        `[billing] Rejecting subscription sync for ${subscription.id}: stored stripe_customer_id mismatch`
      );
      return null;
    }
    return profileByUser.id;
  }

  if (trustedFallbackUserId && trustedFallbackUserId === profileByUser.id) {
    return profileByUser.id;
  }

  console.error(
    `[billing] Skipping subscription sync for ${subscription.id}: user has no Stripe customer binding and no trusted fallback`
  );
  return null;
}

async function resolveVerifiedCheckoutBinding(
  admin: SupabaseClient,
  session: Stripe.Checkout.Session
): Promise<{ userId: string; customerId: string } | null> {
  const customerId = getCheckoutCustomerId(session);
  const metadataUserId = session.metadata?.user_id ?? null;
  const clientReferenceUserId = session.client_reference_id ?? null;

  if (!customerId) {
    console.error("[billing] checkout.session.completed missing customer id");
    return null;
  }

  if (metadataUserId && clientReferenceUserId && metadataUserId !== clientReferenceUserId) {
    console.error("[billing] checkout.session.completed has mismatched metadata.user_id and client_reference_id");
    return null;
  }

  const candidateUserId = clientReferenceUserId ?? metadataUserId;
  if (!candidateUserId) {
    console.error("[billing] checkout.session.completed missing resolvable user id");
    return null;
  }

  const profileByCustomer = await getProfileByStripeCustomerId(admin, customerId);
  if (profileByCustomer) {
    if (profileByCustomer.id !== candidateUserId) {
      console.error("[billing] checkout.session.completed customer is already bound to a different user");
      return null;
    }
    return { userId: profileByCustomer.id, customerId };
  }

  const profileByUser = await getProfileById(admin, candidateUserId);
  if (!profileByUser) {
    console.error("[billing] checkout.session.completed candidate user profile not found");
    return null;
  }

  if (profileByUser.stripe_customer_id && profileByUser.stripe_customer_id !== customerId) {
    console.error("[billing] checkout.session.completed profile has mismatched existing Stripe customer id");
    return null;
  }

  if (!clientReferenceUserId) {
    console.error("[billing] checkout.session.completed without client_reference_id cannot safely bind new customer");
    return null;
  }

  return { userId: profileByUser.id, customerId };
}

function isSubscriptionScheduledToCancel(subscription: Stripe.Subscription): boolean {
  const subscriptionWithCancelAt = subscription as Stripe.Subscription & {
    cancel_at?: number | null;
  };

  return Boolean(subscription.cancel_at_period_end || subscriptionWithCancelAt.cancel_at);
}

async function resolvePlanIdBySlug(admin: SupabaseClient, slug: string | null): Promise<string | null> {
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

async function resolvePlanIdForPrice(admin: SupabaseClient, priceId: string | null): Promise<string | null> {
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
  stripeSubscriptionId: string
): Promise<string | null> {
  const { data, error } = await admin
    .from("subscriptions")
    .select("plan_id")
    .eq("stripe_subscription_id", stripeSubscriptionId)
    .maybeSingle();
  if (error) throw error;
  return (data as { plan_id: string | null } | null)?.plan_id ?? null;
}

export async function upsertSubscriptionFromStripe(
  admin: SupabaseClient,
  subscription: Stripe.Subscription,
  fallbackUserId?: string | null
): Promise<SubscriptionSyncResult> {
  const userId = await resolveVerifiedUserIdForSubscription(admin, subscription, fallbackUserId);
  if (!userId) {
    console.error(`[billing] Skipping subscription sync for ${subscription.id}: user binding could not be verified`);
    reportUserBindingSkip("subscription_sync", {
      stripe_subscription_id: subscription.id,
      stripe_customer_id: getSubscriptionCustomerId(subscription),
      subscription_status: subscription.status,
    });
    return { synced: false, reason: "user binding could not be verified" };
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
  // Before EVER accepting that downgrade on an active/trialing/past_due sub:
  //   1. Recover the plan from the subscription's plan_slug metadata, which
  //      checkout stamps on subscription_data.metadata (app/actions/billing.ts)
  //      and which matches plans.slug 1:1. This rescues brand-new subs whose
  //      price row simply isn't wired up yet.
  //   2. If that still fails, PRESERVE the plan already stored on this
  //      subscription's row rather than overwriting it with null — never strip
  //      Pro from someone actively paying — and page LOUD (ids only, no PII,
  //      pitfall #4). Only genuinely unresolvable first-time syncs fall
  //      through to null here, which is the correct FREE result for those.
  // A canceled/incomplete/etc. sub legitimately resolves to null (→ FREE) and
  // needs no rescue — the guard is scoped to the paid status set.
  const isActivePaidStatus = ["active", "trialing", "past_due"].includes(subscription.status);
  if (planId === null && isActivePaidStatus) {
    planId = await resolvePlanIdBySlug(admin, subscription.metadata?.plan_slug ?? null);

    if (planId === null) {
      const preservedPlanId = await getExistingSubscriptionPlanId(admin, subscription.id);
      Sentry.captureMessage(
        "Paid subscription has UNMAPPED price — preserving existing plan to avoid FREE downgrade",
        {
          level: "error",
          tags: { feature: "billing", kind: "entitlement-mismatch" },
          extra: {
            stripe_subscription_id: subscription.id,
            stripe_price_id: priceId,
            subscription_status: subscription.status,
            plan_slug_metadata: subscription.metadata?.plan_slug ?? null,
            preserved_plan_id: preservedPlanId,
            hint: "Populate plans.stripe_price_id for this price (and verify STRIPE_PRICE_PRO_MONTHLY/ANNUAL env).",
          },
        }
      );
      planId = preservedPlanId;
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
    subscriptionWithPeriods.current_period_start ?? primaryItemWithPeriods?.current_period_start ?? null;
  const periodEndSec =
    subscriptionWithPeriods.current_period_end ?? primaryItemWithPeriods?.current_period_end ?? null;

  const row = {
    user_id: userId,
    plan_id: planId,
    stripe_subscription_id: subscription.id,
    stripe_price_id: priceId,
    status: subscription.status,
    current_period_start:
      periodStartSec != null ? new Date(periodStartSec * 1000).toISOString() : null,
    current_period_end: periodEndSec != null ? new Date(periodEndSec * 1000).toISOString() : null,
    cancel_at_period_end: isSubscriptionScheduledToCancel(subscription),
    updated_at: new Date().toISOString(),
  };

  if (["active", "trialing", "past_due", "unpaid", "paused"].includes(subscription.status)) {
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

  const { error } = await admin.from("subscriptions").upsert(row, { onConflict: "stripe_subscription_id" });
  if (error) throw error;

  return SYNCED;
}

export async function markSubscriptionCanceled(
  admin: SupabaseClient,
  subscription: Stripe.Subscription
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
    flexibleInvoice.subscription ?? flexibleInvoice.parent?.subscription_details?.subscription ?? null;
  if (typeof subscription === "string") return subscription;
  return subscription?.id ?? null;
}

export async function upsertSubscriptionFromInvoice(
  admin: SupabaseClient,
  invoice: Stripe.Invoice
): Promise<SubscriptionSyncResult> {
  const subscriptionId = getInvoiceSubscriptionId(invoice);
  // Not a subscription invoice (e.g. a one-off charge) — nothing to sync.
  if (!subscriptionId) return SYNCED;

  const stripe = getStripe();
  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  return upsertSubscriptionFromStripe(admin, subscription);
}

export async function upsertSubscriptionFromInvoicePayment(
  admin: SupabaseClient,
  invoicePayment: Stripe.InvoicePayment
): Promise<SubscriptionSyncResult> {
  let invoice: Stripe.Invoice | null = null;

  if (typeof invoicePayment.invoice === "string") {
    invoice = await getStripe().invoices.retrieve(invoicePayment.invoice);
  } else if (!("deleted" in invoicePayment.invoice)) {
    invoice = invoicePayment.invoice;
  }

  if (!invoice) return SYNCED;

  return upsertSubscriptionFromInvoice(admin, invoice);
}

export async function linkStripeCustomerToProfile(
  admin: SupabaseClient,
  userId: string,
  customerId: string
): Promise<void> {
  const profile = await getProfileById(admin, userId);
  if (!profile) {
    throw new Error(`Profile not found for user ${userId}`);
  }
  if (profile.stripe_customer_id && profile.stripe_customer_id !== customerId) {
    throw new Error("Existing Stripe customer id mismatch for profile");
  }
  if (profile.stripe_customer_id === customerId) return;

  const { error } = await admin.from("profiles").update({ stripe_customer_id: customerId }).eq("id", userId);
  if (error) throw error;
}

export async function handleCheckoutSessionCompleted(
  admin: SupabaseClient,
  session: Stripe.Checkout.Session
): Promise<SubscriptionSyncResult> {
  const verifiedBinding = await resolveVerifiedCheckoutBinding(admin, session);
  if (!verifiedBinding) {
    console.error("[billing] checkout.session.completed skipped due to unverifiable user/customer binding");
    reportUserBindingSkip("checkout_completed", {
      stripe_session_id: session.id,
      stripe_customer_id: getCheckoutCustomerId(session),
      stripe_subscription_id:
        typeof session.subscription === "string" ? session.subscription : session.subscription?.id ?? null,
    });
    return { synced: false, reason: "checkout user/customer binding could not be verified" };
  }

  await linkStripeCustomerToProfile(admin, verifiedBinding.userId, verifiedBinding.customerId);

  const subscriptionId =
    typeof session.subscription === "string" ? session.subscription : session.subscription?.id;
  if (subscriptionId) {
    const stripe = getStripe();
    const sub = await stripe.subscriptions.retrieve(subscriptionId);
    return upsertSubscriptionFromStripe(admin, sub, verifiedBinding.userId);
  }

  return SYNCED;
}
