"use client";

import { useState, useTransition } from "react";
import { track } from "@/lib/analytics/site-events";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { createCheckoutSessionAction } from "@/app/actions/billing";
import { buttonVariants } from "@/components/ui/button";
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
  const actionClass = buttonVariants({
    size: "cta",
    variant: emphasis === "primary" ? "default" : "outline",
    className: "w-full",
  });

  const startCheckout = (planSlug: CheckoutPlanSlug) => {
    track("checkout_started", {
      plan: planSlug,
      interval: planSlug.includes("annual") ? "annual" : "monthly",
    });
    setPending(true);
    startTransition(async () => {
      try {
        const result = await createCheckoutSessionAction({ planSlug });
        if (!result.ok) {
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
    return (
      <Link
        href={`/auth/sign-up?plan=${plan}&billing=${billing}&next=${encodeURIComponent("/dashboard/new")}`}
        className={actionClass}
      >
        {tierName === "Agent Pro"
          ? "Create a free account — no card"
          : `Start ${tierName} evaluation — no card`}
      </Link>
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
