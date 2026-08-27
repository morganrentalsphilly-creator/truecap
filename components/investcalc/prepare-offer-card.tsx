"use client";

import { FileDown, ShieldCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { InputConfidenceStage } from "@/lib/input-confidence";

type Props = {
  stage: InputConfidenceStage | null;
  remainingVerificationCount: number | null;
  isPreparing: boolean;
  actionsBlocked?: boolean;
  actionsBlockedReason?: string;
  onPrepare: () => void;
};

export function PrepareOfferCard({
  stage,
  remainingVerificationCount,
  isPreparing,
  actionsBlocked = false,
  actionsBlockedReason,
  onPrepare,
}: Props) {
  return (
    <section
      aria-labelledby="prepare-offer-title"
      className="rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-6"
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-primary">
            <ShieldCheck aria-hidden className="size-4" />
            <h2 id="prepare-offer-title" className="text-xs font-extrabold uppercase tracking-widest">
              Decision review package
            </h2>
          </div>
          <p className="mt-2 text-lg font-extrabold text-foreground">Turn the underwrite into a Pro review report.</p>
          <p className="mt-1 max-w-2xl text-sm leading-relaxed text-muted-foreground">
            Package the asking price, Offer Ceiling, target basis, assumptions, downside case, key risks, and underwriting-method version for partner, agent, or lender review.
          </p>
          {stage && stage !== "offer-ready" && remainingVerificationCount != null ? (
            <p className="mt-2 text-xs font-semibold text-amber-700">
              {remainingVerificationCount} priority {remainingVerificationCount === 1 ? "input remains" : "inputs remain"} unconfirmed; the report will still show the assumptions used.
            </p>
          ) : null}
        </div>
        <div className="shrink-0">
          <Button
            type="button"
            size="lg"
            disabled={isPreparing || actionsBlocked}
            title={actionsBlocked ? actionsBlockedReason : undefined}
            aria-busy={isPreparing}
            onClick={onPrepare}
            className="min-h-11 w-full gap-2 rounded-xl sm:w-auto"
          >
            <FileDown aria-hidden className="size-4" />
            {isPreparing ? "Preparing…" : "Create review package"}
          </Button>
          <p className="mt-2 max-w-56 text-[10px] leading-relaxed text-muted-foreground sm:text-right">
            Creates an analysis package. It does not submit or sign a purchase agreement.
          </p>
          {actionsBlocked && actionsBlockedReason ? (
            <p
              role="status"
              className="mt-2 max-w-56 text-xs font-semibold leading-relaxed text-amber-800 sm:text-right dark:text-amber-200"
            >
              {actionsBlockedReason}
            </p>
          ) : null}
        </div>
      </div>
    </section>
  );
}
