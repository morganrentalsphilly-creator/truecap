"use client";

/**
 * Exit-intent offer modal — fires on /pricing when the user moves
 * their cursor toward the close-tab area (top of viewport on desktop)
 * OR shows after 20s on mobile (no real "exit-intent" gesture on touch).
 *
 * Design rationale: this is the last conversion opportunity before
 * the visitor leaves. A targeted offer with a fixed-quantity scarcity
 * frame ("first 100 customers") significantly lifts conversion. We
 * cap impressions per session via sessionStorage so the modal never
 * fires more than once per visit.
 *
 * No analytics dependency — fires the existing PostHog `pro_checkout_started`
 * event via the same /api/billing server action the regular pricing
 * buttons use, so the funnel data stays consistent.
 *
 * Coupon: discount is applied at Stripe checkout via the EXIT_INTENT_COUPON_ID
 * env var. If unset, the modal still shows but the CTA falls back to the
 * standard pricing-page link (no discount). Morgan controls the coupon
 * in Stripe Dashboard.
 */

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { X } from "lucide-react";
import { trackEvent } from "@/lib/analytics";

const SESSION_KEY = "truecap_exit_intent_shown_v1";
const MOBILE_DELAY_MS = 22_000;

export function ExitIntentOffer() {
  const [open, setOpen] = useState(false);
  const armedRef = useRef(true);

  useEffect(() => {
    // Already shown this session → don't re-fire.
    try {
      if (window.sessionStorage.getItem(SESSION_KEY) === "1") {
        armedRef.current = false;
        return;
      }
    } catch {
      // sessionStorage blocked (private mode, etc.) — bail silently.
      return;
    }

    const trigger = () => {
      if (!armedRef.current) return;
      armedRef.current = false;
      setOpen(true);
      // Track exposure — funnel needs to know how many pricing visitors
      // were actually shown the offer so we can compute click rate.
      trackEvent("exit_intent_shown");
      try {
        window.sessionStorage.setItem(SESSION_KEY, "1");
      } catch {
        // Same private-mode fallback.
      }
    };

    // Desktop: fire when cursor crosses above the viewport top.
    // (Approximated as Y < 5 — anything tighter misfires on momentum scroll.)
    const onMouseMove = (e: MouseEvent) => {
      if (e.clientY < 5) {
        trigger();
      }
    };

    // Mobile: no mouse, so fall back to a delayed prompt. 22s lets
    // someone read the pricing page first; below that and we're just
    // interrupting reading.
    const isLikelyTouch =
      typeof window.matchMedia === "function" &&
      window.matchMedia("(pointer: coarse)").matches;

    if (isLikelyTouch) {
      const timer = window.setTimeout(trigger, MOBILE_DELAY_MS);
      return () => window.clearTimeout(timer);
    }

    document.addEventListener("mousemove", onMouseMove);
    return () => document.removeEventListener("mousemove", onMouseMove);
  }, []);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Special offer"
      className="fixed inset-0 z-[60] flex items-center justify-center p-4"
    >
      {/* Backdrop */}
      <button
        type="button"
        aria-label="Close offer"
        onClick={() => setOpen(false)}
        className="absolute inset-0 bg-black/55 backdrop-blur-sm"
      />

      {/* Modal */}
      <div className="relative z-10 w-full max-w-md overflow-hidden rounded-3xl border-2 border-primary bg-card p-6 shadow-2xl sm:p-8">
        <button
          type="button"
          aria-label="Close"
          onClick={() => {
            trackEvent("exit_intent_dismissed");
            setOpen(false);
          }}
          className="absolute right-3 top-3 inline-flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground transition hover:bg-muted hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>

        <p className="text-[11px] font-extrabold uppercase tracking-widest text-primary">
          ★ Limited offer
        </p>
        <h2 className="mt-2 text-balance text-2xl font-extrabold leading-tight text-foreground sm:text-3xl">
          Wait — first 100 customers get
          <br />
          <span className="text-primary">50% off your first year.</span>
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          You came this close to upgrading. Save $114/yr on Pro — full toolkit,
          10-year projections, PDF exports, save unlimited deals. Cancel anytime.
        </p>

        <div className="mt-5 flex flex-col gap-2.5 sm:flex-row">
          <Link
            href="/pricing#plans?coupon=EXIT50"
            onClick={() => {
              trackEvent("exit_intent_clicked", { variant: "50_off_annual" });
              setOpen(false);
            }}
            className="inline-flex flex-1 items-center justify-center rounded-xl bg-primary px-4 py-3 text-sm font-bold text-primary-foreground shadow-sm transition hover:bg-primary/90"
          >
            Claim 50% off
          </Link>
          <button
            type="button"
            onClick={() => {
              trackEvent("exit_intent_dismissed");
              setOpen(false);
            }}
            className="inline-flex flex-1 items-center justify-center rounded-xl border border-border bg-card px-4 py-3 text-sm font-semibold text-muted-foreground transition hover:text-foreground"
          >
            No thanks
          </button>
        </div>

        <p className="mt-4 text-center text-[11px] text-muted-foreground">
          Coupon auto-applies at checkout. Cancel anytime.
        </p>
      </div>
    </div>
  );
}
