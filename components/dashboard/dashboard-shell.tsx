import type { ReactNode } from "react";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";

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
      <Sheet>
        {children}
        <SheetContent
          side="left"
          className="dashboard-mobile-sheet w-64 max-w-[85vw] border-r-0 p-0 lg:hidden [&>button]:rounded-lg [&>button]:border [&>button]:border-white/25 [&>button]:bg-white/10 [&>button]:text-white [&>button]:opacity-100 [&>button]:shadow-[0_0_0_1px_rgba(37,99,235,0.45)] [&>button:hover]:bg-white/20 [&>button>svg]:size-5 [&>button>svg]:stroke-[2.25]"
        >
          <SheetTitle className="sr-only">Dashboard navigation</SheetTitle>
          <Sidebar savedDealCount={savedDealCount} navAccess={navAccess} mobile />
        </SheetContent>
      </Sheet>
    </div>
  );
}
