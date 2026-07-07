"use client";

/**
 * DrillLedger — the ordered stack of DrillRows that replaced the results
 * tab bar (Phase 5, Verdict Ledger).
 *
 * Purely presentational: open/close state lives in AnalysisDashboard
 * (so `setActiveTab(id)` can open rows programmatically) and each row
 * is independent — multi-open, no auto-close of siblings.
 *
 * Adds the accordion keyboard affordance the old roving-tabindex
 * tablist provided: with focus on any row header, ArrowUp/ArrowDown
 * move focus between headers (wrapping) and Home/End jump to the ends.
 * Per the WAI-ARIA accordion pattern the arrows move FOCUS only — they
 * never change a row's open state.
 */

import { type KeyboardEvent, type ReactNode } from "react";
import { cn } from "@/lib/utils";

export function DrillLedger({
  label,
  className,
  children,
}: {
  /** Accessible name for the group (was the tablist's aria-label). */
  label: string;
  className?: string;
  children: ReactNode;
}) {
  const handleKeyDown = (e: KeyboardEvent<HTMLElement>) => {
    if (
      e.key !== "ArrowDown" &&
      e.key !== "ArrowUp" &&
      e.key !== "Home" &&
      e.key !== "End"
    ) {
      return;
    }
    const target = e.target as HTMLElement;
    // Only intercept when a ROW HEADER has focus — arrows inside open
    // panel content (sliders, inputs, charts) must behave natively.
    if (!target.hasAttribute("data-drill-row-header")) return;
    const headers = Array.from(
      e.currentTarget.querySelectorAll<HTMLButtonElement>("[data-drill-row-header]")
    );
    const idx = headers.indexOf(target as HTMLButtonElement);
    if (idx === -1 || headers.length === 0) return;
    e.preventDefault();
    const next =
      e.key === "ArrowDown"
        ? headers[(idx + 1) % headers.length]
        : e.key === "ArrowUp"
          ? headers[(idx - 1 + headers.length) % headers.length]
          : e.key === "Home"
            ? headers[0]
            : headers[headers.length - 1];
    next?.focus();
  };

  return (
    <section
      aria-label={label}
      onKeyDown={handleKeyDown}
      className={cn("space-y-3", className)}
    >
      {children}
    </section>
  );
}
