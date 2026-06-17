"use client";

/**
 * Plan CTAs for /pricing. Three behaviors:
 *
 *  - slot=free      → "Start free" → /auth/sign-up (or /dashboard if already in)
 *  - slot=pro_*     → cold visitor: "Get Pro" → /auth/sign-up?next=/pricing
 *                     authed free:  "Upgrade"  → triggers Stripe checkout
 *                     authed paid:  "Manage subscription" → /profile
 *
 * Keeps the /pricing page free of auth branching — server passes
 * isAuthenticated + isPaid, this component owns the click handler.
 */

import { useState, useTransition } from "react";
import Link from "next/link";
import { ArrowRight, Loader2, Sparkles } from "lucide-react";
import { createCheckoutSessionAction } from "@/app/actions/billing";
import { useToast } from "@/hooks/use-toast";

type Slot = "free" | "pro_monthly" | "pro_annual";

export function PricingPlanButtons({
  slot,
  isAuthenticated,
  isPaid,
}: {
  slot: Slot;
  isAuthenticated: boolean;
  isPaid: boolean;
}) {
  const { toast } = useToast();
  const [, startTransition] = useTransition();
  const [pending, setPending] = useState(false);

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
        href="/auth/sign-up"
        className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-bold text-foreground hover:bg-muted"
      >
        Start free <ArrowRight className="size-4" />
      </Link>
    );
  }

  // Paid user — show manage instead of upgrade
  if (isPaid) {
    return (
      <Link
        href="/profile#billing"
        className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-bold text-foreground hover:bg-muted"
      >
        Manage subscription
      </Link>
    );
  }

  // Cold visitor — funnel to signup; pass next=/pricing so they return here
  if (!isAuthenticated) {
    return (
      <Link
        href={`/auth/sign-up?next=${encodeURIComponent("/pricing")}`}
        className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground shadow-[0_8px_22px_rgba(82,72,212,0.30)] hover:bg-primary/95"
      >
        <Sparkles className="size-4" /> Get Pro — start with free account
      </Link>
    );
  }

  // Authenticated free user — direct checkout
  const handleCheckout = () => {
    setPending(true);
    startTransition(async () => {
      try {
        const result = await createCheckoutSessionAction({ planSlug: slot });
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

  return (
    <button
      type="button"
      onClick={handleCheckout}
      disabled={pending}
      className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground shadow-[0_8px_22px_rgba(82,72,212,0.30)] hover:bg-primary/95 disabled:opacity-60"
    >
      {pending ? (
        <>
          <Loader2 className="size-4 animate-spin" />
          Opening checkout…
        </>
      ) : (
        <>
          <Sparkles className="size-4" /> Upgrade to Pro
        </>
      )}
    </button>
  );
}
