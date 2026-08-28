"use client";

/**
 * Compact analysis-type disclosure for the calculator.
 *
 * Buy & Hold is the calculator's effective default even though the parent
 * intentionally stores that state as `null`. Keeping that distinction here
 * matters: merely confirming the visible default must never invoke the
 * parent's strategy handler. Every real change pauses for an explicit choice:
 * keep the live assumptions, apply the specialist starter set, or—when
 * returning to Buy & Hold—restore the captured pre-strategy assumptions.
 */

import { useId, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import {
  ADVANCED_INVESTOR_STRATEGIES,
  CORE_INVESTOR_STRATEGIES,
  SECONDARY_INVESTOR_STRATEGIES,
  getStrategyByKey,
  type InvestorStrategy,
} from "@/lib/investor-strategies";
import { isSpecialistStrategyEnabled } from "@/lib/feature-flags";

export const DEFAULT_STRATEGY_KEY = "buy-hold";

export type StrategyAssumptionMode = "keep" | "starter" | "restore";

export type StrategyStarterPreview = {
  changedFieldCount: number;
  highlights: string[];
};

/** The strategy the interface should present as selected. */
export function getEffectiveStrategyKey(activeKey: string | null): string {
  return getStrategyByKey(activeKey)?.key ?? DEFAULT_STRATEGY_KEY;
}

/**
 * Translate a visible strategy choice into the parent's existing state model.
 * `undefined` means the choice is already active and no callback may fire.
 */
export function resolveStrategySelectionIntent(
  activeKey: string | null,
  requestedKey: string,
): string | null | undefined {
  const requested = getStrategyByKey(requestedKey);
  if (!requested) return undefined;
  if (requested.key === getEffectiveStrategyKey(activeKey)) return undefined;
  return requested.key === DEFAULT_STRATEGY_KEY ? null : requested.key;
}

function strategyDisplay(strategy: InvestorStrategy) {
  const wholesale = strategy.key === "wholesale-mao";
  return {
    label: wholesale ? "Wholesale / Offer Ceiling" : strategy.label,
    tagline: wholesale
      ? "Offer Ceiling for the selected rules"
      : strategy.tagline,
  };
}

export function StrategyChips({
  activeKey,
  onSelect,
  getStarterChangePreview,
  canRestoreAssumptions = false,
}: {
  activeKey: string | null;
  onSelect: (key: string | null,
    assumptionMode: StrategyAssumptionMode,
  ) => void;
  getStarterChangePreview?: (key: string) => StrategyStarterPreview | null;
  /** True only when this browser has the actual pre-strategy snapshot. */
  canRestoreAssumptions?: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const [pendingStrategy, setPendingStrategy] =
    useState<InvestorStrategy | null>(null);
  const generatedId = useId();
  const panelId = `analysis-type-options-${generatedId}`;
  const confirmationTitleId = `${panelId}-confirmation-title`;
  const disclosureButtonRef = useRef<HTMLButtonElement | null>(null);
  const keepAssumptionsButtonRef = useRef<HTMLButtonElement | null>(null);
  const effectiveKey = getEffectiveStrategyKey(activeKey);
  const active = getStrategyByKey(effectiveKey) ?? CORE_INVESTOR_STRATEGIES[0];
  const ActiveIcon = active.Icon;
  const activeDisplay = strategyDisplay(active);

  const collapseAndRestoreFocus = () => {
    setExpanded(false);
    setPendingStrategy(null);
    // The selected option unmounts when the disclosure collapses. Return
    // keyboard/screen-reader focus to the control that can reopen it instead
    // of leaving focus on <body>.
    requestAnimationFrame(() => disclosureButtonRef.current?.focus());
  };

  const chooseStrategy = (strategy: InvestorStrategy) => {
    const intent = resolveStrategySelectionIntent(activeKey, strategy.key);
    if (intent === undefined) {
      collapseAndRestoreFocus();
      return;
    }
    setPendingStrategy(strategy);
    requestAnimationFrame(() => keepAssumptionsButtonRef.current?.focus());
  };

  const confirmStrategyChange = (assumptionMode: StrategyAssumptionMode) => {
    if (!pendingStrategy) return;
    const intent = resolveStrategySelectionIntent(
      activeKey,
      pendingStrategy.key,
    );
    if (intent !== undefined) onSelect(intent, assumptionMode);
    collapseAndRestoreFocus();
  };

  const renderStrategy = (strategy: InvestorStrategy) => {
    const isActive = strategy.key === effectiveKey;
    const isPending = strategy.key === pendingStrategy?.key;
    const Icon = strategy.Icon;
    const display = strategyDisplay(strategy);
    return (
      <button
        key={strategy.key}
        type="button"
        aria-pressed={isActive}
        title={display.tagline}
        onClick={() => chooseStrategy(strategy)}
        className={cn(
          "flex min-h-11 w-full items-center gap-2 rounded-xl border px-3 py-2 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
          isActive
            ? "border-primary bg-primary/10 text-foreground"
            : isPending
              ? "border-primary bg-primary/5 text-foreground"
              : "border-border bg-background text-foreground hover:bg-muted",
        )}
      >
        <Icon aria-hidden className="size-4 shrink-0 text-primary" />
        <span className="min-w-0 flex-1">
          <span className="block text-xs font-bold [overflow-wrap:anywhere]">
            {display.label}
          </span>
          <span className="block text-[11px] leading-snug text-muted-foreground [overflow-wrap:anywhere]">
            {display.tagline}
            {strategy.primaryOutputIsPro ? " · Pro output" : ""}
          </span>
        </span>
        {isPending ? (
          <span className="shrink-0 rounded-full border border-primary/30 bg-primary/10 px-2 py-1 text-[10px] font-bold text-primary">
            Review
          </span>
        ) : isActive ? (
          <span className="shrink-0 rounded-full bg-primary px-2 py-1 text-[10px] font-bold text-primary-foreground">
            Selected
          </span>
        ) : null}
      </button>
    );
  };

  const renderGroup = (
    label: string,
    strategies: InvestorStrategy[],
    description?: string,
  ) => {
    const labelId = `${panelId}-${label.toLowerCase().replaceAll(/[^a-z]+/g, "-")}`;
    return (
      <div role="group" aria-labelledby={labelId} className="space-y-2">
        <div>
          <p
            id={labelId}
            className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground"
          >
            {label}
          </p>
          {description ? (
            <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
              {description}
            </p>
          ) : null}
        </div>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {strategies.map(renderStrategy)}
        </div>
      </div>
    );
  };

  return (
    <div className="rounded-xl border border-border bg-card px-3 py-2.5 shadow-sm sm:px-4">
      <div className="flex min-h-11 flex-wrap items-center justify-between gap-x-3 gap-y-1">
        <p className="flex min-w-0 flex-1 basis-[9rem] flex-wrap items-center gap-1.5 text-sm text-foreground">
          <span className="shrink-0 text-muted-foreground">Analysis type:</span>
          <span className="inline-flex min-w-0 items-center gap-1.5 font-bold">
            <ActiveIcon aria-hidden className="size-4 shrink-0 text-primary" />
            <span className="break-words [overflow-wrap:anywhere]">
              {activeDisplay.label}
            </span>
          </span>
          {active.productStage !== "core" ? (
            <span className="hidden shrink-0 rounded-full bg-muted px-2 py-0.5 text-[10px] font-bold text-muted-foreground sm:inline">
              {active.productStage === "advanced-beta"
                ? "Advanced / Beta"
                : "Secondary"}
            </span>
          ) : null}
        </p>
        <button
          ref={disclosureButtonRef}
          type="button"
          aria-label={`${expanded ? "Close" : "Change"} analysis type. Current: ${activeDisplay.label}`}
          aria-expanded={expanded}
          aria-controls={expanded ? panelId : undefined}
          onClick={() => {
            if (expanded) {
              collapseAndRestoreFocus();
            } else {
              setExpanded(true);
            }
          }}
          className="ml-auto inline-flex min-h-11 shrink-0 items-center rounded-lg px-3 text-xs font-bold text-primary underline-offset-2 hover:bg-muted hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          {expanded ? "Done" : "Change"}
        </button>
      </div>

      {activeKey && active.productStage !== "core" ? (
        <div
          role="note"
          className="mt-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-[11px] leading-relaxed text-foreground"
        >
          <span className="font-bold">{activeDisplay.label} mode.</span>{" "}
          {active.focusHint}
          {active.limitation ? (
            <span className="mt-1 block text-muted-foreground">
              Verify independently: {active.limitation}
            </span>
          ) : null}
          {active.primaryOutputIsPro ? (
            <span className="mt-1 block font-medium text-foreground">
              The headline {activeDisplay.label} model is a Pro feature. The
              free run still shows cash flow, cap rate, and DSCR.
            </span>
          ) : null}
        </div>
      ) : null}

      {expanded ? (
        <div
          id={panelId}
          role="region"
          aria-label="Choose analysis type"
          className="mt-3 space-y-4 border-t border-border pt-3"
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              event.preventDefault();
              collapseAndRestoreFocus();
            }
          }}
        >
          <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-[11px] leading-relaxed text-foreground">
            <span className="font-bold">
              Changing analysis type can change your property model and apply
              starter assumptions.
            </span>{" "}
            Review every changed value before running the analysis. Returning to
            Buy &amp; Hold lets you keep current assumptions or restore the
            pre-strategy values when available.
          </p>

          {pendingStrategy ? (
            <div
              role="region"
              aria-live="polite"
              aria-labelledby={confirmationTitleId}
              className="rounded-xl border border-primary/30 bg-primary/5 p-3 sm:p-4"
            >
              <h3
                id={confirmationTitleId}
                className="text-sm font-extrabold text-foreground"
              >
                Switch to {strategyDisplay(pendingStrategy).label}?
              </h3>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                Choose what TrueCap should do with the assumptions already in
                this deal. Nothing changes until you confirm.
              </p>

              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                <button
                  ref={keepAssumptionsButtonRef}
                  type="button"
                  onClick={() => confirmStrategyChange("keep")}
                  className="min-h-11 rounded-xl border border-primary bg-primary px-3 py-2 text-left text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  <span className="flex items-center justify-between gap-2 text-xs font-extrabold">
                    Keep my assumptions
                    <span className="rounded-full bg-primary-foreground/15 px-2 py-0.5 text-[10px] font-bold">
                      Recommended
                    </span>
                  </span>
                  <span className="mt-1 block text-[11px] leading-snug text-primary-foreground/85">
                    Keep financing, expenses, growth, and tax inputs. Only
                    model-required fields may change.
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() =>
                    confirmStrategyChange(
                      pendingStrategy.key === DEFAULT_STRATEGY_KEY
                        ? canRestoreAssumptions
                          ? "restore"
                          : "starter"
                        : "starter",
                    )
                  }
                  className="min-h-11 rounded-xl border border-border bg-background px-3 py-2 text-left text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  <span className="text-xs font-extrabold">
                    {pendingStrategy.key === DEFAULT_STRATEGY_KEY
                      ? canRestoreAssumptions
                        ? "Restore pre-strategy assumptions"
                        : "Apply Buy & Hold starter values"
                      : "Apply strategy starter values"}
                  </span>
                  <span className="mt-1 block text-[11px] leading-snug text-muted-foreground">
                    {pendingStrategy.key === DEFAULT_STRATEGY_KEY
                      ? canRestoreAssumptions
                        ? "Return shared fields to the values captured before the specialist strategy was applied."
                        : "No earlier browser snapshot is available. Replace shared assumptions with the Buy & Hold starter set."
                      : (() => {
                          const preview = getStarterChangePreview?.(
                            pendingStrategy.key,
                          );
                          if (!preview) {
                            return "Replace shared assumptions with this strategy's starter set.";
                          }
                          if (preview.changedFieldCount === 0) {
                            return "The starter values already match your current assumptions.";
                          }
                          const details = preview.highlights.join(" · ");
                          const remainder =
                            preview.changedFieldCount -
                            preview.highlights.length;
                          return `${preview.changedFieldCount} fields would change${details ? `: ${details}` : ""}${remainder > 0 ? ` · +${remainder} more` : ""}.`;
                        })()}
                  </span>
                </button>
              </div>

              <button
                type="button"
                onClick={() => {
                  setPendingStrategy(null);
                  requestAnimationFrame(() =>
                    disclosureButtonRef.current?.focus(),
                  );
                }}
                className="mt-2 inline-flex min-h-11 items-center rounded-lg px-3 text-xs font-bold text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                Cancel
              </button>
            </div>
          ) : null}

          {renderGroup("Core", CORE_INVESTOR_STRATEGIES)}
          {renderGroup("Secondary", SECONDARY_INVESTOR_STRATEGIES)}
          {renderGroup(
            "Advanced / Beta strategies",
            ADVANCED_INVESTOR_STRATEGIES.filter((strategy) =>
              isSpecialistStrategyEnabled(strategy.key),
            ),
            "Advanced strategy screens are secondary aids. Their market, lender, operating, regulatory, and exit assumptions require separate evidence.",
          )}
        </div>
      ) : null}
    </div>
  );
}
