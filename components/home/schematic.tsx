/**
 * The property as a line schematic (DESIGN.md "The homepage", Blueprint): a
 * house drawn in graphite, rent flowing in on the left in green, the mortgage
 * and the operating costs flowing out on the right in red, and the cash flow
 * landing under the house on a dashed leader. Every label is a figure from
 * the engine's sample-deal sweep; nothing is typed.
 *
 * Set as HTML on a grid, not as text inside a scaled SVG: the labels are real
 * text at the page's sizes (nothing below 12px at any width) and the three
 * flows are live figures the caller renders (AnimatedNumber), so the drawing
 * answers as the price moves. Only the house and the arrows are SVG, at fixed
 * sizes. From 640px the grid is rent · arrow · house · arrows · costs with
 * the landing figure under the house; below that it stacks in the order of
 * the arithmetic: rent, the house, the two cost rows, the cash flow.
 *
 * Pure markup, no hooks, so the price scrubber island can render it with the
 * live figures and the server can render it alone.
 */

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** A flow's arrow: a stroked line and chevron, so a heavier weight thickens both. */
function Arrow({ tone, heavy = false, className }: { tone: "in" | "out"; heavy?: boolean; className?: string }) {
  return (
    <svg
      viewBox="0 0 48 16"
      aria-hidden
      className={cn("h-4 w-12 shrink-0", tone === "in" ? "text-positive" : "text-negative", className)}
    >
      <path
        d="M2 8 H40 M34 2 L41 8 L34 14"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={cn(
          "transition-[stroke-width] duration-[var(--duration-fast)] ease-[var(--ease-out)] motion-reduce:transition-none",
          heavy ? "stroke-3" : "stroke-2",
        )}
      />
    </svg>
  );
}

/**
 * One flow: its label, its figure and its source line. On phones a ruled row
 * (label and source on the left, the figure on the right); from 640px a block
 * reading label, figure, source.
 */
function Flow({
  label,
  figure,
  source,
  tone,
  align = "left",
  className,
}: {
  label: string;
  figure: ReactNode;
  source: ReactNode;
  tone: "in" | "out";
  align?: "left" | "right";
  className?: string;
}) {
  return (
    <div
      className={cn(
        "grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-x-3 border-b border-rule-soft py-2 sm:block sm:border-b-0 sm:py-0",
        align === "right" && "sm:text-right",
        className,
      )}
    >
      <span className="col-start-1 row-start-1 text-sm font-semibold sm:block">{label}</span>
      <span
        className={cn(
          "col-start-2 row-start-1 row-span-2 self-center font-figure text-lg font-semibold sm:mt-0.5 sm:block sm:text-xl",
          tone === "in" ? "text-positive" : "text-negative",
        )}
      >
        {figure}
      </span>
      <span className="col-start-1 row-start-2 block text-xs sm:mt-0.5">{source}</span>
    </div>
  );
}

export function Schematic({
  rent,
  rate,
  downPaymentPct,
  bedrooms,
  mortgageLabel,
  operatingLabel,
  cashFlowLabel,
  aboveCeiling = false,
  className,
}: {
  /** "$3,050/mo" */
  rent: string;
  /** "6.6%" */
  rate: string;
  /** "20%" */
  downPaymentPct: string;
  bedrooms: number;
  /** The mortgage out, rendered by the caller (so it can animate); null when the sweep has no figure for it. */
  mortgageLabel: ReactNode | null;
  /** Taxes, insurance, vacancy, upkeep and reserves out, rendered by the caller; null when the sweep has no figure for it. */
  operatingLabel: ReactNode | null;
  /** The landing figure, rendered by the caller (so it can animate). */
  cashFlowLabel: ReactNode;
  /** The price on the handle sits above the Offer Ceiling: the out-flows weigh more. */
  aboveCeiling?: boolean;
  className?: string;
}) {
  return (
    <div
      role="group"
      aria-label="The sample deal as a flow: rent in, the mortgage and the operating costs out, and the cash flow after reserves at the bottom"
      className={cn(
        "grid grid-cols-1 sm:grid-cols-[minmax(0,1fr)_auto_auto_auto_minmax(0,1fr)] sm:items-center sm:gap-x-2 sm:gap-y-3",
        className,
      )}
    >
      {/* Rent in. */}
      <Flow
        label="Rent in"
        figure={rent}
        source={<span className="font-mono text-muted-foreground">HUD FMR · {bedrooms} bed · replace with comps</span>}
        tone="in"
        align="right"
        className="sm:col-start-1 sm:row-span-2 sm:row-start-1 sm:self-center"
      />
      <Arrow tone="in" className="hidden sm:col-start-2 sm:row-span-2 sm:row-start-1 sm:block sm:self-center" />

      {/* The house. */}
      <div className="py-3 sm:col-start-3 sm:row-span-2 sm:row-start-1 sm:self-center sm:py-0">
        <svg viewBox="0 0 120 136" aria-hidden className="mx-auto h-auto w-24 sm:w-28">
          <path
            className="fill-none stroke-foreground"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M0 68 L60 18 L120 68 M10 68 V133 H110 V68 M50 133 V98 H70 V133 M75 83 h20 v18 h-20z M80 18 V4 H92 V28"
          />
        </svg>
      </div>

      {/* Mortgage out. */}
      <Arrow tone="out" heavy={aboveCeiling} className="hidden sm:col-start-4 sm:row-start-1 sm:block sm:self-center" />
      <Flow
        label="Mortgage out"
        figure={mortgageLabel}
        source={
          <span className="font-mono text-muted-foreground">
            FRED rate {rate} · {downPaymentPct} down
          </span>
        }
        tone="out"
        className="sm:col-start-5 sm:row-start-1"
      />

      {/* Taxes, insurance, reserves out. */}
      <Arrow tone="out" heavy={aboveCeiling} className="hidden sm:col-start-4 sm:row-start-2 sm:block sm:self-center" />
      <Flow
        label="Tax, insurance, reserves"
        figure={operatingLabel}
        source={<span className="font-semibold text-highlight-text">Property tax: your input</span>}
        tone="out"
        className="sm:col-start-5 sm:row-start-2"
      />

      {/* Cash flow lands, under the house, on a dashed leader. */}
      <div className="pt-3 text-center sm:col-span-5 sm:col-start-1 sm:row-start-3 sm:pt-0">
        <span aria-hidden className="mx-auto mb-1 block h-5 w-px border-l border-dashed border-primary" />
        <span className="block text-sm font-semibold">Cash flow after reserves</span>
        <span className="block font-figure text-lg font-bold sm:text-xl">{cashFlowLabel}</span>
      </div>
    </div>
  );
}
