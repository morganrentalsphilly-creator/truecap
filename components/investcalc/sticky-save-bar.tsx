"use client";

/**
 * Sticky bottom "Save this deal free" bar: PHONES, anonymous visitors, on a
 * result (2026-11 ads pass, A4). The result page is several thousand pixels
 * long and the save ask lives near its top, so the bar keeps that one action
 * a tap away for the rest of the report.
 *
 * It stands down while the same action is already on screen: the save prompt
 * under the decision card (`[data-save-capture]`) or the decision card's own
 * primary Save button (`[data-result-save-action]`). Two identical buttons in
 * one phone viewport is the rule StickyCalculateBar already follows for Run.
 *
 * Stacking: the cookie banner is fixed to the same edge one layer above
 * (z-50 over z-40). While it is open the bar sits on top of it, at the
 * banner's measured height, exactly as the analyzer's run bar does, and
 * returns to the edge when the visitor answers the banner.
 */

import { useEffect, useState } from "react";
import { Save } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useCookieBannerOpen } from "@/lib/use-cookie-banner";
import { cn } from "@/lib/utils";

/** The elements that already offer Save; the bar hides while any is in view. */
const SAVE_SURFACES = "[data-save-capture], [data-result-save-action]";

export function StickySaveBar({
  onSave,
  disabled = false,
  disabledReason,
}: {
  onSave: () => void;
  disabled?: boolean;
  disabledReason?: string;
}) {
  // Hidden until the first observation: never flash over a result whose own
  // Save button is in the first screen.
  const [saveOnScreen, setSaveOnScreen] = useState(true);
  useEffect(() => {
    if (typeof IntersectionObserver === "undefined") {
      setSaveOnScreen(false);
      return;
    }
    const inView = new Map<Element, boolean>();
    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) inView.set(entry.target, entry.isIntersecting);
      setSaveOnScreen([...inView.values()].some(Boolean));
    });
    const observeAll = () => {
      const nodes = document.querySelectorAll(SAVE_SURFACES);
      for (const node of nodes) {
        if (!inView.has(node)) {
          inView.set(node, false);
          observer.observe(node);
        }
      }
      // A surface that left the page (the prompt was dismissed) stops counting.
      for (const node of [...inView.keys()]) {
        if (!node.isConnected) {
          observer.unobserve(node);
          inView.delete(node);
        }
      }
      setSaveOnScreen([...inView.values()].some(Boolean));
    };
    observeAll();
    // The decision card and the prompt mount a moment after the result; the
    // prompt can also be dismissed. Re-scan when the results region changes.
    const root = document.querySelector('[data-analysis-results="true"]');
    const mutations =
      root && typeof MutationObserver !== "undefined"
        ? new MutationObserver(observeAll)
        : null;
    if (root && mutations) {
      mutations.observe(root, { childList: true, subtree: true });
    }
    return () => {
      observer.disconnect();
      mutations?.disconnect();
    };
  }, []);

  const visible = !saveOnScreen;

  const cookieBannerOpen = useCookieBannerOpen();
  const [cookieBannerHeight, setCookieBannerHeight] = useState(0);
  useEffect(() => {
    if (!cookieBannerOpen || !visible) {
      setCookieBannerHeight(0);
      return;
    }
    const banner = document.querySelector<HTMLElement>(
      "[data-cookie-consent-banner]",
    );
    if (!banner) {
      setCookieBannerHeight(0);
      return;
    }
    const measure = () =>
      setCookieBannerHeight(Math.ceil(banner.getBoundingClientRect().height));
    measure();
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(measure);
    observer.observe(banner);
    return () => observer.disconnect();
  }, [cookieBannerOpen, visible]);
  const aboveCookieBanner = cookieBannerHeight > 0;

  if (!visible) return null;

  return (
    <div
      data-sticky-save-bar=""
      data-above-cookie-banner={aboveCookieBanner ? "" : undefined}
      // The banner below already carries the safe-area inset, so the bar
      // keeps only its own 8px while it sits on top of it.
      style={aboveCookieBanner ? { bottom: cookieBannerHeight } : undefined}
      className={cn(
        "fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card/95 px-3 pt-2 shadow-float-up backdrop-blur supports-[backdrop-filter]:bg-card/85 sm:hidden",
        aboveCookieBanner
          ? "pb-2"
          : "pb-[max(env(safe-area-inset-bottom),0.5rem)]",
      )}
    >
      <Button
        type="button"
        onClick={onSave}
        disabled={disabled}
        title={disabledReason}
        className="h-12 w-full gap-2 rounded-md text-base font-semibold"
      >
        <Save className="size-4" aria-hidden />
        Save this deal free
      </Button>
    </div>
  );
}
