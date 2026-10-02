"use client";

/**
 * First Offer Playbook capture surfaces.
 *
 * Two exports, one server action (captureLeadMagnetEmail):
 *   <LeadMagnetInline />      — inline card for SEO-template footers
 *   <LeadMagnetExitIntent />  — desktop exit-intent card for /blog + /tools
 *
 * Exit-intent follows the recorded a11y decision: NON-modal
 * role="complementary" card at z-30 (never a Radix dialog — see
 * post-analysis-email-prompt.tsx header), mouseleave-at-top trigger, once
 * per browser via localStorage (truecap_mip_*_v1 keys), honeypot, and
 * post-checkout suppression so a fresh buyer never sees a pitch.
 *
 * On success both variants show the direct download link — the email is the
 * delivery mechanism and follow-up, not a hostage exchange.
 *
 * Styling (design pass, restyle only: placement, copy and behaviour are
 * unchanged, and whether this capture stays is the founder's call): the
 * inline variant is a ruled block with no box or wash; the field follows the
 * DESIGN.md field spec (white, Ink 2 border, 4px, 48px, 16px text) beside the
 * marketing button; the exit card is a float (10px radius, rule edge, the
 * one float shadow).
 */

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { X } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { trackEvent } from "@/lib/analytics";
import { useCookieBannerOpen } from "@/lib/use-cookie-banner";
import { usePostCheckoutUpsellSuppression } from "@/hooks/use-post-checkout-upsell-suppression";
import { captureLeadMagnetEmail } from "@/app/actions/lead-magnet-capture";

const CAPTURED_KEY = "truecap_mip_captured_v1";
const EXIT_DISMISSED_KEY = "truecap_mip_exit_dismissed_v1";

function useCapturedFlag(): [boolean, (v: boolean) => void] {
  const [captured, setCaptured] = useState(false);
  useEffect(() => {
    try {
      setCaptured(window.localStorage.getItem(CAPTURED_KEY) === "1");
    } catch {
      /* fail open — show the form */
    }
  }, []);
  const persist = (v: boolean) => {
    setCaptured(v);
    try {
      if (v) window.localStorage.setItem(CAPTURED_KEY, "1");
    } catch {
      /* ignore */
    }
  };
  return [captured, persist];
}

function CaptureForm({
  source,
  onCaptured,
  compact = false,
}: {
  source: string;
  onCaptured: (downloadUrl: string) => void;
  compact?: boolean;
}) {
  const [email, setEmail] = useState("");
  const [honeypot, setHoneypot] = useState("");
  const [state, setState] = useState<"idle" | "submitting" | "error">("idle");
  const [message, setMessage] = useState<string | null>(null);
  // The playbook needs no email: when the drip pipeline is down the action
  // still returns the link, and we show it beside the error instead of
  // holding the asset hostage to a working mail send.
  const [fallbackUrl, setFallbackUrl] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (state === "submitting") return;
    setState("submitting");
    setMessage(null);
    setFallbackUrl(null);
    const result = await captureLeadMagnetEmail({
      email,
      source,
      website: honeypot,
    });
    if (result.ok) {
      trackEvent("email_capture_submitted", { source: `mip_${source}` });
      onCaptured(result.downloadUrl);
    } else {
      setState("error");
      setMessage(result.message);
      setFallbackUrl(result.downloadUrl ?? null);
    }
  };

  return (
    <form onSubmit={handleSubmit} className={compact ? "mt-3" : "mt-4"}>
      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          aria-label="Email address"
          className={cn(
            "h-12 min-w-0 flex-1 rounded-md border border-input bg-field text-base placeholder:text-muted-foreground",
            // The exit card is 384px wide: tighter padding keeps its field
            // as wide as it was beside the 16px button.
            compact ? "px-3" : "px-4",
          )}
        />
        <button
          type="submit"
          disabled={state === "submitting"}
          // Outline, not filled: the analyzer CTA (SeoAnalyzerCta) stays the
          // one filled action wherever the capture shows; on /playbook the
          // two share a group.
          className={cn(
            buttonVariants({ variant: "outline", size: "cta" }),
            "shrink-0",
            compact && "px-4",
          )}
        >
          {state === "submitting" ? "Sending…" : "Send me the playbook"}
        </button>
      </div>
      {/* Honeypot */}
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
      {message ? (
        <>
          <p className="mt-2 text-sm font-semibold text-destructive-text">{message}</p>
          {fallbackUrl ? (
            <p className="mt-1 text-sm text-foreground">
              <a
                href={fallbackUrl}
                className="tc-link"
                target="_blank"
                rel="noopener"
              >
                Read the First Offer Playbook
              </a>
            </p>
          ) : null}
        </>
      ) : (
        <p className="mt-2 text-sm text-muted-foreground">
          One link email plus two short follow-ups. Unsubscribe anytime.
        </p>
      )}
    </form>
  );
}

