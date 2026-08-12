import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Topbar } from "@/components/dashboard/Topbar";
import { ClientsWorkspace } from "@/components/investcalc/clients-workspace";
import { listAgentClientsAction, listClientDealCountsAction } from "@/app/actions/agent-clients";
import {
  getDashboardNavAccess,
  hasDashboardAccess,
  hasPaidPlanSubscription,
  hasPlanFeature,
} from "@/lib/entitlements";
import { getRequestUser, getRequestEntitlements } from "@/lib/request-auth";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Clients",
  description: "Manage your buyer roster, their buy boxes, and their deal portals.",
  alternates: { canonical: "/dashboard/clients" },
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

export default async function DashboardClientsPage() {
  const supabase = await createServerSupabaseClient();
  const user = await getRequestUser();
  if (!user) redirect("/auth/login");

  const entitlements = await getRequestEntitlements(user.id);
  // Agent Pro only — same gate the roster actions enforce, so a Pro user who
  // guesses the URL lands back on their deals rather than an empty shell.
  if (!hasDashboardAccess(entitlements) || !hasPlanFeature(entitlements, "client_buy_box")) {
    redirect("/dashboard/saved-analyses");
  }
  const navAccess = getDashboardNavAccess(entitlements);

  const [{ data: profile }, clientsResult, countsResult, isPremium] = await Promise.all([
    supabase
      .from("profiles")
      .select("first_name, last_name, display_name, avatar_url")
      .eq("id", user.id)
      .maybeSingle(),
    listAgentClientsAction(),
    listClientDealCountsAction(),
    hasPaidPlanSubscription(supabase, user.id),
  ]);

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
      <ClientsWorkspace
        initialClients={clientsResult.ok ? clientsResult.clients : []}
        initialCounts={countsResult.ok ? countsResult.counts : []}
        // A failed COUNT would otherwise render every card as "No deals yet" —
        // a confident falsehood. Surface it as a load error instead.
        countsFailed={!countsResult.ok}
        loadError={clientsResult.ok ? null : clientsResult.message}
      />
    </div>
  );
}
