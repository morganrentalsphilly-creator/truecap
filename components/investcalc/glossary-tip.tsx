"use client";

/**
 * Small wrapper around the existing Tooltip primitive + the glossary.
 *
 * Usage:
 *   <GlossaryTip term="dscr">DSCR</GlossaryTip>
 *
 * Renders the label children, plus a tiny "?" indicator, with a hover/focus
 * tooltip showing the plain-English definition and benchmark.
 *
 * NOTE — earlier we tried converting this to a Popover so it would work
 * on touch devices (which never fire hover). That broke the dashboard
 * because GlossaryTip is sometimes rendered inside a <Label>, and
 * <label><button></button></label> is invalid HTML — Radix + React 19
 * threw hydration errors that bubbled to the AnalysisErrorBoundary.
 *
 * To make tooltips tappable on mobile WITHOUT breaking the existing
 * label-nested usages, we'd need either:
 *   (a) a controlled Tooltip with a span trigger + manual onClick toggle, or
 *   (b) refactor all label-nested call sites to put GlossaryTip outside the Label.
 *
 * For now we kept the Tooltip behavior (hover-only, desktop-only) to
 * keep production stable. Revisit when you can audit all call sites.
 */

import { ReactNode } from "react";
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
  const entry: GlossaryEntry | undefined = GLOSSARY[term];
  if (!entry) {
    // No glossary entry — render plain children so nothing breaks.
    return <>{children}</>;
  }

  return (
    <TooltipProvider delayDuration={150}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span
            className={cn(
              "inline-flex items-center gap-1 cursor-help underline decoration-dotted decoration-muted-foreground/40 underline-offset-2",
              className
            )}
          >
            {children}
            {showIcon && (
              <HelpCircle className="w-3 h-3 text-muted-foreground opacity-70" />
            )}
          </span>
        </TooltipTrigger>
        <TooltipContent
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
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
