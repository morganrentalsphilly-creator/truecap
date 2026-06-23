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

import { useEffect, useRef, useState } from "react";
import { Check, Sparkles, X } from "lucide-react";
import { PricingPlanButtons } from "@/components/marketing/pricing-plan-buttons";
import { trackEvent } from "@/lib/analytics";
import { TRIAL_LABEL } from "@/lib/trial";

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
  { label: "Deal Score (0-100) with breakdown", included: true },
  { label: "1 free sale + rent comps lookup", included: true },
  { label: "Save up to 5 deals", included: true },
  { label: "Lender-ready PDF export — $5 one-time per deal", included: true },
  { label: "MAO solver", included: false },
  { label: "Sensitivity grid", included: false },
  { label: "Strategies (BRRRR + flip + rehab)", included: false },
  { label: "Shareable read-only deal links", included: false },
  { label: "10-year projections", included: false },
  { label: "Tax strategy", included: false },
  { label: "Exit scenarios", included: false },
  { label: "Compare deals", included: false },
  { label: "Custom PDF branding (logo, color, contact)", included: false },
];

const PRO_FEATURES = [
  "Everything in Free, plus —",
  "Sale + rent comps from the address (50/mo)",
  "MAO solver — reverse-solve your max offer",
  "Sensitivity grid — stress-test the deal",
  "Strategies — BRRRR + fix-and-flip + rehab estimator",
  "Shareable read-only deal links",
  "10-year cash flow + equity projection",
  "Tax strategy: depreciation + interest modeling",
  "Exit scenarios: best year to sell",
  "Buy Box — auto-screen every deal to your criteria",
  "Deal pipeline + tags (lightweight CRM)",
  "Saved analysis templates",
  "Due-diligence checklist + document vault",
  "Rate-drop alerts on your saved deals",
  "Lender · partner · personal PDF reports",
  "Custom PDF branding — your logo, color, and contact on every export",
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

  // Top of the pricing-page funnel — fire once on mount so we can measure
  // pricing_view → pro_checkout_started (checkout fires server-side in
  // billing.ts). Path-tagged in case these plan cards are ever reused.
  const viewFired = useRef(false);
  useEffect(() => {
    if (viewFired.current) return;
    viewFired.current = true;
    trackEvent("pricing_view", {
      path: typeof window !== "undefined" ? window.location.pathname : "/pricing",
    });
  }, []);

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
  // Dollar-amount annual savings — concrete numbers convert better
  // than percentages. "Save $48/yr" beats "Save 20%" in every A/B
  // test I've seen on SaaS pricing pages.
  const annualSavingsDollars =
    monthlyAmount && annualAmount
      ? Math.max(0, Math.round(monthlyAmount * 12 - annualAmount))
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
            <h3 className="text-lg font-extrabold text-foreground">Free</h3>
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
            <span className="text-4xl font-extrabold text-foreground sm:text-5xl">$0</span>
            <span className="text-sm text-muted-foreground">forever</span>
          </div>
          <div className="mt-5">
            <PricingPlanButtons slot="free" isAuthenticated={isAuthenticated} isPaid={isPaid} />
          </div>
          <ul className="mt-6 space-y-2.5">
            {FREE_FEATURES.map((f) => (
              <li key={f.label} className="flex items-start gap-2 text-sm">
                {/* sr-only prefix: without it, screen readers and
                    crawlers read the struck-through Pro items as if
                    they were included in Free — the icons + line-
                    through are visual-only signals. */}
                {f.included ? (
                  <>
                    <Check aria-hidden className="mt-0.5 size-4 shrink-0 text-[var(--metric-positive)]" />
                    <span className="sr-only">Included:</span>
                  </>
                ) : (
                  <>
                    <X aria-hidden className="mt-0.5 size-4 shrink-0 text-muted-foreground/40" />
                    <span className="sr-only">Not included (Pro only):</span>
                  </>
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
          {/* Savings badge — prefer the dollar-amount savings when
              available because concrete numbers convert better than
              percentages. Falls back to "X months free" or % savings. */}
          {period === "annual" && (annualSavingsPct ?? 0) > 0 ? (
            <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary px-3 py-1 text-[10px] font-extrabold uppercase tracking-widest text-primary-foreground shadow-md">
              {annualSavingsDollars && annualSavingsDollars > 0
                ? `Save $${annualSavingsDollars}/yr`
                : monthsFreeWithAnnual && monthsFreeWithAnnual > 0
                  ? `${monthsFreeWithAnnual} months free`
                  : `Save ${annualSavingsPct}%`}
            </span>
          ) : null}
          {/* "BEST VALUE" — secondary ribbon on annual to make the
              recommended option visually obvious. The default-selected
              annual + this ribbon together do the work of telling the
              user which to pick. */}
          {period === "annual" ? (
            <span className="absolute right-4 top-4 rounded-full bg-[var(--brand-green,#16a34a)]/10 px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-widest text-[var(--brand-green,#16a34a)]">
              ★ Best value
            </span>
          ) : null}

          <div className="flex items-baseline justify-between">
            <h3 className="text-lg font-extrabold text-foreground">Pro</h3>
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
            {/* Tap-target sized for mobile: py-2.5 + text-sm = ~40pt
                total height. Was py-1.5 text-xs (~24pt) which was
                undersized for a key conversion CTA. */}
            <button
              role="tab"
              type="button"
              aria-selected={period === "monthly"}
              onClick={() => setPeriod("monthly")}
              className={
                period === "monthly"
                  ? "rounded-full bg-card px-4 py-2.5 text-sm font-bold text-foreground shadow-sm"
                  : "rounded-full px-4 py-2.5 text-sm font-semibold text-muted-foreground hover:text-foreground"
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
                  ? "inline-flex items-center gap-1.5 rounded-full bg-card px-4 py-2.5 text-sm font-bold text-foreground shadow-sm"
                  : "inline-flex items-center gap-1.5 rounded-full px-4 py-2.5 text-sm font-semibold text-muted-foreground hover:text-foreground"
              }
            >
              Annual
              {annualSavingsPct && annualSavingsPct > 0 ? (
                <span className="rounded-full bg-primary px-1.5 py-0.5 text-[9px] font-extrabold uppercase tracking-wider text-primary-foreground">
                  −{annualSavingsPct}%
                </span>
              ) : null}
            </button>
          </div>

          <div className="mt-5 flex items-baseline gap-1.5">
            <span className="text-4xl font-extrabold text-foreground sm:text-5xl">
              {proCard.priceTop}
            </span>
            <span className="text-sm text-muted-foreground">{proCard.priceSub}</span>
          </div>
          <div className="mt-1 text-xs text-muted-foreground">{proCard.subline}</div>
          <div className="mt-3 flex justify-center">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--metric-positive)]/12 px-3 py-1 text-xs font-extrabold uppercase tracking-wide text-[var(--metric-positive)]">
              <Sparkles className="size-3" /> {TRIAL_LABEL}
            </span>
          </div>
          <div className="mt-5">
            <PricingPlanButtons
              slot={proCard.slot}
              isAuthenticated={isAuthenticated}
              isPaid={isPaid}
            />
          </div>
          <p className="mt-2.5 text-center text-xs text-muted-foreground">
            Start with a <strong className="text-foreground">{TRIAL_LABEL}</strong> — cancel anytime, no
            contract. Downgrade and your saved deals + reports stay in your account.
          </p>
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
