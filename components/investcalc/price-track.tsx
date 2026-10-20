/**
 * The price track in the result (OVERHAUL.md §7, DESIGN.md "Price track"):
 * asking against the Offer Ceiling and the gap between them, in the hero's
 * grammar, static. A dimension line from a little below the lower of the two
 * to a little above the higher, the meets-range in the highlight up to the
 * ceiling, a tick at each price, the two labels on one row above the line in
 * the line's order (positioned labels collided on a narrow track). Pure
 * markup: the analyzer, the share page and the memo render it; no hooks.
 */

import { cn } from "@/lib/utils";

const usd = (n: number) => `$${Math.round(n).toLocaleString("en-US")}`;

export function PriceTrack({
  asking,
  ceiling,
  className,
  compact = false,
}: {
  asking: number;
  ceiling: number;
  className?: string;
  /** Tighter spacing and the short label, for a card. */
  compact?: boolean;
}) {
  const lo = Math.min(asking, ceiling);
  const hi = Math.max(asking, ceiling);
  const margin = Math.max(5_000, Math.round((hi - lo) * 0.25));
  const low = lo - margin;
  const high = hi + margin;
  const pct = (p: number) => ((p - low) / (high - low)) * 100;
  const gap = asking - ceiling;
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
      className={cn("relative mx-1", compact ? "pb-0" : "pb-2", className)}
      role="img"
      aria-label={
        gap > 0
          ? `Asking ${usd(asking)} is ${usd(gap)} above the Offer Ceiling ${usd(ceiling)}`
          : `Asking ${usd(asking)} is within the Offer Ceiling ${usd(ceiling)}`
      }
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
      <div className="relative mt-1.5 h-[2px] w-full bg-foreground" aria-hidden>
        <span
          className="absolute top-1/2 left-0 h-2 -translate-y-1/2 bg-highlight/85"
          style={{ width: `${pct(ceiling)}%` }}
        />
        <span
          className="absolute top-1/2 h-2.5 w-px -translate-y-1/2 bg-highlight-text"
          style={{ left: `${pct(ceiling)}%` }}
        />
        <span
          className="absolute top-1/2 h-2.5 w-px -translate-y-1/2 bg-foreground"
          style={{ left: `${pct(asking)}%` }}
        />
        <span className="absolute top-1/2 left-0 h-3 w-px -translate-y-1/2 bg-foreground" />
        <span className="absolute top-1/2 right-0 h-3 w-px -translate-y-1/2 bg-foreground" />
        {gap > 0 ? (
          <span
            className="absolute top-1/2 h-px -translate-y-1/2 border-t border-dashed border-highlight-text"
            style={{
              left: `${pct(ceiling)}%`,
              width: `${pct(asking) - pct(ceiling)}%`,
            }}
          />
        ) : null}
      </div>
      {gap > 0 ? (
        <p
          className={cn(
            "text-center font-figure text-xs text-muted-foreground",
            compact ? "mt-1" : "mt-1.5",
          )}
          aria-hidden
        >
          Gap {usd(gap)}
        </p>
      ) : null}
    </div>
  );
}
