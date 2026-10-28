"use client";

/**
 * AnimatedNumber: a figure that rolls between values (NumberFlow), formatted
 * for the locale with tabular numerals, inside the text face. The server and
 * the first client render print the plain formatted value. Unchanged figures
 * stay as text instead of building a shadow tree of animated digits;
 * NumberFlow mounts when a value actually changes.
 * Reduced motion: NumberFlow respects the preference itself
 * (respectMotionPreference defaults on), so the number just changes.
 *
 * `rollIn` (the analyzer's result reveal): the figure mounts at zero and
 * rolls to its value after a beat, once, so a result that the visitor just
 * asked for arrives rather than appears. Never used above the fold on a
 * server-rendered page, and never under reduced motion (it mounts at its
 * value).
 *
 * Assistive tech reads an sr-only text twin; the animated host, which
 * NumberFlow marks role="img", is hidden from it (audit A24).
 *
 * Formats: "usd" whole dollars, "usdSigned" whole dollars with a + or −
 * sign always (the live preview's cash flow), "usdCents" two decimals, "usdPerMonth"
 * appends /mo, "ratio" two decimals (DSCR), "percent" one decimal with a %
 * sign, "integer".
 */

import type NumberFlow from "@number-flow/react";
import { lazy, Suspense, useEffect, useState, type ComponentProps, type CSSProperties } from "react";
import { cn } from "@/lib/utils";
import { isSamplePrerenderShown } from "@/lib/sample-prerender";

// Most first-paint figures never animate. Keep the animation library out of
// their startup path, and show the exact formatted value while it loads.
const LazyNumberFlow = lazy(() => import("./number-flow-renderer"));

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

// Match NumberFlow's static fallback box, including its digit-mask padding.
// Promotion must not move the surrounding line or change the figure's width.
const STATIC_NUMBER_STYLE: CSSProperties = {
  display: "inline-block",
  direction: "ltr",
  whiteSpace: "nowrap",
  lineHeight: 1,
  fontKerning: "none",
  paddingBlock: "calc(round(nearest, calc(var(--number-flow-mask-height, 0.25em) / 2), 1px) * 2)",
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
  // Over the sample's server-rendered decision (audit A2) the figure is
  // already on screen: no roll from zero.
  const [skipRoll] = useState(() => rollIn && isSamplePrerenderShown());
  const [shown, setShown] = useState(() =>
    rollIn && !skipRoll && !prefersReducedMotion() ? 0 : value,
  );
  const [initialValue] = useState(shown);
  const [rolled, setRolled] = useState(!rollIn || skipRoll);
  const [animated, setAnimated] = useState(rollIn && !skipRoll);
  // Promote before the effect updates `shown`, so NumberFlow receives the
  // previous value on mount and can animate the first change as well.
  // Once promoted, retain the host even when a figure returns to its start.
  if (!animated && !Object.is(value, shown)) setAnimated(true);
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
  // NumberFlow's host is role="img", so assistive tech met every live figure
  // as an image (audit A24). The figure reaches it as text instead: an sr-only
  // twin in the same format, with the animated host hidden from it.
  const text = `${new Intl.NumberFormat("en-US", FORMAT[kind]).format(shown)}${suffix ?? ""}`;
  const staticNumber = (
    <span aria-hidden data-static-number="" className={cn("font-figure", className)} style={STATIC_NUMBER_STYLE}>
      {text}
    </span>
  );
  return (
    <>
      <span className="sr-only">{text}</span>
      {animated ? (
        <Suspense fallback={staticNumber}>
        <LazyNumberFlow
          aria-hidden
          initialValue={initialValue}
          value={shown}
          format={FORMAT[kind]}
          locales="en-US"
          suffix={suffix}
          trend={trend}
          className={cn("font-figure", className)}
          willChange
        />
        </Suspense>
      ) : (
        staticNumber
      )}
    </>
  );
}
