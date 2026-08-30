"use client";

import { useLayoutEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import * as Sentry from "@sentry/nextjs";
import { useRouter } from "next/navigation";
import { ArrowRight, Check, Loader2 } from "lucide-react";
import { startCompareAction } from "@/app/actions/compare";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { signalDisplay } from "@/lib/verdict-display";
import { isCurrentMountedMutation } from "@/lib/deal-workspace-mutation-lifecycle";

/**
 * Inline deal picker for the Compare page's empty state. Previously the empty
 * state only offered a "Go to Saved Analyses" button - the user had to leave,
 * tick boxes there, and come back. This lets them select 2-4 saved deals right
 * here and start the comparison in place (startCompareAction sets the selection
 * cookie; router.refresh re-runs the page's server component to render the
 * comparison).
 */

export type ComparePickerDeal = {
  id: string;
  label: string;
  score: number | null;
  signal: string | null;
  netCashFlow: number | null;
  capRate: number | null;
  methodologyLabel?: string;
  /** Exact version + provenance cohort. Only identical cohorts may be
   * selected together; this prevents a historical snapshot from being ranked
   * against a result recomputed by a different engine. */
  methodologyCohort: string;
};

const MAX_COMPARE_ITEMS = 4;

const fmtMoney = (n: number | null) =>
  n == null
    ? "—"
    : `${n >= 0 ? "+" : "-"}$${Math.abs(Math.round(n)).toLocaleString("en-US")}/mo`;
const fmtPct = (n: number | null) => (n == null ? "—" : `${n.toFixed(1)}% cap`);

export function isComparableMethodologyCohort(cohort: string | null | undefined): boolean {
  return Boolean(cohort && !cohort.startsWith("unavailable:"));
}

export function arePickerMethodologiesCompatible(
  deals: Pick<ComparePickerDeal, "methodologyCohort">[]
): boolean {
  if (deals.length === 0) return false;
  const cohort = deals[0]?.methodologyCohort;
  return (
    isComparableMethodologyCohort(cohort) &&
    deals.every((deal) => deal.methodologyCohort === cohort)
  );
}

export function normalizeMethodologySelection(
  deals: ComparePickerDeal[],
  selectedIds: string[]
): { selectedIds: string[]; droppedIds: string[] } {
  const dealById = new Map(deals.map((deal) => [deal.id, deal]));
  const requested = Array.from(new Set(selectedIds))
    .map((id) => dealById.get(id))
    .filter((deal): deal is ComparePickerDeal => Boolean(deal));
  const anchor = requested.find((deal) =>
    isComparableMethodologyCohort(deal.methodologyCohort)
  );
  if (!anchor) {
    return { selectedIds: [], droppedIds: requested.map((deal) => deal.id) };
  }
  const selected = requested
    .filter((deal) => deal.methodologyCohort === anchor.methodologyCohort)
    .slice(0, MAX_COMPARE_ITEMS);
  const selectedSet = new Set(selected.map((deal) => deal.id));
  return {
    selectedIds: selected.map((deal) => deal.id),
    droppedIds: requested.filter((deal) => !selectedSet.has(deal.id)).map((deal) => deal.id),
  };
}

export function CompareDealPicker({
  deals,
  initialSelectedIds = [],
  onComplete,
}: {
  deals: ComparePickerDeal[];
  /** A workspace "Compare with another deal" entry seeds the current deal. */
  initialSelectedIds?: string[];
  /** Optional in-place editor hook. The route still refreshes from the
   * server-owned cookie after this fires. */
  onComplete?: () => void;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const initialSelection = normalizeMethodologySelection(deals, initialSelectedIds);
  const [selected, setSelected] = useState<string[]>(initialSelection.selectedIds);
  const [isPending, startTransition] = useTransition();
  const compareRequestInFlightRef = useRef(false);
  const compareRequestRef = useRef<symbol | null>(null);
  useLayoutEffect(() => {
    return () => {
      compareRequestRef.current = null;
      compareRequestInFlightRef.current = false;
    };
  }, []);
  const [errorMessage, setErrorMessage] = useState<string | null>(() =>
    initialSelection.droppedIds.length > 0
      ? "Some previously selected deals used a different calculation method. They were removed so this comparison cannot name a false leader."
      : null
  );

  const dealById = new Map(deals.map((deal) => [deal.id, deal]));
  const selectedDeals = selected
    .map((id) => dealById.get(id))
    .filter((deal): deal is ComparePickerDeal => Boolean(deal));
  const selectedCohort = selectedDeals[0]?.methodologyCohort ?? null;

  const toggle = (id: string) => {
    if (isPending) return;
    setErrorMessage(null);
    if (selected.includes(id)) {
      setSelected((prev) => prev.filter((selectedId) => selectedId !== id));
      return;
    }
    const candidate = dealById.get(id);
    if (!candidate || !isComparableMethodologyCohort(candidate.methodologyCohort)) {
      setErrorMessage(
        "This saved deal does not have a complete comparable calculation record. Re-underwrite it before adding it."
      );
      return;
    }
    if (selectedCohort && candidate.methodologyCohort !== selectedCohort) {
      setErrorMessage(
        `This deal uses ${candidate.methodologyLabel ?? "a different calculation method"}. Re-underwrite it before comparing it with the selected deals.`
      );
      return;
    }
    if (selected.length >= MAX_COMPARE_ITEMS) {
      toast({
        title: "Up to 4 deals",
        description: "You can compare up to 4 deals at a time.",
      });
      return;
    }
    setSelected((prev) => [...prev, id]);
  };

  const canCompare =
    selected.length >= 2 && arePickerMethodologiesCompatible(selectedDeals);

  const onCompare = () => {
    if (!canCompare || compareRequestInFlightRef.current || isPending) return;
    setErrorMessage(null);
    compareRequestInFlightRef.current = true;
    const requestToken = Symbol("compare-picker-save");
    compareRequestRef.current = requestToken;
    const requestStillOwnsPicker = () =>
      isCurrentMountedMutation({
        requestToken,
        currentRequestToken: compareRequestRef.current,
      });
    startTransition(async () => {
      try {
        const result = await startCompareAction(selected);
        if (!requestStillOwnsPicker()) return;
        if (result.ok) {
          // Cookie is now set server-side; re-run the page's server component so
          // it reads the new selection and renders the comparison in place.
          onComplete?.();
          router.refresh();
        } else {
          setErrorMessage(`${result.message} Your selection is still here.`);
          toast({
            title: "Could not start comparison",
            description: result.message,
            variant: "destructive",
          });
        }
      } catch (err) {
        if (!requestStillOwnsPicker()) return;
        // The action REJECTED rather than returning {ok:false} (network blip,
        // cold-start 500, stale-deploy Server Action). Without this the Compare
        // button spinner clears with nothing happening. Tell the user it's
        // retryable — the selection is preserved.
        Sentry.captureException(err, { tags: { feature: "compare" } });
        setErrorMessage("Something interrupted the request. Your selection is still here; check your connection and try again.");
        toast({
          title: "Could not start comparison",
          description: "Something interrupted the request. Check your connection and try again.",
          variant: "destructive",
        });
      } finally {
        if (compareRequestRef.current === requestToken) {
          compareRequestRef.current = null;
          compareRequestInFlightRef.current = false;
        }
      }
    });
  };

  return (
    <div
      className="rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-5"
      aria-busy={isPending}
    >
      {selectedCohort ? (
        <p role="status" className="mb-4 rounded-xl border border-primary/20 bg-primary/5 px-3 py-2 text-xs leading-relaxed text-muted-foreground">
          Comparing one calculation cohort: <span className="font-semibold text-foreground">{selectedDeals[0]?.methodologyLabel ?? "matching saved methodology"}</span>. Deals calculated another way stay unselectable until they are re-underwritten.
        </p>
      ) : null}
      <ul className="space-y-2">
        {deals.map((deal) => {
          const isSel = selected.includes(deal.id);
          const isMethodologyBlocked =
            !isSel &&
            (!isComparableMethodologyCohort(deal.methodologyCohort) ||
              Boolean(selectedCohort && deal.methodologyCohort !== selectedCohort));
          const methodologyDescriptionId = `compare-methodology-${deal.id}`;
          return (
            <li key={deal.id} className="rounded-xl">
              <button
                type="button"
                onClick={() => toggle(deal.id)}
                aria-pressed={isSel}
                aria-disabled={isMethodologyBlocked}
                aria-describedby={methodologyDescriptionId}
                disabled={isPending}
                className={cn(
                  "flex min-h-11 w-full items-center gap-3 rounded-xl border p-3 text-left transition disabled:cursor-wait disabled:opacity-70",
                  isSel
                    ? "border-primary bg-primary/5 ring-1 ring-primary/30"
                    : "border-border bg-background hover:border-primary/40",
                  isMethodologyBlocked && "cursor-not-allowed border-border/70 bg-muted/25 opacity-70"
                )}
              >
                <span
                  className={cn(
                    "flex size-5 shrink-0 items-center justify-center rounded-md border",
                    isSel
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-muted-foreground/40"
                  )}
                >
                  {isSel ? <Check className="size-3.5" /> : null}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold text-foreground">
                    {deal.label}
                  </span>
                  <span className="mt-0.5 block text-xs text-muted-foreground">
                    {fmtMoney(deal.netCashFlow)} · {fmtPct(deal.capRate)}
                    {/* Was ` · ${deal.signal}` — printed the internal slug
                        ("strong-buy"/"avoid") straight to the user. */}
                    {deal.signal ? ` · ${signalDisplay(deal.signal).shortLabel}` : ""}
                  </span>
                  {deal.methodologyLabel ? (
                    <span id={methodologyDescriptionId} className="mt-1 inline-flex rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                      {deal.methodologyLabel}
                    </span>
                  ) : null}
                </span>
                {deal.score != null ? (
                  <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-xs font-bold text-foreground">
                    {Math.round(deal.score)}
                  </span>
                ) : null}
              </button>
              {isMethodologyBlocked ? (
                <p className="px-3 pb-2 pt-1 text-xs leading-relaxed text-muted-foreground">
                  Different calculation record.{" "}
                  <Link
                    href={`/dashboard/new?savedDeal=${encodeURIComponent(deal.id)}`}
                    className="inline-flex min-h-11 items-center font-semibold text-primary underline underline-offset-2"
                  >
                    Re-underwrite to compare
                  </Link>
                </p>
              ) : null}
            </li>
          );
        })}
      </ul>

      {errorMessage ? (
        <p role="alert" className="mt-4 rounded-xl border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive">
          {errorMessage}
        </p>
      ) : null}

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-muted-foreground">
          {selected.length} of {MAX_COMPARE_ITEMS} selected
          {selected.length < 2 ? " - pick at least 2" : ""}
        </p>
        <button
          type="button"
          onClick={onCompare}
          disabled={!canCompare || isPending}
          className="inline-flex min-h-11 items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition disabled:opacity-40"
        >
          {isPending ? <Loader2 className="size-4 animate-spin" /> : null}
          {canCompare ? `Compare ${selected.length} deals` : "Compare"}
          {!isPending ? <ArrowRight className="size-4" /> : null}
        </button>
      </div>
      <p className="sr-only" aria-live="polite">
        {isPending
          ? "Updating comparison selection."
          : `${selected.length} comparable ${selected.length === 1 ? "deal" : "deals"} selected.`}
      </p>
    </div>
  );
}
