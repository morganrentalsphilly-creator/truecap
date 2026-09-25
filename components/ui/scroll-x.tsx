"use client";

import { useEffect, useRef, useState, type ComponentProps } from "react";
import { cn } from "@/lib/utils";

/**
 * A horizontally scrolling container that keyboard users can reach.
 *
 * WCAG 2.1.1 / axe `scrollable-region-focusable`: content that only scrolls
 * with a pointer is unreachable from the keyboard. The 2026-09 audit found
 * 85 such wrappers (comparison, market and article tables, the embed code
 * blocks). Rather than hand a permanent tab stop to every table on every
 * screen size, this measures itself and becomes a named, focusable group
 * ONLY while it actually overflows (phones and narrow windows); on wide
 * screens it stays a plain container. The `overflow-x-auto` class is kept
 * so the global containment rule in app/globals.css still applies.
 *
 * `cue` adds a right-edge fade and a "Scroll for more →" caption while the
 * content overflows, and `stickyFirstColumn` pins a table's first column so
 * a phone reader always sees which row a number belongs to (the same audit
 * found article tables showing only their label column at 375px).
 */
export function ScrollX({
  label,
  className,
  children,
  cue = false,
  stickyFirstColumn = false,
  ...rest
}: ComponentProps<"div"> & {
  label: string;
  /** Fade + caption while the content overflows. */
  cue?: boolean;
  /** Pin `th:first-child` / `td:first-child` of a wrapped table. */
  stickyFirstColumn?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [scrollable, setScrollable] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => setScrollable(el.scrollWidth > el.clientWidth + 1);
    measure();
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    if (el.firstElementChild) observer.observe(el.firstElementChild);
    return () => observer.disconnect();
  }, []);

  const region = (
    <div
      ref={ref}
      role={scrollable ? "group" : undefined}
      aria-label={scrollable ? label : undefined}
      tabIndex={scrollable ? 0 : undefined}
      className={cn(
        "overflow-x-auto focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50",
        stickyFirstColumn &&
          "[&_table_td:first-child]:sticky [&_table_td:first-child]:left-0 [&_table_td:first-child]:z-10 [&_table_td:first-child]:bg-card [&_table_th:first-child]:sticky [&_table_th:first-child]:left-0 [&_table_th:first-child]:z-10 [&_table_th:first-child]:bg-muted",
        className,
      )}
      {...rest}
    >
      {children}
    </div>
  );

  if (!cue) return region;

  return (
    <>
      <div className="relative">
        {region}
        {scrollable ? (
          <div
            aria-hidden
            className="pointer-events-none absolute inset-y-0 right-0 w-10 rounded-r-xl bg-gradient-to-l from-card to-transparent"
          />
        ) : null}
      </div>
      {scrollable ? (
        <p className="mt-1 text-2xs text-muted-foreground sm:hidden">
          Scroll for more →
        </p>
      ) : null}
    </>
  );
}
