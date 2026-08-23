"use client";

/**
 * "What's your play?" strategy chips - the goal-first entry on the calculator.
 * Picking a chip tailors the form (property type + assumption defaults) and
 * tells the results view which tab to lead with. Fully optional: with nothing
 * selected the calculator is unchanged. Free to all users; plays whose headline
 * output is Pro (MAO, BRRRR/Flip) surface the existing Pro gate at the result.
 */

import { cn } from "@/lib/utils";
import { INVESTOR_STRATEGIES, getStrategyByKey } from "@/lib/investor-strategies";

export function StrategyChips({
  activeKey,
  onSelect,
}: {
  activeKey: string | null;
  onSelect: (key: string | null) => void;
}) {
  const active = getStrategyByKey(activeKey);

  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-foreground">Strategy</p>
          <p className="text-[11px] leading-snug text-muted-foreground">
            Optional - tailor the form and lead with the number that matters for your strategy.
          </p>
        </div>
        {active ? (
          // 44px minimum: strategy selection is a primary setup control.
          // strategy chips below carry, without growing the header row.
          <button
            type="button"
            onClick={() => onSelect(null)}
            className="inline-flex min-h-11 shrink-0 items-center px-2 text-xs font-semibold text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
          >
            Clear
          </button>
        ) : null}
      </div>

      {/* One swipeable row on phones (the 6 chips wrapped to 3 rows at
          375px, ~140px of card height for a set-and-forget control);
          wraps as before from sm:. Negative margin bleeds the scroll
          gutter to the card edge so the row hints its overflow. */}
      <div className="mt-3 -mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0 sm:pb-0">
        {INVESTOR_STRATEGIES.map((s) => {
          const isActive = s.key === activeKey;
          const Icon = s.Icon;
          return (
            <button
              key={s.key}
              type="button"
              aria-pressed={isActive}
              title={s.tagline}
              onClick={() => onSelect(isActive ? null : s.key)}
              className={cn(
                "inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-full border px-3 py-2 text-xs font-semibold transition-colors sm:shrink",
                isActive
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-background text-foreground hover:bg-muted"
              )}
            >
              <Icon className="size-3.5 shrink-0" />
              {s.label}
            </button>
          );
        })}
      </div>

      {active ? (
        <p className="mt-3 rounded-xl bg-primary/5 px-3 py-2 text-xs leading-snug text-foreground">
          <span className="font-semibold">{active.label}:</span> {active.focusHint}
        </p>
      ) : null}
    </div>
  );
}
