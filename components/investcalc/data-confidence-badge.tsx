"use client";

/**
 * Data confidence badge - a High/Medium/Low pill that, on click, shows
 * where each key input came from (HUD FMR / FRED / state tax / your own
 * entry) and when it was fetched. Reused on the result screen, My Deals
 * rows, and dashboard Top Deals. Renders nothing when confidence is
 * unknown (e.g. deals saved before this feature).
 */
import { Shield, ShieldAlert, ShieldCheck } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  confidenceLabel,
  dataConfidenceFieldLabel,
  describeConfidenceGap,
  dataConfidenceSourceLabel,
  type DataConfidence,
  type DataConfidenceField,
} from "@/lib/data-confidence";
import { cn } from "@/lib/utils";

const FIELD_ORDER: DataConfidenceField[] = ["monthlyRent", "interestRate", "propertyTaxPct"];

export function DataConfidenceBadge({
  confidence,
  size = "sm",
  propertyType,
}: {
  confidence: DataConfidence | null | undefined;
  size?: "sm" | "xs";
  /** Lets the "to raise this" hint suppress advice that can't work for
   *  multi-unit deals, where HUD rent auto-fill never runs. */
  propertyType?: string | null;
}) {
  if (!confidence) return null;
  const { level } = confidence;
  const tone =
    level === "high"
      ? "border-[var(--brand-green)]/30 bg-[var(--brand-green-light)] text-[var(--brand-green)]"
      : level === "medium"
        ? "border-amber-300 bg-amber-50 text-amber-800"
        : "border-border bg-muted/40 text-muted-foreground";
  const Icon = level === "high" ? ShieldCheck : level === "medium" ? Shield : ShieldAlert;
  const tracked = FIELD_ORDER.filter((f) => confidence.fields[f]);
  const gap = describeConfidenceGap(confidence, { propertyType });

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={`Data confidence: ${confidenceLabel(level)}`}
          className={cn(
            "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 font-semibold",
            size === "xs" ? "text-[10px]" : "text-[11px]",
            tone
          )}
        >
          <Icon className="size-3" />
          Data: {confidenceLabel(level)}
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-64 p-3 text-xs">
        <p className="mb-2 font-semibold text-foreground">Data confidence: {confidenceLabel(level)}</p>
        {tracked.length > 0 ? (
          <ul className="space-y-1.5">
            {tracked.map((f) => {
              const p = confidence.fields[f]!;
              return (
                <li key={f} className="flex items-start justify-between gap-2">
                  <span className="text-muted-foreground">{dataConfidenceFieldLabel(f)}</span>
                  <span className="text-right font-medium text-foreground">
                    {p.verified ? "You verified" : dataConfidenceSourceLabel(p.source)}
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
        {/* What would actually raise this rating. Suppressed at High (nothing
            to do) and when there are no tracked fields — the empty state above
            already gives the same instruction. */}
        {gap && tracked.length > 0 ? (
          <p className="mt-2 border-t border-border pt-2 text-[11px] text-muted-foreground">
            <span className="font-semibold text-foreground">To raise this: </span>
            {gap}
          </p>
        ) : null}
      </PopoverContent>
    </Popover>
  );
}
