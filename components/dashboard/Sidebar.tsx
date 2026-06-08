"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  PlusCircle,
  Briefcase,
  FileBarChart,
  Settings,
  ListTodo,
} from "lucide-react";
import { AppLogo } from "@/components/brand/app-logo";
import type { DashboardNavAccess } from "@/components/dashboard/dashboard-shell";

type SidebarProps = {
  savedDealCount: number;
  navAccess: DashboardNavAccess;
  mobile?: boolean;
};

export function Sidebar({ savedDealCount, navAccess, mobile = false }: SidebarProps) {
  // Live route — drives the `active` highlight on whichever nav item
  // matches. Previously `Dashboard` was hardcoded `active: true`, which
  // left the sidebar lying about the current route on every other page
  // under /dashboard/*. Using pathname matching keeps the indicator
  // honest as the user navigates.
  const pathname = usePathname() ?? "";

  // `/dashboard` should only match the exact path so it doesn't also
  // light up for /dashboard/saved-analyses. Sub-routes match on prefix.
  const isActive = (href: string): boolean => {
    if (href === "/dashboard") return pathname === "/dashboard";
    if (href === "/") return false; // New Analysis link to "/" — never lit from inside the dashboard.
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  const nav = [
    { icon: LayoutDashboard, label: "Dashboard", href: "/dashboard", enabled: navAccess.dashboard },
    { icon: PlusCircle, label: "New Analysis", href: "/", enabled: true },
    { icon: Briefcase, label: "My Deals", href: "/dashboard/saved-analyses", badge: String(savedDealCount), enabled: navAccess.myDeals },
    { icon: ListTodo, label: "Compare Deals", href: "/dashboard/compare", enabled: navAccess.compareDeals },
    { icon: FileBarChart, label: "Manage Templates", href: "/dashboard/templates", enabled: navAccess.templates },
    // Settings promoted from the avatar dropdown into the main sidebar.
    // Pro users pay for Branding (configured at /settings/branding); it
    // shouldn't be 3 clicks deep in a Topbar dropdown. /settings is the
    // hub that links to Branding, Defaults, and Billing sub-pages.
    { icon: Settings, label: "Settings", href: "/settings", enabled: true },
  ].map((item) => ({ ...item, active: isActive(item.href) }));

  return (
    <aside
      className={
        mobile
          ? "flex h-full w-64 max-w-full shrink-0 flex-col text-sidebar-foreground"
          : "hidden h-screen w-64 shrink-0 flex-col text-sidebar-foreground lg:flex"
      }
      style={{ background: "var(--gradient-sidebar)" }}
    >
      <div className="px-6 py-6 border-b border-sidebar-border/60">
        <AppLogo
          onDark
          className="max-w-[150px]"
          imageClassName="h-auto"
          subtitleClassName="text-[11px]"
        />
      </div>

      <div className="px-3 py-5">
        <div className="px-3 mb-2 text-[10px] font-semibold tracking-[0.18em] text-sidebar-foreground/40">MAIN MENU</div>
        <nav className="space-y-1">
          {nav.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.label}
                href={item.enabled ? item.href : "#"}
                prefetch={false}
                aria-disabled={!item.enabled}
                tabIndex={item.enabled ? undefined : -1}
                className={`group flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  item.active
                    ? "bg-sidebar-accent text-white shadow-[inset_0_1px_0_oklch(1_0_0_/_0.06)]"
                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-white"
                } ${item.enabled ? "" : "pointer-events-none opacity-40"}`}
              >
                <Icon className="h-[18px] w-[18px]" />
                <span className="flex-1">{item.label}</span>
                {item.badge && (
                  <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-sidebar-accent text-sidebar-foreground/80">
                    {item.badge}
                  </span>
                )}
                {item.active && <span className="h-1.5 w-1.5 rounded-full bg-primary" />}
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="mt-auto p-4 space-y-3">
        {/* Profile (avatar / display name / email) — distinct from
            Settings, which now lives in the main sidebar nav. */}
        <Link
          href="/profile"
          prefetch={false}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-sidebar-foreground/70 hover:text-white hover:bg-sidebar-accent/50 transition"
        >
          <Briefcase className="h-[18px] w-[18px]" />
          <span>Profile &amp; Billing</span>
        </Link>
      </div>
    </aside>
  );
}
