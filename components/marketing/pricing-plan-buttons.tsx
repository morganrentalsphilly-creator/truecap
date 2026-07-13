"use client";

/**
 * Plan CTAs for /pricing. Three behaviors:
 *
 *  - slot=free      → "Start free" → /auth/sign-up (or /dashboard if already in)
 *  - slot=pro_*     → cold visitor: "Get Pro" → /auth/sign-up?next=/pricing?checkout=<slot>#plans
 *                     authed free:  "Upgrade"  → triggers Stripe checkout
 *                     authed paid:  "Manage subscription" → /profile
 *
 * Checkout resume: the cold-visitor CTA encodes the chosen plan in the
 * signup return path. When this component mounts back on /pricing
 * authenticated with a valid ?checkout= param, it auto-fires the same
 * Stripe checkout exactly once (param stripped from the URL before the
 * redirect so refresh / back-forward can never loop it) — mirroring the
 * pending-save-intent auto-resume in investcalc-page.tsx.
 *
 * Keeps the /pricing page free of auth branching — server passes
 * isAuthenticated + isPaid, this component owns the click handler.
 */

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { ArrowRight, Loader2, Sparkles } from "lucide-react";
import { createCheckoutSessionAction } from "@/app/actions/billing";
import { useToast } from "@/hooks/use-toast";
import {
  buildCheckoutReturnPath,
  resolveCheckoutResume,
  type CheckoutPlanSlug,
} from "@/lib/pricing-checkout-resume";
import { TRIAL_LABEL } from "@/lib/trial";

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
  // pending-save-intent auto-resume in investcalc-page.tsx. Only the pro
  // instance runs it (one mounts at a time via the Monthly/Annual toggle);
  // resolveCheckoutResume ignores unknown plan values silently and refuses
  // to fire on a Stripe cancel return (?billing=checkout_cancelled).
  const autoResumedRef = useRef(false);
  useEffect(() => {
    if (slot === "free" || !isAuthenticated || isPaid || autoResumedRef.current) return;
    const resume = resolveCheckoutResume(window.location.search);
    if (!resume) return;
    autoResumedRef.current = true;
    // Strip the param BEFORE firing so refresh / bfcache / a re-mount can
    // never loop the auto-redirect to Stripe. Preserve Next's history state.
    window.history.replaceState(
      window.history.state,
      "",
      `${window.location.pathname}${resume.strippedSearch}${window.location.hash}`
    );
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

  // Cold visitor — funnel to signup; the return path encodes the chosen
  // plan (?checkout=<slot>) so the auto-resume effect above continues the
  // purchase after auth. `slot` is a pro plan here — free returned earlier.
  if (!isAuthenticated) {
    const nextPath = buildCheckoutReturnPath(slot, couponCode);
    return (
      <Link
        href={`/auth/sign-up?next=${encodeURIComponent(nextPath)}`}
        className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground shadow-[0_8px_22px_rgba(0,112,196,0.30)] hover:bg-primary/95"
      >
        <Sparkles className="size-4" /> Start your {TRIAL_LABEL}
      </Link>
    );
  }

  // Authenticated free user — direct checkout
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
          <Sparkles className="size-4" /> Start {TRIAL_LABEL}
        </>
      )}
    </button>
  );
}
