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
import { redirect } from "next/navigation";
import { InvestCalcPage } from "@/components/investcalc/investcalc-page";
import { Topbar } from "@/components/dashboard/Topbar";
import { getAnalyzerCapabilities } from "@/lib/analyzer-capabilities";
import { getDashboardNavAccess, hasPaidPlanSubscription } from "@/lib/entitlements";
import { getRequestUser, getRequestEntitlements } from "@/lib/request-auth";
import { createServerSupabaseClient } from "@/lib/supabase/server";

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

export default async function NewAnalysisPage() {
  const supabase = await createServerSupabaseClient();
  const user = await getRequestUser();
  if (!user) redirect("/auth/login");

  const entitlements = await getRequestEntitlements(user.id);
  const navAccess = getDashboardNavAccess(entitlements);

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
      <div className="flex-1">
        <InvestCalcPage
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
        />
      </div>
    </div>
  );
}
