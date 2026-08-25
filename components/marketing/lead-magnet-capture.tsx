"use client";

/**
 * Market Intelligence Pack capture surfaces.
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
 */

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { FileDown, X } from "lucide-react";
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

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (state === "submitting") return;
    setState("submitting");
    setMessage(null);
    const result = await captureLeadMagnetEmail({ email, source, website: honeypot });
    if (result.ok) {
      trackEvent("email_capture_submitted", { source: `mip_${source}` });
      onCaptured(result.downloadUrl);
    } else {
      setState("error");
      setMessage(result.message);
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
          className="h-10 min-w-0 flex-1 rounded-lg border border-border bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
        <button
          type="submit"
          disabled={state === "submitting"}
          className="inline-flex min-h-11 shrink-0 items-center justify-center gap-1.5 rounded-lg bg-primary px-4 text-sm font-bold text-primary-foreground hover:bg-primary/95 disabled:opacity-60"
        >
          <FileDown className="size-4" />
          {state === "submitting" ? "Sending…" : "Send me the pack"}
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
        <p className="mt-2 text-xs font-semibold text-destructive">{message}</p>
      ) : (
        <p className="mt-2 text-[11px] text-muted-foreground">
          One download email plus two short follow-ups. Unsubscribe anytime.
        </p>
      )}
    </form>
  );
}

function CapturedState({ downloadUrl }: { downloadUrl: string }) {
  return (
    <p className="mt-3 text-sm text-foreground">
      <strong>Check your inbox</strong> — and here&apos;s the direct link:{" "}
      <a
        href={downloadUrl}
        className="font-bold text-primary underline underline-offset-4"
        target="_blank"
        rel="noopener"
      >
        Market Intelligence Pack (PDF)
      </a>
    </p>
  );
}

export function LeadMagnetInline({ source = "inline" }: { source?: string }) {
  const [captured, setCaptured] = useCapturedFlag();
  const [downloadUrl, setDownloadUrl] = useState(
    "/downloads/truecap-market-intelligence-pack.pdf"
  );
  const shownRef = useRef(false);
  useEffect(() => {
    if (shownRef.current) return;
    shownRef.current = true;
    trackEvent("email_capture_shown", { source: `mip_${source}` });
  }, [source]);

  return (
    <section className="rounded-2xl border-2 border-primary/25 bg-gradient-to-br from-[var(--brand-blue-light)] via-card to-card p-5 sm:p-6">
      <p className="text-[11px] font-bold uppercase tracking-widest text-primary">
        Free download
      </p>
      <h3 className="mt-1 text-lg font-extrabold tracking-tight text-foreground">
        The Market Intelligence Pack
      </h3>
      <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
        Every state&apos;s investing benchmarks on one table, the rent-to-price
        screen, and HUD rent benchmarks for 150 markets — the same sourced data
        that pre-fills every TrueCap analysis.
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
  const [downloadUrl, setDownloadUrl] = useState(
    "/downloads/truecap-market-intelligence-pack.pdf"
  );
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
      setBarMounted(Boolean(document.querySelector("[data-sticky-bottom-bar]")));
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
      aria-label="Free market data download"
      className={`fixed ${barMounted ? "bottom-24" : "bottom-4"} right-4 z-30 w-[calc(100vw-2rem)] max-w-sm rounded-2xl border border-primary/25 bg-card p-4 shadow-[0_18px_44px_rgba(15,23,42,0.15)]`}
    >
      <button
        type="button"
        onClick={dismiss}
        aria-label="Dismiss"
        className="absolute right-1 top-1 inline-flex size-11 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <X className="size-4" />
      </button>
      <p className="pr-6 text-sm font-bold leading-snug text-foreground">
        Leaving? Take the state-by-state numbers with you.
      </p>
      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
        The Market Intelligence Pack: every state&apos;s benchmarks, the
        rent-to-price screen, HUD rents for 150 markets. Free PDF.
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
