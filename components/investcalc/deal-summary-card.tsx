"use client";

/**
 * "AI summary" — one-tap, grounded narrative summary of the current analysis,
 * rendered alongside Deal Q&A under the recommendation row.
 *
 * Design constraints (deliberate):
 *  - One button, summary renders inline. No new tab, no modal, nothing to learn.
 *  - The summary is deterministic from the deal's numbers + cached server-side
 *    per input-hash, so re-opening the same deal is free. Editing the form and
 *    re-running remounts us via the parent's key, clearing the stale summary.
 *  - Everyone gets a few free summaries/day (enforced server-side); the upsell
 *    surfaces only when the limit hits.
 */

import { useState } from "react";
import { Loader2, Sparkles, WandSparkles } from "lucide-react";
import Link from "next/link";
import { generateDealSummaryAction } from "@/app/actions/deal-summary";
import { trackEvent } from "@/lib/analytics";
import type { DealQaExtraContext } from "@/lib/deal-qa-context";
import type { InvestmentFormValues } from "@/lib/investcalc-schema";

export function DealSummaryCard({
  values,
  context,
}: {
  values: InvestmentFormValues;
  /** Optional grounding depth (buy box / Offer Ceiling / projection / comps) already
   *  computed on the dashboard — the summary can then speak to the user's
   *  own criteria. Absent pieces are omitted. */
  context?: DealQaExtraContext;
}) {
  const [summary, setSummary] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [limitHit, setLimitHit] = useState(false);

  const generate = async () => {
    if (isGenerating) return;
    setIsGenerating(true);
    setNotice(null);
    trackEvent("deal_summary_generated", {});
    try {
      const result = await generateDealSummaryAction({ values, context });
      if (result.ok) {
        setSummary(result.summary);
        if (result.remainingToday !== null && result.remainingToday <= 1) {
          setNotice(
            result.remainingToday === 0
              ? "That was your last free summary today."
              : "1 free summary left today."
          );
        }
      } else if (result.code === "RATE_LIMITED") {
        setLimitHit(true);
      } else {
        setNotice(result.message);
      }
    } catch {
      setNotice("Couldn't generate a summary right now. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-5">
      <div className="flex items-center justify-between gap-2">
        <p className="flex items-center gap-2 text-sm font-bold text-foreground">
          <span className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <WandSparkles className="size-4" />
          </span>
          AI summary
          <span className="rounded-full bg-muted px-1.5 py-0.5 text-[9px] font-extrabold uppercase tracking-widest text-muted-foreground">
            Beta
          </span>
        </p>
        {summary && !limitHit ? (
          <button
            type="button"
            onClick={() => void generate()}
            disabled={isGenerating}
            className="text-[11px] font-semibold text-primary hover:underline disabled:opacity-50"
          >
            Regenerate
          </button>
        ) : null}
      </div>

      {summary ? (
        <p className="mt-3 whitespace-pre-line rounded-xl bg-muted/40 px-3 py-2.5 text-sm leading-relaxed text-foreground">
          {summary}
        </p>
      ) : limitHit ? (
        <div className="mt-3 flex flex-col gap-2 rounded-xl border border-primary/25 bg-[var(--brand-blue-light)] p-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs leading-relaxed text-foreground">
            You&apos;ve used today&apos;s free AI summaries. Pro includes unlimited summaries on
            every analysis.
          </p>
          <Link
            href="/pricing"
            className="inline-flex shrink-0 items-center gap-1 text-xs font-bold text-primary hover:underline"
          >
            <Sparkles className="size-3.5" />
            See Pro
          </Link>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => void generate()}
          disabled={isGenerating}
          className="mt-3 inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground transition hover:opacity-90 disabled:opacity-50"
        >
          {isGenerating ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              Writing summary…
            </>
          ) : (
            <>
              <WandSparkles className="size-4" />
              Summarize this deal
            </>
          )}
        </button>
      )}

      {notice && <p className="mt-2 text-[11px] text-muted-foreground">{notice}</p>}
      <p className="mt-2 text-[10px] leading-relaxed text-muted-foreground">
        Generated from this analysis&apos;s numbers only. Not financial advice.
      </p>
    </div>
  );
}
