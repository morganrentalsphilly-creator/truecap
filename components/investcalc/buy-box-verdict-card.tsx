"use client";

/**
 * Buy Box verdict — inline card that shows whether the current deal meets the
 * user's saved acquisition criteria. COMPLEMENTS the Deal Score (never
 * replaces it). With multiple buy boxes (DM-2) it screens the deal against
 * every active box, shows a "meets N of M" summary, and details the default
 * box's per-criterion checks. Renders nothing unless:
 *   - the user is authenticated (gated by `enabled`), AND
 *   - they're on Pro with ≥1 active buy box that has criteria.
 * Invisible-until-useful: free users / users without a buy box see nothing.
 */
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Check, Minus, Target, X } from "lucide-react";
import { listBuyBoxesAction } from "@/app/actions/user-buy-boxes";
import {
  buyBoxHasCriteria,
  evaluateBuyBoxes,
  summarizeBuyBoxFit,
  type BuyBoxDealMetrics,
  type NamedBuyBox,
} from "@/lib/buy-box";
import { cn } from "@/lib/utils";

export function BuyBoxVerdictCard({
  enabled,
  metrics,
}: {
  enabled: boolean;
  metrics: BuyBoxDealMetrics | null;
}) {
  const [boxes, setBoxes] = useState<NamedBuyBox[] | null>(null);

  useEffect(() => {
    if (!enabled) {
      setBoxes(null);
      return;
    }
    let cancelled = false;
    void listBuyBoxesAction()
      .then((result) => {
        if (cancelled) return;
        // Only adopt boxes the user can use, that are switched on and have ≥1 rule.
        if (result.ok && result.canUse) {
          setBoxes(result.boxes.filter((b) => b.isActive && buyBoxHasCriteria(b)));
        } else {
          setBoxes(null);
        }
      })
      .catch((err) => {
        if (!cancelled) console.warn("[buy-box-verdict] load failed:", err);
      });
    return () => {
      cancelled = true;
    };
  }, [enabled]);

  const evaluated = useMemo(() => {
    if (!boxes || boxes.length === 0 || !metrics) return null;
    const results = evaluateBuyBoxes(boxes, metrics).filter((r) => r.result.active);
    if (results.length === 0) return null;
    return { results, summary: summarizeBuyBoxFit(results) };
  }, [boxes, metrics]);

  if (!evaluated) return null;

  // Detail the default box (the action returns default-first).
  const primary = evaluated.results[0]!;
  const r = primary.result;
  const multi = evaluated.results.length > 1;
  const { summary } = evaluated;

  const headline = r.passes
    ? "Meets your buy box"
    : r.failedLabels.length > 0
      ? `Misses on ${r.failedLabels.join(", ")}`
      : "Can't evaluate on this deal yet";
  const applicableCount = r.checks.filter((c) => c.pass !== null).length;

  return (
    <section
      aria-label="Buy box verdict"
      className={cn(
        "rounded-2xl border p-4 sm:p-5",
        r.passes
          ? "border-[var(--brand-green)]/30 bg-[var(--brand-green-light)]"
          : r.failedLabels.length > 0
            ? "border-amber-300 bg-amber-50"
            : "border-border bg-muted/20"
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Target className="size-4 text-muted-foreground" />
          <h3 className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
            {multi ? "Your buy boxes" : "Your buy box"}
          </h3>
        </div>
        <Link
          href="/settings"
          prefetch={false}
          className="text-xs font-semibold text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
        >
          Edit
        </Link>
      </div>

      {multi ? (
        <p className="mt-2 text-xs font-semibold text-muted-foreground">
          Meets{" "}
          <span className={summary.passingCount > 0 ? "text-[var(--brand-green)]" : "text-amber-700"}>
            {summary.passingCount} of {summary.activeCount}
          </span>{" "}
          of your buy boxes
        </p>
      ) : null}

      <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1">
        <span
          className={cn(
            "flex size-6 shrink-0 items-center justify-center rounded-full",
            r.passes ? "bg-[var(--brand-green)] text-white" : "bg-amber-500 text-white"
          )}
        >
          {r.passes ? <Check className="size-3.5" /> : <X className="size-3.5" />}
        </span>
        <p className={cn("text-base font-bold", r.passes ? "text-[var(--brand-green)]" : "text-amber-800")}>
          {headline}
        </p>
        {multi ? (
          <span className="rounded-full border border-border bg-card px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
            {primary.box.name}
          </span>
        ) : null}
        <span className="text-xs text-muted-foreground">
          {r.passedCount}/{applicableCount} criteria met
        </span>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
        {r.checks.map((c) => (
          <div key={c.id} className="rounded-lg border border-border/70 bg-card px-2.5 py-1.5">
            <div className="flex items-center justify-between gap-1">
              <span className="text-[11px] font-semibold text-foreground">{c.label}</span>
              {c.pass === true ? (
                <Check className="size-3.5 text-[var(--brand-green)]" />
              ) : c.pass === false ? (
                <X className="size-3.5 text-red-600" />
              ) : (
                <Minus className="size-3.5 text-muted-foreground" />
              )}
            </div>
            <div className="mt-0.5 text-[11px] text-muted-foreground">
              <span className="font-medium text-foreground">{c.actual}</span>{" "}
              <span className="text-muted-foreground/70">vs {c.target}</span>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
