"use server";

import { z } from "zod";
import * as Sentry from "@sentry/nextjs";
import type Stripe from "stripe";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { hasPaidPlanSubscription } from "@/lib/entitlements";
import { getStripe } from "@/lib/stripe/client";
import { withTrueCapCheckoutBranding } from "@/lib/stripe/checkout-branding";
import {
  getPrimaryPlanPriceId,
  isPaidPlanSlug,
  type PaidPlanSlug,
} from "@/lib/stripe/plan-prices";
import { verifyCheckoutReturnCandidate } from "@/lib/stripe/checkout-return";
import { captureServerEvent } from "@/lib/posthog-server";
import { TRIAL_DAYS } from "@/lib/trial";
import { resolvePostAnalysisOfferCoupon } from "@/lib/post-analysis-offer";
import { findEligiblePackCredit, getPackCreditCouponId } from "@/lib/pack-credit";
import {
  acquireSubscriptionCheckoutIntent,
  bindSubscriptionCheckoutCustomer,
  claimStaleSubscriptionCheckoutIntentForReplacement,
  completeSubscriptionCheckoutIntentFromWebhook,
  expireSubscriptionCheckoutIntentFromWebhook,
  failSubscriptionCheckoutIntent,
  isReusableSubscriptionCheckoutSession,
  markSubscriptionCheckoutIntentOpen,
  replaceStaleSubscriptionCheckoutIntent,
  subscriptionCheckoutIntentLeaseIsStale,
  subscriptionCheckoutIntentMatchesConfiguration,
  type SubscriptionCheckoutIntent,
} from "@/lib/stripe/subscription-checkout-intent";

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

const checkoutReturnSchema = z
  .object({
    sessionId: z.string().regex(/^cs_[a-zA-Z0-9_]{8,240}$/),
  })
  .strict();

export type BillingActionResult =
  | { ok: true; url: string }
  | {
      ok: false;
      code:
        | "SIGN_IN_REQUIRED"
        | "PLAN_NOT_FOUND"
        | "MISSING_PRICE"
        | "ALREADY_SUBSCRIBED"
        | "CHECKOUT_IN_PROGRESS"
        | "SERVER_ERROR";
      message: string;
    };

function getSiteUrl(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");
}

function buildSubscriptionCheckoutSessionParams(args: {
  intent: SubscriptionCheckoutIntent;
  customerId: string;
  siteUrl: string;
}): Stripe.Checkout.SessionCreateParams {
  const { intent, customerId, siteUrl } = args;
  return withTrueCapCheckoutBranding({
    mode: "subscription",
    customer: customerId,
    client_reference_id: intent.user_id,
    expand: ["line_items.data.price", "discounts.coupon"],
    line_items: [
      {
        price: intent.stripe_price_id,
        quantity: 1,
      },
    ],
    discounts: intent.stripe_discount_coupon_id
      ? [{ coupon: intent.stripe_discount_coupon_id }]
      : undefined,
    allow_promotion_codes: intent.stripe_discount_coupon_id ? undefined : true,
    success_url: `${siteUrl}/dashboard/new?billing=success&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${siteUrl}/pricing?billing=checkout_cancelled#plans`,
    metadata: {
      checkout_intent_id: intent.id,
      checkout_price_id: intent.stripe_price_id,
      checkout_discount_coupon_id: intent.stripe_discount_coupon_id ?? "none",
      checkout_trial_days: String(intent.trial_days),
      user_id: intent.user_id,
      plan_slug: intent.plan_slug,
      trial_granted: String(intent.trial_days > 0),
      ...(intent.pack_credit_claim_id
        ? { pack_credit_claim_id: intent.pack_credit_claim_id }
        : {}),
    },
    subscription_data: {
      metadata: {
        user_id: intent.user_id,
        plan_slug: intent.plan_slug,
      },
      ...(intent.trial_days > 0 ? { trial_period_days: intent.trial_days } : {}),
    },
  });
}

function isDefinitiveStripeSessionRejection(error: unknown): boolean {
  // A missing Customer/Price/Coupon is rejected before Stripe creates a
  // Session. Ambiguous transport/API failures and idempotency mismatches must
  // stay fail-closed because the original request may have succeeded.
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: unknown }).code === "resource_missing"
  );
}

