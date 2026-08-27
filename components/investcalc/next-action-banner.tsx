/**
 * Next-action banner - the single recommended next step for a deal, shown at
 * the top of the deal workspace. Pure presentational; the step itself is
 * computed by lib/next-action.ts so the wording/logic stays in one place.
 * Server-renderable (no client hooks).
 */
import Link from "next/link";
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
   *  Next Link is server-renderable and works for same-page #fragments too. */
  cta?: { label: string; href: string };
}) {
  const t = TONE[action.tone];
  const Icon = t.icon;
  return (
    <div className={`flex flex-col gap-3 rounded-2xl border p-4 sm:flex-row sm:items-start ${t.wrap}`}
    >
      <div className="flex min-w-0 flex-1 items-start gap-3">
      <Icon aria-hidden className={`mt-0.5 size-5 shrink-0 ${t.iconClass}`} />
      <div className="min-w-0 flex-1">
        <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
          Next action
        </div>
        <div className="text-sm font-bold text-foreground">{action.label}</div>
        <div className="text-xs text-muted-foreground">{action.reason}.</div>
      </div>
      </div>
      {cta ? (
        <Link
          href={cta.href}
          className="inline-flex min-h-11 w-full shrink-0 items-center justify-center rounded-lg border border-border bg-background px-3 text-xs font-semibold text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 sm:w-auto sm:self-center"
        >
          {cta.label}
        </Link>
      ) : null}
    </div>
  );
}
