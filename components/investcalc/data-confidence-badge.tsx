"use client";

/**
 * Backward-compatible input-source disclosure. The stored object still carries
 * a legacy High/Medium/Low level, but new/live deals cannot durably progress
 * that grade through the current UI. Do not render the ordinal as a promise;
 * show only the useful per-field provenance.
 */
import { Database } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  dataConfidenceFieldLabel,
  dataConfidenceSourceLabel,
  type DataConfidence,
  type DataConfidenceField,
} from "@/lib/data-confidence";
import { cn } from "@/lib/utils";

const FIELD_ORDER: DataConfidenceField[] = ["monthlyRent", "interestRate", "propertyTaxPct"];

export function DataConfidenceBadge({
  confidence,
  size = "sm",
  propertyType: _propertyType,
}: {
  confidence: DataConfidence | null | undefined;
  size?: "sm" | "xs";
  /** Retained for call-site compatibility while this disclosure stays
   * ungraded. Multi-unit guidance lives in the verification workflow. */
  propertyType?: string | null;
}) {
  if (!confidence) return null;
  const tracked = FIELD_ORDER.filter((f) => confidence.fields[f]);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label="Input sources"
          className={cn(
            "inline-flex min-h-11 min-w-11 items-center justify-center gap-1 rounded-full border border-border bg-muted/40 px-2 py-0.5 font-semibold text-muted-foreground",
            size === "xs" ? "text-[10px]" : "text-[11px]",
          )}
        >
          <Database className="size-3" />
          Input sources
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-64 p-3 text-xs">
        <p className="mb-2 font-semibold text-foreground">
          Input sources
        </p>
        <p className="mb-2 text-[11px] leading-relaxed text-muted-foreground">
          See where key starting inputs came from and which ones you confirmed
          in TrueCap. This is not property-specific evidence.
        </p>
        {tracked.length > 0 ? (
          <ul className="space-y-1.5">
            {tracked.map((f) => {
              const p = confidence.fields[f]!;
              return (
                <li key={f} className="flex items-start justify-between gap-2">
                  <span className="text-muted-foreground">{dataConfidenceFieldLabel(f)}</span>
                  <span className="text-right font-medium text-foreground">
                    {p.verified
                      ? "Confirmed by you"
                      : dataConfidenceSourceLabel(p.source)}
                    {p.detail || p.fetchedAt ? (
                      <span className="block text-[10px] font-normal text-muted-foreground">
                        {[p.detail, p.fetchedAt].filter(Boolean).join(" · ")}
                      </span>
                    ) : null}
                  </span>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="text-muted-foreground">
            Based on the inputs you entered. Pick your address from the suggestions to pull live HUD rent
            and FRED rates for higher confidence.
          </p>
        )}
      </PopoverContent>
    </Popover>
  );
}
