"use client";

import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useTapTooltip } from "@/components/investcalc/use-tap-tooltip";

type SummaryItem = {
  label: string;
  value: string;
  tone?: "positive" | "negative" | "neutral";
  /** Shown on label hover, focus or tap (clarifies data source; does not change stored values). */
  labelTooltip?: string;
};

/**
 * A card label that carries a hint. The trigger used to be the bare <p>, so
 * the hint could not be reached by keyboard or by touch. It is now a
 * focusable control that opens on hover, focus and tap (use-tap-tooltip.ts).
 * A span with role="button", not a <button>: the global 44px button floor
 * would make this one label taller than its neighbours and push its value
 * out of line with the row. The invisible band (before:-inset-y-5) gives the
 * tap target its height without moving anything.
 */
function SummaryLabelHint({ label, hint }: { label: string; hint: string }) {
  const tip = useTapTooltip();
  return (
    <p className="text-left text-3xs font-bold uppercase tracking-widest text-muted-foreground">
      <Tooltip delayDuration={200} open={tip.open} onOpenChange={tip.onOpenChange}>
        <TooltipTrigger asChild>
          <span
            role="button"
            tabIndex={0}
            {...tip.triggerProps}
            {...tip.keyboardProps}
            className="relative cursor-help rounded-sm underline decoration-dotted decoration-muted-foreground/50 underline-offset-2 before:absolute before:inset-x-0 before:-inset-y-5"
          >
            {label}
          </span>
        </TooltipTrigger>
        <TooltipContent
          side="top"
          sideOffset={6}
          className="max-w-xs border border-border bg-popover px-3 py-2 text-xs leading-snug text-popover-foreground shadow-md"
        >
          {hint}
        </TooltipContent>
      </Tooltip>
    </p>
  );
}

export function SummaryCardGrid({
  items,
  columnsClassName = "md:grid-cols-3",
}: {
  items: SummaryItem[];
  columnsClassName?: string;
}) {
  return (
    // Dashboard-hardening: one surface with hairline-separated cells
    // (gap-px over a border-colored background) instead of a row of
    // boxed cards. Robust for any column count, including wrapping.
    <div className={cn("grid gap-px overflow-hidden rounded-2xl border border-border bg-border", columnsClassName)}>
      {items.map((item) => (
        <div key={item.label} className="bg-card p-4 sm:p-5">
          {item.labelTooltip ? (
            <SummaryLabelHint label={item.label} hint={item.labelTooltip} />
          ) : (
            <p className="text-3xs font-bold uppercase tracking-widest text-muted-foreground">{item.label}</p>
          )}
          <p
            className={cn(
              "mt-2 font-mono text-2xl font-extrabold tabular-nums tracking-tight",
              item.tone === "positive" && "text-[var(--metric-positive)]",
              item.tone === "negative" && "text-[var(--metric-negative)]",
              (!item.tone || item.tone === "neutral") && "text-foreground"
            )}
          >
            {item.value}
          </p>
        </div>
      ))}
    </div>
  );
}
