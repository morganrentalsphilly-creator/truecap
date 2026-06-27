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
    <div className="dashboard-shell flex min-h-screen w-full overflow-x-hidden bg-background text-foreground lg:h-screen lg:overflow-hidden">
      <Sidebar savedDealCount={savedDealCount} navAccess={navAccess} />
      <DashboardSheet savedDealCount={savedDealCount} navAccess={navAccess}>
        {children}
      </DashboardSheet>
    </div>
  );
}
