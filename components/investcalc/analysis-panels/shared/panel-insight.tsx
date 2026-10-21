import type { ReactNode } from "react";

/**
 * One-line "so what" takeaway rendered at the top of a Pro analysis panel,
 * just under the summary cards. Turns a screen of correct numbers into a
 * decision - "cash flow turns positive in year 8", "your tax shield is
 * front-loaded", "most of the return shows up at sale". Calm, neutral styling
 * so it reads as guidance, not an alert: a sentence on a line, no box and no
 * icon. Renders nothing when the caller has no meaningful takeaway (e.g.
 * empty data), so panels can pass a possibly-null builder result without
 * guarding.
 */
export function PanelInsight({ children }: { children: ReactNode }) {
  if (!children) return null;
  return (
    <p className="border-t border-border pt-3 text-sm leading-relaxed text-muted-foreground">
      {children}
    </p>
  );
}
