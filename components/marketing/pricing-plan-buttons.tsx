"use client";

import { useState, useTransition } from "react";
import { track } from "@/lib/analytics/site-events";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { createCheckoutSessionAction } from "@/app/actions/billing";
import { buttonVariants } from "@/components/ui/button";
import { OpenCheckoutChoice } from "@/components/billing/open-checkout-choice";
import { useToast } from "@/hooks/use-toast";
import type { CheckoutPlanSlug } from "@/lib/pricing-checkout-resume";
import { decidePricingCardCta } from "@/lib/billing-plan-cta";

type Slot = "free" | CheckoutPlanSlug;

/**
 * Pricing CTA boundary:
 * - anonymous visitors create an account and begin the no-card evaluation;
 * - active subscribers manage/switch in Billing;
 * - authenticated non-subscribers see the exact immediate charge.
 * Signup never auto-opens Stripe and never schedules a future charge.
 *
 * Every branch is the 48px marketing button (DESIGN.md "Buttons"). A row of
 * plan cards has one filled button: on /pricing the paid cards are the
 * checkout, so the Pro card's action is "primary" and Free and Agent Pro are
 * "secondary" (the outline button).
 */
export function PricingPlanButtons({
  slot,
  isAuthenticated,
  activePaidPlanSlug,
  priceLabel,
  checkoutReady = true,
  emphasis = "primary",
}: {
  slot: Slot;
  isAuthenticated: boolean;
  activePaidPlanSlug: string | null;
  priceLabel?: string;
  checkoutReady?: boolean;
  /** "primary": the row's one filled button. "secondary": the outline one. */
  emphasis?: "primary" | "secondary";
}) {
  const { toast } = useToast();
  const [, startTransition] = useTransition();
  const [pending, setPending] = useState(false);
  // Set when the server found the buyer's own open Checkout Session for
  // another plan or billing period. The card then offers that checkout or a
  // fresh one for the plan they asked for, in place of the Subscribe button.
  // The requested plan is stored because this instance outlives the
  // Monthly/Annual toggle (its `slot` changes): the choice shows only on the
  // plan it was raised for, so toggling to the open plan itself shows the
  // normal button, which resumes that checkout.
  const [openCheckout, setOpenCheckout] = useState<{
    requestedPlanSlug: CheckoutPlanSlug;
    openPlanSlug: CheckoutPlanSlug;
    resumeUrl: string;
  } | null>(null);
  // Full width in a card, so 12px of side padding is enough (the cta size's
  // 20px broke "Create a free account — no card" onto two lines in the
  // ~274px card column at 1095px), and a label that must wrap in a narrower
  // column splits evenly instead of leaving its last word alone.
  const actionClass = buttonVariants({
    size: "cta",
    variant: emphasis === "primary" ? "default" : "outline",
    className: "w-full px-3 text-balance",
  });

  const startCheckout = (planSlug: CheckoutPlanSlug, startOver = false) => {
    // One funnel event per click on Subscribe; "start over" continues the
    // same attempt.
    if (!startOver) {
      track("checkout_started", {
        plan: planSlug,
        interval: planSlug.includes("annual") ? "annual" : "monthly",
      });
    }
    setPending(true);
    startTransition(async () => {
      try {
        const result = await createCheckoutSessionAction(
          startOver ? { planSlug, startOver: true } : { planSlug },
        );
        if (!result.ok) {
          if (result.code === "CHECKOUT_OPEN_OTHER_PLAN") {
            setOpenCheckout({
              requestedPlanSlug: planSlug,
              openPlanSlug: result.openPlanSlug,
              resumeUrl: result.resumeUrl,
            });
            setPending(false);
            return;
          }
          setOpenCheckout(null);
          toast({
            title: "Checkout error",
            description: result.message,
            variant: "destructive",
          });
          setPending(false);
          return;
        }
        window.location.href = result.url;
      } catch (error) {
        toast({
          title: "Checkout error",
          description: error instanceof Error ? error.message : "Try again in a moment.",
          variant: "destructive",
        });
        setPending(false);
      }
    });
  };

  if (slot === "free") {
    return (
      <Link href="/analyze" prefetch={false} className={actionClass}>
        {isAuthenticated ? "Open the calculator" : "Analyze a property free"}
      </Link>
    );
  }

  const paidCardDecision = decidePricingCardCta(activePaidPlanSlug, slot);
  if (paidCardDecision.kind !== "checkout") {
    return (
      <Link href="/profile#billing" className={actionClass}>
        {paidCardDecision.label}
      </Link>
    );
  }

  if (!isAuthenticated) {
    const tierName = slot.startsWith("agent_pro_") ? "Agent Pro" : "Pro";
    const plan = slot.startsWith("agent_pro_") ? "agent-pro" : "investor-pro";
    const billing = slot.endsWith("_annual") ? "annual" : "monthly";
    // A full-document navigation, not next/link: a visitor who backs out of
    // sign-up returns to the card they were reading. After a client-side
    // hop, Back restored the scroll while the short auth page was still
    // mounted, so the position was clamped to its height (483px at 1095,
    // 415px at 390) and /pricing reopened at its hero.
    return (
      <a
        href={`/auth/sign-up?plan=${plan}&billing=${billing}&next=${encodeURIComponent("/dashboard/new")}`}
        className={actionClass}
      >
        {tierName === "Agent Pro"
          ? "Create a free account — no card"
          : `Start ${tierName} evaluation — no card`}
      </a>
    );
  }

  if (openCheckout && openCheckout.requestedPlanSlug === slot) {
    return (
      <OpenCheckoutChoice
        openPlanSlug={openCheckout.openPlanSlug}
        requestedPlanSlug={openCheckout.requestedPlanSlug}
        pending={pending}
        onResume={() => {
          window.location.href = openCheckout.resumeUrl;
        }}
        onStartOver={() => startCheckout(openCheckout.requestedPlanSlug, true)}
      />
    );
  }

  return (
    <button
      type="button"
      onClick={() => startCheckout(slot)}
      disabled={pending || !checkoutReady}
      className={actionClass}
    >
      {!checkoutReady ? (
        "Billing setup pending"
      ) : pending ? (
        <>
          <Loader2 aria-hidden className="size-4 animate-spin" /> Opening checkout…
        </>
      ) : (
        <>Subscribe — {priceLabel ?? "shown price"} today</>
      )}
    </button>
  );
}
