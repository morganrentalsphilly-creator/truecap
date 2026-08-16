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

import { Suspense, useState } from "react";
import Link from "next/link";
import { ArrowRight, Bookmark, FileDown, History, Loader2, Smartphone, X } from "lucide-react";
import { GoogleAuthButton } from "@/components/auth/google-auth-button";

interface SignupPromptCardProps {
  /** The address the user just analyzed; surfaced for personalization. */
  address?: string;
  /** True when the viewer is signed in. If so, render nothing. */
  isAuthenticated: boolean;
}

export function SignupPromptCard({ address, isAuthenticated }: SignupPromptCardProps) {
  const [dismissed, setDismissed] = useState(false);
  if (isAuthenticated || dismissed) return null;

  const cleanAddress = (address ?? "").trim();
  const headlineSuffix = cleanAddress
    ? `Save ${cleanAddress.length > 36 ? `${cleanAddress.slice(0, 36)}…` : cleanAddress}`
    : "Save this analysis";

  return (
    <div className="rounded-2xl border border-[var(--brand-green)]/25 bg-gradient-to-br from-[var(--brand-green-light)] via-card to-card p-5 shadow-[0_12px_36px_rgba(22,163,74,0.10)] sm:p-6">
      {/* Header — pill + dismiss */}
      <div className="flex items-start justify-between gap-3">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--brand-green)] px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-widest text-white">
          <Bookmark className="size-3" />
          Free forever
        </span>
        <button
          type="button"
          onClick={() => setDismissed(true)}
          aria-label="Dismiss signup prompt"
          className="rounded-full p-1.5 text-muted-foreground/60 transition-colors hover:bg-muted hover:text-foreground"
        >
          <X className="size-4" />
        </button>
      </div>

      {/* Headline */}
      <h3 className="mt-3 text-lg font-extrabold leading-tight tracking-tight text-foreground sm:text-2xl">
        {headlineSuffix} for later
      </h3>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
        Create a free account in one tap and we&apos;ll remember this deal,
        plus every future one. Works on any device.
      </p>

      {/* Benefit bullets — stacked on mobile, 3-up on sm+ */}
      <ul className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-3 sm:gap-3">
        <BenefitChip
          icon={History}
          label="Saved deals"
          sub="Compare across analyses"
        />
        <BenefitChip
          icon={FileDown}
          label="PDF export"
          sub="Lender-facing report"
        />
        <BenefitChip
          icon={Smartphone}
          label="Any device"
          sub="Phone, laptop, iPad"
        />
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
            <div className="flex h-12 w-full items-center justify-center rounded-xl border border-border bg-card">
              <Loader2 className="size-4 animate-spin text-muted-foreground" aria-hidden />
            </div>
          }
        >
          <GoogleAuthButton label="Sign up free with Google" />
        </Suspense>

        <div className="flex items-center justify-center gap-2 text-[11px] text-muted-foreground">
          <span className="h-px w-8 bg-border" />
          <span>OR</span>
          <span className="h-px w-8 bg-border" />
        </div>

        <Link
          href="/auth/sign-up"
          className="group inline-flex h-11 w-full items-center justify-center gap-1.5 rounded-xl border border-border bg-card px-5 text-sm font-semibold text-foreground transition-colors hover:bg-muted"
        >
          Sign up with email
          <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
        </Link>
      </div>

      {/* Risk-reversal */}
      <p className="mt-4 border-t border-border/60 pt-3 text-[11px] text-muted-foreground">
        Always free · No card · Already have an account?{" "}
        <Link href="/auth/login" className="font-semibold text-foreground hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}

function BenefitChip({
  icon: Icon,
  label,
  sub,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  sub: string;
}) {
  return (
    <li className="flex items-start gap-2 rounded-xl border border-border bg-card p-3">
      <Icon className="mt-0.5 size-4 shrink-0 text-[var(--brand-green)]" />
      <div className="min-w-0">
        <div className="text-sm font-bold text-foreground">{label}</div>
        <div className="text-[11px] leading-snug text-muted-foreground">{sub}</div>
      </div>
    </li>
  );
}
