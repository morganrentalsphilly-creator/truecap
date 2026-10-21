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
  isTrueCapSyntheticSampleAddress,
  SAMPLE_DEAL_DISPLAY,
} from "@/lib/sample-deal";
import { setPendingSaveIntent } from "@/lib/save-intent";
import { trackEvent } from "@/lib/analytics";

interface SignupPromptCardProps {
  /** The address the user just analyzed; surfaced for personalization. */
  address?: string;
  /** True when the viewer is signed in. If so, render nothing. */
  isAuthenticated: boolean;
  /** Persist the exact analysis snapshot before auth navigation begins. */
  onPrepareSaveIntent?: () => unknown;
}

export function SignupPromptCard({
  address,
  isAuthenticated,
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

  const cleanAddress = (address ?? "").trim();
  // The sample deal carries an internal placeholder address; show the same
  // "Philadelphia rental example" label the decision card derives, never the
  // raw fixture string. Real addresses keep their street line only so the
  // headline never truncates mid-word.
  const dealLabel = isTrueCapSyntheticSampleAddress(cleanAddress)
    ? `this ${SAMPLE_DEAL_DISPLAY.shortAddress}`
    : cleanAddress
      ? cleanAddress.split(",")[0].trim().slice(0, 48) || "this analysis"
      : "this analysis";

  return (
    <div className="rounded-lg border border-border bg-card p-5 shadow-sm sm:p-6">
      {/* Header — pill + dismiss */}
      <div className="flex items-start justify-between gap-3">
        <span className="inline-flex items-center rounded-sm border border-border px-1.5 py-0.5 font-mono text-2xs text-muted-foreground">
          Free plan
        </span>
        <button
          type="button"
          onClick={() => setDismissed(true)}
          aria-label="Dismiss signup prompt"
          className="inline-flex size-11 items-center justify-center rounded-md text-muted-foreground transition-colors duration-150 hover:bg-band hover:text-foreground focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
        >
          <X className="size-4" />
        </button>
      </div>

      {/* Headline */}
      <h3 className="mt-3 font-display text-balance text-xl text-foreground sm:text-2xl">
        Create an account to save {dealLabel}
      </h3>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
        Save this underwriting and reopen it anywhere. Create a free
        account—we&apos;ll save this deal automatically.
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
