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
 */
export function ScrollX({
  label,
  className,
  children,
  ...rest
}: ComponentProps<"div"> & { label: string }) {
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

  return (
    <div
      ref={ref}
      role={scrollable ? "group" : undefined}
      aria-label={scrollable ? label : undefined}
      tabIndex={scrollable ? 0 : undefined}
      className={cn(
        "overflow-x-auto focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50",
        className,
      )}
      {...rest}
    >
      {children}
    </div>
  );
}
