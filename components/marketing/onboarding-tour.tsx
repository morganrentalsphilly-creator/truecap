"use client";

/**
 * First-time-signup onboarding tour.
 *
 * Triggers when:
 *   - the user is authenticated
 *   - they have ZERO saved deals (clear first-time signal)
 *   - they haven't dismissed the tour previously (localStorage)
 *
 * Three step cards stacked at the bottom-right of the viewport. Each
 * step has a Done / Skip path. When all three are dismissed (or the
 * user clicks "Skip tour"), we persist the dismiss to localStorage so
 * we never show it again on this device.
 *
 * Why localStorage instead of a Supabase profile flag: the latter would
 * require a migration + a server action + extra DB writes for what is
 * UX polish. The cost of a re-show on a fresh device is essentially
 * zero — the user just dismisses again.
 *
 * Mobile: stacks full-width at the bottom, max 1 card visible at a time.
 * Desktop: floating bottom-right card.
 */

import { useEffect, useState } from "react";
import { ArrowRight, Calculator, CheckCircle2, Save, X } from "lucide-react";
import Link from "next/link";

const STORAGE_KEY = "truecap_onboarding_dismissed_v1";

type Step = {
  id: "run-deal" | "save-deal" | "explore-pro";
  icon: typeof Calculator;
  title: string;
  body: string;
  ctaLabel: string;
  ctaHref: string;
};

// NOTE: the old step 1 pointed at the "Try a sample deal" button, which
// is now shown to anonymous visitors only (signed-in users have already
// seen the product — Jun 2026 decision). Step 1 now walks them through
// running their own first deal instead.
const STEPS: Step[] = [
  {
    id: "run-deal",
    icon: Calculator,
    title: "1. Run your first deal",
    body: "Type a property address in the calculator below — rent, rate, and taxes auto-fill. Hit Run analysis and the full underwrite appears in seconds.",
    ctaLabel: "Take me there",
    ctaHref: "/",
  },
  {
    id: "save-deal",
    icon: Save,
    title: "2. Save your first deal",
    body: "Once an analysis is showing, hit Save. It goes into your dashboard where you can come back, edit it, compare to other deals, or export a PDF.",
    ctaLabel: "Open the analyzer",
    ctaHref: "/",
  },
  {
    id: "explore-pro",
    icon: CheckCircle2,
    title: "3. See what Pro unlocks",
    body: "10-year projections, tax strategy, exit scenarios, shareable links, the BRRRR + flip analyzers. Free forever for the basics — upgrade only when the math earns it.",
    ctaLabel: "See pricing",
    ctaHref: "/pricing",
  },
];

type Props = {
  /** True when an authenticated user. Tour skipped for anonymous visitors. */
  isAuthenticated: boolean;
  /** Number of saved deals the user has. Tour skipped if > 0 (they're already active). */
  savedDealCount: number;
};

export function OnboardingTour({ isAuthenticated, savedDealCount }: Props) {
  // Track which step is being shown. Start at 0 (the first step).
  const [activeStep, setActiveStep] = useState(0);
  // Until we've checked storage, render nothing — prevents a flash for
  // returning users who already dismissed.
  const [decision, setDecision] = useState<"pending" | "active" | "dismissed">("pending");

  useEffect(() => {
    if (!isAuthenticated) {
      setDecision("dismissed");
      return;
    }
    if (savedDealCount > 0) {
      // User has already saved at least one deal — they're past the
      // onboarding moment. Don't show the tour even if not dismissed.
      setDecision("dismissed");
      return;
    }
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      setDecision(stored === "1" ? "dismissed" : "active");
    } catch {
      // Storage disabled / Safari Private Mode — still show, just won't persist.
      setDecision("active");
    }
  }, [isAuthenticated, savedDealCount]);

  const dismissTour = () => {
    try {
      window.localStorage.setItem(STORAGE_KEY, "1");
    } catch {
      /* ignore — tour won't persist this session but next mount handles it */
    }
    setDecision("dismissed");
  };

  const nextStep = () => {
    if (activeStep < STEPS.length - 1) {
      setActiveStep((s) => s + 1);
    } else {
      // Last step — dismiss entirely.
      dismissTour();
    }
  };

  if (decision !== "active") return null;

  const step = STEPS[activeStep];
  const Icon = step.icon;
  const isLast = activeStep === STEPS.length - 1;

  return (
    <div
      role="dialog"
      aria-label={`Onboarding step ${activeStep + 1} of ${STEPS.length}: ${step.title}`}
      className="fixed bottom-3 left-3 right-3 z-40 sm:bottom-5 sm:left-auto sm:right-5 sm:max-w-sm"
    >
      <div className="rounded-2xl border border-primary/25 bg-card p-4 shadow-[0_18px_44px_rgba(15,23,42,0.15)] sm:p-5">
        {/* Top: progress + dismiss */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            {STEPS.map((s, i) => (
              <span
                key={s.id}
                className={
                  "h-1.5 w-6 rounded-full transition-colors " +
                  (i === activeStep
                    ? "bg-primary"
                    : i < activeStep
                      ? "bg-primary/40"
                      : "bg-muted")
                }
                aria-hidden
              />
            ))}
            <span className="ml-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              {activeStep + 1} / {STEPS.length}
            </span>
          </div>
          <button
            type="button"
            onClick={dismissTour}
            aria-label="Skip onboarding tour"
            className="rounded-full p-1.5 text-muted-foreground/60 transition-colors hover:bg-muted hover:text-foreground"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Step body */}
        <div className="mt-3 flex items-start gap-3">
          <div className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-xl bg-[var(--brand-blue-light)] text-primary">
            <Icon className="size-4" />
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-extrabold text-foreground sm:text-base">
              {step.title}
            </h3>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground sm:text-sm">
              {step.body}
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="mt-4 flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={dismissTour}
            className="text-xs font-semibold text-muted-foreground transition-colors hover:text-foreground"
          >
            Skip tour
          </button>
          <div className="flex gap-2">
            <Link
              href={step.ctaHref}
              prefetch={false}
              className="inline-flex h-9 items-center gap-1 rounded-lg border border-border bg-card px-3 text-xs font-semibold text-foreground transition-colors hover:bg-muted"
            >
              {step.ctaLabel}
            </Link>
            <button
              type="button"
              onClick={nextStep}
              className="group inline-flex h-9 items-center gap-1 rounded-lg bg-primary px-3 text-xs font-bold text-primary-foreground transition-transform hover:-translate-y-0.5"
            >
              {isLast ? "Got it" : "Next"}
              <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
