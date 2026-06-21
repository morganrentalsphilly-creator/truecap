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

const STORAGE_KEY = "truecap_home_sticky_dismissed";

function scrollToForm() {
  if (typeof window === "undefined") return;
  const el = document.getElementById("main");
  if (el) window.scrollTo({ top: el.offsetTop - 64, behavior: "smooth" });
}

export function StickyConversionBar() {
  const [dismissed, setDismissed] = useState(true);
  const [visible, setVisible] = useState(false);

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

  if (dismissed || !visible) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card/95 px-3 py-2 shadow-[0_-12px_28px_rgba(15,23,42,0.10)] backdrop-blur supports-[backdrop-filter]:bg-card/85 sm:px-4 sm:py-3">
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
