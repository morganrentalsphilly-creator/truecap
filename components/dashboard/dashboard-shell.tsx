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
  myDeals: boolean;
  compareDeals: boolean;
  templates: boolean;
};

export function DashboardShell({
  savedDealCount,
  navAccess = {
    dashboard: true,
    myDeals: true,
    compareDeals: true,
    templates: true,
  },
  children,
}: {
  savedDealCount: number;
  navAccess?: DashboardNavAccess;
  children: ReactNode;
}) {
  return (
    <div className="dashboard-shell flex min-h-screen w-full overflow-x-hidden bg-background text-foreground">
      {/* Skip link — first focusable element, so keyboard/switch users can
          bypass the persistent sidebar nav on every page (the shell stays
          mounted across navigations). Targets the <main id="main"> in the page. */}
      <a
        href="#main"
        className="sr-only z-50 rounded-lg bg-primary px-4 py-2 font-semibold text-primary-foreground shadow-lg focus:not-sr-only focus:absolute focus:left-4 focus:top-4"
      >
        Skip to content
      </a>
      <Sidebar savedDealCount={savedDealCount} navAccess={navAccess} />
      <DashboardSheet savedDealCount={savedDealCount} navAccess={navAccess}>
        {children}
      </DashboardSheet>
    </div>
  );
}
