/**
 * The price track in the result (OVERHAUL.md §7, DESIGN.md "Price track"):
 * asking against the Offer Ceiling and the gap between them, in the hero's
 * grammar, static. A dimension line from a little below the lower of the two
 * to a little above the higher, the meets-range in the highlight up to the
 * ceiling, two labelled ticks. Pure markup: the analyzer, the share page and
 * the memo render it; no hooks.
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
  /** Tighter labels for a card or a bar. */
  compact?: boolean;
}) {
  const lo = Math.min(asking, ceiling);
  const hi = Math.max(asking, ceiling);
  const margin = Math.max(5_000, Math.round((hi - lo) * 0.25));
  const low = lo - margin;
  const high = hi + margin;
  const pct = (p: number) => ((p - low) / (high - low)) * 100;
  // A label near an end of the line hangs from its tick instead of centring
  // on it, so it never leaves the card.
  const labelAlign = (p: number) =>
    pct(p) < 25 ? "" : pct(p) > 75 ? "-translate-x-full" : "-translate-x-1/2";
  const gap = asking - ceiling;
  return (
    <div
      className={cn("relative mx-1", compact ? "pt-4 pb-0" : "pt-6 pb-2", className)}
      role="img"
      aria-label={
        gap > 0
          ? `Asking ${usd(asking)} is ${usd(gap)} above the Offer Ceiling ${usd(ceiling)}`
          : `Asking ${usd(asking)} is within the Offer Ceiling ${usd(ceiling)}`
      }
    >
      <span
        className={cn("absolute top-0 font-mono text-xs whitespace-nowrap text-highlight-text", labelAlign(ceiling))}
        style={{ left: `${pct(ceiling)}%` }}
        aria-hidden
      >
        {compact ? "Ceiling" : "Offer Ceiling"} {usd(ceiling)}
        <span className={cn("mt-0.5 block h-1.5 w-px bg-current", pct(ceiling) < 25 ? "" : pct(ceiling) > 75 ? "ml-auto" : "mx-auto")} />
      </span>
      <span
        className={cn("absolute top-0 font-mono text-xs whitespace-nowrap text-muted-foreground", labelAlign(asking))}
        style={{ left: `${pct(asking)}%` }}
        aria-hidden
      >
        Asking {usd(asking)}
        <span className={cn("mt-0.5 block h-1.5 w-px bg-current", pct(asking) < 25 ? "" : pct(asking) > 75 ? "ml-auto" : "mx-auto")} />
      </span>
      <div className="relative h-[2px] w-full bg-foreground" aria-hidden>
        <span className="absolute top-1/2 left-0 h-2 -translate-y-1/2 bg-highlight/85" style={{ width: `${pct(ceiling)}%` }} />
        <span className="absolute top-1/2 left-0 h-3 w-px -translate-y-1/2 bg-foreground" />
        <span className="absolute top-1/2 right-0 h-3 w-px -translate-y-1/2 bg-foreground" />
        {gap > 0 ? (
          <span
            className="absolute top-1/2 h-px -translate-y-1/2 border-t border-dashed border-highlight-text"
            style={{ left: `${pct(ceiling)}%`, width: `${pct(asking) - pct(ceiling)}%` }}
          />
        ) : null}
      </div>
      {gap > 0 ? (
        <p className={cn("text-center font-figure text-xs text-muted-foreground", compact ? "mt-1" : "mt-1.5")} aria-hidden>
          Gap {usd(gap)}
        </p>
      ) : null}
    </div>
  );
}
