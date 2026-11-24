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
 * onJumpToTab, the input-tab clicks and the strategy primaryTab lead.
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

import { createContext, useContext, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Which kind of row the content sits in, for a shared report part that draws
 * a frame of its own (the summary figures of the projection panels): inside
 * a 'row' it drops the frame, because the region around the row is the one
 * object. 'card' is the default and is what a part reads outside any
 * DrillRow, so the saved-deal workspace and the shared views are unchanged.
 */
const DrillRowVariantContext = createContext<"card" | "row">("card");

export function useDrillRowVariant(): "card" | "row" {
  return useContext(DrillRowVariantContext);
}

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
  /**
   * 'card' (default): the row is its own bordered, shadowed object.
   * 'row': the row sits on a 1px line inside an object that already has a
   * border (a ResultsRegion), so the report is one object per region with
   * rows on lines, not cards in cards. Pair it with
   * `<DrillLedger variant="row">`, which drops the gap between rows.
   */
  variant?: "card" | "row";
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
  variant = "card",
  children,
}: DrillRowProps) {
  // Same id scheme the tab buttons used, so every scroll/focus target
  // (`analysis-tab-${id}`) keeps resolving after the conversion.
  const headerId = `analysis-tab-${id}`;
  const panelId = `analysis-row-panel-${id}`;
  const renderPanel = open || keepMounted;
  const isRow = variant === "row";

  return (
    <section
      data-drill-row={id}
      className={
        isRow
          ? "border-t border-border first:border-t-0"
          : "overflow-hidden rounded-lg border border-border bg-card shadow-sm"
      }
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
          className={cn(
            "scroll-mt-24 sm:scroll-mt-28 flex min-h-14 w-full cursor-pointer items-center gap-3 py-3 text-left transition-colors duration-150 hover:bg-band focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:ring-inset",
            // Row: no frame to inset from, so the glyph and the title start
            // 4px from the region's content edge (room for the inset ring,
            // and the inset the "Full breakdown" control inside the row
            // has), not 12-16px in from the headings and rules of the open
            // panel under them.
            isRow ? "px-1" : "px-3 sm:px-4",
          )}
        >
          {/* A plain glyph, not an icon tile (DESIGN.md: no icon tiles). */}
          {icon ? (
            <span
              aria-hidden
              className="flex size-5 shrink-0 items-center justify-center text-muted-foreground"
            >
              {icon}
            </span>
          ) : null}
          <span className="min-w-0 flex-1">
            <span className="flex items-center gap-2">
              <span className="text-sm font-semibold text-foreground">{title}</span>
              {locked ? (
                // The "Pro" tag: 4px, Geist Mono, on a line (the app's tag
                // grammar), never an orange pill.
                <span className="inline-flex shrink-0 rounded-sm border border-border px-1.5 py-0.5 font-mono text-2xs leading-tight text-muted-foreground">
                  Pro
                </span>
              ) : null}
            </span>
            {summary ? (
              // Two lines, not one: at 390px a single truncated line cut
              // "— verify assumptions" off the projections summary.
              <span className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                {summary}
              </span>
            ) : null}
          </span>
          <ChevronDown
            aria-hidden
            className={cn(
              "size-4 shrink-0 text-muted-foreground transition-transform duration-150",
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
          className={cn(
            "min-w-0 overflow-hidden",
            // Row: the content runs the region's full inner width (no second
            // frame, no side padding). The 4px bleed on each side is room
            // for a 3px focus ring on a full-width control, which this
            // panel's overflow would otherwise clip; the content edge itself
            // stays on the region's.
            isRow ? "-mx-1 px-1 pb-5 pt-1" : "border-t border-border p-2 sm:p-6"
          )}
        >
          <DrillRowVariantContext.Provider value={variant}>
            {children}
          </DrillRowVariantContext.Provider>
        </div>
      ) : null}
    </section>
  );
}
