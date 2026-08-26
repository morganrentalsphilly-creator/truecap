import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { TemplatesManagementPage } from "@/components/investcalc/templates-management-page";

export const metadata: Metadata = {
  title: "Templates",
  description: "Manage your saved rental analysis templates in TrueCap.",
  alternates: { canonical: "/dashboard/templates" },
  robots: { index: false, follow: false },
};
import { Topbar } from "@/components/dashboard/Topbar";
import { listAnalysisTemplatesAction } from "@/app/actions/analysis-templates";
import {
  getDashboardNavAccess,
  hasDashboardAccess,
  hasPaidPlanSubscription,
  hasPlanFeature,
} from "@/lib/entitlements";
import { getRequestUser, getRequestEntitlements } from "@/lib/request-auth";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { RetryRouteButton } from "@/components/dashboard/retry-route-button";

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

export default async function DashboardTemplatesPage() {
  const supabase = await createServerSupabaseClient();
  const user = await getRequestUser();

  if (!user) {
    redirect("/auth/login");
  }

  const entitlements = await getRequestEntitlements(user.id);
  if (!hasDashboardAccess(entitlements) || !hasPlanFeature(entitlements, "template_manage")) {
    redirect("/");
  }
  const navAccess = getDashboardNavAccess(entitlements);

  const [{ data: profile }, result, isPremium] = await Promise.all([
    supabase
      .from("profiles")
      .select("first_name, last_name, display_name, avatar_url")
      .eq("id", user.id)
      .maybeSingle(),
    listAnalysisTemplatesAction(),
    hasPaidPlanSubscription(supabase, user.id),
  ]);

  const displayName = getDisplayName((profile as ProfileRow | null) ?? null, user.email);
  const initials = getInitials(displayName, user.email ?? "");

  if (!result.ok) {
    return (
      <>
        <div className="flex-1 min-w-0 flex flex-col">
          <Topbar
            displayName={displayName}
            email={user.email ?? ""}
            initials={initials}
            avatarSrc={(profile as ProfileRow | null)?.avatar_url ?? undefined}
            isPremium={isPremium}
            canAccessDashboard={navAccess.dashboard}
          />
          <main id="main" className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
            <div className="rounded-2xl border border-destructive/25 bg-destructive/5 p-6">
              <h1 className="text-xl font-bold text-foreground">Could not load templates</h1>
              <p className="text-sm text-muted-foreground mt-2">{result.message}</p>
              <RetryRouteButton className="mt-4" />
            </div>
          </main>
        </div>
      </>
    );
  }

  return (
    <>
      <div className="flex-1 min-w-0 flex flex-col">
        <Topbar
          displayName={displayName}
          email={user.email ?? ""}
          initials={initials}
          avatarSrc={(profile as ProfileRow | null)?.avatar_url ?? undefined}
          isPremium={isPremium}
          canAccessDashboard={navAccess.dashboard}
        />
        <div className="flex-1">
          <TemplatesManagementPage initialTemplates={result.templates} />
        </div>
      </div>
    </>
  );
}
