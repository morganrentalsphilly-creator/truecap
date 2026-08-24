"use client";

/**
 * Post-analysis email capture prompt.
 *
 * Shown after a user completes an analysis as anonymous (not signed in).
 * The pitch is a free underwriting checklist — capture the email by
 * delivering something genuinely useful (the checklist + a short drip).
 *
 * Behaviour:
 *   - Hidden by default
 *   - After the user's first analysis_completed signal, appears when they
 *     SCROLL PAST the results ledger (they've read the answer) or on
 *     desktop exit-intent (mouse leaves through the top of the viewport)
 *   - Dismissable (Close button or Escape); remembers dismissal via
 *     localStorage so it never re-fires on subsequent analyses within
 *     the same browser
 *   - Submits via capturePostAnalysisEmail server action
 *
 * Why it is NOT a dialog (a11y): this is an ambient upsell that must
 * never trap the user (product principle §1.4) — it sits at z-30 under
 * the product chrome, the page behind stays fully interactive, and
 * focus is deliberately left where the user put it. So it is a labelled
 * complementary landmark, not a modal: claiming role="dialog"
 * aria-modal="true" told assistive tech the rest of the page was inert,
 * which in WebKit/VoiceOver dropped the whole analysis out of the
 * accessibility tree the moment this card appeared.
 *
 * Why not a flat timer (BROWSER-6): the redesign's answer-first mobile
 * ordering put the Screening Index exactly where the old 5s overlay landed —
 * it slid over ~40% of a 375px viewport while the first-timer was still
 * reading the verdict. Scroll-past / exit-intent fires at the natural
 * "about to leave" moment instead of mid-read.
 */

import { useCallback, useEffect, useState } from "react";
import { CheckCircle2, X } from "lucide-react";
import { capturePostAnalysisEmail } from "@/app/actions/post-analysis-email-capture";
import { trackEvent } from "@/lib/analytics";

const DISMISSED_KEY = "truecap_post_analysis_email_dismissed_v1";
const CAPTURED_KEY = "truecap_post_analysis_email_captured_v1";
/** The prompt opens once the bottom of the results region is within this
 *  many px of entering the viewport — i.e. the user scrolled through the
 *  ledger and is running out of page. */
const LEDGER_END_MARGIN_PX = 120;
/** Ignore the analyzer's automatic jump into focused results. The prompt may
 * react only after the settled viewport moves materially farther down. */
const SCROLL_INTENT_DISTANCE_PX = 240;
const SCROLL_ARM_DELAY_MS = 1000;

type Props = {
  /** True when an analysis has been completed in the current session. */
  hasCompletedAnalysis: boolean;
  /** Property address from the form (used in the email body). Optional. */
  propertyAddress?: string;
};

