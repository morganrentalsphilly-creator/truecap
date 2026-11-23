"use client";

/**
 * Post-analysis signup prompt for ANONYMOUS users.
 *
 * Renders ONLY when the visitor isn't signed in and has just completed
 * a free analysis. The Pro upsell (MomentOfValueUpsell) handles the
 * paid conversion; this card handles the upstream conversion that
 * makes the Pro pitch even possible later — signup.
 *
 * Conversion theory: paid traffic that runs an analysis and leaves
 * without signing up is gone forever. A soft "save this for later"
 * ask, with Google one-tap, lifts soft conversions materially. Even
 * users who don't want to commit to a paid plan today will often
 * sign up to save the work they just did.
 *
 * Renders nothing if:
 *  - the user is already authenticated
 *  - the user has dismissed it this session
 */

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { Loader2, X } from "lucide-react";
import { GoogleAuthButton } from "@/components/auth/google-auth-button";
import {
  PRODUCT_EVALUATION_COMPARISON_LIMIT,
  PRODUCT_EVALUATION_DAYS,
  PRODUCT_EVALUATION_DEAL_LIMIT,
} from "@/lib/product-access";
import { setPendingSaveIntent } from "@/lib/save-intent";
import { trackEvent } from "@/lib/analytics";

interface SignupPromptCardProps {
  /** True when the viewer is signed in. If so, render nothing. */
  isAuthenticated: boolean;
  /**
   * True when the result on screen is this browser's no-signup decision (the
   * exact Offer Ceiling was served for it). The body's first sentence says so
   * only then: a sample deal or a later run is not "your free full decision".
   */
  isFreeDecision?: boolean;
  /** Persist the exact analysis snapshot before auth navigation begins. */
  onPrepareSaveIntent?: () => unknown;
}

/**
 * What a free account adds, said at the result (2026-11 ads pass, A3). The
 * trial's numbers come from lib/product-access.ts, never typed here.
 */
export function saveDealAccountPitch(isFreeDecision: boolean): string {
  const comparisons = `${PRODUCT_EVALUATION_COMPARISON_LIMIT} comparison${
    PRODUCT_EVALUATION_COMPARISON_LIMIT === 1 ? "" : "s"
  }`;
  return `${isFreeDecision ? "This was your free full decision. " : ""}A free account saves it and adds a ${PRODUCT_EVALUATION_DAYS}-day trial with ${PRODUCT_EVALUATION_DEAL_LIMIT} Pro analyses and ${comparisons}. No card.`;
}

export function SignupPromptCard({
  isAuthenticated,
  isFreeDecision = false,
  onPrepareSaveIntent,
}: SignupPromptCardProps) {
  const [dismissed, setDismissed] = useState(false);
  useEffect(() => {
    if (!isAuthenticated && !dismissed) {
      trackEvent("signup_prompt_viewed", { placement: "analysis_result" });
      trackEvent("save_prompt_shown", { placement: "analysis_result" });
    }
  }, [dismissed, isAuthenticated]);
  if (isAuthenticated || dismissed) return null;

  const beginSignup = (method: "google" | "email" | "sign_in") => {
    const intendedDraft = onPrepareSaveIntent?.();
    setPendingSaveIntent(intendedDraft);
    trackEvent("signup_started", { placement: "analysis_result", method });
  };

  return (
    <div
      data-save-capture-card=""
      className="rounded-lg border border-border bg-card p-5 shadow-sm sm:p-6"
    >
      {/* The heading with its dismiss beside it: no tag above a heading
          (DESIGN.md "Chrome"). The dismiss keeps its 44px target and takes
          its padding back out of the row. */}
      <div className="flex items-start justify-between gap-3">
        <h3 className="font-display text-balance text-xl text-foreground sm:text-2xl">
          Save this deal free
        </h3>
        <button
          type="button"
          onClick={() => setDismissed(true)}
          aria-label="Dismiss signup prompt"
          className="-mr-2 -mt-2 inline-flex size-11 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors duration-150 hover:bg-band hover:text-foreground focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
        >
          <X className="size-4" />
        </button>
      </div>
      <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
        {saveDealAccountPitch(isFreeDecision)}
      </p>

      {/* What the free account gives: three rows on lines (stacked on
          phones, 3-up from sm). No icons: the words carry it. */}
      <ul className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-3 sm:gap-3">
        <BenefitRow label="Save up to 5" sub="Reopen later · editing is Pro" />
        <BenefitRow label="Any device" sub="After you save" />
        <BenefitRow label="Read-only links" sub="Share a saved deal" />
      </ul>

      {/* Primary CTA — Google one-tap. Email signup as the alternate
          path right below.
          GoogleAuthButton uses useSearchParams internally; Next 16
          requires a Suspense boundary around it. The homepage (where
          this card mounts) doesn't have one at the page level, so we
          wrap here. */}
      <div className="mt-5 space-y-3">
        <Suspense
          fallback={
            <div className="flex h-12 w-full items-center justify-center rounded-md border border-border bg-card">
              <Loader2
                className="size-4 animate-spin text-muted-foreground"
                aria-hidden
              />
            </div>
          }
        >
          <GoogleAuthButton
            label="Sign up free with Google"
            onBeforeStart={() => beginSignup("google")}
          />
        </Suspense>

        <div className="flex items-center justify-center gap-2 text-2xs text-muted-foreground">
          <span className="h-px w-8 bg-border" />
          <span>or</span>
          <span className="h-px w-8 bg-border" />
        </div>

        <Link
          href="/auth/sign-up?next=/dashboard/new"
          onClick={() => beginSignup("email")}
          className="inline-flex h-11 w-full items-center justify-center rounded-md border border-input bg-transparent px-5 text-sm font-semibold text-foreground transition-colors duration-150 hover:bg-band focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
        >
          Sign up with email
        </Link>
      </div>

      {/* Risk-reversal */}
      <p className="mt-4 border-t border-border pt-3 text-2xs text-muted-foreground">
        Free plan · No card · Already have an account?{" "}
        <Link
          href="/auth/login?next=/dashboard/new"
          onClick={() => beginSignup("sign_in")}
          className="tc-link inline-flex min-h-11 min-w-11 items-center justify-center px-1 font-semibold focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
        >
          Sign in
        </Link>
      </p>
    </div>
  );
}

function BenefitRow({ label, sub }: { label: string; sub: string }) {
  return (
    <li className="min-w-0 border-t border-border pt-2">
      <div className="text-sm font-semibold text-foreground">{label}</div>
      <div className="text-2xs leading-snug text-muted-foreground">{sub}</div>
    </li>
  );
}
