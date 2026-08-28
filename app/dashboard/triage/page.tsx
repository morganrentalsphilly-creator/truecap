import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Topbar } from "@/components/dashboard/Topbar";
import { BatchTriageClient } from "@/components/investcalc/batch-triage-client";
import {
  getDashboardNavAccess,
  hasDashboardAccess,
  hasPaidPlanSubscription,
  hasPlanFeature,
} from "@/lib/entitlements";
import { getRequestUser, getRequestEntitlements } from "@/lib/request-auth";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  // "Screen Listings" — the sidebar's name for this page. One surface, one
  // name: the tab previously said "Batch Triage" while nav said "Screen
  // Listings", reading as two different features.
  title: "Screen a shortlist",
  description: "Screen a batch of rental listings at once — underwrite and rank them against your buy box.",
  alternates: { canonical: "/dashboard/triage" },
  robots: { index: false, follow: false },
};

type ProfileRow = {
  first_name: string | null;
  last_name: string | null;
  display_name: string | null;
  avatar_url: string | null;
};

function getDisplayName(profile: ProfileRow | null, email?: string | null): string {
  const name =
    profile?.display_name?.trim() ||
    `${profile?.first_name ?? ""} ${profile?.last_name ?? ""}`.trim();
  return name || email?.split("@")[0] || "Investor";
}

function getInitials(displayName: string, email: string): string {
  const parts = displayName.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return `${parts[0]![0]}${parts[1]![0]}`.toUpperCase();
  return (displayName || email || "U").slice(0, 2).toUpperCase();
}

export default async function DashboardTriagePage() {
  const supabase = await createServerSupabaseClient();
  const user = await getRequestUser();
  if (!user) redirect("/auth/login");

  const [entitlements, isPremium] = await Promise.all([
    getRequestEntitlements(user.id),
    hasPaidPlanSubscription(supabase, user.id),
  ]);
  // Batch screening is not the evaluation's one side-by-side comparison. It
  // remains paid-only at both the route and action boundaries.
  if (
    !isPremium ||
    !hasDashboardAccess(entitlements) ||
    !hasPlanFeature(entitlements, "compare_deals")
  ) {
    redirect("/");
  }
  const navAccess = getDashboardNavAccess(entitlements);

  const { data: profile } = await supabase
    .from("profiles")
    .select("first_name, last_name, display_name, avatar_url")
    .eq("id", user.id)
    .maybeSingle();
  const displayName = getDisplayName((profile as ProfileRow | null) ?? null, user.email);
  const initials = getInitials(displayName, user.email ?? "");

  return (
    <div className="flex-1 min-w-0 flex flex-col">
      <Topbar
        displayName={displayName}
        email={user.email ?? ""}
        initials={initials}
        avatarSrc={(profile as ProfileRow | null)?.avatar_url ?? undefined}
        isPremium={isPremium}
        canAccessDashboard={navAccess.dashboard}
      />
      <main id="main" className="flex-1">
        {/* Auto-extract shows only when the AI key is present (graceful-absent,
            like Deal Q&A) — read server-side, passed to the client. */}
        <BatchTriageClient aiEnabled={Boolean(process.env.ANTHROPIC_API_KEY)} />
      </main>
    </div>
  );
}