export function PostAnalysisEmailPrompt({ hasCompletedAnalysis, propertyAddress }: Props) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  /** Honeypot — hidden from real users; only bots fill it. Server treats a
   *  non-empty value as a silent no-op (no email is scheduled). */
  const [website, setWebsite] = useState("");
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

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
    let fired = false;
    const openPrompt = () => {
      if (fired) return;
      fired = true;
      removeListeners();
      setOpen(true);
      // Track exposure — the funnel needs to know how many anonymous
      // users actually SAW the prompt (not just how many submitted).
      // Submission rate = submits / shown is the meaningful metric.
      trackEvent("email_capture_shown", {
        address_present: Boolean(propertyAddress?.trim()),
      });
    };
    // Scroll-past-the-ledger: the user has scrolled through the results —
    // they've read the answer and are running out of page. Arm only after
    // focused-results auto-scroll and lazy dashboard layout have settled;
    // otherwise that programmatic jump opens this card over the first answer.
    let scrollArmed = false;
    let settledScrollY = window.scrollY;
    const armTimer = window.setTimeout(() => {
      settledScrollY = window.scrollY;
      scrollArmed = true;
    }, SCROLL_ARM_DELAY_MS);
    const onScroll = () => {
      if (!scrollArmed || window.scrollY < settledScrollY + SCROLL_INTENT_DISTANCE_PX) {
        return;
      }
      const results = document.querySelector('[data-analysis-results="true"]');
      if (!results) return;
      const bottom = results.getBoundingClientRect().bottom;
      if (bottom <= window.innerHeight + LEDGER_END_MARGIN_PX) openPrompt();
    };
    // Desktop exit-intent: mouse leaves through the top of the viewport
    // (heading for the tab bar / URL) — the classic about-to-leave signal.
    const onMouseLeave = (e: MouseEvent) => {
      if (e.clientY <= 0) openPrompt();
    };
    const removeListeners = () => {
      window.clearTimeout(armTimer);
      window.removeEventListener("scroll", onScroll);
      document.documentElement.removeEventListener("mouseleave", onMouseLeave);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    document.documentElement.addEventListener("mouseleave", onMouseLeave);
    return removeListeners;
  }, [hasCompletedAnalysis, propertyAddress]);

  const dismiss = useCallback(() => {
    setOpen(false);
    trackEvent("email_capture_dismissed");
    try {
      window.localStorage.setItem(DISMISSED_KEY, "1");
    } catch {
      // Ignore — private mode etc.
    }
  }, []);

  // Escape closes it from anywhere on the page — the card never takes
  // focus, so without this a keyboard user has to Tab all the way to the
  // Close button. It is NOT modal, so it must not steal Escape from a
  // real (Radix) dialog layered above it.
  useEffect(() => {
    // Not while the "Checklist sent!" confirmation is up: it closes itself,
    // and routing that through dismiss() would log a dismissal against a
    // capture that succeeded.
    if (!open || status === "success") return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      if (document.querySelector('[role="dialog"][data-state="open"]')) return;
      // Only claim an Escape that is addressed to the PAGE. If it came from
      // inside a control/layer that owns Escape — an open combobox listbox
      // (the address autocomplete sets aria-expanded on its input and closes
      // its dropdown on Escape WITHOUT stopPropagation), a Radix
      // Select/DropdownMenu/Popover (data-state="open") — that keypress is
      // theirs. Without this the same Escape also permanently dismisses this
      // prompt in localStorage and logs a bogus email_capture_dismissed.
      const target = event.target instanceof Element ? event.target : null;
      if (target?.closest('[aria-expanded="true"], [data-state="open"]')) return;
      dismiss();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, status, dismiss]);

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (status === "submitting") return;
    setStatus("submitting");
    setErrorMsg(null);
    const result = await capturePostAnalysisEmail({
      email: email.trim(),
      address: propertyAddress,
      website,
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
      role="complementary"
      aria-label="Get the underwriting checklist"
      aria-live="polite"
      // z-30, deliberately BELOW the sticky Run bar / verdict dock (z-40):
      // if the user scrolls back into the form, the product action wins the
      // bottom edge — the capture card must never block Run (BROWSER-6).
      className="fixed inset-x-3 bottom-3 z-30 sm:inset-auto sm:bottom-6 sm:right-6 sm:max-w-sm"
    >
      <div className="relative overflow-hidden rounded-2xl border-2 border-primary bg-card p-5 shadow-2xl">
        <button
          type="button"
          aria-label="Close"
          onClick={dismiss}
          className="absolute right-1 top-1 inline-flex min-h-11 min-w-11 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <X className="h-4 w-4" />
        </button>

        {status === "success" ? (
          <div>
            <div className="flex items-center gap-2 text-[var(--metric-positive,#16a34a)]">
              <CheckCircle2 className="h-5 w-5" />
              <h3 className="text-base font-extrabold">Checklist sent!</h3>
            </div>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              Check your inbox in a minute — your checklist is on its way.
            </p>
          </div>
        ) : (
          <>
            <p className="text-[10px] font-bold uppercase tracking-widest text-primary">
              Free underwriting checklist
            </p>
            <h3 className="mt-1 text-lg font-extrabold leading-tight text-foreground">
              Get the 7-number deal checklist
            </h3>
            {/* Body copy desktop-only (Jun 2026 mobile audit): on a
                390px phone the full card covered ~45% of the viewport
                on top of the analysis the user was reading. Headline +
                input carries the pitch on mobile. */}
            <p className="mt-2 hidden text-[13px] leading-relaxed text-muted-foreground sm:block">
              Drop your email — I&apos;ll send the underwriting checklist I use before recording a decision, plus a few short notes on the numbers most investors miss.
            </p>
            <form onSubmit={onSubmit} className="mt-4 flex flex-col gap-2">
              {/* Honeypot: display:none, out of the tab order and hidden from
                  assistive tech, so no real user can fill it. Form-filling
                  bots do, and the server then silently drops the submission. */}
              <input
                type="text"
                name="website"
                tabIndex={-1}
                autoComplete="off"
                aria-hidden="true"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                className="hidden"
              />
              <label htmlFor="post-analysis-email" className="sr-only">
                Email address
              </label>
              <input
                id="post-analysis-email"
                name="email"
                type="email"
                autoComplete="email"
                required
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={status === "submitting"}
                aria-invalid={status === "error" || undefined}
                aria-describedby={
                  errorMsg ? "post-analysis-email-error" : "post-analysis-email-hint"
                }
                className="min-h-11 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary focus-visible:ring-2 focus-visible:ring-ring"
              />
              <button
                type="submit"
                disabled={status === "submitting" || email.trim().length === 0}
                className="inline-flex min-h-11 items-center justify-center rounded-lg bg-primary px-3 py-2 text-sm font-bold text-primary-foreground transition hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60"
              >
                {status === "submitting" ? "Sending…" : "Send me the checklist"}
              </button>
              {errorMsg ? (
                <p
                  id="post-analysis-email-error"
                  role="alert"
                  className="text-xs text-destructive"
                >
                  {errorMsg}
                </p>
              ) : null}
              <p
                id="post-analysis-email-hint"
                className="mt-1 text-[10px] text-muted-foreground"
              >
                No spam. Unsubscribe anytime.
              </p>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
