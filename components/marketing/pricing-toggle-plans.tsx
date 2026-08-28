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
import { Check, Sparkles } from "lucide-react";
import Link from "next/link";
import { PricingPlanButtons } from "@/components/marketing/pricing-plan-buttons";
import { trackEvent } from "@/lib/analytics";
import { decidePricingCardCta } from "@/lib/billing-plan-cta";
import { PRODUCT_EVALUATION_DAYS } from "@/lib/product-access";
import { featuresForTier } from "@/lib/entitlements-catalog";
import {
  formatPublicUsd,
  PUBLIC_AGENT_PRO_ANNUAL_USD,
  PUBLIC_AGENT_PRO_MONTHLY_USD,
  PUBLIC_PRO_ANNUAL_USD,
  PUBLIC_PRO_MONTHLY_USD,
} from "@/lib/public-pricing";
import {
  formatPricingEvaluationAllowance,
  type PricingEvaluationSummary,
} from "@/lib/pricing-evaluation";

type ResolvedPrice = { amountLabel: string; period: string } | null;

interface PricingTogglePlansProps {
  monthly: ResolvedPrice;
  annual: ResolvedPrice;
  /** Agent Pro prices — null until STRIPE_PRICE_AGENT_PRO_* is configured,
   *  which keeps the tier fully plumbed but invisible (two-card layout). */
  agentMonthly?: ResolvedPrice;
  agentAnnual?: ResolvedPrice;
  isAuthenticated: boolean;
  /** Exact newest live paid plan, or null for Free. */
  activePaidPlanSlug: string | null;
  /** Actual server-read evaluation state and remaining immutable-ledger usage. */
  evaluation: PricingEvaluationSummary;
  /** An unpaid/paused Stripe subscription must be repaired, not duplicated. */
  billingRecoveryRequired?: boolean;
  /**
   * Agent Pro is configured (env + plan rows). Distinct from "its price
   * resolved this request" — a transient Stripe failure must not delete a live
   * tier from the page.
   */
  agentProConfigured?: boolean;
  /** Marketing-only Pro name experiment; billing slots stay unchanged. */
  proOfferName?: string;
}

// Plan cards summarize the outcome; the single comparison table below carries
// the exhaustive inventory. Keeping one detailed feature list prevents users
// from reconciling the same twenty claims in three different places.
const FREE_FEATURES = [
  "Unlimited cash-flow analyses",
  "Cap rate, CoC, DSCR, cash flow, Screening Index, and screening context",
  "Auto-fill starting assumptions from the address",
  "Shareable read-only deal links",
  // Honest caveat: Free can create five saves, while editing a saved deal is
  // currently Pro-gated.
  "Save up to 5 deals (editing saved deals is Pro)",
] as const;

/**
 * Derived from the entitlement catalog — the labels of exactly the features
 * only agent_pro includes. Hand-typing this list is how pricing surfaces
 * historically drifted from the gates (see lib/entitlements-catalog.ts).
 */
const AGENT_PRO_FEATURES: string[] = [
  ...featuresForTier("agent_pro")
    .filter((f) => !f.tiers.includes("pro"))
    // Don't advertise an entitlement that is not marketable yet. This covers
    // implementation readiness as well as legal/operational approval; the
    // runtime entitlement can remain forward-compatible without being sold.
    .filter((f) => f.shipped !== false)
    .map((f) => f.label),
];

/**
 * Pro sold as OUTCOMES, not a pile of upgrades.
 *
 * This was eighteen flat bullets, which made Pro read as a feature dump and
 * left the buyer to work out what it was FOR. Grouping them into the four jobs
 * Pro actually does makes the upgrade logic legible at a glance:
 *   Free = screen deals · Pro = underwrite + make offers ·
 *   Agent Pro = do that for clients.
 *
 * Every item still names a real, shipped capability — the grouping changed,
 * not the claims.
 */
const PRO_OUTCOMES: { outcome: string; detail: string }[] = [
  {
    outcome: "Find the right price",
    detail: "Calculate a target-backed Offer Ceiling, then check the deal against your Buy Box and market comps.",
  },
  {
    outcome: "See what could break",
    detail: "Stress rent, vacancy, rate, and price against the assumptions that drive the decision.",
  },
  {
    outcome: "Run a repeatable workflow",
    detail: "Save unlimited deals, compare the best four, and carry each one through due diligence.",
  },
  {
    outcome: "Present the decision",
    detail: "Send a lender-facing review report or co-branded share page with the assumptions and risks intact.",
  },
];

