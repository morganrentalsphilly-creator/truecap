"use client";

/**
 * Plan CTAs for /pricing. Three behaviors:
 *
 *  - slot=free      → "Analyze a deal free" → the no-signup homepage analyzer
 *  - slot=pro_*     → cold visitor: "Get Pro" → /auth/sign-up?next=/pricing?checkout=<slot>#plans
 *                     authed free:  "Upgrade"  → triggers Stripe checkout
 *                     authed paid:  exact-plan manage / period switch /
 *                                   tier upgrade copy → /profile#billing
 *
 * Checkout resume: the cold-visitor CTA encodes the chosen plan in the
 * signup return path. When this component mounts back on /pricing
 * authenticated with a valid ?checkout= param, it auto-fires the same
 * Stripe checkout exactly once (param stripped from the URL before the
 * redirect so refresh / back-forward can never loop it) — mirroring the
 * pending-save-intent auto-resume in investcalc-page.tsx.
 *
 * Keeps the /pricing page free of click-handler branching — the server passes
 * auth plus the exact live plan slug, and this component owns the safe action.
 */

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { ArrowRight, Loader2, RefreshCw, Sparkles } from "lucide-react";
import { createCheckoutSessionAction } from "@/app/actions/billing";
import { useToast } from "@/hooks/use-toast";
import {
  buildCheckoutReturnPath,
  resolveCheckoutResumeForSlot,
  type CheckoutPlanSlug,
} from "@/lib/pricing-checkout-resume";
import { decidePricingCardCta } from "@/lib/billing-plan-cta";
import { TRIAL_DAYS, willCheckoutGrantTrial } from "@/lib/trial";
import {
  decideCheckoutResumeAvailability,
  type PricingPriceAvailability,
} from "@/lib/pricing-price-availability";

type Slot = "free" | CheckoutPlanSlug;

