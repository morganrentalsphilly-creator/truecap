"use client";

/**
 * Small wrapper around the Popover primitive + the glossary.
 *
 * Usage:
 *   <GlossaryTip term="dscr">DSCR</GlossaryTip>
 *
 * Renders the label children plus a tiny "?" indicator. Click/tap to
 * open the definition.
 *
 * Why Popover instead of Tooltip:
 *   Radix Tooltip is hover-only and never fires on touch devices, so
 *   ~50% of TrueCap traffic (mobile) couldn't read any definitions.
 *   Popover works with click + tap, so mobile users finally get the
 *   same access as desktop. Slight desktop trade-off: hover no longer
 *   opens it, but technical terms like DSCR are usually intentionally
 *   sought, so the deliberate click is fine UX.
 */

import { ReactNode } from "react";
import { HelpCircle } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { GLOSSARY, type GlossaryEntry } from "@/lib/glossary";

interface GlossaryTipProps {
  /** Key in lib/glossary.ts (e.g. "capRate", "dscr"). */
  term: keyof typeof GLOSSARY;
  children: ReactNode;
  className?: string;
  /** Show a "?" icon next to the label. Default true. */
  showIcon?: boolean;
}

export function GlossaryTip({
  term,
  children,
  className,
  showIcon = true,
}: GlossaryTipProps) {
  const entry: GlossaryEntry | undefined = GLOSSARY[term];
  if (!entry) {
    // No glossary entry — render plain children so nothing breaks.
    return <>{children}</>;
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={`Definition of ${entry.term}`}
          className={cn(
            "inline-flex items-center gap-1 cursor-help underline decoration-dotted decoration-muted-foreground/40 underline-offset-2 bg-transparent border-0 p-0 m-0 text-inherit font-inherit",
            className
          )}
        >
          {children}
          {showIcon && (
            <HelpCircle className="w-3 h-3 text-muted-foreground opacity-70" />
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent
        side="top"
        className="max-w-xs text-xs leading-relaxed bg-popover border border-border shadow-md px-3 py-2"
      >
        <div className="font-semibold text-foreground mb-0.5">{entry.term}</div>
        <p className="text-muted-foreground">{entry.definition}</p>
        {entry.benchmark && (
          <p className="text-muted-foreground mt-1.5 pt-1.5 border-t border-border italic">
            {entry.benchmark}
          </p>
        )}
      </PopoverContent>
    </Popover>
  );
}
