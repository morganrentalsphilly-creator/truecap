"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * One chart inside a Pro panel: its title on a 1px line, the chart under it.
 * Lines, not a card, because the panel already sits inside the ledger row's
 * card (DESIGN.md: lines carry structure inside an object).
 */
export function ChartCard({
  title,
  className,
  children,
}: {
  title: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={cn("min-w-0 overflow-hidden border-t border-border pt-3", className)}>
      <p className="mb-3 text-sm font-semibold text-foreground sm:mb-4">{title}</p>
      {children}
    </div>
  );
}
