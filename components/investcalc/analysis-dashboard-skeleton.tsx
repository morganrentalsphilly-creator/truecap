"use client";

import { Skeleton } from "@/components/ui/skeleton";

/**
 * Loading fallback for the dynamic-imported AnalysisDashboard chunk
 * (see investcalc-page.tsx — the dashboard is next/dynamic'd so the
 * post-Run UI stays out of the anon landing bundle).
 *
 * Mirrors the results shell — answer hero card, metrics band, then the
 * Verdict Ledger rows — so the brief chunk load (typically warm already
 * via preload-on-first-interaction) reads as the results assembling,
 * not a layout jump.
 */
export function AnalysisDashboardSkeleton() {
  return (
    <div className="space-y-4" aria-hidden="true">
      {/* Answer hero card (verdict headline + next move) */}
      <Skeleton className="h-[260px] w-full rounded-2xl" />
      {/* Metrics band tiles */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Skeleton className="h-24 rounded-2xl" />
        <Skeleton className="h-24 rounded-2xl" />
        <Skeleton className="h-24 rounded-2xl" />
        <Skeleton className="h-24 rounded-2xl" />
      </div>
      {/* Verdict Ledger accordion rows */}
      <div className="space-y-3">
        <Skeleton className="h-14 w-full rounded-2xl" />
        <Skeleton className="h-14 w-full rounded-2xl" />
        <Skeleton className="h-14 w-full rounded-2xl" />
      </div>
    </div>
  );
}
