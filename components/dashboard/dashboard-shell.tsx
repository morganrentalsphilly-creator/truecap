import type { CSSProperties, ReactNode } from "react";
import { Sidebar } from "@/components/dashboard/Sidebar";

export function DashboardShell({
  savedDealCount,
  children,
}: {
  savedDealCount: number;
  children: ReactNode;
}) {
  return (
    <div
      className="dashboard-shell flex min-h-screen w-full overflow-x-hidden lg:h-screen lg:overflow-hidden"
      style={{
        "--radius": "0.875rem",
        "--background": "oklch(0.985 0.005 240)",
        "--foreground": "oklch(0.18 0.03 250)",
        "--card": "oklch(1 0 0)",
        "--card-foreground": "oklch(0.18 0.03 250)",
        "--popover": "oklch(1 0 0)",
        "--popover-foreground": "oklch(0.18 0.03 250)",
        "--primary": "oklch(0.55 0.22 265)",
        "--primary-foreground": "oklch(0.99 0 0)",
        "--secondary": "oklch(0.96 0.01 250)",
        "--secondary-foreground": "oklch(0.22 0.04 260)",
        "--muted": "oklch(0.965 0.008 250)",
        "--muted-foreground": "oklch(0.52 0.03 256)",
        "--accent": "oklch(0.95 0.04 260)",
        "--accent-foreground": "oklch(0.22 0.04 260)",
        "--success": "oklch(0.68 0.17 158)",
        "--success-foreground": "oklch(0.99 0 0)",
        "--warning": "oklch(0.78 0.16 75)",
        "--warning-foreground": "oklch(0.2 0.05 60)",
        "--gold": "oklch(0.78 0.14 85)",
        "--border": "oklch(0.92 0.012 255)",
        "--input": "oklch(0.92 0.012 255)",
        "--ring": "oklch(0.55 0.22 265)",
        "--sidebar": "oklch(0.18 0.04 260)",
        "--sidebar-foreground": "oklch(0.85 0.02 250)",
        "--sidebar-primary": "oklch(0.65 0.22 265)",
        "--sidebar-primary-foreground": "oklch(0.99 0 0)",
        "--sidebar-accent": "oklch(0.24 0.05 262)",
        "--sidebar-accent-foreground": "oklch(0.99 0 0)",
        "--sidebar-border": "oklch(0.28 0.04 262)",
        "--sidebar-ring": "oklch(0.55 0.22 265)",
        "--gradient-premium": "linear-gradient(135deg, oklch(0.55 0.22 265), oklch(0.62 0.22 320))",
        "--gradient-success": "linear-gradient(135deg, oklch(0.68 0.17 158), oklch(0.72 0.18 180))",
        "--gradient-gold": "linear-gradient(135deg, oklch(0.82 0.14 85), oklch(0.72 0.16 50))",
        "--gradient-sidebar": "linear-gradient(180deg, oklch(0.2 0.05 262), oklch(0.15 0.04 260))",
        "--gradient-card-glow": "radial-gradient(circle at top right, oklch(0.55 0.22 265 / 0.08), transparent 60%)",
        "--shadow-lg": "0 12px 32px -8px oklch(0.2 0.04 260 / 0.12), 0 4px 8px -4px oklch(0.2 0.04 260 / 0.06)",
        "--shadow-glow": "0 0 40px -8px oklch(0.55 0.22 265 / 0.35)",
        "--shadow-gold-glow": "0 0 24px -4px oklch(0.78 0.14 85 / 0.4)",
        fontFamily: '"Inter", system-ui, sans-serif',
      } as CSSProperties}
    >
      <Sidebar savedDealCount={savedDealCount} />
      {children}
    </div>
  );
}