const PRO_DECISION_ANSWERS = [
  { answer: "Selected-rule fit", proof: "At asking price" },
  { answer: "Offer Ceiling", proof: "Target-backed solver" },
  { answer: "What could break", proof: "Downside stress test" },
  { answer: "How to document it", proof: "Review report" },
] as const;


function parsePriceAmount(p: ResolvedPrice): number | null {
  if (!p) return null;
  const match = p.amountLabel.match(/[\d.]+/);
  return match ? Number(match[0]) : null;
}

export function PricingTogglePlans({
  monthly,
  annual,
  agentMonthly = null,
  agentAnnual = null,
  isAuthenticated,
  activePaidPlanSlug,
  evaluation,
  billingRecoveryRequired = false,
  agentProConfigured = false,
  proOfferName = "TrueCap Pro",
}: PricingTogglePlansProps) {
  const isPaid = activePaidPlanSlug != null || billingRecoveryRequired;
  const evaluationAllowance = formatPricingEvaluationAllowance(evaluation);
  const evaluationBadge = billingRecoveryRequired
    ? "Billing attention needed"
    : isPaid
      ? "Paid access active"
      : !isAuthenticated
        ? `${PRODUCT_EVALUATION_DAYS} days · 3 Pro deals + 1 comparison · no card`
        : evaluation.status === "active" && evaluationAllowance
          ? `${evaluationAllowance} · no card`
          : evaluation.status === "exhausted"
            ? "Included evaluation runs complete"
            : evaluation.status === "expired"
              ? "Evaluation ended · Free screening remains"
              : "Paid access available now";
  // Monthly-first for visitors and Free users: they arrive primed on the
  // advertised monthly price from ads/FAQ/marketing copy (the exact amount is
  // catalog-driven, so this comment does not restate it). A current
  // annual subscriber instead opens on Annual so their exact card is visibly
  // marked Current; the toggle remains under their control.
  const [period, setPeriod] = useState<"monthly" | "annual">(
    activePaidPlanSlug?.endsWith("_annual") ? "annual" : "monthly"
  );

  // Top of the pricing-page funnel — fire once on mount so we can measure
  // pricing_view → pro_checkout_started (checkout fires server-side in
  // billing.ts). Path-tagged in case these plan cards are ever reused.
  const viewFired = useRef(false);
  useEffect(() => {
    if (viewFired.current) return;
    viewFired.current = true;
    const properties = {
      path: typeof window !== "undefined" ? window.location.pathname : "/pricing",
    };
    trackEvent("pricing_view", properties);
    trackEvent("pricing_viewed", properties);
  }, []);

  const monthlyAmount = parsePriceAmount(monthly) ?? PUBLIC_PRO_MONTHLY_USD;
  const annualAmount = parsePriceAmount(annual) ?? PUBLIC_PRO_ANNUAL_USD;

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

  // Agent Pro exists on the page only when its price resolved (env configured).
  const showAgentPro = agentProConfigured;
  const agentMonthlyAmount = parsePriceAmount(agentMonthly);
  const agentAnnualAmount = parsePriceAmount(agentAnnual);
  const agentAnnualMonthlyEquivalent = agentAnnualAmount != null ? agentAnnualAmount / 12 : null;
  const agentCard =
    period === "monthly" || agentAnnual == null
      ? {
          priceTop: agentMonthly?.amountLabel ?? formatPublicUsd(PUBLIC_AGENT_PRO_MONTHLY_USD),
          priceSub: agentMonthly ? `/${agentMonthly.period}` : "/month",
          subline: "billed monthly",
          slot: "agent_pro_monthly" as const,
        }
      : {
          priceTop:
            agentAnnualMonthlyEquivalent != null
              ? `$${agentAnnualMonthlyEquivalent.toFixed(agentAnnualMonthlyEquivalent % 1 === 0 ? 0 : 2)}`
              : formatPublicUsd(PUBLIC_AGENT_PRO_ANNUAL_USD / 12),
          priceSub: "/month",
          subline: agentAnnual?.amountLabel ? `billed annually (${agentAnnual.amountLabel})` : "billed annually",
          slot: "agent_pro_annual" as const,
        };
  void agentMonthlyAmount;

  const proCard =
    period === "monthly"
      ? {
          priceTop: monthly?.amountLabel ?? formatPublicUsd(PUBLIC_PRO_MONTHLY_USD),
          priceSub: `/${monthly?.period ?? "month"}`,
          subline: "billed monthly",
          slot: "pro_monthly" as const,
        }
      : {
          priceTop:
            annualMonthlyEquivalent != null
              ? `$${annualMonthlyEquivalent.toFixed(
                  annualMonthlyEquivalent % 1 === 0 ? 0 : 2
                )}`
              : formatPublicUsd(PUBLIC_PRO_ANNUAL_USD / 12),
          priceSub: "/month",
          subline:
            `billed annually (${annual?.amountLabel ?? formatPublicUsd(PUBLIC_PRO_ANNUAL_USD)})`,
          slot: "pro_annual" as const,
        };
  const proCardDecision = decidePricingCardCta(activePaidPlanSlug, proCard.slot);
  const agentCardDecision = decidePricingCardCta(activePaidPlanSlug, agentCard.slot);
  const proChargeToday =
    period === "monthly"
      ? formatPublicUsd(PUBLIC_PRO_MONTHLY_USD)
      : formatPublicUsd(PUBLIC_PRO_ANNUAL_USD);
  const agentChargeToday =
    period === "monthly"
      ? formatPublicUsd(PUBLIC_AGENT_PRO_MONTHLY_USD)
      : formatPublicUsd(PUBLIC_AGENT_PRO_ANNUAL_USD);

  return (
    <>
      {/* The upgrade logic in one line, before the cards. Without it a visitor
          has to infer the difference between the tiers from the feature lists;
          with it, the cards below are just the detail. */}
      {/* Put the recommended plan first, especially in the mobile viewport. */}
      <div className="mb-5 grid gap-2 rounded-2xl border border-border bg-muted/30 p-4 sm:grid-cols-3 sm:gap-4">
        <p className="text-sm">
          <span className="font-bold text-foreground">{proOfferName}</span>{" "}
          <span className="text-muted-foreground">— underwrite and document decisions</span>
        </p>
        <p className="text-sm">
          <span className="font-bold text-foreground">Free</span>{" "}
          <span className="text-muted-foreground">— complete your first decision</span>
        </p>
        {showAgentPro ? (
          <p className="text-sm">
            <span className="font-bold text-foreground">Agent Pro</span>{" "}
            <span className="text-muted-foreground">— underwrite for your clients</span>
          </p>
        ) : null}
      </div>
      <div className={showAgentPro ? "grid grid-cols-1 gap-4 lg:grid-cols-3 lg:gap-5" : "grid grid-cols-1 gap-4 lg:grid-cols-2 lg:gap-5"}>
        <div className="relative order-2 rounded-3xl border border-border bg-card p-6 shadow-sm lg:order-1">
          <div className="flex items-baseline justify-between">
            <h3 className="text-lg font-extrabold text-foreground">Free</h3>
            {/* "Current" only means something for a signed-in free user.
                Showing it to an anonymous visitor told them they already
                hold a plan — a status-quo anchor toward staying on Free. */}
            {isAuthenticated && !isPaid && (
              <span className="rounded-full bg-[var(--metric-positive)]/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-[var(--metric-positive)]">
                Current
              </span>
            )}
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Get a clear first-pass answer in 60 seconds. No card required.
          </p>
          <div className="mt-5 flex items-baseline gap-1.5">
            <span className="font-mono text-4xl font-extrabold tabular-nums tracking-tight text-foreground sm:text-5xl">$0</span>
            <span className="text-sm text-muted-foreground">forever</span>
          </div>
          <div className="mt-5">
            <PricingPlanButtons
              slot="free"
              isAuthenticated={isAuthenticated}
              activePaidPlanSlug={activePaidPlanSlug}
            />
          </div>
          <ul className="mt-6 space-y-2.5">
            {FREE_FEATURES.map((feature) => (
              <li key={feature} className="flex items-start gap-2 text-sm">
                <Check aria-hidden className="mt-0.5 size-4 shrink-0 text-[var(--metric-positive)]" />
                <span className="sr-only">Included:</span>
                <span className="text-foreground">
                  {feature}
                </span>
              </li>
            ))}
          </ul>
        </div>

        {/* PRO (with toggle) */}
        <div id="pro" className="relative order-1 -mt-2 scroll-mt-24 rounded-3xl border-2 border-primary bg-card p-6 shadow-[0_24px_70px_rgba(0,112,196,0.18)] lg:order-2 lg:scale-[1.03]">
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
            <h3 className="text-lg font-extrabold text-foreground">{proOfferName}</h3>
            {proCardDecision.kind === "current" ? (
              <span className="rounded-full bg-[var(--metric-positive)]/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-[var(--metric-positive)]">
                Current
              </span>
            ) : (
              <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-[var(--brand-blue-text)]">
                Recommended
              </span>
            )}
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Turn every address into a reviewable acquisition decision.
          </p>

          {/* Monthly ↔ Annual toggle */}
          <div
            role="group"
            aria-label="Billing period"
            className="mt-4 inline-flex rounded-full border border-border bg-muted/40 p-1"
          >
            {/* Tap-target sized for mobile: py-2.5 + text-sm = ~40pt
                total height. Was py-1.5 text-xs (~24pt) which was
                undersized for a key conversion CTA. */}
            <button
              type="button"
              aria-pressed={period === "monthly"}
              onClick={() => setPeriod("monthly")}
              className={
                period === "monthly"
                  ? "min-h-11 rounded-full bg-card px-4 py-2.5 text-sm font-bold text-foreground shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  : "min-h-11 rounded-full px-4 py-2.5 text-sm font-semibold text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              }
            >
              Monthly
            </button>
            <button
              type="button"
              aria-pressed={period === "annual"}
              onClick={() => setPeriod("annual")}
              className={
                period === "annual"
                  ? "inline-flex min-h-11 items-center gap-1.5 rounded-full bg-card px-4 py-2.5 text-sm font-bold text-foreground shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  : "inline-flex min-h-11 items-center gap-1.5 rounded-full px-4 py-2.5 text-sm font-semibold text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
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
            <span className="font-mono text-4xl font-extrabold tabular-nums tracking-tight text-foreground sm:text-5xl">
              {proCard.priceTop}
            </span>
            <span className="text-sm text-muted-foreground">{proCard.priceSub}</span>
          </div>
          <div className="mt-1 text-xs text-muted-foreground">{proCard.subline}</div>
          <div className="mt-3 flex justify-center">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--metric-positive)]/12 px-3 py-1 text-xs font-extrabold uppercase tracking-wide text-foreground">
               <Sparkles className="size-3" />{evaluationBadge}
            </span>
          </div>

          <div className="mt-4 rounded-2xl border border-primary/20 bg-primary/[0.045] p-4">
            <p className="text-xs font-extrabold uppercase tracking-widest text-primary">
              One address. Four answers.
            </p>
            <div className="mt-3 grid grid-cols-2 gap-3">
              {PRO_DECISION_ANSWERS.map((item) => (
                <div key={item.answer}>
                  <p className="text-sm font-bold leading-tight text-foreground">{item.answer}</p>
                  <p className="mt-0.5 text-[11px] leading-tight text-muted-foreground">{item.proof}</p>
                </div>
              ))}
            </div>
           </div>
           <div className="mt-5">
             {billingRecoveryRequired ? (
               <Link
                 href="/profile#billing"
                 className="inline-flex min-h-11 w-full items-center justify-center rounded-xl bg-primary px-4 py-2.5 text-center text-sm font-bold text-primary-foreground transition hover:bg-primary/95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
               >
                 Manage billing to reactivate
               </Link>
             ) : (
               <PricingPlanButtons
                 slot={proCard.slot}
                 isAuthenticated={isAuthenticated}
                 activePaidPlanSlug={activePaidPlanSlug}
                 priceLabel={proChargeToday}
                 checkoutReady={period === "monthly" ? monthly != null : annual != null}
               />
             )}
          </div>
          {!isPaid ? (
            <PricingTrialTerms
              isAuthenticated={isAuthenticated}
              evaluation={evaluation}
            />
          ) : null}
          <p className="mt-6 text-sm font-semibold text-foreground">Everything in Free, plus four outcomes —</p>
          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
            {PRO_OUTCOMES.map((group) => (
              <div key={group.outcome} className="rounded-xl border border-border bg-muted/25 p-3">
                <p className="text-xs font-bold text-primary">
                  {group.outcome}
                </p>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{group.detail}</p>
              </div>
            ))}
          </div>
        </div>

        {/* AGENT PRO — rendered only when its Stripe price is configured.
            Feature list derives from lib/entitlements-catalog (the SSOT):
            "Everything in Pro" + exactly the agent_pro-only feature labels,
            so this card can never promise something the tier doesn't gate. */}
        {showAgentPro ? (
          <div id="agent-pro" className="relative order-3 scroll-mt-24 rounded-3xl border border-border bg-card p-6 shadow-sm">
            <div className="flex items-baseline justify-between">
              <h3 className="text-lg font-extrabold text-foreground">Agent Pro</h3>
              <div className="flex flex-wrap justify-end gap-1.5">
                {agentCardDecision.kind === "current" ? (
                  <span className="rounded-full bg-[var(--metric-positive)]/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-[var(--metric-positive)]">
                    Current
                  </span>
                ) : null}
                <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-primary">
                  For agents
                </span>
              </div>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              Give every buyer their own criteria, screen the right deals for them, and keep each client&rsquo;s shortlist organized.
            </p>
            <div className="mt-5 flex items-baseline gap-1.5">
              <span className="font-mono text-4xl font-extrabold tabular-nums tracking-tight text-foreground sm:text-5xl">
                {agentCard.priceTop}
              </span>
              <span className="text-sm text-muted-foreground">{agentCard.priceSub}</span>
            </div>
            <div className="mt-1 text-xs text-muted-foreground">{agentCard.subline}</div>
            <div className="mt-3 flex justify-center">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-extrabold uppercase tracking-wide text-primary">
                 <Sparkles className="size-3" />{evaluationBadge}
              </span>
             </div>
             <div className="mt-5">
               {billingRecoveryRequired ? (
                 <Link
                   href="/profile#billing"
                   className="inline-flex min-h-11 w-full items-center justify-center rounded-xl bg-primary px-4 py-2.5 text-center text-sm font-bold text-primary-foreground transition hover:bg-primary/95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                 >
                   Manage billing to reactivate
                 </Link>
               ) : (
                 <PricingPlanButtons
                   slot={agentCard.slot}
                   isAuthenticated={isAuthenticated}
                   activePaidPlanSlug={activePaidPlanSlug}
                   priceLabel={agentChargeToday}
                   checkoutReady={period === "monthly" ? agentMonthly != null : agentAnnual != null}
                 />
               )}
            </div>
            {!isPaid ? (
              <PricingTrialTerms
                isAuthenticated={isAuthenticated}
                evaluation={evaluation}
              />
            ) : null}
            <div className="mt-6 rounded-2xl border border-primary/15 bg-primary/[0.04] p-4">
              <p className="text-xs font-extrabold uppercase tracking-widest text-primary">What changes for your workflow</p>
              <ul className="mt-3 space-y-2.5">
                {AGENT_PRO_FEATURES.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm">
                    <Sparkles className="mt-0.5 size-4 shrink-0 text-primary" />
                    <span className="text-foreground">{f}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        ) : null}
      </div>
    </>
  );
}

