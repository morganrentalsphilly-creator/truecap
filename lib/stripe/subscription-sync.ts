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
