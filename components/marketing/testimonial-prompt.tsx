"use client";

/**
 * Testimonial prompt — one question, fired at high-signal moments.
 *
 * Listens for the window event "truecap:proof-moment" (dispatched by the
 * analyzer after a completed PDF export or the third saved deal) and asks:
 * "Did TrueCap change what you offered — or whether you offered?" The answer
 * goes to submitTestimonialAction for founder review; NOTHING renders
 * publicly from here (see lib/proof-records.ts publication gate).
 *
 * Deliberately NOT a modal: same a11y decision as
 * post-analysis-email-prompt.tsx (aria-modal dropped the analysis out of the
 * WebKit/VoiceOver tree; product principle — prompts never trap). Non-modal
 * role="complementary" card, fixed bottom-right at z-30 (under product
 * chrome), Escape closes it when no real dialog is open.
 *
 * Frequency cap: once per browser, ever (truecap_testimonial_prompt_v1 in
 * localStorage, set on show — not on dismiss — so an ignored card never
 * returns). Fires trackEvent testimonial_prompt_shown/submitted/dismissed.
 */

import { useEffect, useRef, useState } from "react";
import { MessageSquareQuote, X } from "lucide-react";
import { trackEvent } from "@/lib/analytics";
import { submitTestimonialAction } from "@/app/actions/testimonials";

const PROMPT_KEY = "truecap_testimonial_prompt_v1";
export const PROOF_MOMENT_EVENT = "truecap:proof-moment";

type ProofMomentSource = "pdf_export" | "third_save";

export function dispatchProofMoment(source: ProofMomentSource) {
  try {
    window.dispatchEvent(new CustomEvent(PROOF_MOMENT_EVENT, { detail: { source } }));
  } catch {
    // Never let a proof-moment dispatch break the product action itself.
  }
}

