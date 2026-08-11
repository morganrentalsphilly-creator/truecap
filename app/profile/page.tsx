import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Header } from "@/components/investcalc/header";
import { BillingConversionTracker } from "@/components/marketing/billing-conversion-tracker";
import { BillingPanel } from "@/components/profile/billing-panel";
import { ProfileForm } from "@/components/profile/profile-form";
import { getEntitlementsForUser } from "@/lib/entitlements";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getStripe } from "@/lib/stripe/client";
import { getPrimaryPlanPriceId, isAgentProConfigured, PAID_PLAN_SLUGS, type PaidPlanSlug } from "@/lib/stripe/plan-prices";

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

type StripePriceDisplay = {
  priceLabel: string;
  intervalLabel: string;
  currency: string;
} | null;

type SubscriptionRow = {
  status: string;
  stripe_subscription_id: string | null;
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

function formatCurrency(cents: number, currency: string): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: cents % 100 === 0 ? 0 : 2,
  }).format(cents / 100);
}

function formatPrice(planSlug: PaidPlanSlug, stripePrice?: StripePriceDisplay): string {
  if (stripePrice) return stripePrice.priceLabel;
  if (planSlug === "pro_annual") return "25% off";
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
  const fallback = { pro_monthly: null, pro_annual: null, agent_pro_monthly: null, agent_pro_annual: null };
  if (!process.env.STRIPE_SECRET_KEY) return fallback;

  const stripe = getStripe();
  const entries = await Promise.all(
    PAID_PLAN_SLUGS.map(async (slug) => {
      const dbPriceId = plans?.find((plan) => plan.slug === slug)?.stripe_price_id ?? null;
      const priceId = getPlanPriceId(slug, dbPriceId);
      if (!priceId) return [slug, null] as const;

      try {
        const price = await stripe.prices.retrieve(priceId);
        if (price.unit_amount == null) return [slug, null] as const;

        return [
          slug,
          {
            priceLabel: formatCurrency(price.unit_amount, price.currency),
            intervalLabel: price.recurring?.interval ?? (slug.endsWith("_annual") ? "year" : "month"),
            currency: price.currency,
          },
        ] as const;
      } catch (error) {
        console.error(
          `[billing] Could not load Stripe price for ${slug} (${priceId.slice(0, 12)}...):`,
          error instanceof Error ? error.message : error
        );
        return [slug, null] as const;
      }
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

  const [{ data: profile }, { data: subscription }, { data: planRows }] = await Promise.all([
    supabase
      .from("profiles")
      .select("first_name, last_name, display_name, avatar_url")
      .eq("id", user.id)
      .maybeSingle(),
    supabase
      .from("subscriptions")
      .select("status, stripe_subscription_id, current_period_start, current_period_end, cancel_at_period_end, plans(slug)")
      .eq("user_id", user.id)
      .in("status", ["active", "trialing", "past_due", "unpaid", "paused"])
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("plans")
      .select("slug, stripe_price_id")
      .in("slug", ["pro_monthly", "pro_annual", "agent_pro_monthly", "agent_pro_annual"])
      .eq("is_active", true)
      .order("slug", { ascending: true }),
  ]);
  const stripePriceDisplays = await getStripePriceDisplays((planRows as PlanRow[] | null) ?? null);
  const entitlements = await getEntitlementsForUser(supabase, user.id);

  const fallbackName =
    (user.user_metadata?.full_name as string | undefined)?.trim() ||
    (user.user_metadata?.name as string | undefined)?.trim() ||
    user.email?.split("@")[0] ||
    "Account";

  const firstName = profile?.first_name ?? fallbackName.split(" ")[0] ?? "";
  const lastName = profile?.last_name ?? fallbackName.split(" ").slice(1).join(" ");
  const subscriptionRow = (subscription as SubscriptionRow | null) ?? null;
  const currentPlan = getPlanObject(subscriptionRow);
  const resolvedSearchParams = (await searchParams) ?? {};
  const isSubscriptionCancelReturn = resolvedSearchParams.billing === "subscription_cancelled";
  const availablePlanSlugs = new Set(
    ((planRows as PlanRow[] | null) ?? [])
      .map((plan) => plan.slug)
      .filter((slug): slug is PaidPlanSlug => (PAID_PLAN_SLUGS as readonly string[]).includes(slug))
  );
  const billingPlans = PAID_PLAN_SLUGS
    .filter((slug) => availablePlanSlugs.size === 0 || availablePlanSlugs.has(slug))
    // Agent Pro needs BOTH its plan row (migration) and a configured price:
    // showing a switch target checkout would reject just invites a dead end.
    .filter((slug) => !slug.startsWith("agent_pro") || (isAgentProConfigured() && availablePlanSlugs.has(slug)))
    .map((slug) => ({
      slug,
      title: getPlanTitle(slug),
      intervalLabel: stripePriceDisplays[slug]?.intervalLabel ?? (slug.endsWith("_annual") ? "year" : "month"),
      priceLabel: formatPrice(slug, stripePriceDisplays[slug]),
      badge: slug === "pro_annual" ? "25% off" : undefined,
      description: slug.startsWith("agent_pro")
        ? slug.endsWith("_annual")
          ? "Everything in Pro + the agent toolkit, billed yearly."
          : "Everything in Pro + the agent toolkit, billed monthly."
        : slug === "pro_annual"
          ? "Full Pro access billed yearly."
          : "Full Pro access billed monthly.",
      features: slug.startsWith("agent_pro")
        ? [
            "Everything in Pro",
            "Client rosters + per-client buy boxes",
            "Co-branded client deal pages",
            "White-label embeds",
          ]
        : [
            "Save and compare deals",
            "10-year projections",
            "Tax strategy and exit scenarios",
            "Professional PDF exports",
          ],
    }));

  // Pull the matching plan price so the Google Ads conversion event
  // carries a meaningful value for value-based bidding strategies.
  const justSubscribedSlug = (subscriptionRow?.status === "active" || subscriptionRow?.status === "trialing")
    ? (currentPlan?.slug as PaidPlanSlug | undefined)
    : undefined;
  const subscriptionValue = justSubscribedSlug
    ? (() => {
        const display = stripePriceDisplays[justSubscribedSlug];
        if (!display) return undefined;
        const parsed = parseFloat(display.priceLabel.replace(/[^0-9.]/g, ""));
        return Number.isFinite(parsed) ? parsed : undefined;
      })()
    : undefined;

  return (
    <>
      <Header initialUser={user} initialEntitlements={entitlements} />
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
                  planSlug: currentPlan?.slug ?? null,
                  planName:
                    currentPlan?.slug === "pro_annual"
                      ? "Pro Annual"
                      : currentPlan?.slug === "pro_monthly"
                        ? "Pro Monthly"
                        : "Pro",
                  currentPeriodStart: subscription.current_period_start,
                  currentPeriodEnd: subscription.current_period_end,
                  cancelAtPeriodEnd: Boolean(subscription.cancel_at_period_end) || isSubscriptionCancelReturn,
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
                      "Tax strategy and exit scenarios",
                      "Professional PDF exports",
                    ],
                  },
                  {
                    slug: "pro_annual",
                    title: "Pro Annual",
                    intervalLabel: "year",
                    priceLabel: "25% off",
                    badge: "25% off",
                    description: "Full Pro access billed yearly with 25% savings.",
                    features: [
                      "Save and compare deals",
                      "10-year projections",
                      "Tax strategy and exit scenarios",
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
