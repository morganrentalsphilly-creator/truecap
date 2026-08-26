import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { BillingConversionTracker } from "@/components/marketing/billing-conversion-tracker";
import { BillingPanel } from "@/components/profile/billing-panel";
import { ProfileForm } from "@/components/profile/profile-form";
import { featuresForTier } from "@/lib/entitlements-catalog";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import {
  loadStripeDisplayPriceById,
  type StripeDisplayPriceDetails,
} from "@/lib/stripe/display-prices";
import {
  getPrimaryPlanPriceId,
  isAgentProConfigured,
  isPaidPlanSlug,
  PAID_PLAN_SLUGS,
  planSlugFromPriceId,
  type PaidPlanSlug,
} from "@/lib/stripe/plan-prices";

export const metadata: Metadata = {
  title: "Profile & Billing",
  description: "Manage your TrueCap profile, subscription, and billing details.",
  alternates: { canonical: "/profile" },
  robots: { index: false, follow: false },
};

type PlanRow = {
  slug: string;
  stripe_price_id: string | null;
};

type StripePriceDisplay = StripeDisplayPriceDetails | null;

type SubscriptionRow = {
  status: string;
  stripe_subscription_id: string | null;
  stripe_price_id: string | null;
  current_period_start: string | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  plans:
    | {
        slug: string | null;
      }
    | {
        slug: string | null;
      }[]
    | null;
};

function formatPrice(planSlug: PaidPlanSlug, stripePrice?: StripePriceDisplay): string {
  if (stripePrice) return stripePrice.amountLabel;
  if (planSlug === "pro_annual") return "17% off";
  if (planSlug.startsWith("agent_pro")) return "Agent Pro";
  return "Pro";
}

function getPlanPriceId(planSlug: PaidPlanSlug, dbPriceId?: string | null): string | undefined {
  // Primary (first) configured price — mirrors billing.ts getPlanPriceId.
  // Additional comma-listed prices are grandfathered ids for webhook
  // resolution only (see lib/stripe/plan-prices).
  return getPrimaryPlanPriceId(planSlug) ?? dbPriceId ?? undefined;
}

async function getStripePriceDisplays(
  plans: PlanRow[] | null
): Promise<Record<PaidPlanSlug, StripePriceDisplay>> {
  const entries = await Promise.all(
    PAID_PLAN_SLUGS.map(async (slug) => {
      const dbPriceId = plans?.find((plan) => plan.slug === slug)?.stripe_price_id ?? null;
      const priceId = getPlanPriceId(slug, dbPriceId);
      if (!priceId) return [slug, null] as const;
      const display = await loadStripeDisplayPriceById(
        priceId,
        slug.endsWith("_annual") ? "year" : "month",
        slug
      );
      return [slug, display] as const;
    })
  );

  return Object.fromEntries(entries) as Record<PaidPlanSlug, StripePriceDisplay>;
}

function getPlanTitle(slug: PaidPlanSlug): string {
  switch (slug) {
    case "pro_annual":
      return "Pro Annual";
    case "agent_pro_monthly":
      return "Agent Pro Monthly";
    case "agent_pro_annual":
      return "Agent Pro Annual";
    default:
      return "Pro Monthly";
  }
}

function getPlanObject(sub: SubscriptionRow | null): { slug: string | null } | null {
  if (!sub?.plans) return null;
  return Array.isArray(sub.plans) ? sub.plans[0] ?? null : sub.plans;
}

