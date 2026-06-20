import type { ReactNode } from "react";
import { Lightbulb } from "lucide-react";

/**
 * One-line "so what" takeaway rendered at the top of a Pro analysis panel,
 * just under the summary cards. Turns a screen of correct numbers into a
 * decision — "cash flow turns positive in year 8", "your tax shield is
 * front-loaded", "most of the return shows up at sale". Calm, neutral styling
 * so it reads as guidance, not an alert. Renders nothing when the caller has
 * no meaningful takeaway (e.g. empty data), so panels can pass a possibly-null
 * builder result without guarding.
 */
export function PanelInsight({ children }: { children: ReactNode }) {
  if (!children) return null;
  return (
    <div className="flex items-start gap-2.5 rounded-xl border border-border bg-muted/40 px-3.5 py-3">
      <Lightbulb aria-hidden className="mt-0.5 size-4 shrink-0 text-primary" />
      <p className="text-sm leading-relaxed text-foreground/80">{children}</p>
    </div>
  );
}