function CapturedState({ downloadUrl }: { downloadUrl: string }) {
  return (
    <p className="mt-3 text-sm text-foreground">
      <strong className="font-semibold">Check your inbox</strong> — and here&apos;s the direct link:{" "}
      <a
        href={downloadUrl}
        className="tc-link"
        target="_blank"
        rel="noopener"
      >
        First Offer Playbook
      </a>
    </p>
  );
}

export function LeadMagnetInline({ source = "inline" }: { source?: string }) {
  const [captured, setCaptured] = useCapturedFlag();
  const [downloadUrl, setDownloadUrl] = useState("/playbook");
  const shownRef = useRef(false);
  useEffect(() => {
    if (shownRef.current) return;
    shownRef.current = true;
    trackEvent("email_capture_shown", { source: `mip_${source}` });
  }, [source]);

  return (
    <section className="border-t border-border pt-6">
      <h3 className="text-lg font-semibold">
        The First Offer Playbook
      </h3>
      <p className="mt-1.5 max-w-[64ch] text-sm leading-relaxed text-muted-foreground">
        A review path for Buy Box criteria, editable assumptions, sensitivity,
        due diligence, and adviser questions.
      </p>
      {captured ? (
        <CapturedState downloadUrl={downloadUrl} />
      ) : (
        <CaptureForm
          source={source}
          onCaptured={(url) => {
            setDownloadUrl(url);
            setCaptured(true);
          }}
        />
      )}
    </section>
  );
}

export function LeadMagnetExitIntent() {
  const pathname = usePathname() ?? "/";
  const suppressed = usePostCheckoutUpsellSuppression();
  const cookieBannerOpen = useCookieBannerOpen();
  const [open, setOpen] = useState(false);
  const [captured, setCaptured] = useCapturedFlag();
  const [downloadUrl, setDownloadUrl] = useState("/playbook");
  // The tools/blog families this card ships on own full-width z-40 bottom
  // bars (data-sticky-bottom-bar). The card stays at z-30 per the overlay
  // ladder, so when a bar is mounted at open time we lift the card above
  // the bar's height instead of fighting the z-order.
  const [barMounted, setBarMounted] = useState(false);
  const firedRef = useRef(false);

  useEffect(() => {
    if (captured) return;
    const onMouseLeave = (event: MouseEvent) => {
      if (firedRef.current || event.clientY > 0) return;
      try {
        if (
          window.localStorage.getItem(EXIT_DISMISSED_KEY) ||
          window.localStorage.getItem(CAPTURED_KEY)
        ) {
          return;
        }
      } catch {
        /* fail open, still one-shot per load via firedRef */
      }
      firedRef.current = true;
      setBarMounted(
        Boolean(document.querySelector("[data-sticky-bottom-bar]")),
      );
      setOpen(true);
      trackEvent("email_capture_shown", { source: "mip_exit_intent" });
    };
    document.documentElement.addEventListener("mouseleave", onMouseLeave);
    return () =>
      document.documentElement.removeEventListener("mouseleave", onMouseLeave);
  }, [captured]);

  if (suppressed || captured === undefined) return null;
  // Never compete with the z-50 consent banner for the bottom edge.
  if (!open || cookieBannerOpen || pathname.startsWith("/embed")) return null;

  const dismiss = () => {
    setOpen(false);
    trackEvent("email_capture_dismissed", { source: "mip_exit_intent" });
    try {
      window.localStorage.setItem(EXIT_DISMISSED_KEY, "1");
    } catch {
      /* ignore */
    }
  };

  return (
    <aside
      role="complementary"
      aria-label="Free rental screening guide"
      className={`fixed ${barMounted ? "bottom-24" : "bottom-4"} right-4 z-30 w-[calc(100vw-2rem)] max-w-sm rounded-2xl border border-border bg-card p-4 shadow-lg`}
    >
      <button
        type="button"
        onClick={dismiss}
        aria-label="Dismiss"
        className="absolute right-1 top-1 inline-flex size-11 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      >
        <X aria-hidden className="size-4" />
      </button>
      <p className="pr-10 text-base font-semibold leading-snug text-foreground">
        Leaving? Take the First Offer Playbook with you.
      </p>
      <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
        A public review path for assumptions, sensitivity, due diligence, and
        adviser questions. No state-law or property-tax claims are included.
      </p>
      {captured ? (
        <CapturedState downloadUrl={downloadUrl} />
      ) : (
        <CaptureForm
          compact
          source="exit_intent"
          onCaptured={(url) => {
            setDownloadUrl(url);
            setCaptured(true);
          }}
        />
      )}
    </aside>
  );
}
