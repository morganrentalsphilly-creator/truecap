"use client";

import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

type SummaryItem = {
  label: string;
  value: string;
  tone?: "positive" | "negative" | "neutral";
  /** Shown on label hover (clarifies data source; does not change stored values). */
  labelTooltip?: string;
};

export function SummaryCardGrid({
  items,
  columnsClassName = "md:grid-cols-3",
}: {
  items: SummaryItem[];
  columnsClassName?: string;
}) {
  return (
    <div className={cn("grid gap-3", columnsClassName)}>
      {items.map((item) => (
        <div key={item.label} className="rounded-2xl border border-border bg-card p-4">
          {item.labelTooltip ? (
            <Tooltip delayDuration={200}>
              <TooltipTrigger asChild>
                <p className="text-left text-[10px] font-bold uppercase tracking-widest text-muted-foreground underline decoration-dotted decoration-muted-foreground/50 underline-offset-2 cursor-help">
                  {item.label}
                </p>
              </TooltipTrigger>
              <TooltipContent
                side="top"
                sideOffset={6}
                className="max-w-xs border border-border bg-popover px-3 py-2 text-xs leading-snug text-popover-foreground shadow-md"
              >
                {item.labelTooltip}
              </TooltipContent>
            </Tooltip>
          ) : (
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{item.label}</p>
          )}
          <p
            className={cn(
              "mt-2 text-2xl font-extrabold",
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
