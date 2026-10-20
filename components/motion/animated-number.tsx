"use client";

/**
 * AnimatedNumber: a figure that rolls between values (NumberFlow), formatted
 * for the locale with tabular numerals, inside the text face. The server and
 * the first client render print the plain formatted value, so the figure is
 * in the HTML and never shifts; NumberFlow animates only later changes.
 * Reduced motion: NumberFlow respects the preference itself
 * (respectMotionPreference defaults on), so the number just changes.
 *
 * Formats: "usd" whole dollars, "usdPerMonth" appends /mo, "ratio" two
 * decimals (DSCR), "percent" one decimal with a % sign.
 */

import NumberFlow from "@number-flow/react";
import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

type NumberKind = "usd" | "usdPerMonth" | "ratio" | "percent" | "integer";
type Format = NonNullable<ComponentProps<typeof NumberFlow>["format"]>;

const FORMAT: Record<NumberKind, Format> = {
  usd: { style: "currency", currency: "USD", maximumFractionDigits: 0 },
  usdPerMonth: { style: "currency", currency: "USD", maximumFractionDigits: 0 },
  ratio: { minimumFractionDigits: 2, maximumFractionDigits: 2 },
  percent: { minimumFractionDigits: 1, maximumFractionDigits: 1 },
  integer: { maximumFractionDigits: 0 },
};

export function AnimatedNumber({
  value,
  kind = "integer",
  className,
  trend = 0,
}: {
  value: number;
  kind?: NumberKind;
  className?: string;
  /** 0: digits roll toward the new value in either direction; 1 or -1 force a direction. */
  trend?: -1 | 0 | 1;
}) {
  const suffix = kind === "usdPerMonth" ? "/mo" : kind === "percent" ? "%" : undefined;
  return (
    <NumberFlow
      value={value}
      format={FORMAT[kind]}
      locales="en-US"
      suffix={suffix}
      trend={trend}
      className={cn("font-figure", className)}
      willChange
    />
  );
}
