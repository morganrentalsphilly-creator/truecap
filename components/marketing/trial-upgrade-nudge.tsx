"use client";

/**
 * Upgrade nudge at the moment the free trial bites
 * (docs/funnel-leaks-plan.md Phase C). Flag: FUNNEL_UPGRADE_NUDGE=on, read
 * server-side by consumeProductEvaluationUsageAction — this card renders only
 * when that action says so, so there is no client flag to drift.
 *
 *   third_deal     shown with the result of the third (last) Pro deal
 *   limit_reached  shown in place of a result when a fourth deal is refused
 *
 * An inline card at the point of need (product principle 4), not a modal:
 * the result above it stays fully usable and nothing is dismissed for it.
 */

import { useEffect, useRef } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { track } from "@/lib/analytics/site-events";

export type TrialUpgradeNudgeKind = "third_deal" | "limit_reached";

const COPY: Record<TrialUpgradeNudgeKind, { title: string; body: string }> = {
  third_deal: {
    title: "That was your third Pro deal",
    body: "Your free trial includes three complete Pro deals, and this was the last one. This result stays open. Pro keeps the Offer Ceiling, downside testing, comparisons, and reports on every deal you run next.",
  },
  limit_reached: {
    title: "You've used your three Pro deals",
    body: "Your free trial covers three complete Pro deals. Pro runs the Offer Ceiling, downside testing, comparisons, and reports on every deal, with no limit.",
  },
};

export function TrialUpgradeNudge({ kind }: { kind: TrialUpgradeNudgeKind }) {
  // Once per mount (React 19 StrictMode mounts effects twice in dev).
  const shown = useRef<TrialUpgradeNudgeKind | null>(null);
  useEffect(() => {
    if (shown.current === kind) return;
    shown.current = kind;
    track("upgrade_nudge_shown", { placement: kind });
  }, [kind]);

  const copy = COPY[kind];
  return (
    <section
      aria-labelledby="trial-upgrade-nudge-title"
      className="mb-4 rounded-2xl border border-primary/30 bg-[var(--brand-blue-light)] p-5 sm:p-6"
    >
      <h3 id="trial-upgrade-nudge-title" className="text-base font-extrabold text-foreground">
        {copy.title}
      </h3>
      <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{copy.body}</p>
      <Link
        href="/pricing#plans"
        onClick={() => track("upgrade_nudge_clicked", { placement: kind })}
        className="mt-4 inline-flex min-h-11 items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-bold text-primary-foreground hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
      >
        See Pro plans
        <ArrowRight className="h-4 w-4" aria-hidden="true" />
      </Link>
    </section>
  );
}
