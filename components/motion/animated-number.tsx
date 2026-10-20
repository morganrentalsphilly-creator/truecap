"use client";

/**
 * AnimatedNumber: a figure that rolls between values (NumberFlow), formatted
 * for the locale with tabular numerals, inside the text face. The server and
 * the first client render print the plain formatted value, so the figure is
 * in the HTML and never shifts; NumberFlow animates only later changes.
 * Reduced motion: NumberFlow respects the preference itself
 * (respectMotionPreference defaults on), so the number just changes.
 *
 * `rollIn` (the analyzer's result reveal): the figure mounts at zero and
 * rolls to its value after a beat, once, so a result that the visitor just
 * asked for arrives rather than appears. Never used above the fold on a
 * server-rendered page, and never under reduced motion (it mounts at its
 * value).
 *
 * Formats: "usd" whole dollars, "usdSigned" whole dollars with a + or −
 * sign always (the live preview's cash flow), "usdCents" two decimals, "usdPerMonth"
 * appends /mo, "ratio" two decimals (DSCR), "percent" one decimal with a %
 * sign, "integer".
 */

import NumberFlow from "@number-flow/react";
import { useEffect, useState, type ComponentProps } from "react";
import { cn } from "@/lib/utils";

type NumberKind = "usd" | "usdSigned" | "usdCents" | "usdPerMonth" | "ratio" | "percent" | "integer";
type Format = NonNullable<ComponentProps<typeof NumberFlow>["format"]>;

const FORMAT: Record<NumberKind, Format> = {
  usd: { style: "currency", currency: "USD", maximumFractionDigits: 0 },
  usdSigned: { style: "currency", currency: "USD", maximumFractionDigits: 0, signDisplay: "always" },
  usdCents: { style: "currency", currency: "USD", minimumFractionDigits: 2, maximumFractionDigits: 2 },
  usdPerMonth: { style: "currency", currency: "USD", maximumFractionDigits: 0 },
  ratio: { minimumFractionDigits: 2, maximumFractionDigits: 2 },
  percent: { minimumFractionDigits: 1, maximumFractionDigits: 1 },
  integer: { maximumFractionDigits: 0 },
};

function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

export function AnimatedNumber({
  value,
  kind = "integer",
  className,
  trend = 0,
  rollIn = false,
  rollInDelayMs = 0,
}: {
  value: number;
  kind?: NumberKind;
  className?: string;
  /** 0: digits roll toward the new value in either direction; 1 or -1 force a direction. */
  trend?: -1 | 0 | 1;
  /** Mount at zero and roll to the value once, after rollInDelayMs. */
  rollIn?: boolean;
  rollInDelayMs?: number;
}) {
  const [shown, setShown] = useState(() => (rollIn && !prefersReducedMotion() ? 0 : value));
  const [rolled, setRolled] = useState(!rollIn);
  useEffect(() => {
    if (rolled) {
      setShown(value);
      return;
    }
    const id = window.setTimeout(() => {
      setShown(value);
      setRolled(true);
    }, rollInDelayMs);
    return () => window.clearTimeout(id);
  }, [value, rolled, rollInDelayMs]);
  const suffix = kind === "usdPerMonth" ? "/mo" : kind === "percent" ? "%" : undefined;
  return (
    <NumberFlow
      value={shown}
      format={FORMAT[kind]}
      locales="en-US"
      suffix={suffix}
      trend={trend}
      className={cn("font-figure", className)}
      willChange
    />
  );
}
