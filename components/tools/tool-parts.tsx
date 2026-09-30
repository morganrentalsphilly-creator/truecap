/**
 * Calculator parts (DESIGN.md "Components"): the pieces a free calculator's
 * page and widget are set from, first used on /tools/1-percent-rule-calculator
 * and meant for the other calculators as they convert. Presentational only:
 * no hooks, no copy. Every word arrives as a prop or as children from the
 * page or widget, so the copy guards that scan app/tools and the widget
 * sources keep reading it where it is written.
 *
 * - ToolFrame: the widget's shell. A printed object on the 2px ink rule, no
 *   card, fill, radius or shadow. The same widget renders inside the
 *   /embed/<slug> iframe page, so it brings its own layout and never relies
 *   on a page Section; `@container` lets its grids size off the frame's own
 *   width (the hero column, a full-width phone, a partner's iframe) instead
 *   of the viewport's.
 * - ToolResult: the calculator's one result. A sentence-case label, the key
 *   figure in DM Mono over the ledger's double rule (LedgerTotal, no draw:
 *   the homepage keeps the site's one motion), then the verdict and a note.
 *   The figure is in ink; green and orange belong to the verdict, and only
 *   when it is a pass or miss against a rule (LedgerVerdict).
 * - ToolFormula: a formula printed between rules (2px ink above, the rule
 *   below), DM Mono at 500, left-aligned, with an optional worked example.
 *   `not-prose`, so it keeps its own type inside an article body.
 */

import type { ComponentProps, ReactNode } from "react";
import { LedgerTotal } from "@/components/ledger/ledger-parts";
import { cn } from "@/lib/utils";

export function ToolFrame({
  children,
  className,
  ...props
}: {
  children: ReactNode;
  className?: string;
} & Omit<ComponentProps<"section">, "className" | "children">) {
  return (
    <section
      className={cn("@container min-w-0 border-t-2 border-foreground pt-5", className)}
      {...props}
    >
      {children}
    </section>
  );
}

export function ToolResult({
  label,
  figure,
  pending = false,
  verdict,
  note,
  className,
}: {
  /** The figure's name, sentence case ("Rent / price"). */
  label: ReactNode;
  /**
   * The figure and its unit as ONE string ("1.05%"), or the placeholder.
   * One text node on purpose: the e2e specs find the result by its exact
   * text, and a unit split into its own element no longer matches.
   */
  figure: string;
  /** No result yet: the placeholder in Ink 2. */
  pending?: boolean;
  /** A pass or miss against a rule, set with LedgerVerdict; omit without a result. */
  verdict?: ReactNode;
  /** The line under the verdict, in Ink 2. */
  note?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("min-w-0", className)}>
      <p className="text-sm leading-snug font-semibold text-foreground">{label}</p>
      {/* The color sits on the line, not on LedgerTotal: cn (tailwind-merge)
          reads the custom text-key-sm as a text color, so a color class
          merged beside it would silently drop the phone size. The double
          rule draws in currentColor, so it takes the same ink.
          wrap-anywhere: an absurd input (rent in the billions over a $1
          price) gives a figure wider than a phone; it wraps inside the
          frame instead of pushing the page (or a partner's iframe) sideways. */}
      <p
        className={cn(
          "mt-3 wrap-anywhere",
          pending ? "text-muted-foreground" : "text-foreground",
        )}
      >
        <LedgerTotal className="text-key-sm sm:text-key">{figure}</LedgerTotal>
      </p>
      {verdict ? <p className="mt-4 text-base">{verdict}</p> : null}
      {note ? (
        <p className="mt-2 max-w-[46ch] text-pretty text-base leading-relaxed text-muted-foreground">
          {note}
        </p>
      ) : null}
    </div>
  );
}

export function ToolFormula({
  formula,
  example,
  className,
}: {
  /** The rule or formula itself, set in DM Mono. */
  formula: ReactNode;
  /** A worked example under it, in the text face. */
  example?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "not-prose my-8 border-t-2 border-b border-t-foreground border-b-border py-4",
        className,
      )}
    >
      <p className="font-mono text-base font-medium sm:text-lg">{formula}</p>
      {example ? (
        <p className="mt-2 text-pretty text-base leading-relaxed text-muted-foreground">
          {example}
        </p>
      ) : null}
    </div>
  );
}
