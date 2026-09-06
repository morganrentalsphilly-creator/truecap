"use client";

/**
 * Testimonial prompt — one question, asked once per user, ever.
 *
 * Listens for the window event "truecap:proof-moment" (dispatched by the
 * analyzer after a completed PDF export or the third saved deal). Eight
 * seconds later — so it never competes with the export/save toast — it asks
 * the SERVER whether this user may be asked (claimTestimonialPromptAction;
 * the once-ever rule is the primary key on testimonial_prompt_events, not
 * anything in this browser) and shows the card only on `{ show: true }`.
 * localStorage is a soft cache so a browser that already heard "shown" or
 * "already shown" never makes the round trip again.
 *
 * The answer goes to submitPublishableTestimonialAction. Publication is the
 * cron's job (lib/testimonials/rules.ts): consent + 24-hour hold + every
 * content rule. Nothing renders publicly from here.
 *
 * Deliberately NOT a modal: same a11y decision as
 * post-analysis-email-prompt.tsx (aria-modal dropped the analysis out of the
 * WebKit/VoiceOver tree; product principle — prompts never trap). Non-modal
 * role="complementary" card, fixed bottom-right at z-30 (under product
 * chrome). Escape closes it when no real dialog or open listbox owns the key.
 *
 * TestimonialForm is exported on its own so the emailed feedback page can
 * render the same fields standalone (trigger "email_link").
 */

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from "react";
import { MessageSquareQuote, X } from "lucide-react";
import { track } from "@/lib/analytics/site-events";
import {
  claimTestimonialPromptAction,
  dismissTestimonialPromptAction,
  submitPublishableTestimonialAction,
} from "@/app/actions/testimonials-publish";
import { trackEvent } from "@/lib/analytics";
import { QUOTE_MAX, QUOTE_MIN } from "@/lib/testimonials/rules";

/** Soft cache only — the server decides. Saves a second round trip per browser. */
const PROMPT_KEY = "truecap_testimonial_prompt_v2";
const SHOW_DELAY_MS = 8000;
const CLOSE_AFTER_THANKS_MS = 6000;
export const PROOF_MOMENT_EVENT = "truecap:proof-moment";

type ProofMomentSource = "pdf_export" | "third_save";
export type TestimonialTrigger = ProofMomentSource | "email_link";

const QUESTION =
  "One sentence — what did TrueCap change about how you evaluate deals?";
const CONSENT_LABEL =
  "TrueCap may publish this with my first name, role, and market.";
const THANKS =
  "Thanks. If you agreed to publish, it goes live after a 24-hour hold.";

const ROLE_OPTIONS = [
  { value: "investor", label: "Investor" },
  { value: "house_hacker", label: "House hacker" },
  { value: "agent", label: "Agent" },
  { value: "other", label: "Other" },
] as const;
type RoleValue = (typeof ROLE_OPTIONS)[number]["value"];

export function dispatchProofMoment(source: ProofMomentSource) {
  try {
    window.dispatchEvent(
      new CustomEvent(PROOF_MOMENT_EVENT, { detail: { source } }),
    );
  } catch {
    // Never let a proof-moment dispatch break the product action itself.
  }
}

function promptSettledInThisBrowser(): boolean {
  try {
    return window.localStorage.getItem(PROMPT_KEY) === "1";
  } catch {
    return false;
  }
}

function rememberPromptSettled() {
  try {
    window.localStorage.setItem(PROMPT_KEY, "1");
  } catch {
    // Private mode etc. — the server still enforces once-ever.
  }
}

/** Same whitespace normalization as validateQuote, so the counter matches what the server measures. */
function normalizedLength(raw: string): number {
  return raw.replace(/\s+/g, " ").trim().length;
}

const CONTROL_CLASS =
  "min-h-11 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60";

type TestimonialFormProps = {
  trigger: TestimonialTrigger;
  /** Called once the server accepted the sentence. */
  onSubmitted?: () => void;
  /** Tighter spacing for the bottom-right card; the standalone page leaves it off. */
  compact?: boolean;
};

