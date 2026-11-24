"use client";

/**
 * The compact summary that sticks under the header once the decision card
 * has scrolled out of view (OVERHAUL.md §7 "A compact summary bar sticks on
 * scroll"): the Offer Ceiling at every width, the asking price and the
 * card's own headline from 480px, and a way back to the decision. The
 * headline is read from the card's h2 when the bar shows, so the bar can
 * never disagree with the card; below 480px it stays for assistive tech and
 * the figure takes the row. It occupies no height of its own (a zero-height
 * sticky slot with the bar positioned inside it), so the report's layout is
 * the same with or without it; hidden, it is inert.
 *
 * Docked: the slot sits at the condensed header's height (the token the
 * header itself reads) and the bar hangs from the header's line with no top
 * border or radius. The ceiling is never on the highlight stroke here: the
 * stroke stays out of chrome (DESIGN.md).
 */

import { useEffect, useState } from "react";
import { cn, scrollBehavior } from "@/lib/utils";

const usd = (n: number) => `$${Math.round(n).toLocaleString("en-US")}`;

export function ResultSummaryBar({
  anchor,
  ceiling,
  asking,
  ceilingLocked = false,
}: {
  /** The decision card; the bar shows once this has scrolled above the header. */
  anchor: HTMLElement | null;
  /** The exact Offer Ceiling when it is on screen. */
  ceiling: number | null;
  asking: number;
  /** The plan does not include the Offer Ceiling: the bar says so instead of
   *  printing a dash that reads as "no ceiling for this deal" (audit A4). */
  ceilingLocked?: boolean;
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
      // The dock's offset is the header above it: the public header's
      // condensed height (the token); that plus the one-line upgrade strip
      // (36px and its 1px rule) while a signed-in free user has it showing;
      // the signed-in shell's 64px top bar.
      className="sticky top-[var(--header-condensed-h)] z-30 mb-0 h-0 [.dashboard-shell_&]:top-16 [html:not(:has(.dashboard-shell)):has([data-analyzer-announcement-bar])_&]:top-[calc(var(--header-condensed-h)+2.3125rem)]"
      data-result-summary-bar=""
      data-visible={visible ? "true" : "false"}
    >
      <div
        inert={!visible}
        aria-hidden={!visible}
        className={cn(
          "absolute inset-x-0 top-0 flex items-center gap-3 rounded-t-none rounded-b-md border border-t-0 border-border bg-card/95 px-3 py-2 shadow-md backdrop-blur-sm",
          // Tailwind v4 writes `translate`, not `transform`, for -translate-y-*: name
          // that property or the slide snaps while the opacity eases.
          "transition-[opacity,translate] duration-[var(--duration-base)] ease-[var(--ease-out)] motion-reduce:transition-none",
          visible ? "translate-y-0 opacity-100" : "pointer-events-none -translate-y-2 opacity-0",
        )}
      >
        <p className="shrink-0 font-figure text-sm text-foreground">
          {ceilingLocked && ceiling == null ? (
            <>
              <span className="text-muted-foreground">Offer Ceiling:</span> Pro
            </>
          ) : (
            <>
              <span className="text-muted-foreground">Ceiling</span>{" "}
              <span className="font-figure font-semibold text-foreground">
                {ceiling != null ? usd(ceiling) : "—"}
              </span>
            </>
          )}
          <span className="hidden min-[480px]:inline">
            <span className="text-muted-foreground"> · Asking</span> {usd(asking)}
          </span>
        </p>
        <p className="min-w-0 flex-1 truncate text-sm font-semibold text-foreground max-[480px]:sr-only">
          {decision}
        </p>
        <button
          type="button"
          onClick={backToDecision}
          // ml-auto: below 480px the sentence is out of the row, and the
          // button keeps to the bar's far end.
          className="ml-auto min-h-11 shrink-0 rounded-md border border-border px-2.5 text-xs font-semibold text-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
        >
          Decision
        </button>
      </div>
    </div>
  );
}
