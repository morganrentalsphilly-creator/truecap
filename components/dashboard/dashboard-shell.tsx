import type { ReactNode } from "react";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { DashboardSheet } from "@/components/dashboard/dashboard-sheet";

/**
 * The dashboard's theme tokens live in app/globals.css under `.dashboard-shell`
 * and `.dashboard-mobile-sheet`, not inline here, so they sit with the rest of
 * the palette. The dashboard is always light (matching the analyzer); the shell
 * just applies the classes. The mobile sheet is portaled outside the shell, so
 * it gets its own token class.
 */

export type DashboardNavAccess = {
  dashboard: boolean;
  /** The Pro-only Overview home at /dashboard (portfolio insights). Distinct
   *  from `dashboard` (area access): free users have `dashboard` but not
   *  `overview`, so the Overview nav link only appears for insights holders. */
  overview: boolean;
  myDeals: boolean;
  compareDeals: boolean;
  templates: boolean;
  /** Agent Pro: the client roster + portal page at /dashboard/clients. */
  clients: boolean;
};

export function DashboardShell({
  activeDealCount,
  navAccess = {
    dashboard: true,
    overview: true,
    myDeals: true,
    compareDeals: true,
    templates: true,
    // Default-closed: this fallback is used where no entitlements were
    // resolved, and an Agent-Pro-only link must never appear speculatively.
    clients: false,
  },
  children,
}: {
  activeDealCount: number;
  navAccess?: DashboardNavAccess;
  children: ReactNode;
}) {
  return (
    <div className="dashboard-shell flex min-h-screen w-full overflow-x-clip bg-background text-foreground">
      {/* No skip link here (2026-11 audit C3). The root layout already
          renders "Skip to main content" as the first focusable element of
          every page, targeting the same <main id="main">; this shell added a
          second one, "Skip to content", right behind it, so a keyboard user
          met two links doing one job. The root layout's link is the one
          every page shares. */}
      <Sidebar activeDealCount={activeDealCount} navAccess={navAccess} />
      <DashboardSheet activeDealCount={activeDealCount} navAccess={navAccess}>
        {children}
      </DashboardSheet>
    </div>
  );
}
