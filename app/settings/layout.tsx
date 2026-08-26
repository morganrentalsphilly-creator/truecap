/**
 * /settings segment layout — puts Settings inside the APP SHELL.
 *
 * Before this, the sidebar's own "Settings" item navigated to a page that
 * rendered the MARKETING header: the sidebar vanished, the marketing footer
 * appeared, and a signed-in user was offered "Sign in / Create account". The
 * nav promotion (Sidebar.tsx: Settings was deliberately moved out of the
 * account dropdown because Pro users pay for Branding) shipped without the
 * corresponding shell.
 *
 * URLs ARE PRESERVED. /settings and /settings/branding keep their paths —
 * they are linked from lifecycle emails and from the buy-box anchor on the
 * dashboard — so this is a new layout, not a route move.
 *
 * GUARD DIFFERENCE FROM /dashboard, deliberate: this layout requires a signed-in
 * user but NOT hasDashboardAccess. Settings hosts account-level controls
 * (defaults, alert toggles) that Free users legitimately reach; gating it on
 * dashboard access the way app/dashboard/layout.tsx does would lock them out
 * of their own preferences. Per-page entitlement guards stay in the pages.
 *
 * Topbar renders HERE rather than per-page so /settings and
 * /settings/branding share one mount — and it sits inside DashboardShell's
 * children because its mobile SheetTrigger needs the Radix Sheet context
 * that DashboardSheet provides.
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

export default async function SettingsLayout({ children }: { children: ReactNode }) {
  const supabase = await createServerSupabaseClient();
  const user = await getRequestUser();
  if (!user) redirect(loginPathFor(await getCurrentRequestPath("/settings")));

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
  );
}