/**
 * The question, the sentence, optional role + market, and the consent
 * checkbox. Used inside the card and standalone on the emailed feedback page.
 */
export function TestimonialForm({
  trigger,
  onSubmitted,
  compact,
}: TestimonialFormProps) {
  const [quote, setQuote] = useState("");
  const [role, setRole] = useState<"" | RoleValue>("");
  const [market, setMarket] = useState("");
  const [consent, setConsent] = useState(false);
  /** Honeypot — hidden from real users; only bots fill it. The server then
   *  pretends success and stores nothing. */
  const [website, setWebsite] = useState("");
  const [status, setStatus] = useState<
    "idle" | "submitting" | "done" | "error"
  >("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const quoteRef = useRef<HTMLTextAreaElement>(null);

  const length = normalizedLength(quote);
  const shortBy = QUOTE_MIN - length;

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (status === "submitting") return;
    if (length < QUOTE_MIN) {
      setStatus("error");
      setErrorMessage(
        `At least ${QUOTE_MIN} characters — ${shortBy} more to go.`,
      );
      quoteRef.current?.focus();
      return;
    }
    if (length > QUOTE_MAX) {
      setStatus("error");
      setErrorMessage(`Keep it under ${QUOTE_MAX} characters.`);
      quoteRef.current?.focus();
      return;
    }
    setStatus("submitting");
    setErrorMessage(null);
    const result = await submitPublishableTestimonialAction({
      quote: quote.trim(),
      ...(role ? { role } : {}),
      ...(market.trim() ? { market: market.trim() } : {}),
      consent,
      trigger,
      website,
    });
    if (result.ok) {
      setStatus("done");
      trackEvent("testimonial_prompt_submitted", {
        source: trigger,
        consented: consent,
      });
      track("testimonial_submitted", { consent });
      onSubmitted?.();
      return;
    }
    setStatus("error");
    setErrorMessage(result.message);
    if (result.code === "VALIDATION_ERROR") quoteRef.current?.focus();
  };

  if (status === "done") {
    return (
      <p
        role="status"
        className="text-sm font-semibold leading-relaxed text-foreground"
      >
        {THANKS}
      </p>
    );
  }

  const describedBy = [
    "testimonial-quote-hint",
    "testimonial-quote-count",
    errorMessage ? "testimonial-error" : null,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <form
      onSubmit={onSubmit}
      noValidate
      className={compact ? "relative flex flex-col gap-2" : "relative flex flex-col gap-3"}
    >
      {/* Honeypot: off-screen, out of the tab order and hidden from assistive
          tech, so no real user can fill it. Form-filling bots do. */}
      <input
        type="text"
        name="website"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        value={website}
        onChange={(e) => setWebsite(e.target.value)}
        className="absolute -left-[9999px] top-0 h-px w-px opacity-0"
      />

      <label
        htmlFor="testimonial-quote"
        className={
          compact
            ? "block text-sm font-bold leading-snug text-foreground"
            : "block text-lg font-extrabold leading-tight text-foreground"
        }
      >
        {QUESTION}
      </label>
      <textarea
        id="testimonial-quote"
        name="quote"
        ref={quoteRef}
        value={quote}
        onChange={(e) => setQuote(e.target.value)}
        required
        maxLength={QUOTE_MAX}
        rows={compact ? 3 : 4}
        disabled={status === "submitting"}
        aria-invalid={status === "error" || undefined}
        aria-describedby={describedBy}
        className={`${CONTROL_CLASS} resize-y`}
      />
      <div className="flex items-baseline justify-between gap-3 text-xs text-muted-foreground">
        <p id="testimonial-quote-hint">
          {QUOTE_MIN} to {QUOTE_MAX} characters.
        </p>
        <p id="testimonial-quote-count" className="shrink-0 tabular-nums">
          {length}/{QUOTE_MAX}
          {length > 0 && length < QUOTE_MIN ? ` · ${shortBy} more` : ""}
        </p>
      </div>

      <div
        className={
          compact
            ? "grid grid-cols-2 gap-2"
            : "grid grid-cols-1 gap-3 sm:grid-cols-2"
        }
      >
        <div>
          <label
            htmlFor="testimonial-role"
            className="mb-1 block text-xs font-semibold text-foreground"
          >
            Role{" "}
            <span className="font-normal text-muted-foreground">
              (optional)
            </span>
          </label>
          <select
            id="testimonial-role"
            name="role"
            value={role}
            onChange={(e) => setRole(e.target.value as "" | RoleValue)}
            disabled={status === "submitting"}
            className={CONTROL_CLASS}
          >
            <option value="">Prefer not to say</option>
            {ROLE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label
            htmlFor="testimonial-market"
            className="mb-1 block text-xs font-semibold text-foreground"
          >
            Market{" "}
            <span className="font-normal text-muted-foreground">
              (optional)
            </span>
          </label>
          <input
            id="testimonial-market"
            name="market"
            type="text"
            value={market}
            onChange={(e) => setMarket(e.target.value)}
            maxLength={80}
            placeholder="Philadelphia, PA"
            autoComplete="off"
            disabled={status === "submitting"}
            className={CONTROL_CLASS}
          />
        </div>
      </div>

      <label
        htmlFor="testimonial-consent"
        className="flex min-h-11 cursor-pointer items-start gap-2.5 py-1 text-xs leading-relaxed text-foreground"
      >
        <input
          id="testimonial-consent"
          name="consent"
          type="checkbox"
          checked={consent}
          onChange={(e) => setConsent(e.target.checked)}
          disabled={status === "submitting"}
          className="mt-0.5 size-4 shrink-0 rounded border-border accent-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
        <span>{CONSENT_LABEL}</span>
      </label>

      {errorMessage ? (
        <p
          id="testimonial-error"
          role="alert"
          className="text-xs font-semibold text-destructive"
        >
          {errorMessage}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={status === "submitting"}
        className="inline-flex min-h-11 w-full items-center justify-center rounded-lg bg-primary px-3 py-2 text-sm font-bold text-primary-foreground transition hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60 motion-reduce:transition-none"
      >
        {status === "submitting" ? "Sending…" : "Send"}
      </button>
    </form>
  );
}

export function TestimonialPrompt() {
  const [open, setOpen] = useState(false);
  const [source, setSource] = useState<ProofMomentSource>("pdf_export");
  const [submitted, setSubmitted] = useState(false);
  /** At most one ask per page load, whatever the server answers. */
  const firedRef = useRef(false);
  const showTimerRef = useRef<number | null>(null);
  const closeTimerRef = useRef<number | null>(null);
  const mountedRef = useRef(false);

  useEffect(() => {
    mountedRef.current = true;
    const onProofMoment = (event: Event) => {
      if (firedRef.current) return;
      if (promptSettledInThisBrowser()) return;
      firedRef.current = true;
      const detail = (event as CustomEvent<{ source?: ProofMomentSource }>)
        .detail;
      const nextSource: ProofMomentSource =
        detail?.source === "third_save" ? "third_save" : "pdf_export";
      // Eight seconds so the card never competes with the export/save toast.
      // TRACKED so unmount cancels it: the server claim happens INSIDE the
      // callback, so a user who navigates away first keeps their one ask.
      showTimerRef.current = window.setTimeout(() => {
        showTimerRef.current = null;
        claimTestimonialPromptAction(nextSource)
          .then((result) => {
            if (!mountedRef.current) return;
            if (result.show) {
              rememberPromptSettled();
              setSource(nextSource);
              setOpen(true);
              trackEvent("testimonial_prompt_shown", { source: nextSource });
              track("testimonial_prompt_shown", { source: nextSource });
            } else if (result.reason === "already_shown") {
              rememberPromptSettled();
            }
            // signed_out / unavailable: no ask this page load; nothing cached,
            // so a signed-in session later still gets its one ask.
          })
          .catch(() => {
            // Server actions return unions instead of throwing; a transport
            // failure simply means no ask this time.
          });
      }, SHOW_DELAY_MS);
    };
    window.addEventListener(PROOF_MOMENT_EVENT, onProofMoment);
    return () => {
      mountedRef.current = false;
      window.removeEventListener(PROOF_MOMENT_EVENT, onProofMoment);
      if (showTimerRef.current != null) {
        window.clearTimeout(showTimerRef.current);
        showTimerRef.current = null;
      }
      if (closeTimerRef.current != null) {
        window.clearTimeout(closeTimerRef.current);
        closeTimerRef.current = null;
      }
    };
  }, []);

  const closeCard = useCallback(() => {
    setOpen(false);
    if (closeTimerRef.current != null) {
      window.clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  }, []);

  /** "Never ask again": closes the card and records it on the account. */
  const dismissForever = useCallback(
    (via: "button" | "never_again") => {
      closeCard();
      trackEvent("testimonial_prompt_dismissed", { via });
      dismissTestimonialPromptAction().catch(() => {
        // Best effort — the prompt already can't show again (server claim).
      });
    },
    [closeCard],
  );

  const handleSubmitted = useCallback(() => {
    setSubmitted(true);
    // Leave the thank-you up long enough to read, then get out of the way.
    closeTimerRef.current = window.setTimeout(
      () => setOpen(false),
      CLOSE_AFTER_THANKS_MS,
    );
  }, []);

  // Escape closes the card from anywhere on the page — it never takes focus,
  // so without this a keyboard user has to Tab all the way to Close. It is
  // NOT modal, so it must not steal Escape from a real (Radix) dialog above
  // it, nor from an open combobox listbox / Select / Popover that owns the
  // key (data-state="open" or aria-expanded="true" on the target's ancestry).
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      if (document.querySelector('[role="dialog"][data-state="open"]')) return;
      const target = event.target instanceof Element ? event.target : null;
      if (target?.closest('[aria-expanded="true"], [data-state="open"]')) return;
      closeCard();
      if (!submitted) {
        trackEvent("testimonial_prompt_dismissed", { via: "escape" });
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, submitted, closeCard]);

  if (!open) return null;

  return (
    <div
      role="complementary"
      aria-labelledby="testimonial-prompt-heading"
      // z-30, deliberately BELOW the sticky Run bar / verdict dock (z-40):
      // the product action always wins the bottom edge.
      className="fixed inset-x-3 bottom-3 z-30 sm:inset-auto sm:bottom-6 sm:right-6 sm:w-full sm:max-w-sm"
    >
      <div className="relative overflow-hidden rounded-2xl border-2 border-primary bg-card p-5 shadow-2xl">
        <button
          type="button"
          aria-label="Close"
          onClick={() => (submitted ? closeCard() : dismissForever("button"))}
          className="absolute right-1 top-1 inline-flex size-11 items-center justify-center rounded-full text-muted-foreground transition hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none"
        >
          <X aria-hidden className="size-4" />
        </button>

        <div className="flex items-center gap-2 pr-10">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-[var(--brand-blue-light)] text-primary">
            <MessageSquareQuote aria-hidden className="size-4" />
          </span>
          <h2
            id="testimonial-prompt-heading"
            className="text-[10px] font-bold uppercase tracking-widest text-primary"
          >
            One question
          </h2>
        </div>

        <div className="mt-3">
          <TestimonialForm
            trigger={source}
            onSubmitted={handleSubmitted}
            compact
          />
        </div>

        {submitted ? null : (
          <button
            type="button"
            onClick={() => dismissForever("never_again")}
            className="mt-1 inline-flex min-h-11 w-full items-center justify-center rounded-lg px-3 text-xs font-semibold text-muted-foreground transition hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none"
          >
            Don&apos;t ask again
          </button>
        )}
      </div>
    </div>
  );
}
