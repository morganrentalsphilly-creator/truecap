"use client";

/**
 * A top-level results region: one question, one disclosure, state remembered.
 *
 * The results page had ~20 top-level regions competing at equal weight. This
 * collapses them to four, each headed by the QUESTION it answers rather than
 * a list of its contents — so the page is navigated by intent instead of by
 * scroll position.
 *
 * PERSISTENCE: open/closed is remembered per region in localStorage, so a
 * repeat user doesn't reopen the same sections on every deal. Fails open
 * (renders using the passed default) when storage is unavailable.
 *
 * Uses a real <details>/<summary> so keyboard and screen-reader behavior is
 * native; the marker is suppressed globally in app/globals.css and replaced
 * with one chevron.
 */

import { useEffect, useRef, useState, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { trackEvent } from "@/lib/analytics";
import type { FunnelEvent } from "@/lib/analytics";

const STORAGE_PREFIX = "truecap_results_region_v1:";

export function ResultsRegion({
  id,
  question,
  payoff,
  defaultOpen = false,
  storageScope,
  openEvent,
  children,
}: {
  /** Stable key for the persisted open state. */
  id: string;
  /** The header — states the payoff, not the contents. */
  question: string;
  /** One line under the header. */
  payoff?: string;
  defaultOpen?: boolean;
  /** Optional per-analysis scope. `null` disables persistence for an unsaved
   * run so disclosure choices never leak into the next property. */
  storageScope?: string | null;
  /** Fired once, the first time the region is opened in this session. */
  openEvent?: FunnelEvent;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const [hydrated, setHydrated] = useState(false);
  const firedRef = useRef(false);
  /**
   * True while the STORED open state is being applied. Restoring it calls
   * setOpen(true) → React writes `open` onto <details> → the browser fires a
   * `toggle` event → onToggle ran as if the user had just opened the region.
   * Returning users therefore emitted an "opened" event on every page load.
   */
  const restoringRef = useRef(false);
  const storageKey =
    storageScope === null
      ? null
      : `${STORAGE_PREFIX}${storageScope ? `${storageScope}:` : ""}${id}`;

  // Read persisted state after mount so server and first client render agree.
  useEffect(() => {
    setOpen(defaultOpen);
    firedRef.current = false;
    setHydrated(true);
    if (!storageKey) return;
    try {
      const stored = window.localStorage.getItem(storageKey);
      if (stored === "1" || stored === "0") {
        // Consumed by the first onToggle that follows (see handleToggle).
        // A microtask cannot clear this: the `toggle` event is dispatched as
        // a TASK after the DOM update, so a microtask fires FIRST and the
        // restore was still being counted as a user-initiated open.
        restoringRef.current = stored === "1";
        setOpen(stored === "1");
      }
    } catch {
      // Private mode / storage disabled — keep the default.
    }
  }, [defaultOpen, storageKey]);

  const handleToggle = (next: boolean) => {
    setOpen(next);
    // A restore is not an interaction: swallow exactly the one toggle it
    // triggers, then resume normal behavior.
    if (restoringRef.current) {
      restoringRef.current = false;
      return;
    }
    if (storageKey) {
      try {
        window.localStorage.setItem(storageKey, next ? "1" : "0");
      } catch {
        // Persistence is best-effort; the region still works.
      }
    }
    if (next && openEvent && !firedRef.current) {
      firedRef.current = true;
      trackEvent(openEvent);
    }
  };

  return (
    <details
      className="group rounded-2xl border border-border bg-card shadow-sm"
      open={hydrated ? open : defaultOpen}
      onToggle={(event) => handleToggle((event.currentTarget as HTMLDetailsElement).open)}
    >
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:px-5">
        <span className="min-w-0">
          <span className="block text-base font-extrabold text-foreground">{question}</span>
          {payoff ? (
            <span className="mt-0.5 block text-xs text-muted-foreground">{payoff}</span>
          ) : null}
        </span>
        <ChevronDown
          aria-hidden
          className={cn(
            "size-5 shrink-0 text-muted-foreground transition-transform",
            "group-open:rotate-180"
          )}
        />
      </summary>
      <div className="border-t border-border px-4 py-4 sm:px-5 sm:py-5">{children}</div>
    </details>
  );
}

/**
 * Renders children inside a <ResultsRegion> when `enabled`, or as-is when not.
 *
 * Exists so the four-region layout and the pre-rebuild flat layout can share
 * ONE copy of each block's JSX. Duplicating a 160-line metrics block into both
 * branches of a ternary is how the two drift.
 */
export function ResultsRegionOrFragment({
  enabled,
  children,
  ...region
}: { enabled: boolean } & Parameters<typeof ResultsRegion>[0]) {
  if (!enabled) return <>{children}</>;
  return <ResultsRegion {...region}>{children}</ResultsRegion>;
}