export function PricingPlanButtons({
  slot,
  isAuthenticated,
  activePaidPlanSlug,
  hadPriorSubscription,
  priceAvailability,
}: {
  slot: Slot;
  isAuthenticated: boolean;
  /** Exact live plan slug, or null for Free. Any non-null value is treated as
   * paid and routed through Billing rather than a new checkout. */
  activePaidPlanSlug: string | null;
  /** True when checkout will NOT grant the trial (prior subscription row,
   * any status — see hasAnySubscriptionHistory). Swaps trial CTA copy. */
  hadPriorSubscription: boolean;
  /** Server-resolved live Stripe display-price status for every paid slot. */
  priceAvailability: PricingPriceAvailability;
}) {
  const { toast } = useToast();
  const [, startTransition] = useTransition();
  const [pending, setPending] = useState(false);
  const [unavailablePlan, setUnavailablePlan] = useState<CheckoutPlanSlug | null>(null);
  // Carry a campaign code from the URL (?coupon=ANALYZE20) into checkout + the
  // signup hand-off, so the exit-intent's 50%-off offer survives the click.
  const [couponCode, setCouponCode] = useState("");
  useEffect(() => {
    try {
      setCouponCode(new URLSearchParams(window.location.search).get("coupon") ?? "");
    } catch {
      /* SSR / blocked — no coupon */
    }
  }, []);

  // Hoisted above the branches so both the button click and the auto-resume
  // effect below can fire it. Takes the plan explicitly (not `slot`): a
  // visitor who picked Annual pre-signup returns to a monthly-defaulted
  // toggle, so the mounted pro button's slot may differ from the plan they
  // actually started checkout for.
  const startCheckout = (planSlug: CheckoutPlanSlug, offer?: string) => {
    if (!priceAvailability[planSlug]) {
      setUnavailablePlan(planSlug);
      return;
    }
    setPending(true);
    startTransition(async () => {
      try {
        const result = await createCheckoutSessionAction({ planSlug, offer: offer || undefined });
        if (!result.ok) {
          toast({
            title: "Checkout error",
            description: result.message,
            variant: "destructive",
          });
          setPending(false);
          return;
        }
        // Hand off to Stripe.
        window.location.href = result.url;
      } catch (err) {
        toast({
          title: "Checkout error",
          description: err instanceof Error ? err.message : "Try again in a moment.",
          variant: "destructive",
        });
        setPending(false);
      }
    });
  };

  // Resume a checkout started pre-signup: the cold-visitor CTA routes to
  // /auth/sign-up?next=/pricing?checkout=<plan>…#plans, so mounting back
  // here authenticated with a valid ?checkout= means the Stripe redirect
  // should continue without a re-find-and-re-click step. Mirrors the
  // pending-save-intent auto-resume in investcalc-page.tsx. Pro and Agent Pro
  // can now mount side by side, so only the card that owns the requested tier
  // may claim the resume. The tier-level match intentionally ignores billing
  // period: a visitor who chose Annual returns to the Monthly-defaulted card,
  // but checkout must still resume the exact Annual plan encoded in the URL.
  // Unknown plan values and Stripe-cancel returns are ignored silently.
  const autoResumedRef = useRef(false);
  useEffect(() => {
    if (slot === "free" || !isAuthenticated || activePaidPlanSlug || autoResumedRef.current) return;
    const resume = resolveCheckoutResumeForSlot(window.location.search, slot);
    if (!resume) return;
    autoResumedRef.current = true;
    // Consume the one-shot intent before either checkout OR the unavailable
    // state. Otherwise toggling cadence/remounting or Retry would keep reading
    // the same failed annual/monthly intent and poison the healthy alternative.
    window.history.replaceState(
      window.history.state,
      "",
      `${window.location.pathname}${resume.strippedSearch}${window.location.hash}`
    );
    const availabilityDecision = decideCheckoutResumeAvailability(
      slot,
      resume.plan,
      priceAvailability
    );
    if (availabilityDecision !== "resume") {
      if (availabilityDecision === "disable_current") {
        setUnavailablePlan(resume.plan);
      } else {
        toast({
          title: "Selected billing cadence unavailable",
          description:
            "That Stripe price could not be loaded. The available cadence remains ready to choose.",
          variant: "destructive",
        });
      }
      return;
    }
    startCheckout(resume.plan, resume.coupon);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- one-shot resume on mount
  }, []);

  // Free plan tile
  if (slot === "free") {
    if (isAuthenticated) {
      return (
        <Link
          href="/"
          className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-bold text-foreground hover:bg-muted"
        >
          Open the calculator
        </Link>
      );
    }
    return (
      <Link
        href="/#main"
        className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-bold text-foreground hover:bg-muted"
      >
        Analyze a deal free <ArrowRight className="size-4" />
      </Link>
    );
  }

  const paidCardDecision = decidePricingCardCta(activePaidPlanSlug, slot);

  // A live subscriber never starts a fresh Checkout session from /pricing.
  // Current-plan management, cadence changes, and tier changes all continue in
  // Billing, whose switch flow applies proration and guards double billing.
  if (paidCardDecision.kind !== "checkout") {
    return (
      <Link
        href="/profile#billing"
        className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-bold text-foreground hover:bg-muted"
      >
        {paidCardDecision.label}
      </Link>
    );
  }

  const checkoutUnavailablePlan = unavailablePlan ?? (!priceAvailability[slot] ? slot : null);
  if (checkoutUnavailablePlan) {
    const unavailableTier = checkoutUnavailablePlan.startsWith("agent_pro_")
      ? "Agent Pro"
      : "Pro";
    const unavailablePeriod = checkoutUnavailablePlan.endsWith("_annual")
      ? "annual"
      : "monthly";
    return (
      <div className="space-y-2 text-center">
        <button
          type="button"
          disabled
          aria-disabled="true"
          className="inline-flex w-full cursor-not-allowed items-center justify-center gap-1.5 rounded-xl border border-border bg-muted px-4 py-2.5 text-sm font-bold text-muted-foreground opacity-80"
        >
          Checkout temporarily unavailable
        </button>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-lg px-3 text-xs font-bold text-primary hover:bg-primary/5 hover:underline"
        >
          <RefreshCw className="size-3.5" /> Retry price
        </button>
        <p role="status" className="text-xs leading-relaxed text-muted-foreground">
          The {unavailableTier} {unavailablePeriod} Stripe price could not be loaded.
          Refresh to retry; no checkout was started.
        </p>
      </div>
    );
  }

  // Cold visitor — funnel to signup; the return path encodes the chosen
  // plan (?checkout=<slot>) so the auto-resume effect above continues the
  // purchase after auth. `slot` is a pro plan here — free returned earlier.
  // Identity is unknown here: an anonymous visitor can be a returning customer
  // who signed out. Continue neutrally to signup; only an authenticated user
  // whose history check confirms eligibility gets an explicit Start Trial CTA.
  if (!isAuthenticated) {
    const nextPath = buildCheckoutReturnPath(slot, couponCode);
    const tierName = slot.startsWith("agent_pro_") ? "Agent Pro" : "Pro";
    return (
      <Link
        href={`/auth/sign-up?next=${encodeURIComponent(nextPath)}`}
        className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground shadow-[0_8px_22px_rgba(0,112,196,0.30)] hover:bg-primary/95"
      >
        <Sparkles className="size-4" /> Continue to {tierName}
      </Link>
    );
  }

  // Authenticated free user — direct checkout
  const tierName = slot.startsWith("agent_pro_") ? "Agent Pro" : "Pro";
  return (
    <button
      type="button"
      onClick={() => startCheckout(slot, couponCode || undefined)}
      disabled={pending}
      className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground shadow-[0_8px_22px_rgba(0,112,196,0.30)] hover:bg-primary/95 disabled:opacity-60"
    >
      {pending ? (
        <>
          <Loader2 className="size-4 animate-spin" />
          Opening checkout…
        </>
      ) : (
        <>
          {/* Returning ex-subscribers are excluded from the trial by the
              repeat-trial guard in billing.ts — don't promise one. */}
          <Sparkles className="size-4" />{" "}
          {willCheckoutGrantTrial(hadPriorSubscription)
            ? `Start ${TRIAL_DAYS}-Day ${tierName} Trial`
            : `Unlock ${tierName} Now`}
        </>
      )}
    </button>
  );
}
