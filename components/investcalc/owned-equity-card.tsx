"use client";

/**
 * Owned-equity card for the CLOSED deal workspace — makes the closed-stage
 * next action ("Track your equity — add a close date") doable on the page
 * that gives it, instead of sending the user to the My Deals Completed
 * filter.
 *
 * Without a close date: an inline date input wired to
 * setSavedDealCloseDateAction. With one: the estimated-equity readout (the
 * SAME OwnedEquitySummary numbers as My Deals' OwnedEquityCell — computed
 * server-side by the page from the deal's own snapshot) plus an edit
 * affordance. router.refresh() after a save so the server recomputes.
 *
 * The page only mounts this when the close_date column is live (its tiered
 * select detects a pending migration), and the action itself degrades to
 * MIGRATION_PENDING — toast, never crash.
 */
import { useLayoutEffect, useRef, useState, useTransition } from "react";
import * as Sentry from "@sentry/nextjs";
import { useRouter } from "next/navigation";
import { Landmark } from "lucide-react";
import { setSavedDealCloseDateAction } from "@/app/actions/saved-analyses";
import { useToast } from "@/hooks/use-toast";
import { isCurrentDealWorkspaceMutation } from "@/lib/deal-workspace-mutation-lifecycle";
import { cn } from "@/lib/utils";
import type { OwnedEquitySummary } from "@/lib/owned-equity";

function fmtMoney0(n: number): string {
  return `$${Math.round(n).toLocaleString("en-US")}`;
}

function fmtCloseDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-US", { month: "short", year: "numeric", timeZone: "UTC" });
}

export function OwnedEquityCard({
  savedDealId,
  closeDate,
  equity,
}: {
  savedDealId: string;
  closeDate: string | null;
  /** Server-computed from the deal's own snapshot; null until closeDate is set
   *  (or when the legacy snapshot doesn't validate — then only the date shows). */
  equity: OwnedEquitySummary | null;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [isSaving, startSaving] = useTransition();
  const [editing, setEditing] = useState(false);
  const savedDealIdRef = useRef<string | null>(savedDealId);
  const mutationRequestRef = useRef<symbol | null>(null);

  useLayoutEffect(() => {
    savedDealIdRef.current = savedDealId;
    mutationRequestRef.current = null;
    // This input is uncontrolled so its in-progress raw value belongs to the
    // deal where editing began. Never carry it into a reused dynamic route.
    setEditing(false);
    return () => {
      if (savedDealIdRef.current !== savedDealId) return;
      savedDealIdRef.current = null;
      mutationRequestRef.current = null;
    };
  }, [savedDealId]);

  const save = (value: string | null) => {
    const dealAtSubmit = savedDealId;
    const requestToken = Symbol("owned-equity-close-date-save");
    mutationRequestRef.current = requestToken;
    const requestStillOwnsDeal = () =>
      isCurrentDealWorkspaceMutation({
        submittedDealId: dealAtSubmit,
        currentDealId: savedDealIdRef.current,
        requestToken,
        currentRequestToken: mutationRequestRef.current,
      });
    startSaving(async () => {
      try {
        const r = await setSavedDealCloseDateAction(dealAtSubmit, value);
        if (!requestStillOwnsDeal()) return;
        if (r.ok) {
          setEditing(false);
          router.refresh();
        } else if (r.code === "MIGRATION_PENDING") {
          toast({ title: "Rolling out", description: "Owned-deal equity tracking isn't enabled yet." });
        } else {
          toast({ title: "Couldn't save close date", description: r.message, variant: "destructive" });
        }
      } catch (err) {
        // The action REJECTED rather than returning {ok:false} (network blip,
        // cold-start 500, stale-deploy Server Action). Without this the date
        // input's spinner clears with no signal and the date never persists.
        // Tell the user it's retryable.
        Sentry.captureException(err, { tags: { feature: "owned-equity" } });
        if (!requestStillOwnsDeal()) return;
        toast({
          title: "Couldn't save close date",
          description: "Something interrupted the request. Check your connection and try again.",
          variant: "destructive",
        });
      } finally {
        if (mutationRequestRef.current === requestToken) {
          mutationRequestRef.current = null;
        }
      }
    });
  };

  // Commit on blur/Enter, NOT on change: date inputs fire onChange per
  // keystroke segment — a Backspace mid-edit would CLEAR the persisted
  // date, and typing a year commits absurd values like 0001 before the
  // user finishes. Blur/Enter is the "I'm done" signal; obviously-partial
  // years (< 1900) are ignored rather than saved.
  const commit = (raw: string) => {
    const value = raw || null;
    if (value && Number(value.slice(0, 4)) < 1900) return;
    if (value === closeDate || (!value && !closeDate)) return;
    save(value);
  };
  const dateInput = (
    <input
      type="date"
      defaultValue={closeDate ?? undefined}
      min="1900-01-01"
      max={new Date().toISOString().slice(0, 10)}
      disabled={isSaving}
      onBlur={(e) => commit(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === "Enter") commit((e.target as HTMLInputElement).value);
      }}
      aria-label="Close date"
      className="h-8 rounded-lg border border-input bg-background px-2 text-xs text-foreground"
    />
  );

  return (
    <section
      id="owned-equity"
      aria-label="Owned equity"
      className="rounded-2xl border border-border bg-card p-4"
    >
      <div className="flex items-center gap-2">
        <Landmark aria-hidden className="size-4 text-muted-foreground" />
        <h2 className="text-sm font-bold text-foreground">Owned equity</h2>
      </div>

      {closeDate ? (
        <div className="mt-2 space-y-1.5 text-xs">
          {equity ? (
            <>
              <p
                className={cn(
                  "text-base font-extrabold tracking-tight",
                  equity.equity >= 0 ? "text-success" : "text-[var(--metric-negative)]"
                )}
              >
                Equity ~{fmtMoney0(equity.equity)}
              </p>
              <p className="text-muted-foreground">
                {fmtMoney0(equity.downPayment)} down · {fmtMoney0(equity.appreciationGain)}{" "}
                appreciation · {fmtMoney0(equity.principalPaid)} paid down
              </p>
            </>
          ) : null}
          <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-muted-foreground">
            Closed {fmtCloseDate(closeDate)}
            {editing ? (
              dateInput
            ) : (
              <button
                type="button"
                onClick={() => setEditing(true)}
                className="font-semibold text-primary hover:underline"
              >
                Edit
              </button>
            )}
          </p>
        </div>
      ) : (
        <div className="mt-2 space-y-1.5 text-xs">
          <p className="text-muted-foreground">
            Add your close date to estimate today&apos;s equity — appreciation plus principal paid
            down since you closed.
          </p>
          {editing ? (
            dateInput
          ) : (
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="font-semibold text-primary hover:underline"
            >
              + Add close date to track equity
            </button>
          )}
        </div>
      )}
    </section>
  );
}
