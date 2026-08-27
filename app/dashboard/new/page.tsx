/**
 * /dashboard/new — the analyzer, INSIDE the app shell.
 *
 * THE BUG THIS FIXES: every in-app "New Analysis" control (sidebar, topbar
 * ×2, dashboard empty state, compare, My Deals, templates) pointed at "/".
 * proxy.ts rewrites "/" to the authed home, which renders the MARKETING
 * header and footer with no sidebar — so the single most-used action in the
 * product ejected the user from the product, and the page they landed on
 * offered them "Sign in · Create account · Forgot password".
 *
 * Same analyzer, same capability flags (both routes resolve them through
 * lib/analyzer-capabilities so they cannot drift) — but the sidebar stays
 * mounted and the nav item lights up, because this route is a child of
 * app/dashboard/layout.tsx.
 *
 * The public analyzer at "/" is UNTOUCHED: it remains the anonymous +
 * SEO entry point, statically generated for paid traffic.
 *
 * Reachable only by users with dashboard access (the layout's guard) —
 * which is exactly the set of users who have a sidebar to return to.
 */

import type { Metadata } from "next";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { InvestCalcPage } from "@/components/investcalc/investcalc-page";
import { Topbar } from "@/components/dashboard/Topbar";
import { BillingSuccessBanner } from "@/components/marketing/billing-success-banner";
import { getAnalyzerCapabilities } from "@/lib/analyzer-capabilities";
import { getDashboardNavAccess, hasPaidPlanSubscription } from "@/lib/entitlements";
import { getRequestUser, getRequestEntitlements } from "@/lib/request-auth";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { isAdvocacyInternalUser } from "@/lib/advocacy-rollout";
import { getSavedDealForEditingAction } from "@/app/actions/saved-analyses";
import { getStripe } from "@/lib/stripe/client";
import {
  planSlugFromPriceId,
  type PaidPlanSlug,
} from "@/lib/stripe/plan-prices";

export const metadata: Metadata = {
  title: "New analysis",
  robots: { index: false, follow: false },
};

type ProfileRow = {
  first_name: string | null;
  last_name: string | null;
  display_name: string | null;
  avatar_url: string | null;
};

function getDisplayName(profile: ProfileRow | null, email?: string | null): string {
  const profileName =
    profile?.display_name?.trim() ||
    `${profile?.first_name ?? ""} ${profile?.last_name ?? ""}`.trim();
  return profileName || email?.split("@")[0] || "Investor";
}

function getInitials(displayName: string, email: string): string {
  const parts = displayName.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return `${parts[0]![0]}${parts[1]![0]}`.toUpperCase();
  return (displayName || email || "U").slice(0, 2).toUpperCase();
}

export default async function NewAnalysisPage({
  searchParams,
}: {
  searchParams?: Promise<{ savedDeal?: string;
    billing?: string;
    session_id?: string;
  }>;
}) {
  const supabase = await createServerSupabaseClient();
  const user = await getRequestUser();
  if (!user) redirect("/auth/login");

  const entitlements = await getRequestEntitlements(user.id);
  const navAccess = getDashboardNavAccess(entitlements);
  const resolvedSearchParams = (await searchParams) ?? {};
  const requestedSavedDealId =
    typeof resolvedSearchParams.savedDeal === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      resolvedSearchParams.savedDeal,
    )
      ? resolvedSearchParams.savedDeal
      : null;
  const initialSavedDeal = requestedSavedDealId
    ? await getSavedDealForEditingAction(requestedSavedDealId)
    : null;

  // Stripe returns subscription buyers directly to the authenticated
  // analyzer. Resolve the paid amount from the Checkout Session (available
  // immediately) rather than racing the webhook-written subscription row.
  // This value is only a server-rendered conversion hint; the banner's server
  // action independently verifies the recent Session, user, plan, and Price
  // before it emits success UI or analytics.
  let billingConversionValue: number | undefined;
  let billingPurchasedPlan: PaidPlanSlug | null = null;
  if (
    resolvedSearchParams.billing === "success" &&
    process.env.STRIPE_SECRET_KEY
  ) {
    const sessionId = resolvedSearchParams.session_id;
    if (
      typeof sessionId === "string" &&
      /^cs_[a-zA-Z0-9_]{8,240}$/.test(sessionId)
    ) {
      try {
        const stripe = getStripe();
        const session = await stripe.checkout.sessions.retrieve(sessionId, {
          expand: ["line_items"],
        });
        // Never attach a conversion value or plan hint from another user's
        // Checkout Session.
        if (session.client_reference_id === user.id) {
          const purchasedPrice = session.line_items?.data?.[0]?.price;
          if (purchasedPrice?.unit_amount != null) {
            billingConversionValue = purchasedPrice.unit_amount / 100;
          }
          billingPurchasedPlan = planSlugFromPriceId(purchasedPrice?.id);
        }
      } catch (error) {
        console.warn(
          "[billing] could not resolve checkout session for conversion value:",
          error instanceof Error ? error.message : error,
        );
      }
    }
  }

  const [capabilities, { data: profile }, isPremium] = await Promise.all([
    getAnalyzerCapabilities(supabase, user),
    supabase
      .from("profiles")
      .select("first_name, last_name, display_name, avatar_url")
      .eq("id", user.id)
      .maybeSingle(),
    hasPaidPlanSubscription(supabase, user.id),
  ]);

  const displayName = getDisplayName((profile as ProfileRow | null) ?? null, user.email);

  return (
    <div className="flex min-w-0 flex-1 flex-col">
      <Topbar
        displayName={displayName}
        email={user.email ?? ""}
        initials={getInitials(displayName, user.email ?? "")}
        avatarSrc={(profile as ProfileRow | null)?.avatar_url ?? undefined}
        isPremium={isPremium}
        canAccessDashboard={navAccess.dashboard}
      />
      <Suspense fallback={null}>
        <BillingSuccessBanner
          conversionValue={billingConversionValue}
          purchasedPlanSlug={billingPurchasedPlan ?? undefined}
        />
      </Suspense>
      <div className="flex-1">
        <InvestCalcPage
          key={requestedSavedDealId ?? "new-analysis"}
          canSaveDeals={capabilities.canSaveDeals}
          canCompareDeals={capabilities.canCompareDeals}
          canExportPdf={capabilities.canExportPdf}
          canUseProjections={capabilities.canUseProjections}
          canUseTaxStrategy={capabilities.canUseTaxStrategy}
          canUseExitScenarios={capabilities.canUseExitScenarios}
          canUseDealScore={capabilities.canUseDealScore}
          canUseMaxOffer={capabilities.canUseMaxOffer}
          canUseSensitivity={capabilities.canUseSensitivity}
          canUseStrategies={capabilities.canUseStrategies}
          canUpdateSavedDeals={capabilities.canUpdateSavedDeals}
          saveDealLimitReached={capabilities.saveDealLimitReached}
          initialSavedDealCount={capabilities.savedDealCount}
          savedDealLimit={entitlements?.max_saved_deals ?? null}
          isAuthenticated
          userAnalysisDefaults={capabilities.userAnalysisDefaults}
          advocacyContractEligible={isAdvocacyInternalUser(user.email)}
          initialSavedDeal={initialSavedDeal}
        />
      </div>
    </div>
  );
}
