"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  PlusCircle,
  Briefcase,
  FileBarChart,
  Settings,
  ListChecks,
  ListTodo,
  CircleUserRound,
  Users,
  Target,
  LockKeyhole,
} from "lucide-react";
import { AppLogo } from "@/components/brand/app-logo";
import type { DashboardNavAccess } from "@/components/dashboard/dashboard-shell";
import { requestMountedNewAnalysis } from "@/lib/new-analysis-navigation";

type SidebarProps = {
  activeDealCount: number;
  navAccess: DashboardNavAccess;
  mobile?: boolean;
  /** Mobile drawer: fired when any nav link is tapped, so the drawer can close
   *  even when the tap doesn't change the route (the already-active item). */
  onNavigate?: () => void;
};

export function Sidebar({ activeDealCount, navAccess, mobile = false, onNavigate }: SidebarProps) {
  // Live route — drives the `active` highlight on whichever nav item
  // matches. Previously `Dashboard` was hardcoded `active: true`, which
  // left the sidebar lying about the current route on every other page
  // under /dashboard/*. Using pathname matching keeps the indicator
  // honest as the user navigates.
  const pathname = usePathname() ?? "";

  // `/dashboard` should only match the exact path so it doesn't also
  // light up for /dashboard/saved-analyses. Sub-routes match on prefix.
  const isActive = (href: string): boolean => {
    const pathOnly = href.split("?", 1)[0] ?? href;
    if (pathOnly === "/dashboard") return pathname === "/dashboard";
    return pathname === pathOnly || pathname.startsWith(`${pathOnly}/`);
  };

  const nav = [
    // Gated on `overview` (insights), NOT `dashboard` (area access): /dashboard
    // is the Pro-only portfolio Overview, so for free users this item shows
    // locked/greyed (like Compare & Templates below) instead of an enabled
    // link that /dashboard would immediately redirect to My Deals. Free users
    // still reach the dashboard area via the "My Deals" item just below.
    { icon: LayoutDashboard, label: "Dashboard", href: "/dashboard", enabled: navAccess.overview },
    { icon: PlusCircle, label: "New Analysis", href: "/dashboard/new?fresh=1", enabled: true },
    // ACTIVE deals only — the badge must agree with what /dashboard/saved-analyses
    // shows on arrival, which defaults to the Active filter. Counting archived
    // and completed deals here made the badge read higher than the list.
    { icon: Briefcase, label: "My Deals", href: "/dashboard/saved-analyses", badge: String(activeDealCount), enabled: navAccess.myDeals },
    { icon: ListTodo, label: "Compare Deals", href: "/dashboard/compare", enabled: navAccess.compareDeals },
    // Batch triage stays paid-only. Evaluation users can spend their one
    // side-by-side comparison without inheriting this separate bulk tool;
    // `overview` is paid-plan-only while `compareDeals` may be evaluative.
    { icon: ListChecks, label: "Screen a shortlist", href: "/dashboard/triage", enabled: navAccess.compareDeals && navAccess.overview },
    { icon: FileBarChart, label: "Strategy Profiles", href: "/dashboard/templates", enabled: navAccess.templates },
    { icon: Users, label: "Clients", href: "/dashboard/clients", enabled: navAccess.clients },
    // Buy Boxes are decision criteria, not an account setting. Give them a
    // first-class route in the workspace while keeping the existing settings
    // editor as the single source of truth.
    { icon: Target, label: "Buy Boxes", href: "/settings#buy-boxes", enabled: true },
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
          ? // The drawer host is position:fixed and full-height, so the column
            // has to own its overflow (min-h-0 lets the flex column actually
            // shrink). Without it, Manage Templates / Settings / Profile fall
            // off the bottom on a landscape phone with nothing to scroll.
            "flex h-full min-h-0 w-64 max-w-full shrink-0 flex-col overflow-y-auto overscroll-contain text-sidebar-foreground"
          : // Natural-scroll dashboard: the sidebar pins to the viewport
            // (sticky, self-start so the flex row doesn't stretch it) and owns
            // its own overflow, while the page scrolls the main content.
            "hidden w-64 shrink-0 flex-col text-sidebar-foreground lg:flex lg:sticky lg:top-0 lg:self-start lg:h-screen lg:overflow-y-auto"
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
        <nav aria-label={mobile ? "Dashboard (mobile)" : "Dashboard"} className="space-y-1">
          {nav
            // Disabled items normally render greyed as a one-tier-up upsell
            // (Compare Deals to a Free user). Clients is different: it is an
            // Agent-Pro-only surface, so greying it for every $29.99 Pro user
            // adds a permanently dead row with no explanation — exactly the
            // "confusing" chrome this workflow pass is removing. Hide it
            // instead; every other item keeps the existing upsell behavior.
            .filter((item) => item.enabled || item.label !== "Clients")
            .map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.label}
                href={item.enabled ? item.href : "/pricing"}
                // Prefetch ON for in-app dashboard nav (Jun 2026): these
                // are the tabs a signed-in user bounces between; fetching
                // the RSC payload on hover makes switches feel instant
                // and pairs with the segment layout that keeps the shell
                // mounted. The prefetch={false} convention elsewhere is
                // for marketing surfaces, not the app shell.
                prefetch={item.enabled}
                aria-current={item.active ? "page" : undefined}
                onClick={(event) => {
                  onNavigate?.();
                  if (
                    item.enabled &&
                    item.href.startsWith("/dashboard/new") &&
                    pathname === "/dashboard/new"
                  ) {
                    event.preventDefault();
                    requestMountedNewAnalysis();
                  }
                }}
                title={item.enabled ? undefined : `${item.label} is included with TrueCap Pro`}
                className={`group flex min-h-11 items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  item.active
                    ? "bg-sidebar-accent text-white shadow-[inset_0_1px_0_oklch(1_0_0_/_0.06)]"
                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-white"
                } ${item.enabled ? "" : "opacity-75 hover:opacity-100"}`}
              >
                <Icon className="h-[18px] w-[18px]" />
                <span className="flex-1">{item.label}</span>
                {item.badge && (
                  <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-sidebar-accent text-sidebar-foreground/80">
                    {item.badge}
                  </span>
                )}
                {!item.enabled ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-sidebar-accent px-1.5 py-0.5 text-[9px] font-bold text-sidebar-foreground/80">
                    <LockKeyhole className="size-2.5" aria-hidden />
                    PRO
                  </span>
                ) : null}
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
          onClick={onNavigate}
          className="flex min-h-11 w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-sidebar-foreground/70 transition hover:bg-sidebar-accent/50 hover:text-white"
        >
          <CircleUserRound className="h-[18px] w-[18px]" />
          <span>Profile</span>
        </Link>
      </div>
    </aside>
  );
}