export default async function ProfilePage({
  searchParams,
}: {
  searchParams?: Promise<{ billing?: string }>;
}) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const [profileResult, subscriptionsResult, plansResult] = await Promise.all([
    supabase
      .from("profiles")
      .select("first_name, last_name, display_name, avatar_url")
      .eq("id", user.id)
      .maybeSingle(),
    supabase
      .from("subscriptions")
      .select("status, stripe_subscription_id, stripe_price_id, current_period_start, current_period_end, cancel_at_period_end, plans(slug)")
      .eq("user_id", user.id)
      // Keep inactive history available for honest actual-rate display while
      // still preferring any recoverable/live subscription below.
      .in("status", ["active", "trialing", "past_due", "unpaid", "paused", "canceled"])
      .order("updated_at", { ascending: false })
      .limit(10),
    supabase
      .from("plans")
      .select("slug, stripe_price_id")
      .in("slug", ["pro_monthly", "pro_annual", "agent_pro_monthly", "agent_pro_annual"])
      .eq("is_active", true)
      .order("slug", { ascending: true }),
  ]);
  const { data: profile, error: profileError } = profileResult;
  const { data: subscriptionRows, error: subscriptionsError } = subscriptionsResult;
  const { data: planRows, error: plansError } = plansResult;

  if (profileError || subscriptionsError || plansError) {
    return (
      <main id="main" className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6">
        <div role="alert" className="rounded-2xl border border-destructive/30 bg-destructive/5 p-6">
          <h1 className="text-xl font-bold text-foreground">Couldn&apos;t load profile and billing</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            TrueCap could not verify your account or subscription right now, so it will not show a Free plan or missing profile by mistake.
          </p>
          <Link
            href="/profile"
            className="mt-4 inline-flex min-h-11 items-center rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground"
          >
            Try again
          </Link>
        </div>
      </main>
    );
  }
  const subscriptions = (subscriptionRows as SubscriptionRow[] | null) ?? [];
  const actionableStatuses = new Set(["active", "trialing", "past_due", "unpaid", "paused"]);
  const subscription =
    subscriptions.find((row) => actionableStatuses.has(row.status)) ?? subscriptions[0] ?? null;
  const subscriptionRow = (subscription as SubscriptionRow | null) ?? null;
  const currentPlan = getPlanObject(subscriptionRow);
  const subscribedPlanSlug = isPaidPlanSlug(currentPlan?.slug)
    ? currentPlan.slug
    : planSlugFromPriceId(subscriptionRow?.stripe_price_id);
  const [stripePriceDisplays, subscribedPriceDisplay] = await Promise.all([
    getStripePriceDisplays((planRows as PlanRow[] | null) ?? null),
    loadStripeDisplayPriceById(
      subscriptionRow?.stripe_price_id,
      subscribedPlanSlug?.endsWith("_annual") ? "year" : "month",
      "current_subscription"
    ),
  ]);
  const fallbackName =
    (user.user_metadata?.full_name as string | undefined)?.trim() ||
    (user.user_metadata?.name as string | undefined)?.trim() ||
    user.email?.split("@")[0] ||
    "Account";

  const firstName = profile?.first_name ?? fallbackName.split(" ")[0] ?? "";
  const lastName = profile?.last_name ?? fallbackName.split(" ").slice(1).join(" ");
  const resolvedSearchParams = (await searchParams) ?? {};
  const isSubscriptionCancelReturn = resolvedSearchParams.billing === "subscription_cancelled";
  const availablePlanSlugs = new Set(
    ((planRows as PlanRow[] | null) ?? [])
      .map((plan) => plan.slug)
      .filter((slug): slug is PaidPlanSlug => (PAID_PLAN_SLUGS as readonly string[]).includes(slug))
  );
  const agentProOnlyMarketableFeatures = [
    "Everything in Pro",
    ...featuresForTier("agent_pro")
      .filter((feature) => !feature.tiers.includes("pro") && feature.shipped !== false)
      .map((feature) => feature.label),
  ];
  const billingPlans = PAID_PLAN_SLUGS
    .filter((slug) => availablePlanSlugs.size === 0 || availablePlanSlugs.has(slug))
    // Agent Pro needs BOTH its plan row (migration) and a configured price:
    // showing a switch target checkout would reject just invites a dead end.
    .filter((slug) => !slug.startsWith("agent_pro") || (isAgentProConfigured() && availablePlanSlugs.has(slug)))
    .map((slug) => ({
      slug,
      title: getPlanTitle(slug),
      intervalLabel: stripePriceDisplays[slug]?.period ?? (slug.endsWith("_annual") ? "year" : "month"),
      priceLabel: formatPrice(slug, stripePriceDisplays[slug]),
      badge: slug === "pro_annual" ? "17% off" : undefined,
      description: slug.startsWith("agent_pro")
        ? slug.endsWith("_annual")
          ? "Give every buyer separate criteria and keep their deals organized, billed yearly."
          : "Give every buyer separate criteria and keep their deals organized, billed monthly."
        : slug === "pro_annual"
          ? "Full Pro access billed yearly."
          : "Full Pro access billed monthly.",
      features: slug.startsWith("agent_pro")
        ? agentProOnlyMarketableFeatures
        : [
            "Save and compare deals",
            "10-year projections",
            "Illustrative tax impact and modeled exit comparisons",
            "Professional PDF exports",
          ],
    }));

  // Pull the matching plan price so the Google Ads conversion event
  // carries a meaningful value for value-based bidding strategies.
  const justSubscribedSlug = (subscriptionRow?.status === "active" || subscriptionRow?.status === "trialing")
    ? (subscribedPlanSlug ?? undefined)
    : undefined;
  const subscriptionValue = justSubscribedSlug
    ? (() => {
        const display = stripePriceDisplays[justSubscribedSlug];
        if (!display) return undefined;
        return display.unitAmount;
      })()
    : undefined;

  return (
    <>
      {/* Fires the Google Ads paid-subscription conversion event when the
          user lands here from a Stripe checkout success redirect. */}
      <BillingConversionTracker
        billingStatus={resolvedSearchParams.billing}
        value={subscriptionValue}
        transactionId={subscriptionRow?.stripe_subscription_id ?? undefined}
      />
      <main id="main" className="max-w-5xl mx-auto px-4 sm:px-6 py-5  space-y-10">
        <ProfileForm
          userId={user.id}
          initialEmail={user.email ?? ""}
          initialFirstName={firstName}
          initialLastName={lastName}
          initialAvatarUrl={profile?.avatar_url}
        />
        {/* id="billing" — anchor target for /profile#billing deep links
            from the analyzer's upgrade CTA, dashboard subscription manager,
            saved-analyses paywall, and pricing-plan-buttons. Without this
            anchor the fragment was a no-op — users landed at the top of
            profile instead of the billing card. scroll-mt-24 keeps the
            target below the sticky header. */}
        <div id="billing" className="scroll-mt-24" />
        <BillingPanel
          currentSubscription={
            subscription
              ? {
                  status: String(subscription.status),
                  // Legacy subscriptions can predate (or temporarily lose)
                  // the relational plans join. The immutable Stripe Price ID
                  // is the authoritative fallback, especially for the
                  // grandfathered $20 monthly plan display.
                  planSlug: subscribedPlanSlug ?? null,
                  // getPlanTitle knows every paid slug — the old inline ternary
                  // only knew the two pro_* slugs, so the first Agent Pro
                  // subscriber saw their $59.99 plan labeled "Pro" ($29.99's
                  // name) right next to the switcher card that knew better.
                  planName: subscribedPlanSlug
                    ? getPlanTitle(subscribedPlanSlug)
                    : "Pro",
                  currentPeriodStart: subscription.current_period_start,
                  currentPeriodEnd: subscription.current_period_end,
                  cancelAtPeriodEnd: Boolean(subscription.cancel_at_period_end) || isSubscriptionCancelReturn,
                  subscribedPrice: subscribedPriceDisplay,
                  standardMonthlyPrice: stripePriceDisplays.pro_monthly,
                }
              : null
          }
          plans={
            billingPlans.length > 0
              ? billingPlans
              : [
                  {
                    slug: "pro_monthly",
                    title: "Pro Monthly",
                    intervalLabel: "month",
                    priceLabel: "Pro",
                    description: "Full Pro access billed monthly.",
                    features: [
                      "Save and compare deals",
                      "10-year projections",
                      "Illustrative tax impact and modeled exit comparisons",
                      "Professional PDF exports",
                    ],
                  },
                  {
                    slug: "pro_annual",
                    title: "Pro Annual",
                    intervalLabel: "year",
                    priceLabel: "17% off",
                    badge: "17% off",
                    description: "Full Pro access billed yearly with 17% savings.",
                    features: [
                      "Save and compare deals",
                      "10-year projections",
                      "Illustrative tax impact and modeled exit comparisons",
                      "Professional PDF exports",
                    ],
                  },
                ]
          }
        />
      </main>
    </>
  );
}
