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
import { X } from "lucide-react";
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
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background px-3 pt-2 pb-[max(env(safe-area-inset-bottom),0.5rem)] shadow-float-up sm:px-4 sm:pt-3 sm:pb-[max(env(safe-area-inset-bottom),0.75rem)]"
    >
      <div className="mx-auto flex max-w-5xl items-center gap-3">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-foreground sm:text-base">
            Have a rental in mind? See whether the numbers work.
          </p>
          <p className="hidden truncate text-sm text-muted-foreground sm:block">
            No card · No signup · Editable assumptions
          </p>
        </div>
        <Link
          href="/analyze"
          prefetch={false}
          onClick={() => trackEvent("homepage_primary_cta", { source: "sticky_bar" })}
          className="inline-flex min-h-11 shrink-0 items-center rounded-md bg-primary px-3 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-deep sm:px-4 sm:text-base"
        >
          {/* The primary CTA's wording, as everywhere on the site. Phones
              under 380px fall back to the short form because the full
              label wraps. */}
          <span className="hidden min-[380px]:inline">Analyze a deal free</span>
          <span className="min-[380px]:hidden">Analyze free</span>
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
          className="inline-flex size-11 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        >
          <X className="size-4" />
        </button>
      </div>
    </div>
  );
}
