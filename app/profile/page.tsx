import { redirect } from "next/navigation";
import { Header } from "@/components/investcalc/header";
import { BillingPanel } from "@/components/profile/billing-panel";
import { ProfileForm } from "@/components/profile/profile-form";
import { upsertSubscriptionFromStripe } from "@/lib/stripe/subscription-sync";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getStripe } from "@/lib/stripe/client";

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

function formatPrice(planSlug: "pro_monthly" | "pro_annual", stripePrice?: StripePriceDisplay): string {
  if (stripePrice) return stripePrice.priceLabel;
  if (planSlug === "pro_annual") return "25% off";
  return "Pro";
}

function getPlanPriceId(planSlug: "pro_monthly" | "pro_annual", dbPriceId?: string | null): string | undefined {
  if (dbPriceId) return dbPriceId;
  return planSlug === "pro_monthly" ? process.env.STRIPE_PRICE_PRO_MONTHLY : process.env.STRIPE_PRICE_PRO_ANNUAL;
}

async function getStripePriceDisplays(
  plans: PlanRow[] | null
): Promise<Record<"pro_monthly" | "pro_annual", StripePriceDisplay>> {
  const fallback = { pro_monthly: null, pro_annual: null };
  if (!process.env.STRIPE_SECRET_KEY) return fallback;

  const stripe = getStripe();
  const entries = await Promise.all(
    (["pro_monthly", "pro_annual"] as const).map(async (slug) => {
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
            intervalLabel: price.recurring?.interval ?? (slug === "pro_annual" ? "year" : "month"),
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

  return Object.fromEntries(entries) as Record<"pro_monthly" | "pro_annual", StripePriceDisplay>;
}

function getPlanTitle(slug: "pro_monthly" | "pro_annual"): string {
  if (slug === "pro_annual") return "Pro Annual";
  return "Pro Monthly";
}

function getPlanObject(sub: SubscriptionRow | null): { slug: string | null } | null {
  if (!sub?.plans) return null;
  return Array.isArray(sub.plans) ? sub.plans[0] ?? null : sub.plans;
}

async function getLiveStripeSubscriptionState(subscription: SubscriptionRow | null, fallbackUserId: string): Promise<{
  status: string | null;
  currentPeriodStart: string | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean | null;
}> {
  if (!subscription?.stripe_subscription_id || !process.env.STRIPE_SECRET_KEY) {
    return {
      status: null,
      currentPeriodStart: null,
      currentPeriodEnd: null,
      cancelAtPeriodEnd: null,
    };
  }

  try {
    const stripe = getStripe();
    const liveSubscription = await stripe.subscriptions.retrieve(subscription.stripe_subscription_id);
    const admin = createAdminSupabaseClient();
    await upsertSubscriptionFromStripe(admin, liveSubscription, fallbackUserId);

    const primaryItem = liveSubscription.items.data[0] as
      | (typeof liveSubscription.items.data[number] & {
          current_period_start?: number | null;
          current_period_end?: number | null;
        })
      | undefined;
    const liveSubscriptionWithPeriods = liveSubscription as typeof liveSubscription & {
      current_period_start?: number | null;
      current_period_end?: number | null;
      cancel_at?: number | null;
    };
    const periodStartSec =
      liveSubscriptionWithPeriods.current_period_start ?? primaryItem?.current_period_start ?? null;
    const periodEndSec =
      liveSubscriptionWithPeriods.current_period_end ?? primaryItem?.current_period_end ?? null;

    return {
      status: liveSubscription.status,
      currentPeriodStart:
        periodStartSec != null ? new Date(periodStartSec * 1000).toISOString() : null,
      currentPeriodEnd: periodEndSec != null ? new Date(periodEndSec * 1000).toISOString() : null,
      cancelAtPeriodEnd: Boolean(liveSubscription.cancel_at_period_end || liveSubscriptionWithPeriods.cancel_at),
    };
  } catch (error) {
    console.error(
      "[billing] Could not refresh live Stripe subscription state:",
      error instanceof Error ? error.message : error
    );
    return {
      status: null,
      currentPeriodStart: null,
      currentPeriodEnd: null,
      cancelAtPeriodEnd: null,
    };
  }
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
      .in("slug", ["pro_monthly", "pro_annual"])
      .eq("is_active", true)
      .order("slug", { ascending: true }),
  ]);
  const stripePriceDisplays = await getStripePriceDisplays((planRows as PlanRow[] | null) ?? null);

  const fallbackName =
    (user.user_metadata?.full_name as string | undefined)?.trim() ||
    (user.user_metadata?.name as string | undefined)?.trim() ||
    user.email?.split("@")[0] ||
    "Account";

  const firstName = profile?.first_name ?? fallbackName.split(" ")[0] ?? "";
  const lastName = profile?.last_name ?? fallbackName.split(" ").slice(1).join(" ");
  const subscriptionRow = (subscription as SubscriptionRow | null) ?? null;
  const liveSubscriptionState = await getLiveStripeSubscriptionState(subscriptionRow, user.id);
  const currentPlan = getPlanObject(subscriptionRow);
  const resolvedSearchParams = (await searchParams) ?? {};
  const isSubscriptionCancelReturn = resolvedSearchParams.billing === "subscription_cancelled";
  const availablePlanSlugs = new Set(
    ((planRows as PlanRow[] | null) ?? [])
      .map((plan) => plan.slug)
      .filter((slug): slug is "pro_monthly" | "pro_annual" => slug === "pro_monthly" || slug === "pro_annual")
  );
  const billingPlans = (["pro_monthly", "pro_annual"] as const)
    .filter((slug) => availablePlanSlugs.size === 0 || availablePlanSlugs.has(slug))
    .map((slug) => ({
      slug,
      title: getPlanTitle(slug),
      intervalLabel: stripePriceDisplays[slug]?.intervalLabel ?? (slug === "pro_annual" ? "year" : "month"),
      priceLabel: formatPrice(slug, stripePriceDisplays[slug]),
      badge: slug === "pro_annual" ? "25% off" : undefined,
      description:
        slug === "pro_annual"
          ? "Full Pro access billed yearly."
          : "Full Pro access billed monthly.",
      features: [
        "Save and compare deals",
        "10-year projections",
        "Tax strategy and exit scenarios",
        "Professional PDF exports",
      ],
    }));

  return (
    <>
      <Header initialUser={user} />
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8  space-y-10">
        <ProfileForm
          userId={user.id}
          initialEmail={user.email ?? ""}
          initialFirstName={firstName}
          initialLastName={lastName}
          initialAvatarUrl={profile?.avatar_url}
        />
        <BillingPanel
          currentSubscription={
            subscription
              ? {
                  status: liveSubscriptionState.status ?? String(subscription.status),
                  planSlug: currentPlan?.slug ?? null,
                  planName:
                    currentPlan?.slug === "pro_annual"
                      ? "Pro Annual"
                      : currentPlan?.slug === "pro_monthly"
                        ? "Pro Monthly"
                        : "Pro",
                  currentPeriodStart:
                    liveSubscriptionState.currentPeriodStart ?? subscription.current_period_start,
                  currentPeriodEnd: liveSubscriptionState.currentPeriodEnd ?? subscription.current_period_end,
                  cancelAtPeriodEnd:
                    Boolean(liveSubscriptionState.cancelAtPeriodEnd ?? subscription.cancel_at_period_end) ||
                    isSubscriptionCancelReturn,
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
