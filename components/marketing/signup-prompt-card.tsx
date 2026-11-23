"use client";

/**
 * The save ask for ANONYMOUS visitors, directly under the decision card.
 *
 * One card, two ways to keep the result (2026-11 polish): save it to a free
 * account, or have the memo emailed. They used to be two stacked cards about
 * 700px tall on a phone; together they read as a single ask and run about
 * 200px shorter, which brings the Deal score and the rest of the report up.
 *
 * Hierarchy: Google is the card's one filled action, email sign-up the
 * secondary, and the memo form (passed in as `memoSlot`, when the visitor is
 * entitled to it) sits under a rule with a secondary button. From 1024px the
 * copy and the two sign-up buttons sit side by side, so the buttons keep a
 * control's width instead of stretching across the report.
 *
 * Conversion theory: paid traffic that runs an analysis and leaves without
 * signing up is gone forever. Even visitors who won't commit to a paid plan
 * today will often sign up to save the work they just did.
 *
 * Renders nothing if the user is authenticated. Dismissed, the account ask
 * goes and the memo form (if any) stays, in the same card.
 */

import { Suspense, useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { Loader2, X } from "lucide-react";
import { GoogleAuthButton } from "@/components/auth/google-auth-button";
import {
  PRODUCT_EVALUATION_COMPARISON_LIMIT,
  PRODUCT_EVALUATION_DAYS,
  PRODUCT_EVALUATION_DEAL_LIMIT,
} from "@/lib/product-access";
import { PRODUCT_PLAN_FACTS } from "@/lib/product-facts";
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
  /**
   * The memo email form (components/marketing/memo-email-capture.tsx, its
   * embedded layout), when this visitor may request it. It is the card's
   * second path, under the account ask.
   */
  memoSlot?: ReactNode;
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

/**
 * What the free plan keeps, in one line. The same three facts the card used
 * to set as three ruled rows ("Save up to 5 · Reopen later · editing is Pro",
 * "Any device", "Read-only links"). The saved-deal cap is the catalog's own
 * label ("up to 5"), so a change to the cap changes this line.
 */
export function freePlanKeepsLine(): string {
  return `Save ${PRODUCT_PLAN_FACTS.free.savedDealLimit} deals, reopen them on any device, and share read-only links. Editing a saved deal is Pro.`;
}

const CARD = "rounded-lg border border-border bg-card p-5 shadow-sm sm:p-6";

export function SignupPromptCard({
  isAuthenticated,
  isFreeDecision = false,
  onPrepareSaveIntent,
  memoSlot = null,
}: SignupPromptCardProps) {
  const [dismissed, setDismissed] = useState(false);
  useEffect(() => {
    if (!isAuthenticated && !dismissed) {
      trackEvent("signup_prompt_viewed", { placement: "analysis_result" });
      trackEvent("save_prompt_shown", { placement: "analysis_result" });
    }
  }, [dismissed, isAuthenticated]);
  if (isAuthenticated) return null;
  // The account ask was dismissed: the memo form, if there is one, is still
  // an answer the visitor may want, so it keeps the card.
  if (dismissed) {
    return memoSlot ? <div className={CARD}>{memoSlot}</div> : null;
  }

  const beginSignup = (method: "google" | "email" | "sign_in") => {
    const intendedDraft = onPrepareSaveIntent?.();
    setPendingSaveIntent(intendedDraft);
    trackEvent("signup_started", { placement: "analysis_result", method });
  };

  return (
    <div data-save-capture-card="" className={`relative ${CARD}`}>
      {/* The dismiss keeps its 44px target in the card's corner, out of the
          two-column flow. No tag above the heading (DESIGN.md "Chrome"). */}
      <button
        type="button"
        onClick={() => setDismissed(true)}
        aria-label="Dismiss signup prompt"
        className="absolute right-2 top-2 inline-flex size-11 items-center justify-center rounded-md text-muted-foreground transition-colors duration-150 hover:bg-band hover:text-foreground focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
      >
        <X className="size-4" />
      </button>

      <div className="grid gap-x-12 gap-y-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,21rem)] lg:items-center lg:pr-10">
        <div className="min-w-0">
          <h3 className="pr-10 font-display text-balance text-xl text-foreground sm:text-2xl lg:pr-0">
            Save this deal free
          </h3>
          <p className="mt-1.5 max-w-[62ch] text-pretty text-sm leading-relaxed text-foreground">
            {saveDealAccountPitch(isFreeDecision)}
          </p>
          <p className="mt-1.5 max-w-[62ch] text-pretty text-sm leading-relaxed text-muted-foreground">
            {freePlanKeepsLine()}
          </p>
        </div>

        <div className="min-w-0">
          {/* GoogleAuthButton uses useSearchParams internally; Next 16
              requires a Suspense boundary around it. */}
          <div className="space-y-2">
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
                variant="primary"
                label="Sign up free with Google"
                onBeforeStart={() => beginSignup("google")}
              />
            </Suspense>
            <Link
              href="/auth/sign-up?next=/dashboard/new"
              onClick={() => beginSignup("email")}
              className="inline-flex min-h-11 w-full items-center justify-center rounded-md border border-input bg-transparent px-5 text-sm font-semibold text-foreground transition-colors duration-150 hover:bg-band focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
            >
              Sign up with email
            </Link>
          </div>
          {/* Risk-reversal */}
          <p className="mt-1 text-2xs text-muted-foreground">
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
      </div>

      {memoSlot ? (
        <div className="mt-3 border-t border-border pt-4">{memoSlot}</div>
      ) : null}
    </div>
  );
}
