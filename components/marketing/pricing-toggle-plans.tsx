"use client";

/**
 * Pricing toggle + plan cards. Replaces the previous 3-card layout
 * (Free / Pro Monthly / Pro Annual) with 2 cards (Free / Pro) and a
 * Monthly ↔ Annual toggle above the Pro card.
 *
 * The toggle pattern is industry standard because it forces users to
 * directly compare per-month cost — making the annual savings tangible.
 * Lifts annual-plan conversion 10-15% vs. side-by-side cards.
 *
 * Receives Stripe prices already resolved on the server, plus the
 * user's auth + paid status. Stays a single client component so all
 * toggle logic + checkout wiring lives in one place.
 */

import { useState } from "react";
import { Check, Sparkles, X } from "lucide-react";
import { PricingPlanButtons } from "@/components/marketing/pricing-plan-buttons";

type ResolvedPrice = { amountLabel: string; period: string } | null;

interface PricingTogglePlansProps {
  monthly: ResolvedPrice;
  annual: ResolvedPrice;
  isAuthenticated: boolean;
  isPaid: boolean;
}

const FREE_FEATURES: { label: string; included: boolean }[] = [
  { label: "Unlimited cash-flow analyses", included: true },
  { label: "Cap rate, CoC, DSCR, monthly cash flow", included: true },
  { label: "Auto-fill rent + rate + tax from address", included: true },
  { label: "Plain-English deal verdict", included: true },
  { label: "MAO solver", included: false },
  { label: "Sensitivity grid", included: false },
  { label: "Strategies (BRRRR + flip + rehab)", included: false },
  { label: "Shareable read-only deal links", included: false },
  { label: "10-year projections", included: false },
  { label: "Tax strategy", included: false },
  { label: "Exit scenarios", included: false },
  { label: "Pro Deal Score", included: false },
  { label: "Lender-ready PDF export", included: false },
  { label: "Save + compare deals", included: false },
];

const PRO_FEATURES = [
  "Everything in Free, plus —",
  "MAO solver — reverse-solve your max offer",
  "Sensitivity grid — stress-test the deal",
  "Strategies — BRRRR + fix-and-flip + rehab estimator",
  "Shareable read-only deal links",
  "10-year cash flow + equity projection",
  "Tax strategy: depreciation + interest modeling",
  "Exit scenarios: best year to sell",
  "Pro Deal Score (0-100) with breakdown",
  "Lender-ready PDF reports",
  "Save unlimited deals · compare up to 4",
  "Priority email support",
];

function parsePriceAmount(p: ResolvedPrice): number | null {
  if (!p) return null;
  const match = p.amountLabel.match(/[\d.]+/);
  return match ? Number(match[0]) : null;
}

