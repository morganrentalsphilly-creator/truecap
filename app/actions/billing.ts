"use server";

import { z } from "zod";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getStripe } from "@/lib/stripe/client";

const checkoutSchema = z.object({
  planSlug: z.enum(["pro_monthly", "pro_annual"]),
});

export type BillingActionResult =
  | { ok: true; url: string }
  | {
      ok: false;
      code: "SIGN_IN_REQUIRED" | "PLAN_NOT_FOUND" | "MISSING_PRICE" | "SERVER_ERROR";
      message: string;
    };

function getSiteUrl(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");
}

function getPlanPriceId(planSlug: "pro_monthly" | "pro_annual", dbPriceId?: string | null): string | null {
  if (dbPriceId) return dbPriceId;
  if (planSlug === "pro_monthly") return process.env.STRIPE_PRICE_PRO_MONTHLY ?? null;
  return process.env.STRIPE_PRICE_PRO_ANNUAL ?? null;
}

function getDisplayName(profile: {
  display_name?: string | null;
  first_name?: string | null;
  last_name?: string | null;
} | null): string | undefined {
  const profileName =
    profile?.display_name?.trim() || `${profile?.first_name ?? ""} ${profile?.last_name ?? ""}`.trim();
  return profileName || undefined;
}

async function getOrCreateStripeCustomer(args: {
  userId: string;
  email: string | null;
  name?: string;
  existingCustomerId?: string | null;
}): Promise<string> {
  if (args.existingCustomerId) return args.existingCustomerId;

  const stripe = getStripe();
  const customer = await stripe.customers.create({
    email: args.email ?? undefined,
    name: args.name,
    metadata: {
      user_id: args.userId,
    },
  });

  const admin = createAdminSupabaseClient();
  const { error } = await admin
    .from("profiles")
    .update({ stripe_customer_id: customer.id })
    .eq("id", args.userId);
  if (error) throw error;

  return customer.id;
}

export async function createCheckoutSessionAction(input: unknown): Promise<BillingActionResult> {
  const parsed = checkoutSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, code: "PLAN_NOT_FOUND", message: "Invalid billing plan." };
  }

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, code: "SIGN_IN_REQUIRED", message: "Please sign in to subscribe." };
  }

  const [{ data: profile }, { data: plan, error: planError }] = await Promise.all([
    supabase
      .from("profiles")
      .select("stripe_customer_id, display_name, first_name, last_name")
      .eq("id", user.id)
      .maybeSingle(),
    supabase
      .from("plans")
      .select("id, slug, stripe_price_id")
      .eq("slug", parsed.data.planSlug)
      .eq("is_active", true)
      .maybeSingle(),
  ]);

  if (planError) {
    return { ok: false, code: "SERVER_ERROR", message: planError.message };
  }

  if (!plan) {
    return { ok: false, code: "PLAN_NOT_FOUND", message: "Selected plan is not available." };
  }

  const priceId = getPlanPriceId(parsed.data.planSlug, plan.stripe_price_id);
  if (!priceId) {
    return {
      ok: false,
      code: "MISSING_PRICE",
      message: "Stripe price id is missing for this plan. Add it to the plans table or env file.",
    };
  }

  try {
    const customerId = await getOrCreateStripeCustomer({
      userId: user.id,
      email: user.email ?? null,
      name: getDisplayName(profile),
      existingCustomerId: profile?.stripe_customer_id ?? null,
    });
    const siteUrl = getSiteUrl();
    const annualCoupon =
      parsed.data.planSlug === "pro_annual" ? process.env.STRIPE_ANNUAL_DISCOUNT_COUPON_ID : undefined;
    const stripe = getStripe();
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      client_reference_id: user.id,
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      discounts: annualCoupon ? [{ coupon: annualCoupon }] : undefined,
      allow_promotion_codes: annualCoupon ? undefined : true,
      success_url: `${siteUrl}/profile?billing=success`,
      cancel_url: `${siteUrl}/profile?billing=checkout_cancelled`,
      metadata: {
        user_id: user.id,
        plan_slug: parsed.data.planSlug,
      },
      subscription_data: {
        metadata: {
          user_id: user.id,
          plan_slug: parsed.data.planSlug,
        },
      },
    });

    if (!session.url) {
      return { ok: false, code: "SERVER_ERROR", message: "Stripe did not return a checkout URL." };
    }

    return { ok: true, url: session.url };
  } catch (error) {
    return {
      ok: false,
      code: "SERVER_ERROR",
      message: error instanceof Error ? error.message : "Could not create checkout session.",
    };
  }
}

export async function createBillingPortalSessionAction(): Promise<BillingActionResult> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, code: "SIGN_IN_REQUIRED", message: "Please sign in to manage billing." };
  }

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("stripe_customer_id")
    .eq("id", user.id)
    .maybeSingle();

  if (error) {
    return { ok: false, code: "SERVER_ERROR", message: error.message };
  }

  if (!profile?.stripe_customer_id) {
    return {
      ok: false,
      code: "MISSING_PRICE",
      message: "No Stripe customer exists yet. Subscribe first to manage billing.",
    };
  }

  try {
    const stripe = getStripe();
    const portal = await stripe.billingPortal.sessions.create({
      customer: profile.stripe_customer_id,
      return_url: `${getSiteUrl()}/profile`,
    });
    return { ok: true, url: portal.url };
  } catch (error) {
    return {
      ok: false,
      code: "SERVER_ERROR",
      message: error instanceof Error ? error.message : "Could not open billing portal.",
    };
  }
}

export async function createCancelSubscriptionPortalSessionAction(): Promise<BillingActionResult> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, code: "SIGN_IN_REQUIRED", message: "Please sign in to manage billing." };
  }

  const [{ data: profile, error: profileError }, { data: subscription, error: subscriptionError }] =
    await Promise.all([
      supabase
        .from("profiles")
        .select("stripe_customer_id")
        .eq("id", user.id)
        .maybeSingle(),
      supabase
        .from("subscriptions")
        .select("stripe_subscription_id")
        .eq("user_id", user.id)
        .in("status", ["active", "trialing", "past_due", "unpaid", "paused"])
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

  if (profileError || subscriptionError) {
    return {
      ok: false,
      code: "SERVER_ERROR",
      message: profileError?.message ?? subscriptionError?.message ?? "Could not load billing details.",
    };
  }

  if (!profile?.stripe_customer_id || !subscription?.stripe_subscription_id) {
    return {
      ok: false,
      code: "MISSING_PRICE",
      message: "No active Stripe subscription exists yet.",
    };
  }

  try {
    const siteUrl = getSiteUrl();
    const stripe = getStripe();
    const portal = await stripe.billingPortal.sessions.create({
      customer: profile.stripe_customer_id,
      return_url: `${siteUrl}/profile`,
      flow_data: {
        type: "subscription_cancel",
        subscription_cancel: {
          subscription: subscription.stripe_subscription_id,
        },
        after_completion: {
          type: "redirect",
          redirect: {
            return_url: `${siteUrl}/profile?billing=subscription_cancelled`,
          },
        },
      },
    });
    return { ok: true, url: portal.url };
  } catch (error) {
    return {
      ok: false,
      code: "SERVER_ERROR",
      message: error instanceof Error ? error.message : "Could not open cancellation flow.",
    };
  }
}
