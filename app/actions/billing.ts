"use server";

import { z } from "zod";
import * as Sentry from "@sentry/nextjs";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { hasPaidPlanSubscription } from "@/lib/entitlements";
import { getStripe } from "@/lib/stripe/client";
import { getPrimaryPlanPriceId, type PaidPlanSlug } from "@/lib/stripe/plan-prices";
import { captureServerEvent } from "@/lib/posthog-server";
import { TRIAL_DAYS } from "@/lib/trial";

const checkoutSchema = z.object({
  planSlug: z.enum(["pro_monthly", "pro_annual", "agent_pro_monthly", "agent_pro_annual"]),
  // Optional campaign code from the URL (?coupon=…). Resolved SERVER-SIDE
  // against a whitelist → env coupon id, so a client can never inject an
  // arbitrary Stripe coupon into checkout.
  offer: z.string().max(40).optional(),
});

const switchPlanSchema = z.object({
  targetPlanSlug: z.enum(["pro_monthly", "pro_annual", "agent_pro_monthly", "agent_pro_annual"]),
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

function getPlanPriceId(planSlug: PaidPlanSlug, dbPriceId?: string | null): string | null {
  // Checkout sells the PRIMARY (first) configured price; the env may list
  // additional grandfathered prices after it (see lib/stripe/plan-prices),
  // which are for webhook resolution only, never for new checkouts.
  return getPrimaryPlanPriceId(planSlug) ?? dbPriceId ?? null;
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
  // (default ANALYZE20). EXIT50 (the exit-intent 50% offer) was removed
  // entirely — founder decision, 2026-07: no 50% discounts anywhere. A stale
  // ?coupon=EXIT50 link now falls through to full price, fail-safe.
  const postAnalysisCode = (process.env.POST_ANALYSIS_COUPON_CODE || "ANALYZE20").trim().toUpperCase();
  const map: Record<string, string | undefined> = {
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

  // STRIPE-SIDE double-billing backstop: the local-row guard above trusts
  // a subscriptions row the webhook sync may never have written (e.g. a
  // silently-skipped sync after the account switch). In that state the
  // user looks free locally, retries checkout, and Stripe would happily
  // create a SECOND live subscription — and re-grant the trial. When we
  // already know the Stripe customer, ask Stripe directly before creating
  // a new session.
  if (profile?.stripe_customer_id) {
    try {
      const stripe = getStripe();
      const stripeSubs = await stripe.subscriptions.list({
        customer: profile.stripe_customer_id,
        status: "all",
        limit: 10,
      });
      const hasLiveStripeSubscription = stripeSubs.data.some((sub) =>
        ["active", "trialing", "past_due"].includes(sub.status)
      );
      if (hasLiveStripeSubscription) {
        return {
          ok: false,
          code: "ALREADY_SUBSCRIBED",
          message:
            "You already have an active TrueCap plan. Use Manage billing to switch between monthly and annual — Stripe prorates automatically.",
        };
      }
    } catch (error) {
      // Don't block checkout on a Stripe API blip — the local-row check
      // above already passed, so fall through to it. But a degraded guard
      // must be visible: if this fires alongside checkout traffic, the
      // double-billing backstop is off.
      Sentry.captureException(error, {
        tags: { feature: "billing-checkout" },
        extra: { userId: user.id, guard: "stripe_subscriptions_list" },
      });
    }
  }

  const priceId = getPlanPriceId(parsed.data.planSlug, plan.stripe_price_id);
  if (!priceId) {
    console.error(`[billing] Missing Stripe price id for plan ${parsed.data.planSlug}`);
    // A missing price id blocks EVERY new checkout for this plan — that's
    // revenue = 0 with only a generic toast on the user side. Page on it.
    Sentry.captureMessage(`billing: missing Stripe price id for plan ${parsed.data.planSlug}`, {
      level: "error",
      tags: { feature: "billing-checkout" },
      extra: { planSlug: parsed.data.planSlug },
    });
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
    // A campaign coupon from the URL (e.g. the post-analysis ANALYZE20) takes
    // precedence over the standard annual coupon, and applies to monthly OR
    // annual. Both resolve to a Stripe coupon id we control.
    //
    // PRO TIER ONLY: every campaign coupon was priced against the $29.99 Pro
    // tier. Without this scope, a drip recipient carrying ?coupon=ANALYZE20
    // who clicked the Agent Pro card got 20% off $59.99 — and stacked the
    // discount onto the already-pre-discounted $590 annual. (2026-08-11 audit.)
    const offerCoupon = parsed.data.planSlug.startsWith("agent_pro")
      ? null
      : resolveOfferCouponId(parsed.data.offer);
    // STRIPE_ANNUAL_DISCOUNT_COUPON_ID exists for the Pro annual price only.
    // agent_pro_annual must be created in Stripe at its final (already
    // discounted) amount — stacking this coupon on it would double-discount.
    const annualCoupon =
      parsed.data.planSlug === "pro_annual" ? process.env.STRIPE_ANNUAL_DISCOUNT_COUPON_ID : undefined;
    const appliedCoupon = offerCoupon ?? annualCoupon;
    // Free Pro trial on new subscriptions. Card is collected at checkout and
    // auto-charges when the trial ends. Env-adjustable; PRO_TRIAL_DAYS=0 turns
    // trials off without a deploy. Default TRIAL_DAYS (14).
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
      // Land the new subscriber back on the calculator ("/") where their
      // auto-saved draft + welcome-back banner are waiting, so the first
      // post-purchase act is completing the save they paid for (previously
      // /profile — a name/avatar form with zero purchase acknowledgment).
      // The params drive the Google Ads purchase conversion AND the
      // "Pro unlocked" banner (components/marketing/billing-success-banner.tsx,
      // mounted on BOTH homepage variants). {CHECKOUT_SESSION_ID} is
      // substituted by Stripe and doubles as the conversion dedup key.
      // Signed-in "/" requests are rewritten to /home-authed by proxy.ts
      // (query string preserved), where the conversion value is resolved
      // server-side from the checkout session.
      success_url: `${siteUrl}/?billing=success&session_id={CHECKOUT_SESSION_ID}`,
      // Cancel lands back on /pricing at the plan cards (not /profile, a
      // name/avatar form that acknowledged nothing) — the page built to
      // re-handle whatever objection caused the bail. The param drives a
      // small "no charge was made" banner (checkout-cancelled-banner.tsx).
      cancel_url: `${siteUrl}/pricing?billing=checkout_cancelled#plans`,
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
      Sentry.captureMessage("billing: Stripe checkout session created without a URL", {
        level: "error",
        tags: { feature: "billing-checkout" },
        extra: { planSlug: parsed.data.planSlug, stripeSessionId: session.id },
      });
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
    // A checkout-create failure is a lost sale (e.g. env price id that
    // doesn't exist in the live Stripe account → 'No such price' on every
    // single new checkout). console.error goes nowhere in prod — page.
    Sentry.captureException(error, {
      tags: { feature: "billing-checkout" },
      extra: { userId: user.id, planSlug: parsed.data.planSlug },
    });
    return {
      ok: false,
      code: "SERVER_ERROR",
      message: "Unable to start checkout. Please try again.",
    };
  }
}

export type ProActiveResult =
  | { ok: true; active: boolean }
  | { ok: false; code: "SIGN_IN_REQUIRED" | "SERVER_ERROR"; message: string };

/**
 * Lightweight post-checkout status poll: "has the Stripe webhook landed my
 * subscription row yet?" BillingSuccessBanner calls this every ~2s (for up
 * to ~20s) after a billing=success landing and router.refresh()es the
 * moment it flips true, so the fresh subscriber's page stops treating them
 * as free without a manual reload.
 *
 * Read-only, and deliberately just a wrapper around the EXISTING
 * hasPaidPlanSubscription helper — no new status logic, no entitlement
 * writes, no Stripe calls. Callers must treat any non-ok result the same
 * as `active: false` (keep polling / fail open).
 */
export async function isProActiveAction(): Promise<ProActiveResult> {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { ok: false, code: "SIGN_IN_REQUIRED", message: "Please sign in to check your plan." };
    }

    const active = await hasPaidPlanSubscription(supabase, user.id);
    return { ok: true, active };
  } catch (error) {
    // Transient failure while the caller is polling — no Sentry page here
    // (hasPaidPlanSubscription already reports query failures itself).
    console.error("[billing] isProActiveAction failed:", error);
    return { ok: false, code: "SERVER_ERROR", message: "Unable to check subscription status." };
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

/**
 * Deep-link a plan SWITCH (monthly ↔ annual) straight to Stripe's
 * change-plan confirmation screen — NOT the generic billing-portal home.
 *
 * The old switch path routed through createBillingPortalSessionAction, which
 * opens the portal HOME: the user then had to hunt for the plan, and if the
 * portal wasn't configured for subscription updates it was a silent dead end
 * that still *looked* like success (we returned {ok:true,url} and redirected).
 * This action instead opens a `subscription_update_confirm` flow pre-filled
 * with the target price, so the user lands on the confirm-proration screen and
 * one click applies the switch. Mirrors the deep-link approach already used by
 * createCancelSubscriptionPortalSessionAction (subscription_cancel flow).
 *
 * Fails LOUD (discriminated-union code + message) at every step where we can't
 * build a correct switch — unknown target price, no live subscription, already
 * on the target plan, or Stripe rejecting the flow (e.g. the portal
 * Configuration doesn't have subscription_update enabled with both prices in
 * its product list). It NEVER silently drops to the generic portal in a way
 * that looks like a successful switch.
 *
 * Prerequisite Morgan owns: the Stripe Customer Portal Configuration must have
 * "Customers can switch plans" enabled and list BOTH the monthly and annual
 * products/prices under features.subscription_update.products — otherwise
 * Stripe returns an invalid_request_error here and the user sees the loud
 * error toast (correct) rather than a dead-end generic portal.
 */
export async function createSwitchPlanPortalSessionAction(input: unknown): Promise<BillingActionResult> {
  const parsed = switchPlanSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, code: "PLAN_NOT_FOUND", message: "Invalid target plan." };
  }
  const targetPlanSlug = parsed.data.targetPlanSlug;

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, code: "SIGN_IN_REQUIRED", message: "Please sign in to manage billing." };
  }

  // Resolve the target price BEFORE touching Stripe. A switch to a plan with
  // no configured price id can never succeed — fail loud here rather than
  // opening a flow that would error (or, worse, appear to work). Uses the
  // PRIMARY (current) price, same as checkout — never a grandfathered id.
  const targetPriceId = getPrimaryPlanPriceId(targetPlanSlug);
  if (!targetPriceId) {
    console.error(`[billing] Missing Stripe price id for switch target ${targetPlanSlug}`);
    Sentry.captureMessage(`billing: missing Stripe price id for switch target ${targetPlanSlug}`, {
      level: "error",
      tags: { feature: "billing-switch" },
      extra: { targetPlanSlug },
    });
    return {
      ok: false,
      code: "MISSING_PRICE",
      message: "That plan is temporarily unavailable. Please try again shortly.",
    };
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
        // Only a LIVE subscription can be switched. Match the same active set
        // getEntitlementsForUser treats as Pro (active/trialing/past_due) —
        // canceled/unpaid/paused have nothing to prorate.
        .select("stripe_subscription_id, plans(slug)")
        .eq("user_id", user.id)
        .in("status", ["active", "trialing", "past_due"])
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

  if (profileError || subscriptionError) {
    console.error("[billing] Failed to load switch prerequisites:", profileError ?? subscriptionError);
    return { ok: false, code: "SERVER_ERROR", message: "Unable to load billing details right now." };
  }

  if (!profile?.stripe_customer_id || !subscription?.stripe_subscription_id) {
    // No live subscription to switch — this is the checkout path, not a switch.
    // (The UI only shows "Switch" when a live plan exists, so this is the
    // stale-props / direct-call case.)
    return {
      ok: false,
      code: "MISSING_PRICE",
      message: "No active subscription to switch. Start a subscription first.",
    };
  }

  // Guard: already on the requested plan → nothing to prorate. Keeps parity
  // with the checkout ALREADY_SUBSCRIBED guard and stops a no-op portal open.
  const currentPlan = Array.isArray(subscription.plans)
    ? subscription.plans[0] ?? null
    : subscription.plans;
  if (currentPlan?.slug === targetPlanSlug) {
    return {
      ok: false,
      code: "ALREADY_SUBSCRIBED",
      message: "You're already on this plan.",
    };
  }

  try {
    const stripe = getStripe();
    // subscription_update_confirm needs the SUBSCRIPTION ITEM id, which only
    // Stripe has — the DB stores the subscription id, not its item id. A
    // single-item subscription is the only shape we sell.
    const stripeSubscription = await stripe.subscriptions.retrieve(subscription.stripe_subscription_id);
    const item = stripeSubscription.items.data[0];
    if (!item) {
      console.error(
        `[billing] Subscription ${subscription.stripe_subscription_id} has no items — cannot build switch flow`
      );
      Sentry.captureMessage("billing: switch target subscription has no items", {
        level: "error",
        tags: { feature: "billing-switch" },
        extra: { userId: user.id },
      });
      return { ok: false, code: "SERVER_ERROR", message: "Unable to switch plans right now." };
    }

    const siteUrl = getSiteUrl();
    const portal = await stripe.billingPortal.sessions.create({
      customer: profile.stripe_customer_id,
      return_url: `${siteUrl}/profile?billing=plan_switched#billing`,
      flow_data: {
        type: "subscription_update_confirm",
        subscription_update_confirm: {
          subscription: subscription.stripe_subscription_id,
          items: [{ id: item.id, price: targetPriceId, quantity: 1 }],
        },
        after_completion: {
          type: "redirect",
          redirect: {
            return_url: `${siteUrl}/profile?billing=plan_switched#billing`,
          },
        },
      },
    });
    return { ok: true, url: portal.url };
  } catch (error) {
    console.error("[billing] createSwitchPlanPortalSessionAction failed:", error);
    // A failure here is usually a portal Configuration that doesn't allow
    // subscription updates (or omits the target price from its product list).
    // Page on it — this blocks every plan switch — and surface a loud error
    // to the user rather than pretending the switch worked.
    Sentry.captureException(error, {
      tags: { feature: "billing-switch" },
      extra: { userId: user.id, targetPlanSlug },
    });
    return {
      ok: false,
      code: "SERVER_ERROR",
      message: "Unable to open the plan-switch flow right now.",
    };
  }
}
