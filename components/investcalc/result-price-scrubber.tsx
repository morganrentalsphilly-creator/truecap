"use client";

/**
 * The result's price track as an instrument (OVERHAUL.md §7, "what if I
 * offer $X"; the polish critique's first P1): the homepage teaches "drag the
 * price", so the deal the visitor just ran drags too. Dragging the handle, or
 * arrow-keying it, previews the deal at that price: the card's cash flow and
 * DSCR roll to the engine's figures at $X and the target chips flip. The
 * price being analyzed does not change (asking and the Offer Ceiling stay
 * fixed as the dimension labels; "Edit assumptions" is still how the price
 * changes), so nothing is written to the form. The slider announces on
 * release, never per tick; "Back to asking" returns the handle.
 *
 * Grammar from the hero's track (DESIGN.md "Price track"): a 2px graphite
 * line with end ticks, the meets-range in the highlight up to the ceiling, a
 * tick at each price, the dashed gap, a cobalt-bordered diamond handle that
 * is the thumb itself (the site's focus ring follows its edges) and fills
 * while pressed; the 44px slider root is the pointer target.
 */

import * as SliderPrimitive from "@radix-ui/react-slider";
import { useId, useState } from "react";
import { cn } from "@/lib/utils";

const usd = (n: number) => `$${Math.round(n).toLocaleString("en-US")}`;

export function ResultPriceScrubber({
  asking,
  ceiling,
  price,
  onPriceChange,
  valueText,
  compact = false,
}: {
  asking: number;
  ceiling: number;
  /** The what-if price the handle sits at; `asking` when at rest. */
  price: number;
  onPriceChange: (price: number) => void;
  /** The announcement for a price: "$250,000: cash flow $650 a month, misses…" */
  valueText: (price: number) => string;
  /** Tighter spacing and the short label, for a card. */
  compact?: boolean;
}) {
  const id = useId();
  const lo = Math.min(asking, ceiling);
  const hi = Math.max(asking, ceiling);
  const margin = Math.max(5_000, Math.round((hi - lo) * 0.25));
  const low = Math.max(1_000, Math.floor((lo - margin) / 1_000) * 1_000);
  const high = Math.ceil((hi + margin) / 1_000) * 1_000;
  const pct = (p: number) => ((p - low) / (high - low)) * 100;
  const gap = asking - ceiling;
  const moved = price !== asking;
  const [announcement, setAnnouncement] = useState("");

  const ceilingLabel = (
    <span className="text-highlight-text">
      {compact ? "Ceiling" : "Offer Ceiling"} {usd(ceiling)}
    </span>
  );
  const askingLabel = (
    <span className="text-muted-foreground">Asking {usd(asking)}</span>
  );

  return (
    <div
      className={cn("relative mx-1", compact ? "pb-0" : "pb-2")}
      data-result-price-scrubber=""
      data-what-if={moved ? "true" : "false"}
    >
      <div
        className="flex items-baseline justify-between gap-3 font-mono text-xs"
        aria-hidden
      >
        {ceiling <= asking ? (
          <>
            {ceilingLabel}
            {askingLabel}
          </>
        ) : (
          <>
            {askingLabel}
            {ceilingLabel}
          </>
        )}
      </div>
      <SliderPrimitive.Root
        // 44px tall: Radix takes the pointer on the root, so the band around
        // the track is the drag target whatever the thumb's size.
        className="relative mt-1.5 flex h-11 w-full touch-none items-center select-none"
        min={low}
        max={high}
        step={1_000}
        value={[price]}
        onValueChange={([v]) => onPriceChange(v)}
        onValueCommit={([v]) => setAnnouncement(valueText(v))}
      >
        <SliderPrimitive.Track className="relative h-[2px] w-full grow bg-foreground">
          <span
            aria-hidden
            className="absolute top-1/2 left-0 h-2 -translate-y-1/2 bg-highlight/85"
            style={{ width: `${pct(ceiling)}%` }}
          />
          <SliderPrimitive.Range className="absolute h-full bg-transparent" />
          <span
            aria-hidden
            className="absolute top-1/2 h-2.5 w-px -translate-y-1/2 bg-highlight-text"
            style={{ left: `${pct(ceiling)}%` }}
          />
          <span
            aria-hidden
            className="absolute top-1/2 h-2.5 w-px -translate-y-1/2 bg-foreground"
            style={{ left: `${pct(asking)}%` }}
          />
          <span aria-hidden className="absolute top-1/2 left-0 h-3 w-px -translate-y-1/2 bg-foreground" />
          <span aria-hidden className="absolute top-1/2 right-0 h-3 w-px -translate-y-1/2 bg-foreground" />
          {gap > 0 ? (
            <span
              aria-hidden
              className="absolute top-1/2 h-px -translate-y-1/2 border-t border-dashed border-highlight-text"
              style={{
                left: `${pct(ceiling)}%`,
                width: `${pct(asking) - pct(ceiling)}%`,
              }}
            />
          ) : null}
        </SliderPrimitive.Track>
        <SliderPrimitive.Thumb
          aria-label="What-if offer price"
          // Radix derives aria-valuenow from a collection index the server
          // does not have; the value is known here.
          aria-valuenow={price}
          aria-valuetext={valueText(price)}
          aria-describedby={`${id}-help`}
          // The thumb IS the diamond (the hero's handle, components/home/
          // price-scrubber.tsx): a 20px square turned 45°, so the site's focus
          // ring follows its edges instead of circling a 44px thumb. Hover
          // grows it; press fills it cobalt and grows it more; release eases
          // it back at the fast duration.
          className="block size-5 rotate-45 cursor-grab rounded-none border-2 border-primary bg-card shadow-xs transition-[scale,background-color] duration-[var(--duration-fast)] ease-[var(--ease-out)] hover:scale-110 active:scale-125 active:cursor-grabbing active:bg-primary motion-reduce:transition-none"
        />
      </SliderPrimitive.Root>
      <p
        id={`${id}-help`}
        className={cn(
          "flex min-h-5 items-center justify-center gap-2 text-center font-figure text-xs text-muted-foreground",
          compact ? "mt-1" : "mt-1.5",
        )}
      >
        {moved ? (
          <>
            <span className="text-highlight-text">What if you offered {usd(price)}</span>
            <button
              type="button"
              className="tc-link inline-flex min-h-11 items-center font-sans"
              onClick={() => onPriceChange(asking)}
            >
              Back to asking
            </button>
          </>
        ) : gap > 0 ? (
          <span aria-hidden>Gap {usd(gap)}</span>
        ) : null}
      </p>
      <span className="sr-only" role="status" aria-live="polite" aria-atomic="true">
        {announcement}
      </span>
    </div>
  );
}