function getPlanPriceId(planSlug: PaidPlanSlug, dbPriceId?: string | null): string | null {
  // Checkout sells the PRIMARY (first) configured price; the env may list
  // additional grandfathered prices after it (see lib/stripe/plan-prices),
  // which are for webhook resolution only, never for new checkouts.
  return getPrimaryPlanPriceId(planSlug) ?? dbPriceId ?? null;
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
  intentId: string;
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

  const customer = await stripe.customers.create(
    {
      // Keep the idempotent CREATE payload immutable for the lifetime of the
      // intent. Email/name can change while a stale lease is being recovered;
      // including them here would make Stripe reject the replay as a parameter
      // mismatch and recreate the permanent lock the ledger is meant to heal.
      metadata: {
        user_id: args.userId,
      },
    },
    {
      // A timeout after Stripe accepted customer creation is ambiguous. The
      // durable intent key makes a retry return that same Customer instead of
      // minting a second, orphaned billing identity.
      idempotencyKey: `truecap-subscription-customer:${args.intentId}`,
    }
  );

  // Enrichment cannot duplicate a Customer, so it does not share the durable
  // CREATE idempotency key. A failure is retryable: replaying CREATE returns
  // the same Customer, then this update is attempted again with current data.
  if (args.email || args.name) {
    await stripe.customers.update(customer.id, {
      email: args.email ?? undefined,
      name: args.name,
    });
  }

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
  const { data: existingSubscription, error: existingSubscriptionError } = await supabase
    .from("subscriptions")
    .select("id")
    .eq("user_id", user.id)
    .in("status", ["active", "trialing", "past_due", "unpaid", "paused"])
    .limit(1)
    .maybeSingle();
  if (existingSubscriptionError) {
    Sentry.captureException(existingSubscriptionError, {
      tags: { feature: "billing-checkout", guard: "local-subscription" },
      extra: { userId: user.id },
    });
    return {
      ok: false,
      code: "SERVER_ERROR",
      message: "We couldn't safely verify your billing status. Please try again shortly.",
    };
  }
  if (existingSubscription) {
    return {
      ok: false,
      code: "ALREADY_SUBSCRIBED",
      message:
        "You already have a TrueCap subscription. Use Manage billing to switch plans or restore billing safely.",
    };
  }

  // Repeat-trial guard: the free trial is a FIRST-time offer. A returning user
  // who ever subscribed before (any status, incl. canceled/incomplete) does NOT
  // get it again — otherwise cancel-and-resubscribe farms a fresh trial each
  // cycle. Only grant the trial when there's no prior subscription row at all.
  const { data: priorSubscription, error: priorSubscriptionError } = await supabase
    .from("subscriptions")
    .select("id")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();
  if (priorSubscriptionError) {
    Sentry.captureException(priorSubscriptionError, {
      tags: { feature: "billing-checkout", guard: "trial-history" },
      extra: { userId: user.id },
    });
    return {
      ok: false,
      code: "SERVER_ERROR",
      message: "We couldn't safely verify trial eligibility. Please try again shortly.",
    };
  }
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
        ["active", "trialing", "past_due", "unpaid", "paused"].includes(sub.status)
      );
      if (hasLiveStripeSubscription) {
        return {
          ok: false,
          code: "ALREADY_SUBSCRIBED",
          message:
            "You already have a TrueCap subscription. Use Manage billing to switch plans or restore billing safely.",
        };
      }
    } catch (error) {
      // Fail closed: if Stripe cannot confirm that the customer has no live,
      // unpaid, or paused subscription, creating a checkout could double-bill
      // them. A retryable error is safer than a parallel subscription.
      Sentry.captureException(error, {
        tags: { feature: "billing-checkout" },
        extra: { userId: user.id, guard: "stripe_subscriptions_list" },
      });
      return {
        ok: false,
        code: "SERVER_ERROR",
        message: "We couldn't safely verify your Stripe subscriptions. Please try again shortly.",
      };
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

  // Campaign links must fail CLOSED. A recognized code with a missing Stripe
  // coupon is a discount we cannot honor; creating a full-price session would
  // charge more than the email promised.
  const offerResolution = parsed.data.planSlug.startsWith("agent_pro")
    ? ({ kind: "none" } as const)
    : resolvePostAnalysisOfferCoupon(parsed.data.offer);
  if (offerResolution.kind === "misconfigured") {
    Sentry.captureMessage(
      `offer coupon '${offerResolution.code}' has no configured Stripe coupon id`,
      {
        level: "error",
        tags: { feature: "billing-offer-coupon" },
      }
    );
    return {
      ok: false,
      code: "SERVER_ERROR",
      message: "This promotional offer is temporarily unavailable. Please try again later.",
    };
  }

  try {
    const admin = createAdminSupabaseClient();
    const stripe = getStripe();
    // A campaign coupon from the URL (e.g. the post-analysis ANALYZE20) takes
    // precedence over the standard annual coupon, and applies to monthly OR
    // annual. Both resolve to a Stripe coupon id we control.
    //
    // PRO TIER ONLY: every campaign coupon was priced against the $29.99 Pro
    // tier. Without this scope, a drip recipient carrying ?coupon=ANALYZE20
    // who clicked the Agent Pro card got 20% off $59.99 — and stacked the
    // discount onto the already-pre-discounted $590 annual. (2026-08-11 audit.)
    const offerCoupon =
      offerResolution.kind === "configured" ? offerResolution.couponId : null;
    // STRIPE_ANNUAL_DISCOUNT_COUPON_ID exists for the Pro annual price only.
    // agent_pro_annual must be created in Stripe at its final (already
    // discounted) amount — stacking this coupon on it would double-discount.
    const annualCoupon =
      parsed.data.planSlug === "pro_annual" ? process.env.STRIPE_ANNUAL_DISCOUNT_COUPON_ID : undefined;
    // Pack credit (founder-approved 2026-08-17): a Deal Decision Pack bought
    // within its 7-day window is credited toward the first Pro invoice. It is
    // money the customer already paid us — NOT a discount offer — so it
    // outranks the campaign and annual coupons in the single discount slot
    // Stripe checkout accepts. Pro tiers only (same scoping as the campaign
    // coupons); fail-closed on STRIPE_PACK_CREDIT_COUPON_ID; a lookup failure
    // degrades to a normal full-price checkout rather than blocking it.
    // With a trial the coupon lands on the first REAL invoice — the credit is
    // attached at redemption and survives the trial delay.
    let packCredit = null;
    const packCreditCouponId = getPackCreditCouponId();
    if (packCreditCouponId && !parsed.data.planSlug.startsWith("agent_pro")) {
      try {
        packCredit = await findEligiblePackCredit(admin, user.id, new Date(), stripe);
      } catch (error) {
        Sentry.captureException(error, {
          tags: { feature: "billing-checkout", flow: "pack_credit_lookup" },
          extra: { userId: user.id },
        });
      }
    }
    const creditCoupon = packCredit ? packCreditCouponId : null;
    const appliedCoupon = creditCoupon ?? offerCoupon ?? annualCoupon;
    // Free trial on eligible first subscriptions. Card is collected at
    // checkout and auto-charges when the trial ends. The duration is the same
    // imported constant every public surface renders; a hidden environment
    // override previously allowed checkout and the offer to contradict each
    // other.
    const proTrialDays = TRIAL_DAYS;
    let checkoutProfileCustomerId = profile?.stripe_customer_id ?? null;
    const acquireInput = {
      userId: user.id,
      planSlug: parsed.data.planSlug,
      stripePriceId: priceId,
      stripeDiscountCouponId: appliedCoupon ?? null,
      trialDays: grantTrial && proTrialDays > 0 ? proTrialDays : 0,
      packCreditClaimId: packCredit?.claimId ?? null,
    };
    let acquisition = await acquireSubscriptionCheckoutIntent(admin, acquireInput);
    const requestedCheckoutConfiguration = {
      planSlug: acquireInput.planSlug,
      stripePriceId: acquireInput.stripePriceId,
      stripeDiscountCouponId: acquireInput.stripeDiscountCouponId,
      trialDays: acquireInput.trialDays,
      packCreditClaimId: acquireInput.packCreditClaimId,
    };

    const siteUrl = getSiteUrl();
    // A completed/expired Stripe Session can race its webhook. Resolve Stripe
    // truth before deciding whether an existing ledger row is reusable. A
    // stale creator with changed terms is also reconciled here: if a Customer
    // was already bound, replaying the OLD idempotency key converges any
    // ambiguous/resumed worker on one old Session before that intent is
    // retired. Without this fence, replacing the DB row could orphan a late
    // old Session and allow two parallel subscription checkouts.
    for (let attempt = 0; !acquisition.acquired && attempt < 3; attempt += 1) {
      let existingIntent = acquisition.intent;
      const configurationMatches = subscriptionCheckoutIntentMatchesConfiguration(
        existingIntent,
        requestedCheckoutConfiguration
      );
      if (!configurationMatches && existingIntent.status === "creating") {
        if (!subscriptionCheckoutIntentLeaseIsStale(existingIntent)) {
          return {
            ok: false,
            code: "CHECKOUT_IN_PROGRESS",
            message:
              "Another checkout with different pricing or trial terms is already being prepared. Please try again in a moment.",
          };
        }

        const reconciliationClaim =
          await claimStaleSubscriptionCheckoutIntentForReplacement(admin, existingIntent);
        if (!reconciliationClaim.acquired) {
          acquisition = reconciliationClaim;
          continue;
        }
        existingIntent = reconciliationClaim.intent;

        // Converge Customer creation too. A stale worker may be paused after
        // Stripe accepted the Customer request but before it bound the row;
        // replacing a null-customer intent immediately would let that worker
        // overwrite profiles with an orphan Customer after the successor won.
        if (!existingIntent.stripe_customer_id) {
          const recoveredCustomerId = await getOrCreateStripeCustomer({
            intentId: existingIntent.id,
            userId: existingIntent.user_id,
            email: user.email ?? null,
            name: getDisplayName(profile),
            existingCustomerId: checkoutProfileCustomerId,
          });
          checkoutProfileCustomerId = recoveredCustomerId;
          existingIntent = await bindSubscriptionCheckoutCustomer(
            admin,
            existingIntent.id,
            recoveredCustomerId
          );
        }

        let safeToReplace = false;
        let replacementStripeCustomerId = existingIntent.stripe_customer_id;
        if (existingIntent.stripe_customer_id) {
          let staleSession: Stripe.Checkout.Session | undefined;
          try {
            staleSession = await stripe.checkout.sessions.create(
              buildSubscriptionCheckoutSessionParams({
                intent: existingIntent,
                customerId: existingIntent.stripe_customer_id,
                siteUrl,
              }),
              { idempotencyKey: `truecap-subscription-checkout:${existingIntent.id}` }
            );
          } catch (error) {
            if (!isDefinitiveStripeSessionRejection(error)) throw error;
            // Determine whether the missing resource was the Customer itself
            // or the old Price/Coupon. Preserve a proven-live Customer; clear
            // a missing/deleted one so the successor can bind a replacement.
            // Any ambiguous Customer read remains fail-closed.
            try {
              const staleCustomer = await stripe.customers.retrieve(
                existingIntent.stripe_customer_id
              );
              replacementStripeCustomerId =
                "deleted" in staleCustomer && staleCustomer.deleted
                  ? null
                  : staleCustomer.id;
            } catch (customerError) {
              if (!isDefinitiveStripeSessionRejection(customerError)) throw customerError;
              replacementStripeCustomerId = null;
            }
            // Stripe definitively rejected before creating a Session, so the
            // old intent may now be retired with the classified Customer.
            safeToReplace = true;
          }

          if (staleSession?.status === "open") {
            if (!isReusableSubscriptionCheckoutSession({
              session: staleSession,
              intent: existingIntent,
            })) {
              throw new Error("stale checkout-intent Session failed exact binding");
            }
            try {
              staleSession = await stripe.checkout.sessions.expire(staleSession.id);
            } catch (expireError) {
              // Completion may win the expire request. Retrieve Stripe truth;
              // any other error/status remains fail-closed.
              const currentSession = await stripe.checkout.sessions.retrieve(staleSession.id);
              if (currentSession.status === "open") throw expireError;
              staleSession = currentSession;
            }
          }
          if (staleSession?.status === "complete") {
            await completeSubscriptionCheckoutIntentFromWebhook(admin, staleSession);
            return {
              ok: false,
              code: "ALREADY_SUBSCRIBED",
              message: "This checkout is already complete. Your subscription is being activated.",
            };
          }
          if (staleSession?.status === "expired") {
            await expireSubscriptionCheckoutIntentFromWebhook(admin, staleSession);
            acquisition = await acquireSubscriptionCheckoutIntent(admin, acquireInput);
            continue;
          }
        }

        if (safeToReplace) {
          acquisition = await replaceStaleSubscriptionCheckoutIntent(admin, {
            ...acquireInput,
            staleIntent: existingIntent,
            replacementStripeCustomerId,
          });
          continue;
        }
        throw new Error("stale checkout-intent could not be reconciled");
      }
      if (!configurationMatches) {
        return {
          ok: false,
          code: "CHECKOUT_IN_PROGRESS",
          message:
            "Another checkout with different pricing or trial terms is already open. Finish or let it expire before starting this offer.",
        };
      }
      if (existingIntent.status === "creating") {
        return {
          ok: false,
          code: "CHECKOUT_IN_PROGRESS",
          message: "Your secure checkout is already being prepared. Please try again in a moment.",
        };
      }
      if (!existingIntent.stripe_checkout_session_id) {
        throw new Error("open checkout-intent is missing its Stripe Session id");
      }

      const existingSession = await stripe.checkout.sessions.retrieve(
        existingIntent.stripe_checkout_session_id,
        { expand: ["line_items.data.price", "discounts.coupon"] }
      );
      if (isReusableSubscriptionCheckoutSession({ session: existingSession, intent: existingIntent })) {
        return { ok: true, url: existingSession.url! };
      }
      if (existingSession.status === "complete") {
        await completeSubscriptionCheckoutIntentFromWebhook(admin, existingSession);
        return {
          ok: false,
          code: "ALREADY_SUBSCRIBED",
          message: "This checkout is already complete. Your subscription is being activated.",
        };
      }
      if (existingSession.status === "expired") {
        await expireSubscriptionCheckoutIntentFromWebhook(admin, existingSession);
        acquisition = await acquireSubscriptionCheckoutIntent(admin, acquireInput);
        continue;
      }

      Sentry.captureMessage("billing: existing Checkout Session failed intent binding", {
        level: "error",
        tags: { feature: "billing-checkout", guard: "open-session-binding" },
        extra: { intentId: existingIntent.id, stripeSessionId: existingSession.id },
      });
      return {
        ok: false,
        code: "SERVER_ERROR",
        message: "We couldn't safely resume your existing checkout. Please contact support.",
      };
    }

    if (!acquisition.acquired) {
      return {
        ok: false,
        code: "CHECKOUT_IN_PROGRESS",
        message: "Your secure checkout is already being prepared. Please try again in a moment.",
      };
    }

    let intent: SubscriptionCheckoutIntent = acquisition.intent;
    if (!subscriptionCheckoutIntentMatchesConfiguration(intent, requestedCheckoutConfiguration)) {
      return {
        ok: false,
        code: "CHECKOUT_IN_PROGRESS",
        message:
          "Another checkout with different pricing or trial terms is already open. Finish or let it expire before starting this offer.",
      };
    }
    if (
      intent.stripe_customer_id &&
      checkoutProfileCustomerId &&
      intent.stripe_customer_id !== checkoutProfileCustomerId
    ) {
      throw new Error("checkout-intent customer disagrees with the user profile");
    }
    const customerId = await getOrCreateStripeCustomer({
      intentId: intent.id,
      userId: user.id,
      email: user.email ?? null,
      name: getDisplayName(profile),
      existingCustomerId: intent.stripe_customer_id ?? checkoutProfileCustomerId,
    });
    intent = await bindSubscriptionCheckoutCustomer(admin, intent.id, customerId);

    // Recheck immediately before creating a Session. This closes the race
    // where a legacy/open Checkout completes after the earlier guard but
    // before this request becomes the sole intent leader.
    const stripeSubs = await stripe.subscriptions.list({
      customer: customerId,
      status: "all",
      limit: 10,
    });
    if (
      stripeSubs.data.some((sub) =>
        ["active", "trialing", "past_due", "unpaid", "paused"].includes(sub.status)
      )
    ) {
      await failSubscriptionCheckoutIntent(admin, intent.id);
      return {
        ok: false,
        code: "ALREADY_SUBSCRIBED",
        message:
          "You already have a TrueCap subscription. Use Manage billing to switch plans or restore billing safely.",
      };
    }

    // Recover an open Session from an ambiguous prior response. Returning its
    // URL is safe only with exact actual Price/discount plus immutable
    // user/plan/trial/Pack bindings. A pre-ledger or otherwise unverifiable
    // Session blocks creation rather than risking a wrong offer or duplicate.
    const recentSessions = await stripe.checkout.sessions.list({
      customer: customerId,
      limit: 100,
      // Hosted Sessions expire within 24 hours. Include a small clock-skew
      // buffer so a pre-ledger Session that completed between the two Stripe
      // guards cannot disappear from the `status=open` result and race a new
      // subscription into existence.
      created: { gte: Math.floor(Date.now() / 1000) - 26 * 60 * 60 },
      expand: ["data.line_items.data.price", "data.discounts.coupon"],
    });
    for (const recentSession of recentSessions.data.filter(
      (candidate) => candidate.mode === "subscription"
    )) {
      if (recentSession.status === "open" &&
        isReusableSubscriptionCheckoutSession({
          session: recentSession,
          intent,
        })
      ) {
        intent = await markSubscriptionCheckoutIntentOpen(admin, intent.id, recentSession);
        return { ok: true, url: recentSession.url! };
      }
      if (recentSession.status === "complete") {
        if (recentSession.metadata?.checkout_intent_id === intent.id) {
          await completeSubscriptionCheckoutIntentFromWebhook(admin, recentSession);
        } else {
          await failSubscriptionCheckoutIntent(admin, intent.id);
        }
        return {
          ok: false,
          code: "ALREADY_SUBSCRIBED",
          message: "A recent checkout is already complete. Your subscription is being activated.",
        };
      }
      if (recentSession.status === "expired") {
        if (recentSession.metadata?.checkout_intent_id === intent.id) {
          await expireSubscriptionCheckoutIntentFromWebhook(admin, recentSession);
          return {
            ok: false,
            code: "CHECKOUT_IN_PROGRESS",
            message: "Your prior checkout just expired. Please try once more to start a fresh one.",
          };
        }
        continue;
      }

      Sentry.captureMessage("billing: another open subscription Checkout Session blocked creation", {
        level: "warning",
        tags: { feature: "billing-checkout", guard: "open-session-list" },
        extra: { intentId: intent.id, stripeSessionId: recentSession.id },
      });
      return {
        ok: false,
        code: "CHECKOUT_IN_PROGRESS",
        message:
          "Another subscription checkout is already open. Finish that checkout or wait for it to expire before starting another.",
      };
    }

    const session = await stripe.checkout.sessions.create(
      buildSubscriptionCheckoutSessionParams({ intent, customerId, siteUrl }),
      {
        // Stable for this durable intent only. An ambiguous retry returns the
        // same hosted Session; a later legitimate subscription gets a new
        // intent id and therefore a new key.
        idempotencyKey: `truecap-subscription-checkout:${intent.id}`,
      }
    );

    if (!isReusableSubscriptionCheckoutSession({ session, intent })) {
      Sentry.captureMessage("billing: created Checkout Session failed intent binding", {
        level: "error",
        tags: { feature: "billing-checkout", guard: "created-session-binding" },
        extra: { intentId: intent.id, stripeSessionId: session.id },
      });
      return {
        ok: false,
        code: "SERVER_ERROR",
        message: "We couldn't safely verify the new checkout. Please contact support.",
      };
    }
    await markSubscriptionCheckoutIntentOpen(admin, intent.id, session);

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
      },
    });
    await captureServerEvent({
      distinctId: user.id,
      event: "checkout_started",
      properties: {
        plan_slug: parsed.data.planSlug,
      },
    });
    await captureServerEvent({
      distinctId: user.id,
      event: "subscription_checkout_started",
      properties: {
        plan: parsed.data.planSlug,
        interval: parsed.data.planSlug.endsWith("_annual") ? "annual" : "monthly",
      },
    });
    if (parsed.data.planSlug.startsWith("agent_pro")) {
      await captureServerEvent({
        distinctId: user.id,
        event: "agent_pro_checkout_started",
        properties: {
          plan_slug: parsed.data.planSlug,
        },
      });
    }

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

