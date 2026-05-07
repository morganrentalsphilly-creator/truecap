import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type Stripe from "stripe";
import { getStripe } from "@/lib/stripe/client";

type ProfileBindingRow = {
  id: string;
  stripe_customer_id: string | null;
};

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

function planSlugFromPriceId(priceId: string | null): "pro_monthly" | "pro_annual" | null {
  if (!priceId) return null;
  if (priceId === process.env.STRIPE_PRICE_PRO_MONTHLY) return "pro_monthly";
  if (priceId === process.env.STRIPE_PRICE_PRO_ANNUAL) return "pro_annual";
  return null;
}

function isSubscriptionScheduledToCancel(subscription: Stripe.Subscription): boolean {
  const subscriptionWithCancelAt = subscription as Stripe.Subscription & {
    cancel_at?: number | null;
  };

  return Boolean(subscription.cancel_at_period_end || subscriptionWithCancelAt.cancel_at);
}

async function resolvePlanIdForPrice(admin: SupabaseClient, priceId: string | null): Promise<string | null> {
  if (!priceId) return null;

  const { data: planByPrice } = await admin
    .from("plans")
    .select("id")
    .eq("stripe_price_id", priceId)
    .maybeSingle();

  if (planByPrice?.id) return planByPrice.id;

  const slug = planSlugFromPriceId(priceId);
  if (!slug) return null;

  const { data: planBySlug } = await admin
    .from("plans")
    .select("id")
    .eq("slug", slug)
    .maybeSingle();

  return planBySlug?.id ?? null;
}

export async function upsertSubscriptionFromStripe(
  admin: SupabaseClient,
  subscription: Stripe.Subscription,
  fallbackUserId?: string | null
): Promise<void> {
  const userId = await resolveVerifiedUserIdForSubscription(admin, subscription, fallbackUserId);
  if (!userId) {
    console.error(`[billing] Skipping subscription sync for ${subscription.id}: user binding could not be verified`);
    return;
  }

  const primaryItem = subscription.items.data[0];
  const priceId =
    primaryItem?.price && typeof primaryItem.price === "object"
      ? primaryItem.price.id
      : typeof primaryItem?.price === "string"
        ? primaryItem.price
        : null;

  const planId = await resolvePlanIdForPrice(admin, priceId);

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
}

export async function markSubscriptionCanceled(
  admin: SupabaseClient,
  subscription: Stripe.Subscription
): Promise<void> {
  const { data: existing, error: lookupError } = await admin
    .from("subscriptions")
    .select("id")
    .eq("stripe_subscription_id", subscription.id)
    .maybeSingle();
  if (lookupError) throw lookupError;

  if (!existing) {
    await upsertSubscriptionFromStripe(admin, subscription);
    return;
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
): Promise<void> {
  const subscriptionId = getInvoiceSubscriptionId(invoice);
  if (!subscriptionId) return;

  const stripe = getStripe();
  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  await upsertSubscriptionFromStripe(admin, subscription);
}

export async function upsertSubscriptionFromInvoicePayment(
  admin: SupabaseClient,
  invoicePayment: Stripe.InvoicePayment
): Promise<void> {
  let invoice: Stripe.Invoice | null = null;

  if (typeof invoicePayment.invoice === "string") {
    invoice = await getStripe().invoices.retrieve(invoicePayment.invoice);
  } else if (!("deleted" in invoicePayment.invoice)) {
    invoice = invoicePayment.invoice;
  }

  if (!invoice) return;

  await upsertSubscriptionFromInvoice(admin, invoice);
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
): Promise<void> {
  const verifiedBinding = await resolveVerifiedCheckoutBinding(admin, session);
  if (!verifiedBinding) {
    console.error("[billing] checkout.session.completed skipped due to unverifiable user/customer binding");
    return;
  }

  await linkStripeCustomerToProfile(admin, verifiedBinding.userId, verifiedBinding.customerId);

  const subscriptionId =
    typeof session.subscription === "string" ? session.subscription : session.subscription?.id;
  if (subscriptionId) {
    const stripe = getStripe();
    const sub = await stripe.subscriptions.retrieve(subscriptionId);
    await upsertSubscriptionFromStripe(admin, sub, verifiedBinding.userId);
  }
}
