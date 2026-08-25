"use client";

/**
 * "Assumptions used" trust strip - shown at the top of the result state,
 * right where the visitor judges the output. It names the source behind
 * each pre-filled input and makes the "everything is editable" promise
 * concrete at the decision moment (before they export or upgrade).
 *
 * TRUTHFUL: sources come from the live enrichment provenance, not a
 * hardcoded list — after the user types their own rent the strip says
 * "You entered it", never "HUD Fair Market Rent" (roadmap P1-8; the old
 * static version claimed HUD/FRED/state regardless of what happened).
 *
 * Mobile-compact (density audit M4): below sm the card is a single
 * headline + one-line source summary; the per-field grid + disclaimer
 * expand on tap. From sm: the full grid renders as before.
 */

import { useState } from "react";
import Link from "next/link";
import { ChevronDown, Database, Pencil } from "lucide-react";
import type { EnrichmentProvenanceInput } from "@/lib/data-confidence";
import { cn } from "@/lib/utils";

type StripEntry = {
  label: string;
  /** Full source name for the grid, e.g. "HUD Fair Market Rent". */
  source: string;
  /** Compact form for the one-line mobile summary, e.g. "HUD". */
  short: string;
  /** True when the value is the user's own entry (styled neutrally). */
  manual: boolean;
  /** Source vintage when the upstream feed supplies one. */
  freshness?: string;
};

const MANUAL: Pick<StripEntry, "source" | "short" | "manual"> = {
  source: "You entered it",
  short: "yours",
  manual: true,
};

/** Provenance → display rows. Exported for unit tests (pure). */
export function buildAssumptionEntries(
  provenance: EnrichmentProvenanceInput | null | undefined,
  expensesEdited: boolean
): StripEntry[] {
  const rent = provenance?.monthlyRent;
  const rate = provenance?.interestRate;
  const tax = provenance?.propertyTaxPct;
  return [
    {
      label: "Rent",
      ...(rent && !rent.overridden
        ? {
            source:
              rent.source === "rentcast-estimate"
                ? "RentCast market-rent estimate"
                : rent.source === "hud-safmr"
                  ? "HUD rent benchmark (ZIP)"
                  : "HUD rent benchmark (county)",
            short: "HUD",
            manual: false,
            ...(rent.fetchedAt ? { freshness: /^\d{4}$/.test(rent.fetchedAt) ? `HUD ${rent.fetchedAt}` : `As of ${rent.fetchedAt}` } : {}),
          }
        : MANUAL),
    },
    {
      label: "Mortgage rate",
      ...(rate && !rate.overridden
        ? { source: "FRED owner-occupied benchmark", short: "FRED", manual: false, ...(rate.fetchedAt ? { freshness: `As of ${rate.fetchedAt}` } : {}) }
        : MANUAL),
    },
    {
      label: "Property tax",
      ...(tax && !tax.overridden
        ? { source: "State tax benchmark", short: "state", manual: false, freshness: "State benchmark" }
        : MANUAL),
    },
    {
      label: "Expenses",
      ...(expensesEdited
        ? MANUAL
        : { source: "Smart defaults", short: "defaults", manual: false }),
    },
  ];
}

export function AssumptionsSourceStrip({
  onEdit,
  provenance,
  expensesEdited = false,
  chrome = "card",
}: {
  onEdit: () => void;
  /** Live enrichment provenance; null/undefined = nothing auto-filled. */
  provenance?: EnrichmentProvenanceInput | null;
  /** True when the user touched any operating-expense field. */
  expensesEdited?: boolean;
  /** ADDITIVE chrome variant (same contract as the form sections): "bare"
   *  drops the card wrapper so the strip composes inside the ledger's
   *  "Where these numbers came from" row without a card-in-card seam.
   *  Default keeps the standalone chrome byte-identical. */
  chrome?: "card" | "bare";
}) {
  const [expanded, setExpanded] = useState(false);
  const entries = buildAssumptionEntries(provenance, expensesEdited);
  const summary = entries.map((e) => `${e.label.split(" ")[0]} ${e.short}`).join(" · ");

  return (
    <div
      className={
        chrome === "bare"
          ? undefined
          : "mb-6 rounded-2xl border border-border bg-card/60 p-4 shadow-sm sm:p-5"
      }
    >
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

      {/* Mobile one-liner + expand toggle (density audit M4): the full
          grid was ~200px between the user and the verdict at 375px. */}
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
        className="mt-2 flex min-h-11 w-full items-center justify-between gap-2 text-left sm:hidden"
      >
        <span className="min-w-0 truncate text-xs text-muted-foreground">{summary}</span>
        <ChevronDown
          className={cn("size-3.5 shrink-0 text-muted-foreground transition-transform", expanded && "rotate-180")}
        />
      </button>

      <ul
        className={cn(
          "mt-1 grid-cols-2 gap-x-4 gap-y-2 sm:mt-3 sm:grid sm:grid-cols-4",
          expanded ? "grid" : "hidden sm:grid"
        )}
      >
        {entries.map((s) => (
          <li key={s.label} className="min-w-0">
            <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              {s.label}
            </div>
            <div
              className={cn(
                "truncate text-sm font-semibold",
                s.manual ? "text-muted-foreground" : "text-foreground"
              )}
              title={s.source}
            >
              {s.source}
            </div>
            {s.freshness ? (
              <div className="truncate text-[10px] text-muted-foreground" title={s.freshness}>
                {s.freshness}
              </div>
            ) : null}
          </li>
        ))}
      </ul>
      <p
        className={cn(
          "mt-3 border-t border-border/60 pt-2.5 text-[11px] leading-relaxed text-muted-foreground",
          expanded ? "block" : "hidden sm:block"
        )}
      >
        Planning benchmarks, not property facts or financial advice — verify rent, financing, taxes, insurance, and condition before recording an investment decision.{" "}
        {/* Quiet provenance link (trust-polish audit): the skeptical-investor
            "is this math real?" path used to dead-end here — /methodology
            documents every formula + data source but had no inbound link
            at the decision moment. */}
        <Link
          href="/methodology"
          className="font-semibold text-primary/80 transition-colors hover:text-primary"
        >
          See exactly how we compute these numbers →
        </Link>
      </p>
    </div>
  );
}
