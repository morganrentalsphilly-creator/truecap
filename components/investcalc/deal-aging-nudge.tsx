"use client";

/**
 * A gentle, dismissible "keep it moving" nudge on a saved deal that's been
 * sitting in a time-sensitive acquisition stage (negotiating / offer /
 * under contract). It
 * embeds TrueCap in the real workflow and gives a reason to come back.
 *
 * Honesty note: we only have created_at (when the deal was SAVED), not a
 * stage-entry timestamp, so the copy says "saved N days ago" — never a
 * false "in this stage N days." A future stage_changed_at column would make
 * it precise; until then we don't overclaim. Dismissal is per deal+stage in
 * localStorage (no server write — zero data-integrity surface).
 *
 * The aging thresholds live in lib/deal-aging (shared with the dashboard
 * home's aging line) so both surfaces agree on what "aging" means.
 */

import { useEffect, useState } from "react";
import { Clock, X } from "lucide-react";
import type { PipelineStage } from "@/lib/pipeline";
import { DEAL_AGING_MIN_DAYS, DEAL_AGING_STAGES, daysSinceSaved } from "@/lib/deal-aging";

export function DealAgingNudge({
  dealId,
  stage,
  createdAt,
  address,
}: {
  dealId: string;
  stage: PipelineStage;
  createdAt: string | null;
  address: string;
}) {
  const [dismissed, setDismissed] = useState(true);

  const storageKey = `truecap_aging_dismissed_${dealId}_${stage}`;
  const days = daysSinceSaved(createdAt) ?? NaN;
  const eligible =
    DEAL_AGING_STAGES.includes(stage) && Number.isFinite(days) && days >= DEAL_AGING_MIN_DAYS;

  useEffect(() => {
    if (!eligible) {
      setDismissed(true);
      return;
    }
    try {
      setDismissed(window.localStorage.getItem(storageKey) === "1");
    } catch {
      setDismissed(false);
    }
  }, [eligible, storageKey]);

  if (!eligible || dismissed) return null;

  const label =
    stage === "negotiating"
      ? "Negotiating"
      : stage === "offer"
        ? "Offer made"
        : "Under contract";
  const action =
    stage === "negotiating"
      ? "Recheck every seller change against your Offer Ceiling and set the next follow-up."
      : stage === "offer"
        ? "A quick follow-up with the seller or their agent keeps it from going cold."
        : "Stay on top of inspection, financing, and your due-diligence deadlines.";

  return (
    <div className="flex items-start gap-3 rounded-2xl border border-amber-300/70 bg-amber-50 p-4 sm:p-5">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-card text-amber-600">
        <Clock className="size-4" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-bold uppercase tracking-widest text-amber-700">Keep it moving</p>
        <p className="mt-0.5 text-sm font-semibold text-foreground">
          You saved {address} {days} days ago and it&apos;s still marked {label}.
        </p>
        <p className="mt-0.5 text-xs leading-relaxed text-foreground/70">{action}</p>
      </div>
      <button
        type="button"
        aria-label="Dismiss reminder"
        onClick={() => {
          setDismissed(true);
          try {
            window.localStorage.setItem(storageKey, "1");
          } catch {
            /* ignore */
          }
        }}
        className="shrink-0 rounded-full p-1.5 text-muted-foreground/60 transition-colors hover:bg-muted hover:text-foreground"
      >
        <X className="size-4" />
      </button>
    </div>
  );
}
