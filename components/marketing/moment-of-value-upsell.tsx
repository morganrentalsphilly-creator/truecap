"use client";

/**
 * "Moment of value" Pro upsell that appears AFTER a successful free-tier
 * analysis in the dashboard. The pitch uses the actual deal numbers
 * so the offer feels relevant rather than generic.
 *
 * Renders only when:
 *  - the user is on a free plan (canUseProjections === false)
 *  - the analysis has produced a non-trivial result
 *  - the user hasn't dismissed it for this session
 */

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowRight, Lock, X, FileDown, Calculator, TrendingUp } from "lucide-react";
import { trackEvent } from "@/lib/analytics";
import { TRIAL_LABEL } from "@/lib/trial";

interface MomentOfValueUpsellProps {
  netCashFlow: number;
  capRate: number;
  cocReturn: number;
  /** Approximate annual depreciation savings — used as the Pro hook. */
  estimatedAnnualTaxSavings: number;
  /** True when the viewer is already on a paid plan; if so we render nothing. */
  isPaid: boolean;
  /** Triggers the PDF export flow (the $5 one-time chooser for free users).
   *  When provided, the "Export this PDF — $5" next-step is shown so the
   *  visitor isn't funneled only toward Pro. */
  onExportPdf?: () => void;
}

const fmtMoney = (n: number) => {
  const abs = Math.abs(Math.round(n)).toLocaleString("en-US");
  return n < 0 ? `-$${abs}` : `$${abs}`;
};

export function MomentOfValueUpsell({
  netCashFlow,
  capRate,
  cocReturn,
  estimatedAnnualTaxSavings,
  isPaid,
  onExportPdf,
}: MomentOfValueUpsellProps) {
  const [dismissed, setDismissed] = useState(false);

  // Upsell attribution — fire once when this post-analysis upsell actually
  // renders (free user). Pairs with upsell_prompt_clicked on the Pro CTA to
  // measure moment-of-value → checkout. Effect runs before the early return
  // below so the Rules of Hooks hold.
  const fired = useRef(false);
  useEffect(() => {
    if (isPaid || fired.current) return;
    fired.current = true;
    trackEvent("upsell_prompt_shown", { feature: "moment_of_value", placement: "post_analysis" });
  }, [isPaid]);

  if (isPaid || dismissed) return null;

  // "Keep editing" — jump back to the form so refining a default and
  // rerunning is one click from the numbers the user is judging.
  const handleKeepEditing = () => {
    if (typeof window === "undefined") return;
    const el = document.getElementById("main");
    if (el) window.scrollTo({ top: el.offsetTop - 64, behavior: "smooth" });
  };

  // Choose a personalized hook based on the actual numbers
  const positiveCF = netCashFlow >= 0;
  const strongCap = capRate >= 7;
  const headline = positiveCF
    ? strongCap
      ? "This deal looks strong. See the full 10-year picture."
      : "Solid cash flow today. How does it compound over 10 years?"
    : "Tight on cash flow today — does the tax shield close the gap?";

  return (
    <div className="rounded-2xl border-2 border-primary/30 bg-gradient-to-br from-[var(--brand-blue-light)] via-card to-card p-5 shadow-[0_12px_36px_rgba(0,112,196,0.10)] sm:p-6">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-primary px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-widest text-primary-foreground">
            <TrendingUp className="size-3" />
            Next steps
          </span>
          <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
            for this deal
          </span>
        </div>
        <button
          type="button"
          onClick={() => setDismissed(true)}
          aria-label="Dismiss upgrade prompt"
          className="rounded-full p-1 text-muted-foreground/60 transition-colors hover:bg-muted hover:text-foreground"
        >
          <X className="size-4" />
        </button>
      </div>

      <h3 className="mt-3 text-lg font-extrabold leading-tight tracking-tight text-foreground sm:text-2xl">
        {headline}
      </h3>

      {/* Pro feature preview row — uses this deal's numbers */}
      <div className="mt-4 grid grid-cols-1 gap-2.5 sm:grid-cols-3 sm:gap-3">
        <FeatureChip
          icon={TrendingUp}
          label="10-Year cumulative"
          value={positiveCF ? `≈ ${fmtMoney(netCashFlow * 12 * 10 * 1.18)}` : "Live projection"}
          sub="modeled with rent growth"
        />
        <FeatureChip
          icon={Calculator}
          label="Est. annual tax savings"
          value={`≈ ${fmtMoney(estimatedAnnualTaxSavings)}/yr`}
          sub="depreciation + interest"
        />
        <FeatureChip
          icon={FileDown}
          label="Lender-ready PDF"
          value="1 click"
          sub="verdict + charts + tables"
        />
      </div>

      {/* Next steps — three clear paths so the visitor isn't funneled only
          toward Pro: keep refining (free), send one $5 report, or upgrade
          for the repeat workflow. */}
      <div className="mt-5 space-y-2.5">
        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
          Next steps
        </p>

        <button
          type="button"
          onClick={handleKeepEditing}
          className="flex w-full items-start gap-2.5 rounded-xl border border-border bg-card p-3 text-left text-sm transition-colors hover:bg-muted"
        >
          <Calculator className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
          <span className="text-foreground">
            <strong>Keep editing</strong> — refine assumptions and rerun the numbers.
          </span>
        </button>

        {onExportPdf ? (
          <button
            type="button"
            onClick={onExportPdf}
            className="flex w-full items-start gap-2.5 rounded-xl border border-border bg-card p-3 text-left text-sm transition-colors hover:bg-muted"
          >
            <FileDown className="mt-0.5 size-4 shrink-0 text-[var(--brand-green)]" />
            <span className="text-foreground">
              <strong>Export this PDF — $5</strong> — a lender-ready report for this one
              deal. No subscription.
            </span>
          </button>
        ) : null}

        <Link
          href="/pricing"
          onClick={() =>
            trackEvent("upsell_prompt_clicked", { feature: "moment_of_value", placement: "post_analysis" })
          }
          className="group flex w-full items-start gap-2.5 rounded-xl border-2 border-primary/40 bg-primary/5 p-3 text-left text-sm transition-colors hover:bg-primary/10"
        >
          <Lock className="mt-0.5 size-4 shrink-0 text-primary" />
          <span className="flex-1 text-foreground">
            <strong>Start your {TRIAL_LABEL} — Pro</strong> — save, compare &amp; export
            unlimited, reuse assumptions, brand reports. Cancel anytime.
          </span>
          <ArrowRight className="mt-0.5 size-4 shrink-0 text-primary transition-transform group-hover:translate-x-0.5" />
        </Link>
      </div>

      {/* Inline note — softens the upsell */}
      <p className="mt-4 border-t border-border/60 pt-3 text-[11px] text-muted-foreground">
        Cash flow {fmtMoney(netCashFlow)}/mo · cap {capRate.toFixed(1)}% · CoC {cocReturn.toFixed(1)}% — the
        numbers above are estimates for this specific deal based on standard 27.5-yr depreciation and 2.5% rent growth.
      </p>
    </div>
  );
}

function FeatureChip({
  icon: Icon,
  label,
  value,
  sub,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  sub: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-3">
      <div className="flex items-center gap-1.5">
        <Icon className="size-3.5 text-primary" />
        <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
          {label}
        </span>
      </div>
      <div className="mt-1 text-base font-extrabold tabular-nums text-foreground">{value}</div>
      <div className="text-[11px] text-muted-foreground">{sub}</div>
    </div>
  );
}