function PricingTrialTerms({
  isAuthenticated,
  evaluation,
}: {
  isAuthenticated: boolean;
  evaluation: PricingEvaluationSummary;
}) {
  if (!isAuthenticated) {
    return (
      <>
        <p className="mt-2.5 text-center text-xs text-muted-foreground">
          <strong className="text-foreground">New account: $0 today, no card.</strong>{" "}
          The {PRODUCT_EVALUATION_DAYS}-day evaluation includes three complete Pro deals and one
          comparison. Nothing auto-renews; subscribe only if you choose to later.
        </p>
      </>
    );
  }

  const allowance = formatPricingEvaluationAllowance(evaluation);
  if (evaluation.status === "active" && allowance) {
    return (
      <>
        <p className="mt-2.5 text-center text-xs text-muted-foreground">
          <strong className="text-foreground">Evaluation active: {allowance}.</strong>{" "}
          You can subscribe at the exact displayed price at any time. Saved work stays in your
          account if you downgrade.
        </p>
      </>
    );
  }

  if (evaluation.status === "exhausted") {
    return (
      <p className="mt-2.5 text-center text-xs text-muted-foreground">
        <strong className="text-foreground">Your included evaluation runs are complete.</strong>{" "}
        Free screening remains available; subscribe only when you choose to run another complete Pro decision.
      </p>
    );
  }

  if (evaluation.status === "expired") {
    return (
      <p className="mt-2.5 text-center text-xs text-muted-foreground">
        <strong className="text-foreground">Your no-card evaluation has ended.</strong>{" "}
        Free screening remains available; subscribe only when you choose to continue with Pro.
      </p>
    );
  }

  return (
    <>
      <p className="mt-2.5 text-center text-xs text-muted-foreground">
        <strong className="text-foreground">Subscription access starts with the charge shown above.</strong>{" "}
        Cancel online anytime; no contract. Your saved work stays in your account if you downgrade.
      </p>
    </>
  );
}
