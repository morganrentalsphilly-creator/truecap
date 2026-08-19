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
      {/* Skip link — first focusable element, so keyboard/switch users can
          bypass the persistent sidebar nav on every page (the shell stays
          mounted across navigations). Targets the <main id="main"> in the page
          (globals.css gives it a scroll-margin so the landing spot clears the
          fixed mobile Topbar). focus:fixed, matching the root-layout skip
          link: .dashboard-shell is not positioned, so focus:absolute pinned
          the link to the DOCUMENT top and it scrolled out of sight. */}
      <a
        href="#main"
        className="sr-only z-50 rounded-lg bg-primary px-4 py-2 font-semibold text-primary-foreground shadow-lg focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
      >
        Skip to content
      </a>
      <Sidebar activeDealCount={activeDealCount} navAccess={navAccess} />
      <DashboardSheet activeDealCount={activeDealCount} navAccess={navAccess}>
        {children}
      </DashboardSheet>
    </div>
  );
}
