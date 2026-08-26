"use client";

/**
 * Sticky bottom CTA for /blog/* posts.
 *
 * Different from the homepage StickyConversionBar in two ways:
 *   1. Links to "/" (the analyzer) instead of scrolling to a #main
 *      element. On blog posts, #main IS the article body, so scrolling
 *      within the page is useless.
 *   2. Different copy — assumes the reader is engaged with educational
 *      content, so the pitch is "try the calculator that powers this
 *      post" rather than the homepage's "ready to underwrite a deal?".
 *
 * Conversion theory: long-form blog readers are HIGH intent (they've
 * already committed 5-10 minutes to the topic). Without a persistent
 * CTA they have to scroll to the bottom of the post to find one;
 * many never do. Sticky bar catches them mid-engagement when the
 * intent peaks.
 *
 * Dismissible. Separate localStorage key from the homepage bar so
 * dismissing one doesn't kill the other.
 */

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, Calculator, X } from "lucide-react";
import { useCookieBannerOpen } from "@/lib/use-cookie-banner";

const STORAGE_KEY = "truecap_blog_sticky_dismissed";
const SCROLL_TRIGGER_PX = 720;

export function BlogStickyCta() {
  const [dismissed, setDismissed] = useState(true);
  const [visible, setVisible] = useState(false);
  const cookieBannerOpen = useCookieBannerOpen();

  useEffect(() => {
    // Safe localStorage read — Safari Private Mode + strict CSP can throw.
    try {
      setDismissed(window.localStorage.getItem(STORAGE_KEY) === "1");
    } catch {
      setDismissed(false);
    }
  }, []);

  useEffect(() => {
    if (dismissed) return;
    const onScroll = () => {
      setVisible(window.scrollY > SCROLL_TRIGGER_PX);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, [dismissed]);

  // Don't stack behind the opaque cookie-consent banner on a first visit.
  if (dismissed || !visible || cookieBannerOpen) return null;

  return (
    // data-sticky-bottom-bar: globals.css reserves the bar's height under the
    // site footer while this is mounted, so the footer's legal row isn't
    // stranded underneath it at the bottom of the post.
    <div
      data-sticky-bottom-bar=""
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card/95 px-3 pt-2 pb-[max(env(safe-area-inset-bottom),0.5rem)] shadow-[0_-12px_28px_rgba(15,23,42,0.10)] backdrop-blur supports-[backdrop-filter]:bg-card/85 sm:px-4 sm:pt-3 sm:pb-[max(env(safe-area-inset-bottom),0.75rem)]">
      <div className="mx-auto flex max-w-5xl items-center gap-3">
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-bold text-foreground sm:text-sm">
            Try the calculator that powers this post.
          </p>
          <p className="hidden truncate text-[11px] text-muted-foreground sm:block">
            Free · No signup · Real address auto-fill · 60 seconds to first answer
          </p>
        </div>
        <Link
          href="/"
          prefetch={false}
          className="inline-flex min-h-11 shrink-0 items-center gap-1 rounded-lg bg-primary px-3 text-xs font-bold text-primary-foreground hover:bg-primary/95 sm:px-4 sm:text-sm"
        >
          <Calculator className="size-3.5 sm:size-4" />
          <span className="hidden min-[380px]:inline">Analyze free</span>
          <span className="min-[380px]:hidden">Open</span>
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
          className="inline-flex size-11 shrink-0 items-center justify-center rounded-full text-muted-foreground/60 hover:bg-muted hover:text-foreground"
        >
          <X className="size-4" />
        </button>
      </div>
    </div>
  );
}
