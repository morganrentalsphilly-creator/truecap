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

import { useEffect, useState } from "react";
import { ArrowRight, Calculator, X } from "lucide-react";
import { useCookieBannerOpen } from "@/lib/use-cookie-banner";

const STORAGE_KEY = "truecap_home_sticky_dismissed";

function scrollToForm() {
  if (typeof window === "undefined") return;
  const el = document.getElementById("main");
  if (!el) return;
  // Document-absolute position, NOT el.offsetTop — offsetTop is measured
  // from the nearest positioned ancestor, so it's only correct while that
  // ancestor sits at the document top (same hardening as the hero's
  // scrollToCalculator).
  const top = el.getBoundingClientRect().top + window.scrollY - 64;
  window.scrollTo({ top, behavior: "smooth" });
}

export function StickyConversionBar() {
  const [dismissed, setDismissed] = useState(true);
  const [visible, setVisible] = useState(false);
  // Once the visitor is USING the analyzer (typed anything meaningful, or
  // results exist), this funnel CTA has done its job — keeping it pinned
  // over the form/results just eats ~90px of phone viewport while telling
  // an active user to "try it". InvestCalcPage dispatches the event.
  const [analyzerEngaged, setAnalyzerEngaged] = useState(false);
  const cookieBannerOpen = useCookieBannerOpen();

  useEffect(() => {
    const onEngaged = () => setAnalyzerEngaged(true);
    window.addEventListener("tc-analyzer-engaged", onEngaged);
    return () => window.removeEventListener("tc-analyzer-engaged", onEngaged);
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
  const showing = !dismissed && visible && !cookieBannerOpen && !analyzerEngaged;

  if (!showing) return null;

  return (
    // data-conversion-bar-root: globals.css hides this bar while the
    // calculator's own sticky submit bar is up (html[data-calc-bar]) — the
    // product action outranks the funnel CTA inside the form. The calc bar
    // retires itself outside the form / while the submit button or results
    // are on screen, so this bar still owns the marketing sections.
    <div
      data-conversion-bar-root=""
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card/95 px-3 pt-2 pb-[max(env(safe-area-inset-bottom),0.5rem)] shadow-[0_-12px_28px_rgba(15,23,42,0.10)] backdrop-blur supports-[backdrop-filter]:bg-card/85 sm:px-4 sm:pt-3 sm:pb-[max(env(safe-area-inset-bottom),0.75rem)]">
      <div className="mx-auto flex max-w-5xl items-center gap-3">
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-bold text-foreground sm:text-sm">
            Ready to underwrite a deal? It&apos;s free.
          </p>
          <p className="hidden truncate text-[11px] text-muted-foreground sm:block">
            No card · No signup · 60 seconds to first answer
          </p>
        </div>
        <button
          type="button"
          onClick={scrollToForm}
          className="inline-flex h-9 shrink-0 items-center gap-1 rounded-lg bg-primary px-3 text-xs font-bold text-primary-foreground hover:bg-primary/95 sm:h-10 sm:px-4 sm:text-sm"
        >
          <Calculator className="size-3.5 sm:size-4" />
          {/* Standardized to "Analyze free" to match the homepage's
              primary CTA. Sub-380px tiny phones fall back to "Try it"
              because the full label wraps. */}
          <span className="hidden min-[380px]:inline">Analyze free</span>
          <span className="min-[380px]:hidden">Try it</span>
          <ArrowRight className="size-3.5 sm:size-4" />
        </button>
        <button
          type="button"
          onClick={() => {
            setDismissed(true);
            try { window.localStorage.setItem(STORAGE_KEY, "1"); } catch { /* ignore */ }
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
