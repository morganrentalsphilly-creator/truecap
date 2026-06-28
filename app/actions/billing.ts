"use server";

import { z } from "zod";
import * as Sentry from "@sentry/nextjs";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getStripe } from "@/lib/stripe/client";
import { captureServerEvent } from "@/lib/posthog-server";
import { TRIAL_DAYS } from "@/lib/trial";

const checkoutSchema = z.object({
  planSlug: z.enum(["pro_monthly", "pro_annual"]),
  // Optional campaign code from the URL (?coupon=…). Resolved SERVER-SIDE
  // against a whitelist → env coupon id, so a client can never inject an
  // arbitrary Stripe coupon into checkout.
  offer: z.string().max(40).optional(),
});

export type BillingActionResult =
  | { ok: true; url: string }
  | {
      ok: false;
      code:
        | "SIGN_IN_REQUIRED"
        | "PLAN_NOT_FOUND"
        | "MISSING_PRICE"
        | "ALREADY_SUBSCRIBED"
        | "SERVER_ERROR";
      message: string;
    };

function getSiteUrl(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");
}

function getPlanPriceId(planSlug: "pro_monthly" | "pro_annual", dbPriceId?: string | null): string | null {
  // Env-first so a price change is a single env-var swap: new checkouts follow
  // STRIPE_PRICE_PRO_* immediately, while plans.stripe_price_id (kept = the OLD
  // price) still lets the webhook map grandfathered subscriptions to Pro.
  // Behaviour-neutral until the env vars point at a new Stripe Price.
  const envPriceId =
    planSlug === "pro_monthly" ? process.env.STRIPE_PRICE_PRO_MONTHLY : process.env.STRIPE_PRICE_PRO_ANNUAL;
  return envPriceId ?? dbPriceId ?? null;
}

/**
 * Resolve a campaign code (?coupon=…) to a configured Stripe COUPON id.
 * Whitelisted server-side so clients can't pass arbitrary coupon ids; an
 * unknown code or an unset env var yields null (checkout proceeds at full
 * price — fail-safe). Morgan owns the coupon + env var in Stripe/Vercel.
 */
