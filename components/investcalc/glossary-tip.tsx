"use client";

/**
 * Small wrapper around the existing Tooltip primitive + the glossary.
 *
 * Usage:
 *   <GlossaryTip term="dscr">DSCR</GlossaryTip>
 *
 * Renders the label children, plus a tiny "?" indicator, with a tooltip
 * showing the plain-English definition and benchmark.
 *
 * TOUCH + KEYBOARD: this is a CONTROLLED tooltip whose trigger is a
 * focusable <span role="button"> (NOT a <button> - GlossaryTip is sometimes
 * nested inside a <Label>, and <label><button></label> is invalid HTML that
 * broke hydration before). Because the trigger is a span, it stays valid in
 * every existing call site, while now opening on:
 *   - hover (desktop, via Radix onOpenChange),
 *   - focus (keyboard tab-in),
 *   - tap (touch -> onClick forces it open; most of our audience is on a phone,
 *     where the old hover-only tooltip was completely dead).
 * It closes on blur, Escape, pointer-leave (Radix), or Enter/Space toggle.
 * onClick stops propagation so tapping the term inside a <Label> doesn't also
 * activate the label's input.
 */

"use client";

import { ReactNode, useState } from "react";
import { HelpCircle } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
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
  const [open, setOpen] = useState(false);
  const entry: GlossaryEntry | undefined = GLOSSARY[term];
  if (!entry) {
    // No glossary entry - render plain children so nothing breaks.
    return <>{children}</>;
  }

  return (
    <TooltipProvider delayDuration={150}>
      <Tooltip open={open} onOpenChange={setOpen}>
        <TooltipTrigger asChild>
          <span
            role="button"
            tabIndex={0}
            aria-label={`${entry.term} - what's this?`}
            className={cn(
              "inline-flex min-h-11 min-w-11 items-center justify-center gap-1 cursor-help rounded-sm underline decoration-dotted decoration-muted-foreground/40 underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              className,
            )}
            onClick={(e) => {
              // Tap target on touch; stop the click from reaching a wrapping
              // <Label htmlFor> (which would steal focus to the input).
              e.preventDefault();
              e.stopPropagation();
              setOpen(true);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                setOpen((o) => !o);
              }
            }}
          >
            {children}
            {showIcon && <HelpCircle className="h-3 w-3 text-foreground" />}
          </span>
        </TooltipTrigger>
        <TooltipContent
          side="top"
          className="max-w-xs text-xs leading-relaxed bg-popover text-popover-foreground border border-border shadow-md px-3 py-2"
        >
          <div className="font-semibold text-foreground mb-0.5">
            {entry.term}
          </div>
          <p className="text-muted-foreground">{entry.definition}</p>
          {entry.benchmark && (
            <p className="text-muted-foreground mt-1.5 pt-1.5 border-t border-border italic">
              {entry.benchmark}
            </p>
          )}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
