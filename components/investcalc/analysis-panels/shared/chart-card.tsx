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
    <div className={cn("rounded-2xl border border-border bg-card p-4", className)}>
      <p className="mb-4 text-sm font-semibold text-foreground">{title}</p>
      {children}
    </div>
  );
}
