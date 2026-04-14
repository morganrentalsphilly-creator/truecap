import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type Stripe from "stripe";
import { getStripe } from "@/lib/stripe/client";

async function resolveUserIdForSubscription(
  admin: SupabaseClient,
  subscription: Stripe.Subscription
): Promise<string | null> {
  const metaUser = subscription.metadata?.user_id;
  if (metaUser) return metaUser;

  const customerId =
    typeof subscription.customer === "string"
      ? subscription.customer
      : subscription.customer?.id;
  if (!customerId) return null;

  const { data } = await admin
    .from("profiles")
    .select("id")
    .eq("stripe_customer_id", customerId)
    .maybeSingle();

  return data?.id ?? null;
}

export async function upsertSubscriptionFromStripe(
  admin: SupabaseClient,
  subscription: Stripe.Subscription,
  fallbackUserId?: string | null
): Promise<void> {
  const userId =
    (await resolveUserIdForSubscription(admin, subscription)) ?? fallbackUserId ?? null;
  if (!userId) {
    throw new Error("Cannot resolve user_id for subscription");
  }

  const primaryItem = subscription.items.data[0];
  const priceId =
    primaryItem?.price && typeof primaryItem.price === "object"
      ? primaryItem.price.id
      : typeof primaryItem?.price === "string"
        ? primaryItem.price
        : null;

  let planId: string | null = null;
  if (priceId) {
    const { data: plan } = await admin.from("plans").select("id").eq("stripe_price_id", priceId).maybeSingle();
    planId = plan?.id ?? null;
  }

  const periodStartSec = primaryItem?.current_period_start ?? null;
  const periodEndSec = primaryItem?.current_period_end ?? null;

  const row = {
    user_id: userId,
    plan_id: planId,
    stripe_subscription_id: subscription.id,
    stripe_price_id: priceId,
    status: subscription.status,
    current_period_start:
      periodStartSec != null ? new Date(periodStartSec * 1000).toISOString() : null,
    current_period_end: periodEndSec != null ? new Date(periodEndSec * 1000).toISOString() : null,
    cancel_at_period_end: subscription.cancel_at_period_end,
    updated_at: new Date().toISOString(),
  };

  const { error } = await admin.from("subscriptions").upsert(row, { onConflict: "stripe_subscription_id" });
  if (error) throw error;
}

export async function markSubscriptionCanceled(
  admin: SupabaseClient,
  subscription: Stripe.Subscription
): Promise<void> {
  const { error } = await admin
    .from("subscriptions")
    .update({
      status: "canceled",
      cancel_at_period_end: subscription.cancel_at_period_end ?? false,
      updated_at: new Date().toISOString(),
    })
    .eq("stripe_subscription_id", subscription.id);
  if (error) throw error;
}

export async function linkStripeCustomerToProfile(
  admin: SupabaseClient,
  userId: string,
  customerId: string
): Promise<void> {
  const { error } = await admin.from("profiles").update({ stripe_customer_id: customerId }).eq("id", userId);
  if (error) throw error;
}

export async function handleCheckoutSessionCompleted(
  admin: SupabaseClient,
  session: Stripe.Checkout.Session
): Promise<void> {
  const userId = session.metadata?.user_id ?? session.client_reference_id;
  const customerId = typeof session.customer === "string" ? session.customer : session.customer?.id;

  if (userId && customerId) {
    await linkStripeCustomerToProfile(admin, userId, customerId);
  }

  const subscriptionId =
    typeof session.subscription === "string" ? session.subscription : session.subscription?.id;
  if (subscriptionId) {
    const stripe = getStripe();
    const sub = await stripe.subscriptions.retrieve(subscriptionId);
    await upsertSubscriptionFromStripe(admin, sub, userId ?? null);
  }
}