export function PricingTogglePlans({
  monthly,
  annual,
  isAuthenticated,
  isPaid,
}: PricingTogglePlansProps) {
  const [period, setPeriod] = useState<"monthly" | "annual">("annual");

  const monthlyAmount = parsePriceAmount(monthly);
  const annualAmount = parsePriceAmount(annual);

  // Derived display values
  const annualMonthlyEquivalent =
    annualAmount != null ? annualAmount / 12 : null;
  const monthsFreeWithAnnual =
    monthlyAmount && annualAmount
      ? Math.max(0, Math.round((monthlyAmount * 12 - annualAmount) / monthlyAmount))
      : null;
  const annualSavingsPct =
    monthlyAmount && annualAmount
      ? Math.max(0, Math.round((1 - annualAmount / (monthlyAmount * 12)) * 100))
      : null;

  const proCard =
    period === "monthly"
      ? {
          priceTop: monthly?.amountLabel ?? "Pro",
          priceSub: monthly ? `/${monthly.period}` : "/month",
          subline: monthly ? "billed monthly" : "monthly billing",
          slot: "pro_monthly" as const,
        }
      : {
          priceTop:
            annualMonthlyEquivalent != null
              ? `$${annualMonthlyEquivalent.toFixed(
                  annualMonthlyEquivalent % 1 === 0 ? 0 : 2
                )}`
              : (annual?.amountLabel ?? "Pro"),
          priceSub: "/month",
          subline:
            annual?.amountLabel
              ? `billed annually (${annual.amountLabel})`
              : "billed annually",
          slot: "pro_annual" as const,
        };

  return (
    <>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:gap-5">
        {/* FREE */}
        <div className="relative rounded-3xl border border-border bg-card p-6 shadow-sm">
          <div className="flex items-baseline justify-between">
            <h3 className="text-lg font-black text-foreground">Free</h3>
            {!isPaid && (
              <span className="rounded-full bg-[var(--metric-positive)]/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-[var(--metric-positive)]">
                Current
              </span>
            )}
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Everything you need to triage a deal in 60 seconds.
          </p>
          <div className="mt-5 flex items-baseline gap-1.5">
            <span className="text-4xl font-black text-foreground sm:text-5xl">$0</span>
            <span className="text-sm text-muted-foreground">forever</span>
          </div>
          <div className="mt-5">
            <PricingPlanButtons slot="free" isAuthenticated={isAuthenticated} isPaid={isPaid} />
          </div>
          <ul className="mt-6 space-y-2.5">
            {FREE_FEATURES.map((f) => (
              <li key={f.label} className="flex items-start gap-2 text-sm">
                {f.included ? (
                  <Check className="mt-0.5 size-4 shrink-0 text-[var(--metric-positive)]" />
                ) : (
                  <X className="mt-0.5 size-4 shrink-0 text-muted-foreground/40" />
                )}
                <span
                  className={
                    f.included
                      ? "text-foreground"
                      : "text-muted-foreground/60 line-through"
                  }
                >
                  {f.label}
                </span>
              </li>
            ))}
          </ul>
        </div>

        {/* PRO (with toggle) */}
        <div className="relative -mt-2 rounded-3xl border-2 border-primary bg-card p-6 shadow-[0_24px_70px_rgba(82,72,212,0.18)] lg:scale-[1.03]">
          {/* Savings badge */}
          {period === "annual" && (annualSavingsPct ?? 0) > 0 ? (
            <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary px-3 py-1 text-[10px] font-black uppercase tracking-widest text-primary-foreground shadow-md">
              {monthsFreeWithAnnual && monthsFreeWithAnnual > 0
                ? `${monthsFreeWithAnnual} months free`
                : `Save ${annualSavingsPct}%`}
            </span>
          ) : null}

          <div className="flex items-baseline justify-between">
            <h3 className="text-lg font-black text-foreground">Pro</h3>
            {isPaid ? (
              <span className="rounded-full bg-[var(--metric-positive)]/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-[var(--metric-positive)]">
                Current
              </span>
            ) : null}
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Full toolkit, lender-ready PDFs, save unlimited deals.
          </p>

          {/* Monthly ↔ Annual toggle */}
          <div
            role="tablist"
            aria-label="Billing period"
            className="mt-4 inline-flex rounded-full border border-border bg-muted/40 p-1"
          >
            <button
              role="tab"
              type="button"
              aria-selected={period === "monthly"}
              onClick={() => setPeriod("monthly")}
              className={
                period === "monthly"
                  ? "rounded-full bg-card px-4 py-1.5 text-xs font-bold text-foreground shadow-sm"
                  : "rounded-full px-4 py-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground"
              }
            >
              Monthly
            </button>
            <button
              role="tab"
              type="button"
              aria-selected={period === "annual"}
              onClick={() => setPeriod("annual")}
              className={
                period === "annual"
                  ? "inline-flex items-center gap-1.5 rounded-full bg-card px-4 py-1.5 text-xs font-bold text-foreground shadow-sm"
                  : "inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground"
              }
            >
              Annual
              {annualSavingsPct && annualSavingsPct > 0 ? (
                <span className="rounded-full bg-primary px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider text-primary-foreground">
                  −{annualSavingsPct}%
                </span>
              ) : null}
            </button>
          </div>

          <div className="mt-5 flex items-baseline gap-1.5">
            <span className="text-4xl font-black text-foreground sm:text-5xl">
              {proCard.priceTop}
            </span>
            <span className="text-sm text-muted-foreground">{proCard.priceSub}</span>
          </div>
          <div className="mt-1 text-xs text-muted-foreground">{proCard.subline}</div>
          <div className="mt-5">
            <PricingPlanButtons
              slot={proCard.slot}
              isAuthenticated={isAuthenticated}
              isPaid={isPaid}
            />
          </div>
          <ul className="mt-6 space-y-2.5">
            {PRO_FEATURES.map((f) => (
              <li key={f} className="flex items-start gap-2 text-sm">
                <Sparkles className="mt-0.5 size-4 shrink-0 text-primary" />
                <span className="text-foreground">{f}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </>
  );
}
