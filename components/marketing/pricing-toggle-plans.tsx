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
 * Receives Stripe prices already resolved on the server, plus the
 * user's auth + paid status. Stays a single client component so all
 * toggle logic + checkout wiring lives in one place.
 */

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { PlanCard } from "@/components/marketing/plan-card";
import { PricingPlanButtons } from "@/components/marketing/pricing-plan-buttons";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
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
  "Cap rate, CoC, DSCR, cash flow, Deal score, and screening context",
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
 * What the one agent-only entitlement (client_buy_box) does in practice, so
 * the card lists the workflow, not one catalog label. Each line is a runtime
 * fact: rosters cap at 100 (app/actions/agent-clients.ts), a Buy Box can be
 * scoped to a client and a saved deal assigned to one (lib/buy-box.ts,
 * app/actions/saved-analyses.ts), the client-report share mode hides the
 * address unless included (share-link-button.tsx), and a miss names the
 * criterion (buy-box-verdict-card.tsx). Nothing here is a portal or a
 * white-label embed — those stay unshipped.
 */
const AGENT_PRO_WORKFLOW = [
  "A client roster, up to 100 clients",
  "A Buy Box assigned to each client (up to 12 Buy Boxes per account)",
  "Assign a saved deal to a client; it is screened against that client's targets",
  "Client-report share links: no account needed, address hidden unless you include it",
  "A miss names the criterion and the gap, so “this one doesn't fit” comes with a reason",
] as const;

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
    outcome: "Does the deal meet my criteria?",
    detail: "Check every deal against your Buy Box — cash flow, CoC, DSCR, cap rate, and price targets — and against market comps.",
  },
  {
    outcome: "What is my Offer Ceiling?",
    detail: "Your walk-away price based on your targets: the highest price that still meets them under the assumptions shown.",
  },
  {
    outcome: "What could make the deal fail?",
    detail: "Stress rent, vacancy, rate, and price against the assumptions that drive the decision.",
  },
  {
    outcome: "Can I defend the analysis?",
    detail: "Save unlimited deals, compare up to four, and send a lender-facing report or co-branded share page with the assumptions and risks intact.",
  },
];

/**
 * The four answers by name, set under the Pro card's questions as a caption
 * on the list's last rule (it was a tinted box inside the card).
 */
const PRO_DECISION_ANSWERS = [
  { answer: "Buy Box fit", proof: "At asking price" },
  { answer: "Offer Ceiling", proof: "Solved from your targets" },
  { answer: "What could break", proof: "Downside stress test" },
  { answer: "How to document it", proof: "Review report" },
] as const;

/** The billing-period segments: 44px controls, 2px radius inside the 4px group. */
const PERIOD_BUTTON =
  "inline-flex min-h-11 items-center gap-1.5 rounded-sm border px-4 text-base font-semibold transition-colors";
