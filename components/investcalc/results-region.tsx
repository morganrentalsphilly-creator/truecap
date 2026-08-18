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
  /** Fired once, the first time the region is opened in this session. */
  openEvent?: FunnelEvent;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const [hydrated, setHydrated] = useState(false);
  const firedRef = useRef(false);

  // Read persisted state after mount so server and first client render agree.
  useEffect(() => {
    setHydrated(true);
    try {
      const stored = window.localStorage.getItem(`${STORAGE_PREFIX}${id}`);
      if (stored === "1") setOpen(true);
      else if (stored === "0") setOpen(false);
    } catch {
      // Private mode / storage disabled — keep the default.
    }
  }, [id]);

  const handleToggle = (next: boolean) => {
    setOpen(next);
    try {
      window.localStorage.setItem(`${STORAGE_PREFIX}${id}`, next ? "1" : "0");
    } catch {
      // Persistence is best-effort; the region still works.
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
