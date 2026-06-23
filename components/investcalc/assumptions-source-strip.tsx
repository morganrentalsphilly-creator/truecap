"use client";

/**
 * "Assumptions used" trust strip - shown at the top of the result state,
 * right where the visitor judges the output. It names the primary source
 * behind each pre-filled input and makes the "everything is editable"
 * promise concrete at the decision moment (before they export or upgrade).
 *
 * These are the DEFAULT sources TrueCap uses; the user may have already
 * overridden any of them, which is exactly the point - the "Edit
 * assumptions" action jumps back to the form and opens the advanced
 * section so refining is one click away.
 *
 * Deliberately compact so it never competes with the headline metrics
 * immediately below it.
 */

import { Database, Pencil } from "lucide-react";

const SOURCES: { label: string; source: string }[] = [
  { label: "Rent", source: "HUD Fair Market Rent" },
  { label: "Mortgage rate", source: "FRED 30-yr fixed" },
  { label: "Property tax", source: "State effective rate" },
  { label: "Expenses", source: "Smart defaults" },
];

export function AssumptionsSourceStrip({ onEdit }: { onEdit: () => void }) {
  return (
    <div className="mb-6 rounded-2xl border border-border bg-card/60 p-4 shadow-sm sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
        <p className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
          <Database className="size-3.5 text-primary" />
          Assumptions used
          <span className="font-semibold normal-case tracking-normal text-[var(--metric-positive)]">
            · all editable
          </span>
        </p>
        <button
          type="button"
          onClick={onEdit}
          className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-semibold text-foreground transition-colors hover:bg-muted"
        >
          <Pencil className="size-3.5" />
          Edit assumptions
        </button>
      </div>
      <ul className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-4">
        {SOURCES.map((s) => (
          <li key={s.label} className="min-w-0">
            <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              {s.label}
            </div>
            <div className="truncate text-sm font-semibold text-foreground" title={s.source}>
              {s.source}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
