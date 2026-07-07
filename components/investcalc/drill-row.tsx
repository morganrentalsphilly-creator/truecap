"use client";

/**
 * DrillRow — one door of the Verdict Ledger (Phase 5).
 *
 * A single accordion row: closed it reads as ONE truthful summary line
 * (icon + title + live summary phrase + chevron, PRO pill when the
 * content is plan-locked); open it hosts the EXACT panel the results
 * tab used to host. Rows are independent — opening one never closes a
 * sibling (the single-open enforcement was explicitly rejected).
 *
 * Controlled on purpose: open state lives in AnalysisDashboard so
 * `setActiveTab(id)` (kept name) can open a row programmatically for
 * every existing consumer — metric-tap jumps, StrategyOutcomeCard's
 * onJumpToTab, the saved-deal tab restore and the strategy primaryTab
 * lead.
 *
 * Mount semantics — two modes, matching how each panel behaved BEFORE
 * the ledger so no fetch/bundle timing changes:
 *   - default (lazy): children render only while open. This is exactly
 *     the old tab contract — a Pro snapshot panel that lazy-loaded its
 *     recharts chunk + fired its snapshot action on first TAB click now
 *     does both on first ROW open, and unmounts on collapse just like
 *     switching tabs away did.
 *   - keepMounted: children stay mounted, hidden when closed. For cards
 *     that were ALWAYS mounted pre-ledger (comps' saved-comps fetch on
 *     mount, notes' first-mount fetch, Q&A state) so converting them to
 *     rows changes what's visible, never when effects fire.
 *
 * The header button carries the `analysis-tab-${id}` DOM id the old tab
 * buttons had, so the metric-jump scrollIntoView targets keep landing.
 */

import { type ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export interface DrillRowProps {
  /** Row id — for the six analysis rows this IS the AnalysisDashboardTab id. */
  id: string;
  title: string;
  /** Small leading glyph (e.g. a lucide icon sized size-4). */
  icon?: ReactNode;
  /** ONE truthful line derived from already-computed data — or a
   *  verb-first action line when the row's data isn't computed yet. */
  summary?: ReactNode;
  /** True = show the PRO pill (the gate itself renders INSIDE the open
   *  row, exactly as the gated tab did). */
  locked?: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Keep children mounted (hidden) while closed — see module docs. */
  keepMounted?: boolean;
  children?: ReactNode;
}

export function DrillRow({
  id,
  title,
  icon,
  summary,
  locked = false,
  open,
  onOpenChange,
  keepMounted = false,
  children,
}: DrillRowProps) {
  // Same id scheme the tab buttons used, so every scroll/focus target
  // (`analysis-tab-${id}`) keeps resolving after the conversion.
  const headerId = `analysis-tab-${id}`;
  const panelId = `analysis-row-panel-${id}`;
  const renderPanel = open || keepMounted;

  return (
    <section
      data-drill-row={id}
      className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm"
    >
      <h3 className="m-0">
        <button
          type="button"
          id={headerId}
          data-drill-row-header
          aria-expanded={open}
          // Only reference the panel while it exists in the DOM (lazy
          // rows have no panel node while closed).
          aria-controls={renderPanel ? panelId : undefined}
          onClick={() => onOpenChange(!open)}
          // scroll-mt clears the sticky site header when metric-tap /
          // jump wiring smooth-scrolls this row into view (same offsets
          // the tab buttons carried).
          className="scroll-mt-24 sm:scroll-mt-28 flex min-h-14 w-full cursor-pointer items-center gap-3 px-3 py-3 text-left transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset sm:px-4"
        >
          {icon ? (
            <span
              aria-hidden
              className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-[var(--brand-blue-light)] text-primary"
            >
              {icon}
            </span>
          ) : null}
          <span className="min-w-0 flex-1">
            <span className="flex items-center gap-2">
              <span className="text-sm font-bold text-foreground">{title}</span>
              {locked ? (
                <span className="inline-flex shrink-0 rounded-full bg-[var(--brand-orange)] px-1.5 py-0.5 text-[9px] font-bold uppercase text-white sm:text-[10px]">
                  PRO
                </span>
              ) : null}
            </span>
            {summary ? (
              <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                {summary}
              </span>
            ) : null}
          </span>
          <ChevronDown
            aria-hidden
            className={cn(
              "size-4 shrink-0 text-muted-foreground transition-transform",
              open && "rotate-180"
            )}
          />
        </button>
      </h3>
      {renderPanel ? (
        <div
          role="region"
          id={panelId}
          aria-labelledby={headerId}
          hidden={!open}
          className="min-w-0 overflow-hidden border-t border-border p-2 sm:p-6"
        >
          {children}
        </div>
      ) : null}
    </section>
  );
}
