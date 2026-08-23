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
import { ArrowRight, Lock, X, FileDown, Calculator, Target, TrendingUp } from "lucide-react";
import { trackEvent } from "@/lib/analytics";
import { getMarketingOfferConfig } from "@/lib/marketing-offer-config";
import { scrollBehavior } from "@/lib/utils";
import { usePostCheckoutUpsellSuppression } from "@/hooks/use-post-checkout-upsell-suppression";
import { GuaranteeBadge } from "@/components/marketing/guarantee-badge";

interface MomentOfValueUpsellProps {
  purchasePrice: number;
  netCashFlow: number;
  capRate: number;
  cocReturn: number;
  decisionTone: "blocked" | "review" | "ready";
  /** True when the viewer is already on a paid plan; if so we render nothing. */
  isPaid: boolean;
  /** Triggers the one-time Deal Decision Pack chooser for free users.
   *  When provided, the one-time next-step is shown so the
   *  visitor isn't funneled only toward Pro. */
  onExportPdf?: () => void;
}

const fmtMoney = (n: number) => {
  const abs = Math.abs(Math.round(n)).toLocaleString("en-US");
  return n < 0 ? `-$${abs}` : `$${abs}`;
};

export function MomentOfValueUpsell({
  purchasePrice,
  netCashFlow,
  capRate,
  cocReturn,
  decisionTone,
  isPaid,
  onExportPdf,
}: MomentOfValueUpsellProps) {
  const [dismissed, setDismissed] = useState(false);
  const { proOfferName, singleDeal } = getMarketingOfferConfig();

  // Post-checkout suppression: while BillingSuccessBanner is confirming a
  // fresh purchase (billing=success poll pending), render nothing — a buyer
  // must never see a trial pitch seconds after paying. Fails OPEN to false
  // (upsell behaves exactly as today) for everyone else.
  const suppressed = usePostCheckoutUpsellSuppression();

  // Upsell attribution — fire once when this post-analysis upsell actually
  // renders (free user). Pairs with upsell_prompt_clicked on the Pro CTA to
  // measure moment-of-value → checkout. Effect runs before the early return
  // below so the Rules of Hooks hold.
  const fired = useRef(false);
  useEffect(() => {
    if (isPaid || suppressed || fired.current) return;
    fired.current = true;
    trackEvent("upsell_prompt_shown", { feature: "moment_of_value", placement: "post_analysis" });
    trackEvent("upgrade_modal_viewed", { feature: "max_offer", placement: "post_analysis" });
    trackEvent("max_offer_teaser_viewed", { placement: "post_analysis", decision_tone: decisionTone });
  }, [decisionTone, isPaid, suppressed]);

  if (isPaid || dismissed || suppressed) return null;

  // "Keep editing" — jump back to the form so refining a default and
  // rerunning is one click from the numbers the user is judging.
  const handleKeepEditing = () => {
    if (typeof window === "undefined") return;
    const el = document.getElementById("main");
    if (el) window.scrollTo({ top: el.offsetTop - 64, behavior: scrollBehavior() });
  };

  return (
    <div className="rounded-2xl border-2 border-primary/30 bg-gradient-to-br from-[var(--brand-blue-light)] via-card to-card p-5 shadow-[0_12px_36px_rgba(0,112,196,0.10)] sm:p-6">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-primary px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-widest text-primary-foreground">
            <TrendingUp className="size-3" />
            Free screen complete
          </span>
          <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
            decide + act with Pro
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
        {decisionTone === "blocked"
          ? "This deal misses at the current price. Find the price where it starts working."
          : decisionTone === "review"
            ? "This deal is close. Find the exact price that clears your targets."
            : "This deal clears the first screen. Protect the upside with a hard offer ceiling."}
      </h3>
      <p className="mt-2 text-sm text-muted-foreground">
        Decide before you negotiate—not after the list price anchors you.
      </p>

      {/* Everything here is a value already visible in the free analysis.
          The gated result itself is never approximated or leaked. */}
      <div className="mt-4 grid grid-cols-1 gap-2.5 sm:grid-cols-3 sm:gap-3">
        <FeatureChip
          icon={Calculator}
          label="List price"
          value={fmtMoney(purchasePrice)}
          sub="current asking price"
        />
        <FeatureChip
          icon={TrendingUp}
          label="Screened cash flow"
          value={`${fmtMoney(netCashFlow)}/mo`}
          sub={`${capRate.toFixed(1)}% cap · ${cocReturn.toFixed(1)}% CoC`}
        />
        <FeatureChip
          icon={FileDown}
          label="Decision package"
          value="Ready to unlock"
          sub="offer · downside · report"
        />
      </div>

      <div className="mt-4 rounded-2xl border-2 border-primary/35 bg-card p-4 sm:p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-widest text-primary">
              <Target className="size-3.5" /> Interactive target solver
            </div>
            <div className="mt-1 flex items-center gap-2 text-2xl font-extrabold text-foreground">
              <Lock className="size-5 text-primary" aria-hidden /> Unlock
            </div>
          </div>
          <span className="rounded-full bg-primary/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-primary">
            Pro decision
          </span>
        </div>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          Your result includes a fixed price ceiling for the displayed criteria.
          Upgrade to change cash-flow, cash-on-cash, cap-rate, or DSCR targets
          and re-solve the ceiling instantly.
        </p>
      </div>

      {/* Next steps — three clear paths so the visitor isn't funneled only
          toward Pro: keep refining (free), buy one decision package, or upgrade
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
            onClick={() => {
              trackEvent("max_offer_unlock_clicked", { placement: "post_analysis", offer: "single_deal" });
              onExportPdf();
            }}
            className="flex w-full items-start gap-2.5 rounded-xl border border-border bg-card p-3 text-left text-sm transition-colors hover:bg-muted"
          >
            <FileDown className="mt-0.5 size-4 shrink-0 text-[var(--brand-green)]" />
            <span className="text-foreground">
              <strong>Deal Decision Pack — {singleDeal.priceLabel}</strong> — get this
              property&apos;s Max Offer, Deal Doctor thresholds, downside, projections,
              and complete report. No subscription.
            </span>
          </button>
        ) : null}

        <Link
          href="/pricing"
          onClick={() => {
            trackEvent("max_offer_view_attempted", { placement: "post_analysis" });
            trackEvent("max_offer_unlock_clicked", { placement: "post_analysis", offer: "pro" });
            trackEvent("upsell_prompt_clicked", { feature: "max_offer", placement: "post_analysis" });
          }}
          className="group flex w-full items-start gap-2.5 rounded-xl border-2 border-primary/40 bg-primary/5 p-3 text-left text-sm transition-colors hover:bg-primary/10"
        >
          <Lock className="mt-0.5 size-4 shrink-0 text-primary" />
          <span className="flex-1 text-foreground">
            <strong>Tune your price ceiling with {proOfferName}</strong> — set your Buy Box,
            stress-test downside, compare opportunities, and act on the best ones.
          </span>
          <ArrowRight className="mt-0.5 size-4 shrink-0 text-primary transition-transform group-hover:translate-x-0.5" />
        </Link>
          <GuaranteeBadge align="start" className="mt-3" />
      </div>

      {/* Inline note — softens the upsell */}
      <p className="mt-4 border-t border-border/60 pt-3 text-[11px] text-muted-foreground">
        Cash flow {fmtMoney(netCashFlow)}/mo · cap {capRate.toFixed(1)}% · CoC {cocReturn.toFixed(1)}%.
        Calculations are estimates based on your inputs. Verify assumptions independently before making an offer.
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
