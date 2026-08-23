"use client";

/**
 * "What's your play?" strategy chips - the goal-first entry on the calculator.
 * Picking a chip tailors the form (property type + assumption defaults) and
 * tells the results view which tab to lead with. Fully optional: with nothing
 * selected the calculator is unchanged. Free to all users; plays whose headline
 * output is Pro (MAO, BRRRR/Flip) surface the existing Pro gate at the result.
 */

import { cn } from "@/lib/utils";
import {
  ADVANCED_INVESTOR_STRATEGIES,
  CORE_INVESTOR_STRATEGIES,
  SECONDARY_INVESTOR_STRATEGIES,
  getStrategyByKey,
  type InvestorStrategy,
} from "@/lib/investor-strategies";

export function StrategyChips({
  activeKey,
  onSelect,
}: {
  activeKey: string | null;
  onSelect: (key: string | null) => void;
}) {
  const active = getStrategyByKey(activeKey);
  const renderStrategy = (strategy: InvestorStrategy) => {
    const isActive = strategy.key === activeKey;
    const Icon = strategy.Icon;
    return (
      <button
        key={strategy.key}
        type="button"
        aria-pressed={isActive}
        title={strategy.tagline}
        onClick={() => onSelect(isActive ? null : strategy.key)}
        className={cn(
          "inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-full border px-3 py-2 text-xs font-semibold transition-colors sm:shrink",
          isActive
            ? "border-primary bg-primary text-primary-foreground"
            : "border-border bg-background text-foreground hover:bg-muted"
        )}
      >
        <Icon aria-hidden className="size-3.5 shrink-0" />
        {strategy.label}
      </button>
    );
  };

  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-foreground">Strategy</p>
          <p className="text-[11px] leading-snug text-muted-foreground">
            Long-term rental acquisition is the core workflow. Other models stay available with their limitations attached.
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

      <p className="mt-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
        Core
      </p>
      <div className="mt-3 -mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0 sm:pb-0">
        {CORE_INVESTOR_STRATEGIES.map(renderStrategy)}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
          Secondary
        </span>
        {SECONDARY_INVESTOR_STRATEGIES.map(renderStrategy)}
      </div>

      <details
        className="group mt-3 rounded-xl border border-border bg-muted/20 px-3"
        open={active?.productStage === "advanced-beta" ? true : undefined}
      >
        <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 text-xs font-bold text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          Advanced / Beta strategies
          <span aria-hidden className="text-muted-foreground transition-transform group-open:rotate-45">+</span>
        </summary>
        <p className="pb-2 text-[11px] leading-relaxed text-muted-foreground">
          BRRRR, flip, wholesale, and STR are screening aids. Their rehab, ARV, lender, operating, regulatory, and exit assumptions require separate evidence.
        </p>
        <div className="flex flex-wrap gap-2 border-t border-border py-3">
          {ADVANCED_INVESTOR_STRATEGIES.map(renderStrategy)}
        </div>
      </details>

      {active ? (
        <p className="mt-3 rounded-xl bg-primary/5 px-3 py-2 text-xs leading-snug text-foreground">
          <span className="font-semibold">{active.label}:</span> {active.focusHint}
          {active.limitation ? (
            <span className="mt-1 block text-muted-foreground">Limit: {active.limitation}</span>
          ) : null}
        </p>
      ) : null}
    </div>
  );
}
