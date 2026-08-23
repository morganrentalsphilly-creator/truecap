"use client";

/**
 * Conversion CTA for the public /tools/* calculator pages.
 *
 * Today every /tools page ends with a small "Run the full analysis"
 * link, and most visitors leave. This is the moment-of-value pitch:
 * they just got the answer they came for, so the offer is small,
 * specific, and high-trust — "save this calculation to your free
 * account and unlock the full picture."
 *
 * Behaviors:
 *  - Inline card at the bottom of the page (always visible)
 *  - Sticky bottom bar on mobile that appears after scrolling past
 *    the calculator (so it doesn't compete with the form)
 */

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, Sparkles, X } from "lucide-react";
import { useCookieBannerOpen } from "@/lib/use-cookie-banner";
import {
  LeadMagnetInline,
  LeadMagnetExitIntent,
} from "@/components/marketing/lead-magnet-capture";

interface ToolsConversionCtaProps {
  /** Name of the calculator the user just used — shown in the pitch. */
  calculatorName: string;
  /** Optional one-liner that ties the pitch to this specific tool. */
  hook?: string;
}

const STORAGE_KEY = "truecap_tools_cta_dismissed";

export function ToolsConversionCta({ calculatorName, hook }: ToolsConversionCtaProps) {
  const [dismissed, setDismissed] = useState(true); // start hidden, then check storage
  const [stickyVisible, setStickyVisible] = useState(false);
  const cookieBannerOpen = useCookieBannerOpen();

  useEffect(() => {
    // Safari Private Mode + strict CSPs throw on localStorage access;
    // crashing the effect would leave dismissed=true and hide the CTA forever.
    try {
      setDismissed(window.localStorage.getItem(STORAGE_KEY) === "1");
    } catch {
      setDismissed(false);
    }
  }, []);

  // Show the sticky bar after the user scrolls 30%+ down the page
  useEffect(() => {
    if (dismissed) return;
    const onScroll = () => {
      const scrolled = window.scrollY;
      const docH = document.documentElement.scrollHeight - window.innerHeight;
      setStickyVisible(docH > 0 && scrolled / docH > 0.30);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, [dismissed]);

  const handleDismiss = () => {
    setDismissed(true);
    try {
      window.localStorage.setItem(STORAGE_KEY, "1");
    } catch {
      // localStorage unavailable — fine, just won't persist.
    }
  };

  return (
    <>
      {/* Inline card — always rendered, below the long-form content */}
      <section className="mx-auto mt-12 max-w-3xl rounded-3xl border-2 border-primary/25 bg-gradient-to-br from-[var(--brand-blue-light)] via-card to-card p-6 shadow-[0_12px_36px_rgba(0,112,196,0.10)] sm:p-8">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-primary px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-widest text-primary-foreground">
            <Sparkles className="size-3" />
            Free upgrade
          </span>
          <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
            no card required
          </span>
        </div>
        <h2 className="mt-3 text-xl font-extrabold leading-tight tracking-tight text-foreground sm:text-3xl">
          Like the {calculatorName.toLowerCase()}? Save it to your free TrueCap account.
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground sm:text-base">
          {hook ??
            "The full TrueCap analyzer runs every metric at once — cap rate, CoC, DSCR, cash flow, 10-year projection, tax savings, exit scenarios. Save your deal, run sensitivity, share it. Always free to start."}
        </p>
        <div className="mt-5 flex flex-wrap items-center gap-3">
          <Link
            href="/auth/sign-up"
            className="group inline-flex h-11 items-center gap-1.5 rounded-xl bg-primary px-5 text-sm font-bold text-primary-foreground shadow-[0_10px_24px_rgba(0,112,196,0.28)] transition-transform hover:-translate-y-0.5"
          >
            Start free
            <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
          </Link>
          <Link
            href="/"
            className="inline-flex h-11 items-center gap-1.5 rounded-xl border border-border bg-card px-5 text-sm font-semibold text-foreground hover:bg-muted"
          >
            Analyze a property free
          </Link>
        </div>
      </section>

      {/* Lead magnet + exit-intent capture (2026-08 offer rollout): mounted
          here so all 21 tool pages get both in one edit. Self-capping. */}
      <div className="mt-6">
        <LeadMagnetInline source="tools" />
      </div>
      <LeadMagnetExitIntent />

      {/* Sticky mobile-friendly bottom bar — only after scroll, and not while
          the opaque cookie-consent banner occupies the bottom on a first visit */}
      {!dismissed && stickyVisible && !cookieBannerOpen && (
        // data-sticky-bottom-bar: globals.css reserves the bar's height under
        // the site footer while this is mounted, so the footer's legal row
        // isn't stranded underneath it at maximum scroll.
        <div
          data-sticky-bottom-bar=""
          className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card/95 px-3 pt-2 pb-[max(env(safe-area-inset-bottom),0.5rem)] shadow-[0_-12px_28px_rgba(15,23,42,0.10)] backdrop-blur supports-[backdrop-filter]:bg-card/80 sm:px-4 sm:pt-3 sm:pb-[max(env(safe-area-inset-bottom),0.75rem)]">
          <div className="mx-auto flex max-w-3xl items-center gap-3">
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-bold text-foreground sm:text-sm">
                Save this {calculatorName.toLowerCase()} to TrueCap — free.
              </p>
              <p className="hidden truncate text-[11px] text-muted-foreground sm:block">
                Full analyzer + 10-yr projection + PDF export. No card.
              </p>
            </div>
            <Link
              href="/auth/sign-up"
              className="inline-flex h-9 shrink-0 items-center gap-1 rounded-lg bg-primary px-3 text-xs font-bold text-primary-foreground hover:bg-primary/95 sm:h-10 sm:px-4 sm:text-sm"
            >
              Start free
              <ArrowRight className="size-3.5" />
            </Link>
            <button
              type="button"
              onClick={handleDismiss}
              aria-label="Dismiss"
              className="shrink-0 rounded-full p-1.5 text-muted-foreground/60 hover:bg-muted hover:text-foreground"
            >
              <X className="size-4" />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
