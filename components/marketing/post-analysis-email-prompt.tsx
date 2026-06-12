"use client";

/**
 * Post-analysis email capture prompt.
 *
 * Shown after a user completes an analysis as anonymous (not signed in).
 * The pitch is "save this analysis" — capture the email by promising
 * something useful (their actual analysis bookmarked + a 4-email drip).
 *
 * Behaviour:
 *   - Hidden by default
 *   - Appears 5 seconds after the user's first analysis_completed signal
 *   - Dismissable; remembers dismissal via localStorage so it never
 *     re-fires on subsequent analyses within the same browser
 *   - Submits via capturePostAnalysisEmail server action
 *
 * Why 5s delay: the user is reading the result. Interrupting them with
 * a modal in the first second feels rude. After 5s most users have
 * processed the verdict and are about to leave — that's the window.
 */

import { useEffect, useRef, useState } from "react";
import { CheckCircle2, X } from "lucide-react";
import { capturePostAnalysisEmail } from "@/app/actions/post-analysis-email-capture";
import { trackEvent } from "@/lib/analytics";

const DISMISSED_KEY = "truecap_post_analysis_email_dismissed_v1";
const CAPTURED_KEY = "truecap_post_analysis_email_captured_v1";
const DELAY_MS = 5000;

type Props = {
  /** True when an analysis has been completed in the current session. */
  hasCompletedAnalysis: boolean;
  /** Property address from the form (used in the email body). Optional. */
  propertyAddress?: string;
};

export function PostAnalysisEmailPrompt({ hasCompletedAnalysis, propertyAddress }: Props) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    if (!hasCompletedAnalysis) return;
    // Short-circuit if already dismissed or already captured.
    try {
      if (
        window.localStorage.getItem(DISMISSED_KEY) === "1" ||
        window.localStorage.getItem(CAPTURED_KEY) === "1"
      ) {
        return;
      }
    } catch {
      return;
    }
    timerRef.current = window.setTimeout(() => {
      setOpen(true);
      // Track exposure — the funnel needs to know how many anonymous
      // users actually SAW the prompt (not just how many submitted).
      // Submission rate = submits / shown is the meaningful metric.
      trackEvent("email_capture_shown", {
        address_present: Boolean(propertyAddress?.trim()),
      });
    }, DELAY_MS);
    return () => {
      if (timerRef.current != null) window.clearTimeout(timerRef.current);
    };
  }, [hasCompletedAnalysis, propertyAddress]);

  const dismiss = () => {
    setOpen(false);
    trackEvent("email_capture_dismissed");
    try {
      window.localStorage.setItem(DISMISSED_KEY, "1");
    } catch {
      // Ignore — private mode etc.
    }
  };

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (status === "submitting") return;
    setStatus("submitting");
    setErrorMsg(null);
    const result = await capturePostAnalysisEmail({
      email: email.trim(),
      address: propertyAddress,
    });
    if (result.ok) {
      setStatus("success");
      trackEvent("email_capture_submitted", {
        address_present: Boolean(propertyAddress?.trim()),
        scheduled_count: result.scheduledCount,
      });
      try {
        window.localStorage.setItem(CAPTURED_KEY, "1");
      } catch {
        // ignore
      }
      // Auto-close after 3.5s so the success message has time to land.
      window.setTimeout(() => setOpen(false), 3500);
    } else {
      setStatus("error");
      setErrorMsg(result.message);
    }
  };

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Save your analysis"
      className="fixed inset-x-3 bottom-3 z-[55] sm:inset-auto sm:bottom-6 sm:right-6 sm:max-w-sm"
    >
      <div className="relative overflow-hidden rounded-2xl border-2 border-primary bg-card p-5 shadow-2xl">
        <button
          type="button"
          aria-label="Close"
          onClick={dismiss}
          className="absolute right-2 top-2 inline-flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>

        {status === "success" ? (
          <div>
            <div className="flex items-center gap-2 text-[var(--metric-positive,#16a34a)]">
              <CheckCircle2 className="h-5 w-5" />
              <h3 className="text-base font-extrabold">Saved!</h3>
            </div>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              Check your inbox in a minute — your analysis is on its way.
            </p>
          </div>
        ) : (
          <>
            <p className="text-[10px] font-bold uppercase tracking-widest text-primary">
              Save your analysis
            </p>
            <h3 className="mt-1 text-lg font-extrabold leading-tight text-foreground">
              Want this saved to your inbox?
            </h3>
            {/* Body copy desktop-only (Jun 2026 mobile audit): on a
                390px phone the full card covered ~45% of the viewport
                on top of the analysis the user was reading. Headline +
                input carries the pitch on mobile. */}
            <p className="mt-2 hidden text-[13px] leading-relaxed text-muted-foreground sm:block">
              Drop your email — I&apos;ll send you the full analysis plus 3 short notes on the metrics most investors miss.
            </p>
            <form onSubmit={onSubmit} className="mt-4 flex flex-col gap-2">
              <input
                type="email"
                autoComplete="email"
                required
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={status === "submitting"}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
              />
              <button
                type="submit"
                disabled={status === "submitting" || email.trim().length === 0}
                className="inline-flex items-center justify-center rounded-lg bg-primary px-3 py-2 text-sm font-bold text-primary-foreground transition hover:bg-primary/90 disabled:opacity-60"
              >
                {status === "submitting" ? "Sending…" : "Send it to me"}
              </button>
              {errorMsg ? (
                <p className="text-xs text-destructive">{errorMsg}</p>
              ) : null}
              <p className="mt-1 text-[10px] text-muted-foreground">
                No spam. Unsubscribe anytime.
              </p>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
