"use client";

/**
 * The compact summary that sticks under the header once the decision card
 * has scrolled out of view (OVERHAUL.md §7 "A compact summary bar sticks on
 * scroll"): the card's own headline, the Offer Ceiling and the asking price,
 * and a way back to the decision. The headline is read from the card's h2
 * when the bar shows, so the bar can never disagree with the card. It
 * occupies no height of its own (a zero-height sticky slot with the bar
 * positioned inside it), so the report's layout is the same with or without
 * it; hidden, it is inert.
 */

import { useEffect, useState } from "react";
import { cn, scrollBehavior } from "@/lib/utils";

const usd = (n: number) => `$${Math.round(n).toLocaleString("en-US")}`;

export function ResultSummaryBar({
  anchor,
  ceiling,
  asking,
}: {
  /** The decision card; the bar shows once this has scrolled above the header. */
  anchor: HTMLElement | null;
  /** The exact Offer Ceiling when it is on screen. */
  ceiling: number | null;
  asking: number;
}) {
  const [visible, setVisible] = useState(false);
  const [decision, setDecision] = useState("");
  useEffect(() => {
    if (!anchor || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry) return;
        // Out of view *above* the header, not still below the fold.
        const show = !entry.isIntersecting && entry.boundingClientRect.top < 0;
        if (show) setDecision(anchor.querySelector("h2")?.textContent?.trim() ?? "");
        setVisible(show);
      },
      { rootMargin: "-72px 0px 0px 0px", threshold: 0 },
    );
    observer.observe(anchor);
    return () => observer.disconnect();
  }, [anchor]);

  const backToDecision = () => {
    if (!anchor) return;
    anchor.scrollIntoView({ behavior: scrollBehavior(), block: "start" });
    anchor.querySelector<HTMLElement>("h2")?.focus({ preventScroll: true });
  };

  return (
    <div
      className="sticky top-14 z-30 mb-0 h-0 sm:top-16"
      data-result-summary-bar=""
      data-visible={visible ? "true" : "false"}
    >
      <div
        inert={!visible}
        aria-hidden={!visible}
        className={cn(
          "absolute inset-x-0 top-2 flex items-center gap-3 rounded-md border border-border bg-card/95 px-3 py-2 shadow-md backdrop-blur-sm",
          "transition-[opacity,transform] duration-[var(--duration-base)] ease-[var(--ease-out)] motion-reduce:transition-none",
          visible ? "translate-y-0 opacity-100" : "pointer-events-none -translate-y-2 opacity-0",
        )}
      >
        <p className="min-w-0 flex-1 truncate text-sm font-semibold text-foreground">
          {decision}
        </p>
        <p className="hidden shrink-0 font-figure text-sm text-foreground min-[480px]:block">
          <span className="text-muted-foreground">Ceiling</span> {ceiling != null ? usd(ceiling) : "—"}
          <span className="text-muted-foreground"> · Asking</span> {usd(asking)}
        </p>
        <button
          type="button"
          onClick={backToDecision}
          className="min-h-9 shrink-0 rounded-md border border-border px-2.5 text-xs font-semibold text-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
        >
          Decision
        </button>
      </div>
    </div>
  );
}
