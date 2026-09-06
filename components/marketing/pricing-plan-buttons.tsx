"use client";

import { useState, useTransition } from "react";
import { track } from "@/lib/analytics/site-events";
import Link from "next/link";
import { ArrowRight, Loader2, Sparkles } from "lucide-react";
import { createCheckoutSessionAction } from "@/app/actions/billing";
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
 */
export function PricingPlanButtons({
  slot,
  isAuthenticated,
  activePaidPlanSlug,
  priceLabel,
  checkoutReady = true,
}: {
  slot: Slot;
  isAuthenticated: boolean;
  activePaidPlanSlug: string | null;
  priceLabel?: string;
  checkoutReady?: boolean;
}) {
  const { toast } = useToast();
  const [, startTransition] = useTransition();
  const [pending, setPending] = useState(false);

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
      <Link
        href="/analyze"
        className="inline-flex min-h-11 w-full items-center justify-center gap-1.5 rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-bold text-foreground hover:bg-muted"
      >
        {isAuthenticated ? "Open the calculator" : "Analyze a property free"}
        {!isAuthenticated ? <ArrowRight aria-hidden className="size-4" /> : null}
      </Link>
    );
  }

  const paidCardDecision = decidePricingCardCta(activePaidPlanSlug, slot);
  if (paidCardDecision.kind !== "checkout") {
    return (
      <Link
        href="/profile#billing"
        className="inline-flex min-h-11 w-full items-center justify-center rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-bold text-foreground hover:bg-muted"
      >
        {paidCardDecision.label}
      </Link>
    );
  }

  if (!isAuthenticated) {
    const tierName = slot.startsWith("agent_pro_") ? "Agent Pro" : "Investor Pro";
    const plan = slot.startsWith("agent_pro_") ? "agent-pro" : "investor-pro";
    const billing = slot.endsWith("_annual") ? "annual" : "monthly";
    return (
      <Link
        href={`/auth/sign-up?plan=${plan}&billing=${billing}&next=${encodeURIComponent("/dashboard/new")}`}
        className="inline-flex min-h-11 w-full items-center justify-center gap-1.5 rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground shadow-[0_8px_22px_rgba(0,112,196,0.30)] hover:bg-primary/95"
      >
        <Sparkles aria-hidden className="size-4" /> Start {tierName} evaluation — no card
      </Link>
    );
  }

  return (
    <button
      type="button"
      onClick={() => startCheckout(slot)}
      disabled={pending || !checkoutReady}
      className="inline-flex min-h-11 w-full items-center justify-center gap-1.5 rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground shadow-[0_8px_22px_rgba(0,112,196,0.30)] hover:bg-primary/95 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {!checkoutReady ? (
        "Billing setup pending"
      ) : pending ? (
        <>
          <Loader2 aria-hidden className="size-4 animate-spin" /> Opening checkout…
        </>
      ) : (
        <>
          <Sparkles aria-hidden className="size-4" /> Subscribe — {priceLabel ?? "shown price"} today
        </>
      )}
    </button>
  );
}
