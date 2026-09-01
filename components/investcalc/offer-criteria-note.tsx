"use client";

import { Info } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

/**
 * The exact-criteria disclosure behind an Offer Ceiling / Max Offer number.
 *
 * This used to be an always-visible <details> line ("View exact criteria")
 * under EVERY deal row's offer line — a repeated 44px summary that said the
 * same thing on each deal and doubled the line's height on both the My Deals
 * table and the dashboard-home Top Deals table. The content is unchanged; it
 * now opens from a small ⓘ next to the number, matching the verdict badge's
 * own popover pattern.
 */
export function OfferCriteriaNote({
  basisLabel,
}: {
  basisLabel?: string | null;
}) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label="How this Offer Ceiling is computed"
          className="inline-flex size-6 shrink-0 items-center justify-center rounded-full align-middle text-muted-foreground/80 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Info className="h-3.5 w-3.5" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="w-72 p-3 text-left text-[11px] leading-relaxed"
      >
        <p className="font-semibold text-foreground">
          Criteria: {basisLabel ?? "Captured targets"}
        </p>
        <p className="mt-1 text-muted-foreground">
          Highest modeled price that still meets these criteria under the
          assumptions shown. This is not a recommended offer or appraisal.
        </p>
      </PopoverContent>
    </Popover>
  );
}
