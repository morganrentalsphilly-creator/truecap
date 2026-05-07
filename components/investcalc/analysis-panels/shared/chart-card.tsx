"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

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
    <div className={cn("min-w-0 overflow-hidden rounded-2xl border border-border bg-card p-3 sm:p-4", className)}>
      <p className="mb-3 text-sm font-semibold text-foreground sm:mb-4">{title}</p>
      {children}
    </div>
  );
}
