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
import { TRIAL_DAYS, willCheckoutGrantTrial } from "@/lib/trial";
import { featuresForTier } from "@/lib/entitlements-catalog";

type ResolvedPrice = { amountLabel: string; period: string } | null;

interface PricingTogglePlansProps {
  monthly: ResolvedPrice;
  annual: ResolvedPrice;
  /** Agent Pro prices — null until STRIPE_PRICE_AGENT_PRO_* is configured,
   *  which keeps the tier fully plumbed but invisible (two-card layout). */
  agentMonthly?: ResolvedPrice;
  agentAnnual?: ResolvedPrice;
  isAuthenticated: boolean;
  isPaid: boolean;
  /**
   * Server-computed mirror of the checkout repeat-trial guard (see
   * hasAnySubscriptionHistory in lib/entitlements.ts): true when the user has
   * ANY prior subscription row, so checkout will NOT grant the trial. Swaps
   * the trial-promising copy for a truthful "Welcome back" variant. Always
   * false for anonymous visitors.
   */
  hadPriorSubscription: boolean;
  /**
   * Agent Pro is configured (env + plan rows). Distinct from "its price
   * resolved this request" — a transient Stripe failure must not delete a live
   * tier from the page.
   */
  agentProConfigured?: boolean;
  /** Marketing-only Pro name experiment; billing slots stay unchanged. */
  proOfferName?: string;
  /** Marketing-only one-time price label resolved by the server config. */
  singleDealPriceLabel?: string;
}

const FREE_FEATURES: { label: string; included: boolean }[] = [
  { label: "Unlimited cash-flow analyses", included: true },
  { label: "Cap rate, CoC, DSCR, monthly cash flow", included: true },
  { label: "Auto-fill rent + rate + tax from address", included: true },
  // The personalization wedge, free tier: the strategy lens tunes the
  // verdict/score to the investor's play, and saved defaults pre-fill every
  // new deal. Both are free (signed-in) — claimed here, inherited by Pro
  // via "Everything in Free". The buy-box Personal Verdict is Pro-only, so
  // it rides in the strikethrough group below.
  { label: "Plain-English verdict — read through your strategy lens", included: true },
  { label: "Your saved defaults on every new deal", included: true },
  { label: "Deal Score (0-100) with breakdown", included: true },
  { label: "1 free sale + rent comps lookup", included: true },
  // Honest caveat: the runtime lets Free CREATE up to 5 deals but Pro-gates
  // UPDATING a saved deal (app/actions/saved-analyses.ts update path). Don't
  // drop the parenthetical without changing that gate — the bare bullet
  // promised editing the product doesn't deliver.
  { label: "Save up to 5 deals (editing saved deals is Pro)", included: true },
  { label: "Lender-ready PDF export — $5 one-time per deal", included: true },
  { label: "MAO solver", included: false },
  { label: "Sensitivity grid", included: false },
  { label: "Strategies (BRRRR + flip + rehab)", included: false },
  { label: "Shareable read-only deal links", included: true },
  { label: "Personal Verdict — pass/fail against your buy box", included: false },
  { label: "10-year projections", included: false },
  { label: "Tax strategy", included: false },
  { label: "Exit scenarios", included: false },
  { label: "Compare deals", included: false },
  { label: "Custom PDF branding (logo, color, contact)", included: false },
];

/**
 * Derived from the entitlement catalog — the labels of exactly the features
 * only agent_pro includes. Hand-typing this list is how pricing surfaces
 * historically drifted from the gates (see lib/entitlements-catalog.ts).
 */
