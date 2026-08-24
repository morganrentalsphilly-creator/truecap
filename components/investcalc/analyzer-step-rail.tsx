"use client";

/**
 * AnalyzerStepRail (AN-1) - a sticky orientation rail across the top of the
 * analyzer that shows the investor where they are in the flow, what's done,
 * and lets them jump to any section. It is purely additive navigation: it does
 * not gate inputs, change validation, or alter the manual "Run analysis" flow.
 *
 * Status comes from lib/analyzer-steps.ts (pure + tested). Navigation is
 * delegated to the parent via onNavigate so the parent can open the collapsed
 * "advanced" block before scrolling to Financing / Expenses.
 */

import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import type { AnalyzerStep, AnalyzerStepId, StepStatus } from "@/lib/analyzer-steps";

const STATUS_A11Y: Record<StepStatus, string> = {
  complete: "complete",
  partial: "in progress",
  empty: "not started",
  pending: "awaiting analysis",
};

function StepIndicator({
  status,
  index,
}: {
  status: StepStatus;
  index: number;
}) {
  // No active ring on the dot. The active step is signalled by the button's
  // pill (background + bold label) and aria-current — a translucent same-hue
  // ring with no offset muddied the filled green disc. (Flicker stabilization
  // lives on the sticky <nav> via will-change-transform, not here.)
  if (status === "complete") {
    return (
      <span
        aria-hidden
        className="flex size-5 shrink-0 items-center justify-center rounded-full bg-[var(--brand-green)] text-white"
      >
        <Check className="size-3" strokeWidth={3} />
      </span>
    );
  }
  return (
    <span
      aria-hidden
      className={cn(
        "flex size-5 shrink-0 items-center justify-center rounded-full border text-[10px] font-bold tabular-nums",
        status === "partial" && "border-[var(--brand-orange)] text-[var(--brand-orange)]",
        status === "pending" && "border-dashed border-muted-foreground/40 text-muted-foreground",
        status === "empty" && "border-border text-muted-foreground"
      )}
    >
      {index}
    </span>
  );
}

export function AnalyzerStepRail({
  steps,
  activeStepId = null,
  onNavigate,
  className,
}: {
  steps: AnalyzerStep[];
  activeStepId?: AnalyzerStepId | null;
  onNavigate: (id: AnalyzerStepId) => void;
  className?: string;
}) {
  return (
    <nav
      aria-label="Analyzer steps"
      // Solid background — intentionally NO backdrop-blur. A backdrop-filter
      // on this sticky container forced the subtree onto a separate GPU
      // raster layer, which intermittently squared off the rounded-full step
      // dots (a white notch punched into the green disc, visible after a
      // refresh). A solid card fill renders the dots cleanly and is more
      // legible over scrolling content anyway.
      //
      // will-change-transform keeps this STICKY rail on its own stable
      // compositor layer. Without it, the rail repaints as the page scrolls
      // and the tiny rounded-full dots get re-rasterized at fractional
      // sub-pixel positions each paint — their antialiased edges shimmer.
      // will-change (a promotion hint, not an actual transform) avoids the
      // containing-block side effects that a real `transform` would impose on
      // sticky positioning, and — unlike backdrop-filter — honours the dots'
      // border-radius, so the rasterize-once-then-composite path stays clean.
      className={cn(
        "rounded-2xl border border-border bg-card px-2 py-1.5 shadow-sm will-change-transform",
        className
      )}
    >
      <ol className="flex flex-wrap items-center gap-1">
        {steps.map((step, i) => {
          const active = step.id === activeStepId;
          return (
            <li key={step.id} className="shrink-0">
              <button
                type="button"
                onClick={() => onNavigate(step.id)}
                aria-current={active ? "step" : undefined}
                aria-label={`${step.label} - ${STATUS_A11Y[step.status]}`}
                className={cn(
                  "flex min-h-11 items-center gap-1.5 rounded-xl px-2 py-1.5 text-xs font-semibold transition-colors sm:px-2.5",
                  active
                    ? "bg-[var(--brand-green-light)] text-[var(--brand-green)]"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <StepIndicator status={step.status} index={i + 1} />
                <span className="whitespace-nowrap">{step.label}</span>
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
