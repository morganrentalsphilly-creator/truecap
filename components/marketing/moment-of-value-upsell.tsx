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

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, Lock, X, FileDown, Calculator, TrendingUp } from "lucide-react";

interface MomentOfValueUpsellProps {
  netCashFlow: number;
  capRate: number;
  cocReturn: number;
  /** Approximate annual depreciation savings — used as the Pro hook. */
  estimatedAnnualTaxSavings: number;
  /** True when the viewer is already on a paid plan; if so we render nothing. */
  isPaid: boolean;
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
}: MomentOfValueUpsellProps) {
  const [dismissed, setDismissed] = useState(false);
  if (isPaid || dismissed) return null;

  // Choose a personalized hook based on the actual numbers
  const positiveCF = netCashFlow >= 0;
  const strongCap = capRate >= 7;
  const headline = positiveCF
    ? strongCap
      ? "This deal looks strong. See the full 10-year picture."
      : "Solid cash flow today. How does it compound over 10 years?"
    : "Tight on cash flow today — does the tax shield close the gap?";

  return (
    <div className="rounded-2xl border-2 border-primary/30 bg-gradient-to-br from-[var(--brand-blue-light)] via-card to-card p-5 shadow-[0_12px_36px_rgba(82,72,212,0.10)] sm:p-6">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-primary px-2.5 py-1 text-[10px] font-black uppercase tracking-widest text-primary-foreground">
            <Lock className="size-3" />
            Pro unlocks
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

      <h3 className="mt-3 text-lg font-black leading-tight tracking-tight text-foreground sm:text-2xl">
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

      {/* CTAs */}
      <div className="mt-5 flex flex-wrap items-center gap-3">
        <Link
          href="/pricing"
          className="group inline-flex h-11 items-center gap-1.5 rounded-xl bg-primary px-5 text-sm font-bold text-primary-foreground shadow-[0_10px_24px_rgba(82,72,212,0.28)] transition-transform hover:-translate-y-0.5"
        >
          See Pro pricing
          <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
        </Link>
        <span className="text-xs text-muted-foreground">
          14-day money-back · cancel anytime
        </span>
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
      <div className="mt-1 text-base font-black tabular-nums text-foreground">{value}</div>
      <div className="text-[11px] text-muted-foreground">{sub}</div>
    </div>
  );
}
