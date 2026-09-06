"use client";

/**
 * Sticky bottom CTA bar for cold visitors on the homepage. Fires after
 * the user has scrolled past the hero (~600px) — at that point they've
 * read enough to be evaluating. Mobile-prominent (it's the main funnel
 * for paid traffic), shrunk to a compact pill on desktop.
 *
 * Dismissible. Hides on the /auth and /pricing routes via the parent
 * not rendering it.
 */

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight, Calculator, X } from "lucide-react";
import { useCookieBannerOpen } from "@/lib/use-cookie-banner";
import { trackEvent } from "@/lib/analytics";

const STORAGE_KEY = "truecap_home_sticky_dismissed";

export function StickyConversionBar() {
  const [dismissed, setDismissed] = useState(true);
  const [visible, setVisible] = useState(false);
  // Once the visitor is USING the analyzer (typed anything meaningful, or
  // results exist), this funnel CTA has done its job — keeping it pinned
  // over the form/results just eats ~90px of phone viewport while telling
  // an active user to "try it". InvestCalcPage dispatches the event.
  const [analyzerEngaged, setAnalyzerEngaged] = useState(false);
  const [calculatorInView, setCalculatorInView] = useState(false);
  const cookieBannerOpen = useCookieBannerOpen();

  useEffect(() => {
    const onEngaged = () => setAnalyzerEngaged(true);
    window.addEventListener("tc-analyzer-engaged", onEngaged);
    return () => window.removeEventListener("tc-analyzer-engaged", onEngaged);
  }, []);

  useEffect(() => {
    const calculator = document.querySelector('form[data-calc-form="true"]');
    if (!calculator || typeof IntersectionObserver === "undefined") return;

    const observer = new IntersectionObserver(([entry]) => {
      setCalculatorInView(entry?.isIntersecting ?? false);
    });
    observer.observe(calculator);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    // Wrapped — localStorage throws on Safari Private Mode / strict CSP;
    // a thrown effect would otherwise leave the bar permanently hidden.
    try {
      setDismissed(window.localStorage.getItem(STORAGE_KEY) === "1");
    } catch {
      setDismissed(false);
    }
  }, []);

  useEffect(() => {
    if (dismissed) return;
    const onScroll = () => {
      // Show only after they've scrolled past the hero, so we don't
      // double up on the primary CTA that's already on screen.
      setVisible(window.scrollY > 720);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, [dismissed]);

  // Don't stack behind the opaque cookie-consent banner on a first visit,
  // and stand down entirely once the visitor is inside the analyzer.
  const showing =
    !dismissed &&
    visible &&
    !cookieBannerOpen &&
    !analyzerEngaged &&
    !calculatorInView;

  if (!showing) return null;

  return (
    // data-conversion-bar-root: globals.css hides this bar while the
    // calculator's own sticky submit bar is up (html[data-calc-bar]) — the
    // product action outranks the funnel CTA inside the form. The calc bar
    // retires itself outside the form / while the submit button or results
    // are on screen, so this bar still owns the marketing sections.
    // data-sticky-bottom-bar: globals.css reserves the bar's height under the
    // site footer while this is mounted, so the footer's legal row isn't
    // stranded underneath it at maximum scroll.
    <div
      data-conversion-bar-root=""
      data-sticky-bottom-bar=""
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card/95 px-3 pt-2 pb-[max(env(safe-area-inset-bottom),0.5rem)] shadow-[0_-12px_28px_rgba(15,23,42,0.10)] backdrop-blur supports-[backdrop-filter]:bg-card/85 sm:px-4 sm:pt-3 sm:pb-[max(env(safe-area-inset-bottom),0.75rem)]"
    >
      <div className="mx-auto flex max-w-5xl items-center gap-3">
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-bold text-foreground sm:text-sm">
            Have a rental in mind? See whether the numbers work.
          </p>
          <p className="hidden truncate text-[11px] text-muted-foreground sm:block">
            No card · No signup · Editable assumptions
          </p>
        </div>
        <Link
          href="/analyze"
          prefetch={false}
          onClick={() => trackEvent("homepage_primary_cta", { source: "sticky_bar" })}
          className="inline-flex min-h-11 shrink-0 items-center gap-1 rounded-lg bg-primary px-3 text-xs font-bold text-primary-foreground hover:bg-primary/95 sm:px-4 sm:text-sm"
        >
          <Calculator className="size-3.5 sm:size-4" />
          {/* Standardized to match the homepage's primary CTA verb.
              Sub-380px tiny phones fall back to "Try it" because the
              full label wraps. */}
          <span className="hidden min-[380px]:inline">Start analysis</span>
          <span className="min-[380px]:hidden">Start</span>
          <ArrowRight className="size-3.5 sm:size-4" />
        </Link>
        <button
          type="button"
          onClick={() => {
            setDismissed(true);
            try {
              window.localStorage.setItem(STORAGE_KEY, "1");
            } catch {
              /* ignore */
            }
          }}
          aria-label="Dismiss"
          className="shrink-0 rounded-full p-1.5 text-muted-foreground/60 hover:bg-muted hover:text-foreground"
        >
          <X className="size-4" />
        </button>
      </div>
    </div>
  );
}
