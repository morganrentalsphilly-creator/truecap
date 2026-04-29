import Link from "next/link";
import {
  LayoutDashboard,
  PlusCircle,
  Briefcase,
  FileBarChart,
  // compareIcon,
  PieChart,
  Settings,
  Sparkles,
  ListTodo,
} from "lucide-react";
import { AppLogo } from "@/components/brand/app-logo";

type SidebarProps = {
  savedDealCount: number;
};

export function Sidebar({ savedDealCount }: SidebarProps) {
  const nav = [
    { icon: LayoutDashboard, label: "Dashboard", href: "/dashboard", active: true },
    { icon: PlusCircle, label: "New Analysis", href: "/" },
    { icon: Briefcase, label: "My Deals", href: "/dashboard/saved-analyses", badge: String(savedDealCount) },
    { icon: ListTodo, label: "Compare Deals", href: "/dashboard/compare" },
    { icon: FileBarChart, label: "Manage Templates", href: "/dashboard/templates" },
    // { icon: PieChart, label: "Analytics", href: "/dashboard" },
  ];

  return (
    <aside className="hidden lg:flex h-screen w-64 shrink-0 flex-col text-sidebar-foreground" style={{ background: "var(--gradient-sidebar)" }}>
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
                href={item.href}
                prefetch={false}
                className={`group flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  item.active
                    ? "bg-sidebar-accent text-white shadow-[inset_0_1px_0_oklch(1_0_0_/_0.06)]"
                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-white"
                }`}
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
       
        <Link
          href="/profile"
          prefetch={false}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-sidebar-foreground/70 hover:text-white hover:bg-sidebar-accent/50 transition"
        >
          <Settings className="h-[18px] w-[18px]" />
          <span>Manage Account</span>
        </Link>
      </div>
    </aside>
  );
}
