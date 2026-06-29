"use client";

import { useEffect, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { Sidebar } from "@/components/dashboard/Sidebar";
import type { DashboardNavAccess } from "@/components/dashboard/dashboard-shell";

/**
 * Controls the mobile nav drawer so it CLOSES on navigation. Previously the
 * Sheet was uncontrolled, so tapping a nav item changed the route underneath
 * but left the drawer + overlay covering the new page — every mobile nav tap
 * was a dead-end. We close on pathname change (which also covers tapping the
 * already-active route). The open-trigger (hamburger) lives in the Topbar
 * inside `children` and drives this via Radix Sheet context.
 */
export function DashboardSheet({
  savedDealCount,
  navAccess,
  children,
}: {
  savedDealCount: number;
  navAccess: DashboardNavAccess;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      {children}
      <SheetContent
        side="left"
        className="dashboard-mobile-sheet w-64 max-w-[85vw] border-r-0 p-0 lg:hidden [&>button]:flex [&>button]:size-11 [&>button]:items-center [&>button]:justify-center [&>button]:rounded-lg [&>button]:border [&>button]:border-white/25 [&>button]:bg-white/10 [&>button]:text-white [&>button]:opacity-100 [&>button]:shadow-[0_0_0_1px_rgba(0, 112, 196,0.45)] [&>button:hover]:bg-white/20 [&>button>svg]:size-5 [&>button>svg]:stroke-[2.25]"
      >
        <SheetTitle className="sr-only">Dashboard navigation</SheetTitle>
        <Sidebar savedDealCount={savedDealCount} navAccess={navAccess} mobile />
      </SheetContent>
    </Sheet>
  );
}