const PERIOD_BUTTON_PRESSED = "border-foreground bg-band text-foreground";
const PERIOD_BUTTON_IDLE = "border-transparent text-muted-foreground hover:text-foreground";

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
  proOfferName = "Pro",
}: PricingTogglePlansProps) {
  const isPaid = activePaidPlanSlug != null || billingRecoveryRequired;
  // Annual-first (docs/site-overhaul.md Phase 9): the card shows the
  // effective monthly figure with "billed annually (total)" under it, so the
  // visitor sees the lower monthly number AND the real charge. A current
  // monthly subscriber opens on Monthly so their exact card is visibly marked
  // Current; the toggle remains under their control.
  const [period, setPeriod] = useState<"monthly" | "annual">(
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
  // The annual saving, stated in the Pro card's price note after the annual
  // charge (it was a pill floating above the card's heading). Prefer the
  // dollar-amount savings when available because concrete numbers convert
  // better than percentages. Falls back to "X months free" or % savings.
  const annualSavingsLabel =
    period === "annual" && (annualSavingsPct ?? 0) > 0
      ? annualSavingsDollars && annualSavingsDollars > 0
        ? `Save $${annualSavingsDollars}/yr`
        : monthsFreeWithAnnual && monthsFreeWithAnnual > 0
          ? `${monthsFreeWithAnnual} months free`
          : `Save ${annualSavingsPct}%`
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
          with it, the cards below are just the detail. Each line takes its
          card's order, so the recommended plan comes first on phones and the
          line reads in the cards' order at every width. */}
      <ul className="flex flex-col gap-y-1 text-base sm:flex-row sm:flex-wrap sm:gap-x-8">
        <li className="order-1 md:order-2">
          <span className="font-semibold">{proOfferName}</span>{" "}
          <span className="text-muted-foreground">— know what to offer</span>
        </li>
        <li className="order-2 md:order-1">
          <span className="font-semibold">Free</span>{" "}
          <span className="text-muted-foreground">— screen the deal</span>
        </li>
        {showAgentPro ? (
          <li className="order-3">
            <span className="font-semibold">Agent Pro</span>{" "}
            <span className="text-muted-foreground">— win investor clients</span>
          </li>
        ) : null}
      </ul>

      {/* Monthly ↔ Annual toggle, above the row: it sets both paid cards'
          prices. A 4px control whose pressed segment takes the band and an
          ink edge, so the state does not rest on color alone. */}
      <div
        role="group"
        aria-label="Billing period"
        className="mt-6 flex w-fit gap-1 rounded-md border border-border p-1"
      >
        <button
          type="button"
          aria-pressed={period === "monthly"}
          onClick={() => setPeriod("monthly")}
          className={cn(
            PERIOD_BUTTON,
            period === "monthly" ? PERIOD_BUTTON_PRESSED : PERIOD_BUTTON_IDLE,
          )}
        >
          Monthly
        </button>
        <button
          type="button"
          aria-pressed={period === "annual"}
          onClick={() => setPeriod("annual")}
          className={cn(
            PERIOD_BUTTON,
            period === "annual" ? PERIOD_BUTTON_PRESSED : PERIOD_BUTTON_IDLE,
          )}
        >
          Annual
          {annualSavingsPct && annualSavingsPct > 0 ? (
            <span className="text-sm font-semibold">−{annualSavingsPct}%</span>
          ) : null}
        </button>
      </div>

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
          answers={FREE_FEATURES.map((feature) => ({ term: feature }))}
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
          price={proCard.priceTop}
          period={proCard.priceSub}
          priceNote={
            annualSavingsLabel
              ? `${proCard.subline} · ${annualSavingsLabel}`
              : proCard.subline
          }
          answersCaption="Everything in Free, plus answers to four questions —"
          answers={PRO_OUTCOMES.map((group) => ({
            term: group.outcome,
            detail: group.detail,
          }))}
          note={
            <>
              <span className="block font-semibold text-foreground">
                One address. Four answers.
              </span>
              <span className="mt-2 grid grid-cols-2 gap-x-4 gap-y-2">
                {PRO_DECISION_ANSWERS.map((item) => (
                  <span key={item.answer} className="block min-w-0">
                    <span className="block font-semibold text-foreground">{item.answer}</span>
                    <span className="block">{item.proof}</span>
                  </span>
                ))}
              </span>
            </>
          }
          footnote={
            !isPaid ? (
              <PricingTrialTerms
                isAuthenticated={isAuthenticated}
                evaluation={evaluation}
              />
            ) : null
          }
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
                slot={proCard.slot}
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
            Feature list derives from lib/entitlements-catalog (the SSOT):
            "Everything in Pro" + exactly the agent_pro-only feature labels,
            so this card can never promise something the tier doesn't gate. */}
        {showAgentPro ? (
          <PlanCard
            id="agent-pro"
            className="order-3"
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
            price={agentCard.priceTop}
            period={agentCard.priceSub}
            priceNote={agentCard.subline}
            answersCaption="What changes for your workflow"
            answers={[...AGENT_PRO_FEATURES, ...AGENT_PRO_WORKFLOW].map((f) => ({ term: f }))}
            note={
              <>
                Plus everything in {proOfferName}, including co-branded share
                pages and PDFs.
              </>
            }
            footnote={
              !isPaid ? (
                <PricingTrialTerms
                  isAuthenticated={isAuthenticated}
                  evaluation={evaluation}
                  tier="agent_pro"
                />
              ) : null
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
                  slot={agentCard.slot}
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
    </>
  );
}

/**
 * The trial terms, set as a card's fine print (PlanCard's footnote, a div).
 * Every string here is pinned (pricing-copy-guards.test.ts and the
 * authenticated e2e specs): restyle, never reword.
 */
function PricingTrialTerms({
  isAuthenticated,
  evaluation,
  tier = "pro",
}: {
  isAuthenticated: boolean;
  evaluation: PricingEvaluationSummary;
  /** The no-card trial grants Pro deal analyses only — never the client
   *  roster (lib/entitlements.ts evaluationFeatures) — so the Agent Pro card
   *  says so instead of repeating the Pro card's terms. */
  tier?: "pro" | "agent_pro";
}) {
  if (!isAuthenticated) {
    return (
      <p>
        <strong className="font-semibold text-foreground">New account: $0 today, no card.</strong>{" "}
        The {PRODUCT_EVALUATION_DAYS}-day free trial includes three complete Pro deals and one
        comparison.
        {tier === "agent_pro"
          ? " The client roster and client Buy Boxes start with an Agent Pro subscription, not the trial."
          : ""}{" "}
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
        <strong className="font-semibold text-foreground">Your free-trial runs are complete.</strong>{" "}
        Free screening remains available; subscribe only when you choose to run another complete Pro decision.
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