const AGENT_PRO_FEATURES: string[] = [
  "Everything in Pro, plus —",
  ...featuresForTier("agent_pro")
    .filter((f) => !f.tiers.includes("pro"))
    // Don't advertise an entitlement whose feature isn't built yet (client
    // portal, white-label embeds). The strings stay in the plan JSON so the
    // day they ship it's a one-line flip — but the card must not sell vapor.
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
const PRO_OUTCOMES: { outcome: string; items: string[] }[] = [
  {
    outcome: "Find the right price",
    items: [
      "MAO solver — reverse-solve your max offer",
      "Sale + rent comps from the address (50/mo)",
      "Sensitivity grid — stress-test the deal",
      "Personal Verdict — every deal pass/failed against YOUR buy box",
    ],
  },
  {
    outcome: "Underwrite deeper",
    items: [
      "10-year cash flow + equity projection",
      "Tax strategy: depreciation + interest modeling",
      "Exit scenarios: best year to sell",
      "Strategies — BRRRR, fix-and-flip, rehab estimator",
    ],
  },
  {
    outcome: "Save your work",
    items: [
      "Save unlimited deals · compare up to 4",
      "Deal pipeline + tags (lightweight CRM)",
      "Saved analysis templates",
      "Due-diligence checklist + document vault",
      "Rate-drop alerts on your saved deals",
    ],
  },
  {
    outcome: "Share the deal",
    items: [
      "Lender · partner · personal PDF reports, with comps",
      "Custom PDF branding — your logo, color, contact",
      "Co-branded share links with lead capture",
      "Priority email support",
    ],
  },
];

const PRO_DECISION_ANSWERS = [
  { answer: "Pursue or pass", proof: "Buy Box verdict" },
  { answer: "What to offer", proof: "Max Offer solver" },
  { answer: "What could break", proof: "Downside stress test" },
  { answer: "How to present it", proof: "Offer-ready report" },
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
  isPaid,
  hadPriorSubscription,
  agentProConfigured = false,
  proOfferName = "TrueCap Pro",
  singleDealPriceLabel = "$5",
}: PricingTogglePlansProps) {
  // One decision for every trial mention on this card — must match what
  // checkout actually grants (billing.ts denies the trial to anyone with
  // prior subscription history, any status).
  const offersTrial = willCheckoutGrantTrial(hadPriorSubscription);
  // Monthly-first: visitors arrive primed on the advertised monthly price
  // ($29.99) from ads/FAQ/marketing copy — the annual-first default led with
  // "$25/mo billed annually", a different number they had to reconcile
  // before trusting the page (UX walkthrough P2-9). The annual toggle still
  // carries its savings chip, so the discount stays one tap away.
  const [period, setPeriod] = useState<"monthly" | "annual">("monthly");

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

  // Agent Pro exists on the page only when its price resolved (env configured).
  const showAgentPro = agentProConfigured || agentMonthly != null || agentAnnual != null;
  const agentMonthlyAmount = parsePriceAmount(agentMonthly);
  const agentAnnualAmount = parsePriceAmount(agentAnnual);
  const agentAnnualMonthlyEquivalent = agentAnnualAmount != null ? agentAnnualAmount / 12 : null;
  const agentCard =
    period === "monthly" || agentAnnual == null
      ? {
          priceTop: agentMonthly?.amountLabel ?? "Agent Pro",
          priceSub: agentMonthly ? `/${agentMonthly.period}` : "/month",
          subline: "billed monthly",
          slot: "agent_pro_monthly" as const,
        }
      : {
          priceTop:
            agentAnnualMonthlyEquivalent != null
              ? `$${agentAnnualMonthlyEquivalent.toFixed(agentAnnualMonthlyEquivalent % 1 === 0 ? 0 : 2)}`
              : (agentAnnual?.amountLabel ?? "Agent Pro"),
          priceSub: "/month",
          subline: agentAnnual?.amountLabel ? `billed annually (${agentAnnual.amountLabel})` : "billed annually",
          slot: "agent_pro_annual" as const,
        };
  void agentMonthlyAmount;

  const proCard =
    period === "monthly"
      ? {
          priceTop: monthly?.amountLabel ?? proOfferName,
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
              : (annual?.amountLabel ?? proOfferName),
          priceSub: "/month",
          subline:
            annual?.amountLabel
              ? `billed annually (${annual.amountLabel})`
              : "billed annually",
          slot: "pro_annual" as const,
        };

  return (
    <>
      {/* The upgrade logic in one line, before the cards. Without it a visitor
          has to infer the difference between the tiers from the feature lists;
          with it, the cards below are just the detail. */}
      <div className="mb-5 grid gap-2 rounded-2xl border border-border bg-muted/30 p-4 sm:grid-cols-3 sm:gap-4">
        <p className="text-sm">
          <span className="font-bold text-foreground">Free</span>{" "}
          <span className="text-muted-foreground">— screen deals</span>
        </p>
        <p className="text-sm">
          <span className="font-bold text-foreground">{proOfferName}</span>{" "}
          <span className="text-muted-foreground">— underwrite and make offers</span>
        </p>
        {showAgentPro ? (
          <p className="text-sm">
            <span className="font-bold text-foreground">Agent Pro</span>{" "}
            <span className="text-muted-foreground">— underwrite for your clients</span>
          </p>
        ) : null}
      </div>
      <div className={showAgentPro ? "grid grid-cols-1 gap-4 lg:grid-cols-3 lg:gap-5" : "grid grid-cols-1 gap-4 lg:grid-cols-2 lg:gap-5"}>
        {/* FREE — follows Pro on narrow screens so a high-intent visitor sees
            the paid offer immediately; returns to the left column on desktop
            where side-by-side comparison is visible without scrolling. */}
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
              isPaid={isPaid}
              hadPriorSubscription={hadPriorSubscription}
            />
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
                  {f.label.startsWith("Lender-ready PDF export")
                    ? `Single-Deal Underwrite — ${singleDealPriceLabel} one-time`
                    : f.label}
                </span>
              </li>
            ))}
          </ul>
        </div>

        {/* PRO (with toggle) */}
        <div className="relative order-1 -mt-2 rounded-3xl border-2 border-primary bg-card p-6 shadow-[0_24px_70px_rgba(0,112,196,0.18)] lg:order-2 lg:scale-[1.03]">
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
            {isPaid ? (
              <span className="rounded-full bg-[var(--metric-positive)]/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-[var(--metric-positive)]">
                Current
              </span>
            ) : null}
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Turn every address into a defensible acquisition decision.
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
            <span className="font-mono text-4xl font-extrabold tabular-nums tracking-tight text-foreground sm:text-5xl">
              {proCard.priceTop}
            </span>
            <span className="text-sm text-muted-foreground">{proCard.priceSub}</span>
          </div>
          <div className="mt-1 text-xs text-muted-foreground">{proCard.subline}</div>
          <div className="mt-3 flex justify-center">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--metric-positive)]/12 px-3 py-1 text-xs font-extrabold uppercase tracking-wide text-[var(--metric-positive)]">
              <Sparkles className="size-3" /> {offersTrial ? `Full Pro · ${TRIAL_DAYS} days free` : "Full Pro access"}
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
            <PricingPlanButtons
              slot={proCard.slot}
              isAuthenticated={isAuthenticated}
              isPaid={isPaid}
              hadPriorSubscription={hadPriorSubscription}
            />
          </div>
          {offersTrial ? (
            <p className="mt-2.5 text-center text-xs text-muted-foreground">
              <strong className="text-foreground">Full Pro access now.</strong> Card required at checkout.
              Subscription billing starts after {TRIAL_DAYS} days unless you cancel first. Your saved
              work stays in your account if you downgrade.
            </p>
          ) : (
            <p className="mt-2.5 text-center text-xs text-muted-foreground">
              <strong className="text-foreground">Full Pro access starts immediately.</strong> The
              free trial is a first-time offer. Cancel online anytime; no contract. Your saved work
              stays in your account if you downgrade.
            </p>
          )}
          <p className="mt-6 text-sm font-semibold text-foreground">Everything in Free, plus —</p>
          <div className="mt-3 space-y-4">
            {PRO_OUTCOMES.map((group) => (
              <div key={group.outcome}>
                <p className="text-[11px] font-bold uppercase tracking-widest text-primary">
                  {group.outcome}
                </p>
                <ul className="mt-1.5 space-y-1.5">
                  {group.items.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm">
                      <Sparkles className="mt-0.5 size-4 shrink-0 text-primary" />
                      <span className="text-foreground">{f}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        {/* AGENT PRO — rendered only when its Stripe price is configured.
            Feature list derives from lib/entitlements-catalog (the SSOT):
            "Everything in Pro" + exactly the agent_pro-only feature labels,
            so this card can never promise something the tier doesn't gate. */}
        {showAgentPro ? (
          <div className="relative order-3 rounded-3xl border border-border bg-card p-6 shadow-sm">
            <div className="flex items-baseline justify-between">
              <h3 className="text-lg font-extrabold text-foreground">Agent Pro</h3>
              <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-primary">
                For agents
              </span>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              Run every client&rsquo;s buy box. Send co-branded deals that come back to you.
            </p>
            <div className="mt-5 flex items-baseline gap-1.5">
              <span className="font-mono text-4xl font-extrabold tabular-nums tracking-tight text-foreground sm:text-5xl">
                {agentCard.priceTop}
              </span>
              <span className="text-sm text-muted-foreground">{agentCard.priceSub}</span>
            </div>
            <div className="mt-1 text-xs text-muted-foreground">{agentCard.subline}</div>
            <div className="mt-5">
              <PricingPlanButtons
                slot={agentCard.slot}
                isAuthenticated={isAuthenticated}
                isPaid={isPaid}
                hadPriorSubscription={hadPriorSubscription}
              />
            </div>
            <ul className="mt-6 space-y-2.5">
              {AGENT_PRO_FEATURES.map((f) => (
                <li key={f} className="flex items-start gap-2 text-sm">
                  <Sparkles className="mt-0.5 size-4 shrink-0 text-primary" />
                  <span className="text-foreground">{f}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    </>
  );
}
