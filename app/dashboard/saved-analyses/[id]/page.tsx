/**
 * Per-deal workspace in the Pro dashboard: the due-diligence checklist +
 * documents for one saved deal. These were moved out of the analyzer's
 * underwrite output (analysis-dashboard) so the deal output stays focused on
 * the numbers, and live here in the dashboard instead. Reuses the same
 * self-contained cards (each fetches its own data given just the deal id).
 *
 * Guard mirrors /dashboard/saved-analyses exactly: signed in + dashboard
 * access + save_deal entitlement, else redirect. The deal is loaded
 * ownership-scoped (user_id + not deleted); missing / foreign → back to the
 * list (so it doubles as an ownership check, not just not-found).
 */
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Topbar } from "@/components/dashboard/Topbar";
import { DueDiligenceCard } from "@/components/investcalc/due-diligence-card";
import { DealDocumentsCard } from "@/components/investcalc/deal-documents-card";
import { DealDetailsCard } from "@/components/investcalc/deal-details-card";
import { DealCommentsPanel } from "@/components/investcalc/deal-comments-panel";
import { ScenariosCard } from "@/components/investcalc/scenarios-card";
import { NextActionBanner } from "@/components/investcalc/next-action-banner";
import { DealAgingNudge } from "@/components/investcalc/deal-aging-nudge";
import { nextActionForDeal } from "@/lib/next-action";
import { isPipelineStage, DEFAULT_PIPELINE_STAGE } from "@/lib/pipeline";
import {
  getDashboardNavAccess,
  hasDashboardAccess,
  hasPaidPlanSubscription,
  hasPlanFeature,
} from "@/lib/entitlements";
import { getRequestUser, getRequestEntitlements } from "@/lib/request-auth";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Deal checklist & documents",
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

export default async function DealWorkspacePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createServerSupabaseClient();
  const user = await getRequestUser();

  if (!user) {
    redirect("/auth/login");
  }

  const entitlements = await getRequestEntitlements(user.id);
  if (!hasDashboardAccess(entitlements) || !hasPlanFeature(entitlements, "save_deal")) {
    redirect("/");
  }
  const navAccess = getDashboardNavAccess(entitlements);

  const [{ data: profile }, isPremium, { data: deal }] = await Promise.all([
    supabase
      .from("profiles")
      .select("first_name, last_name, display_name, avatar_url")
      .eq("id", user.id)
      .maybeSingle(),
    hasPaidPlanSubscription(supabase, user.id),
    supabase
      .from("saved_analyses")
      .select("id, address, title, result_snapshot, net_cash_flow_monthly, pipeline_stage, created_at")
      .eq("id", id)
      .eq("user_id", user.id)
      .is("deleted_at", null)
      .maybeSingle(),
  ]);

  // Missing or not owned (the user_id filter makes this an ownership check) →
  // back to the list rather than a dead page.
  if (!deal) {
    redirect("/dashboard/saved-analyses");
  }

  const dealRow = deal as {
    id: string;
    address: string | null;
    title: string | null;
    result_snapshot: Record<string, unknown> | null;
    net_cash_flow_monthly: number | null;
    pipeline_stage: string | null;
    created_at: string | null;
  };
  const heading = dealRow.address?.trim() || dealRow.title?.trim() || "Untitled property";

  // Recommended next step from the saved underwrite (cash flow + DSCR).
  const snap = dealRow.result_snapshot ?? {};
  const num = (v: unknown): number => {
    const n = typeof v === "number" ? v : Number(v);
    return Number.isFinite(n) ? n : 0;
  };
  const nextAction = nextActionForDeal({
    netCashFlow: num(snap["netCashFlow"] ?? dealRow.net_cash_flow_monthly),
    dscr: snap["dscr"] != null ? num(snap["dscr"]) : null,
    monthlyPayment: num(snap["monthlyPayment"]),
  });

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
      <div className="flex-1">
        <main id="main" className="mx-auto max-w-3xl space-y-5 px-4 py-6 sm:px-6 sm:py-8">
          <div className="min-w-0">
            <Link
              href="/dashboard/saved-analyses"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="size-3.5" />
              My Deals
            </Link>
            <h1 className="mt-1 truncate text-xl font-extrabold tracking-tight text-foreground sm:text-2xl">
              {heading}
            </h1>
            <p className="text-xs text-muted-foreground">
              Due-diligence checklist &amp; documents for this deal. Your analysis stays in the deal view.
            </p>
          </div>

          <NextActionBanner action={nextAction} />
          <DealAgingNudge
            dealId={dealRow.id}
            stage={isPipelineStage(dealRow.pipeline_stage) ? dealRow.pipeline_stage : DEFAULT_PIPELINE_STAGE}
            createdAt={dealRow.created_at}
            address={heading}
          />
          <DealDetailsCard savedDealId={dealRow.id} />
          <ScenariosCard savedDealId={dealRow.id} />
          <DueDiligenceCard savedDealId={dealRow.id} />
          <DealDocumentsCard savedDealId={dealRow.id} />
          <DealCommentsPanel savedDealId={dealRow.id} />
        </main>
      </div>
    </div>
  );
}
