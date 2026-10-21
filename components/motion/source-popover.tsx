"use client";

/**
 * SourcePopover: a figure or an input that opens where it came from. The
 * trigger is the figure itself (a 44px target), the content is the source's
 * name, its date or basis, and what to replace it with, in the words
 * lib/product-facts.ts already uses. Radix Popover carries the keyboard and
 * focus behaviour; on touch it opens on tap, on a pointer it opens on click
 * (hover alone never reveals content a keyboard user cannot reach).
 */

import type { ReactNode } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

/** The source's tag: "HUD FMR", "FRED, 20 Aug 2026", "Sample input, 25 Aug 2026". */
export type SourceLabel = string;

export function SourcePopover({
  source,
  basis,
  replaceWith,
  children,
  className,
}: {
  source: SourceLabel;
  /** The date or the basis of the value: "FY2026, 3-bedroom, Philadelphia County". */
  basis: ReactNode;
  /** What to replace it with before deciding. */
  replaceWith?: ReactNode;
  /** The figure or chip that opens the popover. */
  children: ReactNode;
  className?: string;
}) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            "inline-flex min-h-11 items-center gap-1.5 rounded-md text-left underline decoration-dotted decoration-1 underline-offset-[5px] hover:decoration-solid",
            className,
          )}
        >
          {children}
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-72 text-sm">
        <p className="font-mono text-xs text-muted-foreground">{source}</p>
        <div className="mt-1 text-foreground">{basis}</div>
        {replaceWith ? (
          <p className="mt-2 border-t border-rule-soft pt-2 text-muted-foreground">
            Replace with: {replaceWith}
          </p>
        ) : null}
      </PopoverContent>
    </Popover>
  );
}
