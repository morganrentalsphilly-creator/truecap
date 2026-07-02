/**
 * Next-action banner - the single recommended next step for a deal, shown at
 * the top of the deal workspace. Pure presentational; the step itself is
 * computed by lib/next-action.ts so the wording/logic stays in one place.
 * Server-renderable (no client hooks).
 */
import { AlertTriangle, AlertCircle, CheckCircle2 } from "lucide-react";
import type { NextAction } from "@/lib/next-action";

const TONE = {
  blocked: {
    wrap: "border-[var(--metric-negative)]/30 bg-[var(--metric-negative)]/10",
    icon: AlertTriangle,
    iconClass: "text-[var(--metric-negative)]",
  },
  review: {
    wrap: "border-amber-500/30 bg-amber-500/10",
    icon: AlertCircle,
    iconClass: "text-amber-600",
  },
  ready: {
    wrap: "border-[var(--metric-positive)]/30 bg-[var(--metric-positive)]/10",
    icon: CheckCircle2,
    iconClass: "text-[var(--metric-positive)]",
  },
} as const;

export function NextActionBanner({
  action,
  cta,
}: {
  action: NextAction;
  /** Optional in-place CTA so the instruction is doable where it's shown
   *  (e.g. the closed stage's "add a close date" jumps to the equity card).
   *  Plain anchor — server-renderable, works for same-page #fragments too. */
  cta?: { label: string; href: string };
}) {
  const t = TONE[action.tone];
  const Icon = t.icon;
  return (
    <div className={`flex items-start gap-3 rounded-2xl border p-4 ${t.wrap}`}>
      <Icon aria-hidden className={`mt-0.5 size-5 shrink-0 ${t.iconClass}`} />
      <div className="min-w-0 flex-1">
        <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
          Next action
        </div>
        <div className="text-sm font-bold text-foreground">{action.label}</div>
        <div className="text-xs text-muted-foreground">{action.reason}.</div>
      </div>
      {cta ? (
        <a
          href={cta.href}
          className="shrink-0 self-center rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs font-semibold text-foreground transition-colors hover:bg-muted"
        >
          {cta.label}
        </a>
      ) : null}
    </div>
  );
}
