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
 * was a dead-end. The open-trigger (hamburger) lives in the Topbar inside
 * `children` and drives this via Radix Sheet context.
 *
 * Three close paths, because one isn't enough:
 *  1. pathname change — the normal "tapped a nav item" case.
 *  2. the link's own click (`onNavigate`) — tapping the ALREADY-ACTIVE item
 *     pushes an identical URL, so the pathname never changes and (1) never
 *     fires; the drawer used to just sit there.
 *  3. crossing into `lg` — the drawer content is `lg:hidden`, but display:none
 *     doesn't unmount the Radix layer, so an open sheet at ≥lg leaves a
 *     full-screen scrim plus the body pointer-events/scroll lock over a
 *     dashboard with no visible way out (rotate an iPad, widen a window).
 */
export function DashboardSheet({
  activeDealCount,
  navAccess,
  children,
}: {
  activeDealCount: number;
  navAccess: DashboardNavAccess;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    // Matches the `lg:` breakpoint the drawer + hamburger are hidden at
    // (Tailwind lg = 64rem = 1024px).
    const mq = window.matchMedia("(min-width: 1024px)");
    if (mq.matches) setOpen(false);
    const handler = (event: MediaQueryListEvent) => {
      if (event.matches) setOpen(false);
    };
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      {children}
      <SheetContent
        side="left"
        className="dashboard-mobile-sheet w-64 max-w-[85vw] border-r-0 p-0 lg:hidden [&>button]:flex [&>button]:size-11 [&>button]:items-center [&>button]:justify-center [&>button]:rounded-lg [&>button]:border [&>button]:border-white/25 [&>button]:bg-white/10 [&>button]:text-white [&>button]:opacity-100 [&>button]:shadow-[0_0_0_1px_rgba(0,112,196,0.45)] [&>button:hover]:bg-white/20 [&>button>svg]:size-5 [&>button>svg]:stroke-[2.25]"
      >
        <SheetTitle className="sr-only">Dashboard navigation</SheetTitle>
        <Sidebar
          activeDealCount={activeDealCount}
          navAccess={navAccess}
          mobile
          onNavigate={() => setOpen(false)}
        />
      </SheetContent>
    </Sheet>
  );
}
