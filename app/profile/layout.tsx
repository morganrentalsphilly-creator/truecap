/**
 * /profile segment layout — puts Profile & Billing inside the APP SHELL.
 *
 * Same defect as /settings: the sidebar's Profile link and the account
 * dropdown's Profile item both landed on a page wearing the MARKETING
 * header, dropping the user out of the app shell mid-session — on the page
 * that hosts BILLING, where losing the product frame is worst.
 *
 * URLs ARE PRESERVED. /profile keeps its path — it is the Stripe checkout
 * return target and is linked from billing emails — so this is a new
 * layout, not a route move.
 *
 * GUARD DIFFERENCE FROM /dashboard, deliberate: signed-in user required, but
 * NOT hasDashboardAccess — a Free user must be able to reach their own
 * billing page to upgrade. Gating it the way app/dashboard/layout.tsx does
 * would lock the upgrade path behind the thing being upgraded to.
 *
 * Topbar sits inside DashboardShell's children because its mobile
 * SheetTrigger needs the Radix Sheet context that DashboardSheet provides.
 */

import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { Topbar } from "@/components/dashboard/Topbar";
import {
  getDashboardNavAccess,
  hasPaidPlanSubscription,
} from "@/lib/entitlements";
import { getRequestUser, getRequestEntitlements } from "@/lib/request-auth";
import { getActiveSavedAnalysesCount } from "@/lib/saved-analyses-count";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { loginPathFor } from "@/lib/auth-schema";
import { getCurrentRequestPath } from "@/lib/request-path";
import { AccountSessionBoundary } from "@/components/auth/account-session-boundary";

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

export default async function ProfileLayout({ children }: { children: ReactNode }) {
  const supabase = await createServerSupabaseClient();
  const user = await getRequestUser();
  if (!user) redirect(loginPathFor(await getCurrentRequestPath("/profile")));

  const entitlements = await getRequestEntitlements(user.id);
  const navAccess = getDashboardNavAccess(entitlements);

  const [activeDealCount, { data: profile }, isPremium] = await Promise.all([
    getActiveSavedAnalysesCount(supabase, user.id),
    supabase
      .from("profiles")
      .select("first_name, last_name, display_name, avatar_url")
      .eq("id", user.id)
      .maybeSingle(),
    hasPaidPlanSubscription(supabase, user.id),
  ]);

  const displayName = getDisplayName((profile as ProfileRow | null) ?? null, user.email);

  return (
    <AccountSessionBoundary expectedUserId={user.id}>
      <DashboardShell activeDealCount={activeDealCount} navAccess={navAccess}>
        <div className="flex min-w-0 flex-1 flex-col">
          <Topbar
            displayName={displayName}
            email={user.email ?? ""}
            initials={getInitials(displayName, user.email ?? "")}
            avatarSrc={(profile as ProfileRow | null)?.avatar_url ?? undefined}
            isPremium={isPremium}
            canAccessDashboard={navAccess.dashboard}
          />
          <div className="flex-1">{children}</div>
        </div>
      </DashboardShell>
    </AccountSessionBoundary>
  );
}
