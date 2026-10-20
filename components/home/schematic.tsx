/**
 * The property as a line schematic (DESIGN.md "The homepage", Blueprint): a
 * house drawn in graphite, rent flowing in on the left in green, the mortgage
 * and the operating costs flowing out on the right in red, and the cash flow
 * landing under the house on a dashed leader. Every label is a figure from
 * the engine's sample-deal ledger; nothing is typed. Pure markup, no hooks,
 * so the price scrubber island can render it with the live cash flow and the
 * server can render it alone.
 */

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function Schematic({
  rent,
  rate,
  downPaymentPct,
  bedrooms,
  cashFlowLabel,
  className,
}: {
  /** "$3,050/mo" */
  rent: string;
  /** "6.6%" */
  rate: string;
  /** "20%" */
  downPaymentPct: string;
  bedrooms: number;
  /** The landing figure, rendered by the caller (so it can animate). */
  cashFlowLabel: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("relative", className)}>
      <svg
        viewBox="0 0 720 250"
        className="block h-auto w-full"
        role="img"
        aria-label="Rent flows into the property; the mortgage, taxes, insurance and reserves flow out; the cash flow after reserves lands at the bottom."
      >
        {/* The house. */}
        <path
          className="fill-none stroke-foreground"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M300 118 L360 68 L420 118 M310 118 V183 H410 V118 M350 183 V148 H370 V183 M375 133 h20 v18 h-20z M380 68 V54 H392 V78"
        />
        {/* The price dimension line over the roof. */}
        <path className="stroke-primary" strokeWidth="1" d="M300 34 H420 M300 28 V40 M420 28 V40" />
        <text x="360" y="24" textAnchor="middle" className="fill-muted-foreground font-mono" fontSize="12">
          price · drag below
        </text>
        {/* Rent in. */}
        <path
          className="fill-none stroke-success"
          strokeWidth="2.5"
          d="M166 92 C 226 92, 246 100, 296 106"
          markerEnd="url(#tc-arrow-in)"
        />
        <text x="60" y="80" className="fill-foreground" fontSize="13" fontWeight="600">
          Rent in
        </text>
        <text x="60" y="100" className="fill-success font-figure" fontSize="16" fontWeight="700">
          {rent}
        </text>
        <text x="60" y="116" className="fill-muted-foreground" fontSize="12">
          HUD FMR · {bedrooms} bed · replace with comps
        </text>
        {/* Mortgage out. */}
        <path
          className="fill-none stroke-negative"
          strokeWidth="2"
          d="M418 138 C 470 138, 490 118, 556 118"
          markerEnd="url(#tc-arrow-out)"
        />
        <text x="566" y="114" className="fill-foreground" fontSize="13" fontWeight="600">
          Mortgage out
        </text>
        <text x="566" y="130" className="fill-muted-foreground" fontSize="12">
          FRED rate {rate} · {downPaymentPct} down
        </text>
        {/* Taxes, insurance, reserves out. */}
        <path
          className="fill-none stroke-negative"
          strokeWidth="2"
          d="M418 166 C 470 166, 490 178, 556 178"
          markerEnd="url(#tc-arrow-out)"
        />
        <text x="566" y="174" className="fill-foreground" fontSize="13" fontWeight="600">
          Tax, insurance, reserves
        </text>
        <text x="566" y="190" className="fill-highlight-text" fontSize="12" fontWeight="600">
          Property tax: your input
        </text>
        {/* Cash flow lands. */}
        <path className="fill-none stroke-primary" strokeWidth="1.25" strokeDasharray="4 3" d="M360 183 V222" />
        <text x="360" y="240" textAnchor="middle" className="fill-foreground" fontSize="13" fontWeight="600">
          Cash flow after reserves
        </text>
        <defs>
          <marker id="tc-arrow-in" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
            <path d="M0 0 L10 5 L0 10z" className="fill-success" />
          </marker>
          <marker id="tc-arrow-out" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
            <path d="M0 0 L10 5 L0 10z" className="fill-negative" />
          </marker>
        </defs>
      </svg>
      {/* The landing figure sits in HTML under the SVG's leader, so it can be
          a live, animated number and real text. */}
      <p className="-mt-1 text-center font-figure text-lg font-bold sm:text-xl">{cashFlowLabel}</p>
    </div>
  );
}