export type CheckoutReturnVerificationResult =
  | {
      ok: true;
      purchasedPlanSlug: PaidPlanSlug;
      conversionValue?: number;
    }
  | {
      ok: false;
      code: "SIGN_IN_REQUIRED" | "INVALID_RETURN" | "SERVER_ERROR";
      message: string;
    };

/**
 * Verify the attacker-controlled success URL before any banner, conversion,
 * analytics event, or entitlement poll runs in the browser. It never creates,
 * mutates, or charges anything in Stripe. After full verification it may close
 * the server-only intent ledger, which heals a Session whose completion event
 * was processed by an older webhook instance during a rolling deployment.
 */
export async function verifyCheckoutReturnAction(
  input: unknown
): Promise<CheckoutReturnVerificationResult> {
  const parsed = checkoutReturnSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      code: "INVALID_RETURN",
      message: "This checkout return could not be verified.",
    };
  }

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return {
      ok: false,
      code: "SIGN_IN_REQUIRED",
      message: "Sign in to verify this checkout return.",
    };
  }

  try {
    const stripe = getStripe();
    const session = await stripe.checkout.sessions.retrieve(parsed.data.sessionId, {
      expand: ["line_items"],
    });
    const metadataPlanSlug = session.metadata?.plan_slug ?? null;
    if (!isPaidPlanSlug(metadataPlanSlug)) {
      return {
        ok: false,
        code: "INVALID_RETURN",
        message: "This checkout return could not be verified.",
      };
    }

    const { data: plan, error: planError } = await supabase
      .from("plans")
      .select("stripe_price_id")
      .eq("slug", metadataPlanSlug)
      .eq("is_active", true)
      .maybeSingle();
    if (planError) throw planError;

    const expectedPriceId = getPlanPriceId(metadataPlanSlug, plan?.stripe_price_id);
    if (!expectedPriceId) {
      Sentry.captureMessage("billing: checkout return plan has no current Price", {
        level: "error",
        tags: { feature: "billing-checkout-return" },
        extra: { planSlug: metadataPlanSlug },
      });
      return {
        ok: false,
        code: "SERVER_ERROR",
        message: "Checkout verification is temporarily unavailable.",
      };
    }

    const purchasedPrice = session.line_items?.data[0]?.price;
    const verified = verifyCheckoutReturnCandidate({
      candidate: {
        mode: session.mode,
        status: session.status,
        clientReferenceId: session.client_reference_id,
        metadataUserId: session.metadata?.user_id ?? null,
        metadataPlanSlug,
        priceId: purchasedPrice?.id ?? null,
        unitAmount: purchasedPrice?.unit_amount ?? null,
        currency: purchasedPrice?.currency ?? null,
        createdAtSeconds: session.created,
        hasSubscription: Boolean(session.subscription),
      },
      expectedUserId: user.id,
      expectedPriceId,
    });
    if (!verified) {
      return {
        ok: false,
        code: "INVALID_RETURN",
        message: "This checkout return could not be verified.",
      };
    }

    // Reverse rolling-deploy compatibility: a new checkout action can create
    // an intent-stamped Session while an old webhook instance is still
    // draining. The old handler activates billing but cannot close the new
    // ledger. The authenticated, fully verified success return is a second
    // idempotent closure path; the current webhook can still apply Pack credit.
    await completeSubscriptionCheckoutIntentFromWebhook(
      createAdminSupabaseClient(),
      session
    );

    return { ok: true, ...verified };
  } catch (error) {
    Sentry.captureException(error, {
      tags: { feature: "billing-checkout-return" },
      extra: { userId: user.id },
    });
    return {
      ok: false,
      code: "SERVER_ERROR",
      message: "Checkout verification is temporarily unavailable.",
    };
  }
}

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
