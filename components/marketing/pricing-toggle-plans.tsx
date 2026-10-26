"use client";

/**
 * Pricing toggle + plan cards. Replaces the previous 3-card layout
 * (Free / Pro Monthly / Pro Annual) with the plan cards (Free / Pro, and
 * Agent Pro where it is sold) under one Monthly ↔ Annual toggle, which
 * sits above the card row because it sets both paid cards' prices.
 *
 * The toggle pattern is industry standard because it forces users to
 * directly compare per-month cost — making the annual savings tangible.
 * Lifts annual-plan conversion 10-15% vs. side-by-side cards.
 *
 * The cards are PlanCard (DESIGN.md "Components": the one card on
 * marketing pages). On /pricing the paid cards ARE the checkout, so the
 * Pro card's action is the row's one filled button and Free and Agent Pro
 * take the outline button.
 *
 * The toggle, the rolling per-month figure and the note under it are the
 * shared parts in components/marketing/cadence-toggle.tsx, and the cards'
 * answer rows come from components/marketing/plan-answers.ts: the same
 * parts and rows the homepage's plans use, so the two pages set a plan one
 * way. Receives Stripe prices already resolved on the server, plus the
 * user's auth + paid status. Stays a single client component so all
 * toggle logic + checkout wiring lives in one place.
 */

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  annualSavingFloorPct,
  CadenceToggle,
  PaidPlanPrice,
  paidChargeToday,
  paidPriceDisplay,
  paidPriceNote,
  planPrices,
  type Cadence,
} from "@/components/marketing/cadence-toggle";
import { agentProPlanAnswers, freePlanAnswers, proPlanAnswers } from "@/components/marketing/plan-answers";
import { PlanCard } from "@/components/marketing/plan-card";
import { PricingPlanButtons } from "@/components/marketing/pricing-plan-buttons";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { trackEvent } from "@/lib/analytics";
import { decidePricingCardCta } from "@/lib/billing-plan-cta";
import {
  PRODUCT_EVALUATION_COMPARISON_LIMIT,
  PRODUCT_EVALUATION_DAYS,
  PRODUCT_EVALUATION_DEAL_LIMIT,
} from "@/lib/product-access";
import {
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

/**
 * A paid plan's two prices for the cadence toggle: Stripe's display amount
 * when it resolved (it is shown only when it equals the catalog amount,
 * lib/stripe/display-prices.ts), else the catalog pair (lib/public-pricing.ts).
 * The toggle alone picks the branch: a Stripe read that fails this request
 * falls back to the catalog amounts, never to the other billing period
 * (Annual pressed over a "billed monthly" card, with a monthly sign-up link,
 * contradicted /for-agents' annual price). Checkout stays gated on the
 * resolved price through checkoutReady below.
 */

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
  proOfferName = "Pro",
}: PricingTogglePlansProps) {
  const isPaid = activePaidPlanSlug != null || billingRecoveryRequired;
  // Annual-first (docs/site-overhaul.md Phase 9): the card shows the
  // effective monthly figure with "billed annually (total)" under it, so the
  // visitor sees the lower monthly number AND the real charge. A current
  // monthly subscriber opens on Monthly so their exact card is visibly marked
  // Current; the toggle remains under their control.
  const [period, setPeriod] = useState<Cadence>(
    activePaidPlanSlug?.endsWith("_monthly") ? "monthly" : "annual"
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

  // The hero's stage list (app/pricing/page.tsx) shows each paid price at
  // this cadence, from the server-rendered pair (audit A13); it reads it here.
  useEffect(() => {
    document.documentElement.setAttribute("data-plan-cadence", period);
    return () => document.documentElement.removeAttribute("data-plan-cadence");
  }, [period]);

  // Agent Pro exists on the page only when it is configured (env + plan rows).
  const showAgentPro = agentProConfigured;
  const proPrices = planPrices(monthly, annual, {
    monthly: PUBLIC_PRO_MONTHLY_USD,
    annual: PUBLIC_PRO_ANNUAL_USD,
  });
  const agentPrices = planPrices(agentMonthly, agentAnnual, {
    monthly: PUBLIC_AGENT_PRO_MONTHLY_USD,
    annual: PUBLIC_AGENT_PRO_ANNUAL_USD,
  });
  const proSlot = period === "monthly" ? ("pro_monthly" as const) : ("pro_annual" as const);
  const agentSlot = period === "monthly" ? ("agent_pro_monthly" as const) : ("agent_pro_annual" as const);
  const proCardDecision = decidePricingCardCta(activePaidPlanSlug, proSlot);
  const agentCardDecision = decidePricingCardCta(activePaidPlanSlug, agentSlot);
  const proChargeToday = paidChargeToday(proPrices, period);
  const agentChargeToday = paidChargeToday(agentPrices, period);

  return (
    <>
      {/* Monthly ↔ Annual toggle, above the row: it sets both paid cards'
          prices. The shared radiogroup (the homepage's), whose "costs less"
          note carries no figure, so it is true beside every paid card on the
          page and shows only while each of them costs less paid annually.
          Which plan does which job is the hero's stage chooser
          (app/pricing/page.tsx), with each plan's price, and each card's
          bold lead repeats its job. */}
      <CadenceToggle
        aria-label="Billing period"
        value={period}
        onChange={setPeriod}
        annualSavingPct={annualSavingFloorPct(showAgentPro ? [proPrices, agentPrices] : [proPrices])}
      />

      {/* The homepage plan row: default stretch, so PlanCard's flexible list
          lines the actions up across the row. Pro comes first on phones. */}
      <div
        className={cn(
          "mt-6 grid gap-4 sm:gap-5",
          showAgentPro ? "md:grid-cols-3" : "md:grid-cols-2 lg:max-w-4xl",
        )}
      >
        <PlanCard
          className="order-2 md:order-1"
          name="Free"
          // "Current" only means something for a signed-in free user.
          // Showing it to an anonymous visitor told them they already hold a
          // plan — a status-quo anchor toward staying on Free.
          tag={isAuthenticated && !isPaid ? "Current" : undefined}
          audience="First decision, no account"
          lead={
            <>
              <strong className="font-semibold">Screen the deal.</strong>{" "}
              Understand the economics before spending more time on the
              property. No card required.
            </>
          }
          price="$0"
          period="forever"
          answers={freePlanAnswers()}
          action={
            <PricingPlanButtons
              slot="free"
              isAuthenticated={isAuthenticated}
              activePaidPlanSlug={activePaidPlanSlug}
              emphasis="secondary"
            />
          }
        />

        {/* PRO: the row's one filled action (the paid cards are the checkout
            on this page). The hero's "See Pro plans" jumps to #pro, and the
            Monthly/Annual toggle that sets this price sits above the row, so
            the card carries a scroll margin: the html scroll padding (72px)
            plus 112px puts the toggle band (the row's 24px gap and the 54px
            group) below the sticky header, including the 36px upgrade bar a
            signed-in free user sees above it (93px on phones, 101px from
            640px). */}
        <PlanCard
          id="pro"
          className="order-1 md:order-2 scroll-mt-28"
          name={proOfferName}
          tag={proCardDecision.kind === "current" ? "Current" : "Recommended"}
          audience="For your own deals"
          lead={
            <>
              <strong className="font-semibold">Know what to offer.</strong>{" "}
              See whether the deal meets your targets, find your Offer Ceiling,
              stress-test the assumptions, and document the decision.
            </>
          }
          price={<PaidPlanPrice prices={proPrices} cadence={period} />}
          period={paidPriceDisplay(proPrices, period).period}
          priceNote={<span className="font-figure">{paidPriceNote(proPrices, period)}</span>}
          // A block span, so the caption's wrap is balanced ("Everything in
          // Free, plus / answers to four questions —") rather than leaving
          // the last words alone on a second line in a narrow card.
          answersCaption={
            <span className="block text-balance">
              Everything in Free, plus answers to four questions —
            </span>
          }
          answers={proPlanAnswers()}
          action={
            billingRecoveryRequired ? (
              <Link
                href="/profile#billing"
                className={buttonVariants({ size: "cta", className: "w-full" })}
              >
                Manage billing to reactivate
              </Link>
            ) : (
              <PricingPlanButtons
                slot={proSlot}
                isAuthenticated={isAuthenticated}
                activePaidPlanSlug={activePaidPlanSlug}
                priceLabel={proChargeToday}
                checkoutReady={period === "monthly" ? monthly != null : annual != null}
                emphasis="primary"
              />
            )
          }
        />

        {/* AGENT PRO — rendered only when its Stripe price is configured.
            Its rows derive from lib/entitlements-catalog through
            plan-answers.ts (the SSOT): "Everything in Pro" + what Agent Pro
            adds, so this card can never promise something the tier doesn't
            gate. The hero's stage chooser jumps to #agent-pro: from 768px the
            card sits in the row under the toggle, so it takes the Pro card's
            scroll margin and lands with the toggle that sets its price in
            view. On phones it is the third card down and lands at its top. */}
        {showAgentPro ? (
          <PlanCard
            id="agent-pro"
            className="order-3 md:scroll-mt-28"
            name="Agent Pro"
            tag={agentCardDecision.kind === "current" ? "Current" : undefined}
            audience="For agents with investor clients"
            lead={
              <>
                <strong className="font-semibold">Win investor clients.</strong>{" "}
                Screen each listing against the client&apos;s own Buy Box and
                send the decision memo, co-branded, under your name.
              </>
            }
            price={<PaidPlanPrice prices={agentPrices} cadence={period} />}
            period={paidPriceDisplay(agentPrices, period).period}
            priceNote={<span className="font-figure">{paidPriceNote(agentPrices, period)}</span>}
            answersCaption="What changes for your workflow"
            answers={agentProPlanAnswers()}
            note={
              <>
                Plus everything in {proOfferName}, including co-branded share
                pages and PDFs.
              </>
            }
            action={
              billingRecoveryRequired ? (
                <Link
                  href="/profile#billing"
                  className={buttonVariants({ size: "cta", variant: "outline", className: "w-full" })}
                >
                  Manage billing to reactivate
                </Link>
              ) : (
                <PricingPlanButtons
                  slot={agentSlot}
                  isAuthenticated={isAuthenticated}
                  activePaidPlanSlug={activePaidPlanSlug}
                  priceLabel={agentChargeToday}
                  checkoutReady={period === "monthly" ? agentMonthly != null : agentAnnual != null}
                  emphasis="secondary"
                />
              )
            }
          />
        ) : null}
      </div>

      {/* The trial terms, once, under the row (they were each paid card's
          fine print, which padded both cards and left holes in the others).
          With Agent Pro on the page they carry its roster sentence too. */}
      {!isPaid ? (
        <div
          data-pricing-trial-terms=""
          className="mt-4 max-w-[68ch] text-pretty text-sm leading-relaxed text-muted-foreground"
        >
          <PricingTrialTerms
            isAuthenticated={isAuthenticated}
            evaluation={evaluation}
            tier={showAgentPro ? "agent_pro" : "pro"}
          />
        </div>
      ) : null}
    </>
  );
}

/**
 * The trial terms, set once as fine print under the plan cards.
 * Every string here is pinned (pricing-copy-guards.test.ts and the
 * authenticated e2e specs): restyle, never reword.
 * The signed-out sentence was reworded for row P1-07 ("Pro analyses" plus
 * the rerun sentence) with its pin; the signed-in allowance says "Pro
 * analyses" too, written by formatPricingEvaluationAllowance
 * (lib/pricing-evaluation.ts) and pinned by
 * e2e/authenticated-audit-account.spec.ts.
 */
function PricingTrialTerms({
  isAuthenticated,
  evaluation,
  tier = "pro",
}: {
  isAuthenticated: boolean;
  evaluation: PricingEvaluationSummary;
  /** The no-card trial grants Pro analyses only — never co-branding
   *  (custom_branding) or the client roster (lib/entitlements.ts
   *  evaluationFeatures) — so the terms say so after the Pro allowance, and
   *  name the roster when Agent Pro is on the page. */
  tier?: "pro" | "agent_pro";
}) {
  if (!isAuthenticated) {
    return (
      <p>
        <strong className="font-semibold text-foreground">New account: $0 today, no card.</strong>{" "}
        The {PRODUCT_EVALUATION_DAYS}-day free trial includes {PRODUCT_EVALUATION_DEAL_LIMIT} Pro
        analyses and {PRODUCT_EVALUATION_COMPARISON_LIMIT} comparison. Revisions to the same property do not use another trial analysis.
        {tier === "agent_pro"
          ? " Co-branded share pages and PDFs start with a Pro or Agent Pro subscription, and the client roster and client Buy Boxes with Agent Pro, not the trial."
          : " Co-branded share pages and PDFs start with a Pro subscription, not the trial."}{" "}
        Nothing auto-renews; subscribe only if you choose to later.
      </p>
    );
  }

  const allowance = formatPricingEvaluationAllowance(evaluation);
  if (evaluation.status === "active" && allowance) {
    return (
      <p>
        <strong className="font-semibold text-foreground">Free trial active: {allowance}.</strong>{" "}
        You can subscribe at the exact displayed price at any time. Saved work stays in your
        account if you downgrade.
      </p>
    );
  }

  if (evaluation.status === "exhausted") {
    return (
      <p>
        <strong className="font-semibold text-foreground">Your trial property slots are used.</strong>{" "}
        Revise your trial properties until the trial expires. Free screening remains available; subscribe when you need to analyze another property.
      </p>
    );
  }

  if (evaluation.status === "expired") {
    return (
      <p>
        <strong className="font-semibold text-foreground">Your no-card free trial has ended.</strong>{" "}
        Free screening remains available; subscribe only when you choose to continue with Pro.
      </p>
    );
  }

  return (
    <p>
      <strong className="font-semibold text-foreground">Subscription access starts with the charge shown above.</strong>{" "}
      Cancel online anytime; no contract. Your saved work stays in your account if you downgrade.
    </p>
  );
}
