"use client";

/**
 * Buy Box verdict — inline card that shows whether the current deal
 * meets the user's saved acquisition criteria. COMPLEMENTS the Deal
 * Score (never replaces it). Renders nothing unless:
 *   - the user is authenticated (gated by `enabled`, so the public
 *     homepage analyzer never fires the fetch), AND
 *   - they're on Pro with an active Buy Box that has ≥1 criterion.
 * This keeps the feature "invisible until useful" — free users and
 * users without a Buy Box see no empty state here; they configure it
 * in Settings.
 */
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Check, Minus, Target, X } from "lucide-react";
import { getBuyBoxAction } from "@/app/actions/user-buy-box";
import {
  buyBoxHasCriteria,
  evaluateBuyBox,
  type BuyBoxCriteria,
  type BuyBoxDealMetrics,
} from "@/lib/buy-box";
import { cn } from "@/lib/utils";

export function BuyBoxVerdictCard({
  enabled,
  metrics,
}: {
  enabled: boolean;
  metrics: BuyBoxDealMetrics | null;
}) {
  const [criteria, setCriteria] = useState<BuyBoxCriteria | null>(null);

  useEffect(() => {
    if (!enabled) {
      setCriteria(null);
      return;
    }
    let cancelled = false;
    void getBuyBoxAction()
      .then((result) => {
        if (cancelled) return;
        // Only adopt the criteria when the user can actually use the
        // feature, has switched it on, and has set at least one rule.
        if (result.ok && result.canUse && result.criteria.isActive && buyBoxHasCriteria(result.criteria)) {
          setCriteria(result.criteria);
        } else {
          setCriteria(null);
        }
      })
      .catch((err) => {
        // Non-critical — swallow so it doesn't surface as Sentry noise.
        if (!cancelled) console.warn("[buy-box-verdict] load failed:", err);
      });
    return () => {
      cancelled = true;
    };
  }, [enabled]);

  const result = useMemo(
    () => (criteria && metrics ? evaluateBuyBox(criteria, metrics) : null),
    [criteria, metrics]
  );

  if (!result || !result.active) return null;

  const headline = result.passes
    ? "Meets your buy box"
    : result.failedLabels.length > 0
      ? `Misses on ${result.failedLabels.join(", ")}`
      : "Can't evaluate on this deal yet";
  const applicableCount = result.checks.filter((c) => c.pass !== null).length;

  return (
    <section
      aria-label="Buy box verdict"
      className={cn(
        "rounded-2xl border p-4 sm:p-5",
        result.passes
          ? "border-[var(--brand-green)]/30 bg-[var(--brand-green-light)]"
          : result.failedLabels.length > 0
            ? "border-amber-300 bg-amber-50"
            : "border-border bg-muted/20"
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Target className="size-4 text-muted-foreground" />
          <h3 className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
            Your buy box
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

      <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1">
        <span
          className={cn(
            "flex size-6 shrink-0 items-center justify-center rounded-full",
            result.passes ? "bg-[var(--brand-green)] text-white" : "bg-amber-500 text-white"
          )}
        >
          {result.passes ? <Check className="size-3.5" /> : <X className="size-3.5" />}
        </span>
        <p
          className={cn(
            "text-base font-bold",
            result.passes ? "text-[var(--brand-green)]" : "text-amber-800"
          )}
        >
          {headline}
        </p>
        <span className="text-xs text-muted-foreground">
          {result.passedCount}/{applicableCount} criteria met
        </span>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
        {result.checks.map((c) => (
          <div
            key={c.id}
            className="rounded-lg border border-border/70 bg-card px-2.5 py-1.5"
          >
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