export function TestimonialPrompt() {
  const [open, setOpen] = useState(false);
  const [source, setSource] = useState<ProofMomentSource>("pdf_export");
  const [quote, setQuote] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [roleSegment, setRoleSegment] = useState<string>("");
  const [consent, setConsent] = useState(false);
  const [honeypot, setHoneypot] = useState("");
  const [state, setState] = useState<"idle" | "submitting" | "done" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const firedRef = useRef(false);
  const showTimerRef = useRef<number | null>(null);

  useEffect(() => {
    const onProofMoment = (event: Event) => {
      if (firedRef.current) return;
      try {
        if (window.localStorage.getItem(PROMPT_KEY)) return;
      } catch {
        // Storage unavailable → still show at most once per page load.
      }
      firedRef.current = true;
      const detail = (event as CustomEvent<{ source?: ProofMomentSource }>).detail;
      if (detail?.source) setSource(detail.source);
      // Small delay so the card never competes with the export/save toast.
      // TRACKED so unmount can cancel it: an uncancelled timer wrote the
      // once-per-browser key and fired the "shown" event for a card the user
      // navigated away from — burning the single ask on nothing.
      showTimerRef.current = window.setTimeout(() => {
        try {
          window.localStorage.setItem(PROMPT_KEY, "shown");
        } catch {
          // ignore
        }
        setOpen(true);
        trackEvent("testimonial_prompt_shown", { source: detail?.source ?? "unknown" });
      }, 8000);
    };
    window.addEventListener(PROOF_MOMENT_EVENT, onProofMoment);
    return () => {
      window.removeEventListener(PROOF_MOMENT_EVENT, onProofMoment);
      if (showTimerRef.current != null) {
        window.clearTimeout(showTimerRef.current);
        // Left un-fired: the key is only written inside the callback, so a
        // cancelled prompt stays available for the user's next proof moment.
        showTimerRef.current = null;
      }
    };
  }, []);

  // Escape closes the card — but defers to any real open dialog.
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      if (document.querySelector('[role="dialog"][data-state="open"]')) return;
      setOpen(false);
      trackEvent("testimonial_prompt_dismissed", { via: "escape" });
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open]);

  if (!open) return null;

  const handleDismiss = () => {
    setOpen(false);
    trackEvent("testimonial_prompt_dismissed", { via: "button" });
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (state === "submitting") return;
    setState("submitting");
    setErrorMessage(null);
    const result = await submitTestimonialAction({
      quote,
      ...(displayName.trim() ? { displayName: displayName.trim() } : {}),
      ...(roleSegment ? { roleSegment: roleSegment as "investor" | "house_hacker" | "agent" | "other" } : {}),
      consentToPublish: consent,
      sourceEvent: source,
      website: honeypot,
    });
    if (result.ok) {
      setState("done");
      trackEvent("testimonial_prompt_submitted", { source, consented: consent });
      window.setTimeout(() => setOpen(false), 3500);
    } else {
      setState("error");
      setErrorMessage(result.message);
    }
  };

  return (
    <aside
      role="complementary"
      aria-label="Share your experience"
      className="fixed bottom-4 right-4 z-30 w-[calc(100vw-2rem)] max-w-sm rounded-2xl border border-primary/25 bg-card p-4 shadow-[0_18px_44px_rgba(15,23,42,0.15)]"
    >
      <button
        type="button"
        onClick={handleDismiss}
        aria-label="Dismiss"
        className="absolute right-2 top-2 inline-flex size-8 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
      >
        <X className="size-4" />
      </button>

      {state === "done" ? (
        <p className="pr-6 text-sm font-semibold text-foreground">
          Thank you — that genuinely helps other investors decide.
        </p>
      ) : (
        <form onSubmit={handleSubmit}>
          <div className="flex items-start gap-3">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-[var(--brand-blue-light)] text-primary">
              <MessageSquareQuote aria-hidden className="size-4" />
            </span>
            <p className="pr-4 text-sm font-bold leading-snug text-foreground">
              Did TrueCap change what you offered — or whether you offered?
              <span className="mt-0.5 block text-xs font-medium text-muted-foreground">
                Tell us in a sentence.
              </span>
            </p>
          </div>
          <textarea
            value={quote}
            onChange={(e) => setQuote(e.target.value)}
            required
            minLength={10}
            maxLength={1000}
            rows={3}
            placeholder="e.g. Passed on 3 deals, offered on the 4th — under asking."
            className="mt-3 w-full rounded-lg border border-border bg-background p-2.5 text-sm text-foreground placeholder:text-muted-foreground/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
          <div className="mt-2 grid grid-cols-2 gap-2">
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              maxLength={120}
              placeholder="Name (optional)"
              className="w-full rounded-lg border border-border bg-background px-2.5 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
            <select
              value={roleSegment}
              onChange={(e) => setRoleSegment(e.target.value)}
              aria-label="Your role (optional)"
              className="w-full rounded-lg border border-border bg-background px-2 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option value="">Role (optional)</option>
              <option value="investor">Investor</option>
              <option value="house_hacker">House hacker</option>
              <option value="agent">Agent</option>
              <option value="other">Other</option>
            </select>
          </div>
          {/* Honeypot — hidden from real users, bots fill it. */}
          <input
            type="text"
            name="website"
            value={honeypot}
            onChange={(e) => setHoneypot(e.target.value)}
            tabIndex={-1}
            autoComplete="off"
            aria-hidden="true"
            className="absolute -left-[9999px] top-0 h-px w-px opacity-0"
          />
          <label className="mt-2.5 flex items-start gap-2 text-xs text-muted-foreground">
            <input
              type="checkbox"
              checked={consent}
              onChange={(e) => setConsent(e.target.checked)}
              className="mt-0.5 size-3.5 rounded border-border"
            />
            <span>
              TrueCap may publish this quote (we&apos;ll verify with you first —
              nothing goes live without your OK).
            </span>
          </label>
          {errorMessage ? (
            <p className="mt-2 text-xs font-semibold text-destructive">{errorMessage}</p>
          ) : null}
          <button
            type="submit"
            disabled={state === "submitting"}
            className="mt-3 inline-flex h-9 w-full items-center justify-center rounded-lg bg-primary px-3 text-xs font-bold text-primary-foreground hover:bg-primary/95 disabled:opacity-60"
          >
            {state === "submitting" ? "Sending…" : "Send it"}
          </button>
        </form>
      )}
    </aside>
  );
}
