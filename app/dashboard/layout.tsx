/**
 * /dashboard segment layout — owns the DashboardShell (sidebar + theme
 * vars + the desktop viewport lock).
 *
 * WHY A LAYOUT (Jun 2026): previously every dashboard page rendered its
 * own <DashboardShell>, so switching tabs re-rendered the entire shell —
 * sidebar included — producing a white flash on each navigation. As a
 * layout, Next keeps the shell MOUNTED across child navigations: only
 * the content area swaps (through loading.tsx's skeleton), and the
 * sidebar never repaints.
 *
 * Guards here are the BASE requirements shared by every dashboard page
 * (signed in + dashboard access). Page-specific entitlement guards
 * (insights, save_deal, compare_deals, template_manage) remain in the
 * pages themselves — layouts don't re-run on every child navigation,
 * so per-page authorization must never live only here.
 */

import type { ReactNode } from "react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import {
  getDashboardNavAccess,
  hasDashboardAccess,
} from "@/lib/entitlements";
import { getRequestUser, getRequestEntitlements } from "@/lib/request-auth";
import { getSavedAnalysesTotalCount } from "@/lib/saved-analyses-count";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { TRUECAP_RETURN_PATH_HEADER } from "@/lib/auth-return-path";
import { safeInternalNextPath } from "@/lib/auth-schema";

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const supabase = await createServerSupabaseClient();
  const user = await getRequestUser();

  if (!user) {
    const returnPath = safeInternalNextPath(
      (await headers()).get(TRUECAP_RETURN_PATH_HEADER)
    );
    redirect(`/auth/login?next=${encodeURIComponent(returnPath)}`);
  }

  const entitlements = await getRequestEntitlements(user.id);
  if (!hasDashboardAccess(entitlements)) {
    redirect("/");
  }

  const [navAccess, savedDealTotalCount] = [
    getDashboardNavAccess(entitlements),
    await getSavedAnalysesTotalCount(supabase, user.id),
  ];

  return (
    <DashboardShell savedDealCount={savedDealTotalCount} navAccess={navAccess}>
      {children}
    </DashboardShell>
  );
}