function resolveOfferCouponId(offer: string | undefined): string | null {
  if (!offer) return null;
  const code = offer.trim().toUpperCase();
  // The post-analysis drip's final nudge links ?coupon=<POST_ANALYSIS_COUPON_CODE>
  // (default ANALYZE20). Key the map off that same code so the promised 20% off
  // actually applies once POST_ANALYSIS_COUPON_ID is set — previously only EXIT50
  // was wired, so ANALYZE20 silently fell through to full price.
  const postAnalysisCode = (process.env.POST_ANALYSIS_COUPON_CODE || "ANALYZE20").trim().toUpperCase();
  const map: Record<string, string | undefined> = {
    EXIT50: process.env.EXIT_INTENT_COUPON_ID,
    [postAnalysisCode]: process.env.POST_ANALYSIS_COUPON_ID,
  };
  const resolved = map[code] ?? null;
  // A KNOWN offer code with no configured coupon id = a promo we promised but
  // can't honor. Surface it loudly instead of silently charging full price.
  if (resolved == null && code in map) {
    Sentry.captureMessage(`offer coupon '${code}' has no configured Stripe coupon id`, {
      level: "warning",
      tags: { feature: "billing-offer-coupon" },
    });
  }
  return resolved;
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
  const stripe = getStripe();
  if (args.existingCustomerId) {
    // Self-healing (Jun 2026): a stored customer id pointing at a
    // deleted/missing Stripe customer previously THREW here — which
    // made checkout fail permanently for that user on every retry
    // (the stale id never got replaced). Now we fall through and mint
    // a replacement customer instead. The cross-user binding check
    // below remains a hard failure — that one is a safety property.
    try {
      const existingCustomer = await stripe.customers.retrieve(args.existingCustomerId);
      if (!("deleted" in existingCustomer && existingCustomer.deleted)) {
        const metadataUserId = existingCustomer.metadata?.user_id;
        if (metadataUserId && metadataUserId !== args.userId) {
          throw new Error("Stored Stripe customer belongs to a different user");
        }
        if (!metadataUserId) {
          await stripe.customers.update(existingCustomer.id, {
            metadata: { ...(existingCustomer.metadata ?? {}), user_id: args.userId },
          });
        }
        return existingCustomer.id;
      }
      console.warn(
        `[billing] stored Stripe customer ${args.existingCustomerId} was deleted — creating a replacement`
      );
    } catch (err) {
      if (err instanceof Error && err.message.includes("belongs to a different user")) {
        throw err;
      }
      const stripeCode = (err as { code?: string } | null)?.code;
      if (stripeCode !== "resource_missing") throw err;
      console.warn(
        `[billing] stored Stripe customer ${args.existingCustomerId} missing in Stripe — creating a replacement`
      );
    }
  }

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

  // GUARD: never start a NEW subscription checkout for a user who
  // already has one — Stripe would happily create a second, parallel
  // subscription and double-bill them. Plan changes (monthly ↔ annual)
  // go through the billing portal, which prorates correctly. Callers
  // route ALREADY_SUBSCRIBED to the portal.
  const { data: existingSubscription } = await supabase
    .from("subscriptions")
    .select("id")
    .eq("user_id", user.id)
    .in("status", ["active", "trialing", "past_due"])
    .limit(1)
    .maybeSingle();
  if (existingSubscription) {
    return {
      ok: false,
      code: "ALREADY_SUBSCRIBED",
      message:
        "You already have an active TrueCap plan. Use Manage billing to switch between monthly and annual — Stripe prorates automatically.",
    };
  }

  // Repeat-trial guard: the free trial is a FIRST-time offer. A returning user
  // who ever subscribed before (any status, incl. canceled/incomplete) does NOT
  // get it again — otherwise cancel-and-resubscribe farms a fresh trial each
  // cycle. Only grant the trial when there's no prior subscription row at all.
  const { data: priorSubscription } = await supabase
    .from("subscriptions")
    .select("id")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();
  const grantTrial = !priorSubscription;

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
    console.error("[billing] Failed to load plan:", planError);
    return { ok: false, code: "SERVER_ERROR", message: "Unable to start checkout. Please try again." };
  }

  if (!plan) {
    return { ok: false, code: "PLAN_NOT_FOUND", message: "Selected plan is not available." };
  }

  const priceId = getPlanPriceId(parsed.data.planSlug, plan.stripe_price_id);
  if (!priceId) {
    console.error(`[billing] Missing Stripe price id for plan ${parsed.data.planSlug}`);
    return {
      ok: false,
      code: "MISSING_PRICE",
      message: "This plan is temporarily unavailable. Please try again shortly.",
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
    // A campaign coupon from the URL (e.g. the exit-intent EXIT50) takes
    // precedence over the standard annual coupon, and applies to monthly OR
    // annual. Both resolve to a Stripe coupon id we control.
    const offerCoupon = resolveOfferCouponId(parsed.data.offer);
    const annualCoupon =
      parsed.data.planSlug === "pro_annual" ? process.env.STRIPE_ANNUAL_DISCOUNT_COUPON_ID : undefined;
    const appliedCoupon = offerCoupon ?? annualCoupon;
    // Free Pro trial on new subscriptions. Card is collected at checkout and
    // auto-charges when the trial ends. Env-adjustable; PRO_TRIAL_DAYS=0 turns
    // trials off without a deploy. Default 3 days.
    const proTrialDays = Math.max(0, Number.parseInt(process.env.PRO_TRIAL_DAYS ?? String(TRIAL_DAYS), 10) || 0);
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
      discounts: appliedCoupon ? [{ coupon: appliedCoupon }] : undefined,
      allow_promotion_codes: appliedCoupon ? undefined : true,
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
        ...(grantTrial && proTrialDays > 0 ? { trial_period_days: proTrialDays } : {}),
      },
    });

    if (!session.url) {
      console.error("[billing] Stripe checkout session missing URL");
      return { ok: false, code: "SERVER_ERROR", message: "Unable to start checkout. Please try again." };
    }

    // PostHog funnel event — fires just before we return the Stripe
    // redirect URL. Captures conversion INTENT even if the user later
    // bounces on Stripe's checkout page (the corresponding
    // `pro_subscribed` event will only fire on actual successful
    // payment, so the gap between these two = checkout drop-off rate).
    await captureServerEvent({
      distinctId: user.id,
      event: "pro_checkout_started",
      properties: {
        plan_slug: parsed.data.planSlug,
        stripe_session_id: session.id,
      },
    });

    return { ok: true, url: session.url };
  } catch (error) {
    console.error("[billing] createCheckoutSessionAction failed:", error);
    return {
      ok: false,
      code: "SERVER_ERROR",
      message: "Unable to start checkout. Please try again.",
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
    console.error("[billing] Failed to load profile for billing portal:", error);
    return { ok: false, code: "SERVER_ERROR", message: "Unable to open billing portal right now." };
  }

  if (!profile?.stripe_customer_id) {
    return {
      ok: false,
      code: "MISSING_PRICE",
      message: "No billing account found yet. Start a subscription first.",
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
    console.error("[billing] createBillingPortalSessionAction failed:", error);
    return {
      ok: false,
      code: "SERVER_ERROR",
      message: "Unable to open billing portal right now.",
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
    console.error("[billing] Failed to load cancellation prerequisites:", profileError ?? subscriptionError);
    return {
      ok: false,
      code: "SERVER_ERROR",
      message: "Unable to load billing details right now.",
    };
  }

  if (!profile?.stripe_customer_id || !subscription?.stripe_subscription_id) {
    return {
      ok: false,
      code: "MISSING_PRICE",
      message: "No active subscription found.",
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
    console.error("[billing] createCancelSubscriptionPortalSessionAction failed:", error);
    return {
      ok: false,
      code: "SERVER_ERROR",
      message: "Unable to open cancellation flow right now.",
    };
  }
}
