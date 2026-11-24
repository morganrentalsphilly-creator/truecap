/**
 * Calculator parts (DESIGN.md "Components"): the pieces a free calculator's
 * page and widget are set from, first used on /tools/1-percent-rule-calculator
 * and meant for the other calculators as they convert. Presentational only:
 * no hooks, no copy. Every word arrives as a prop or as children from the
 * page or widget, so the copy guards that scan app/tools and the widget
 * sources keep reading it where it is written.
 *
 * - ToolFrame: the widget's shell. An instrument the visitor acts on, so a
 *   card: white, 1px line, the object radius, the rest shadow (DESIGN.md
 *   "Card"). The same widget renders inside the
 *   /embed/<slug> iframe page, so it brings its own layout and never relies
 *   on a page Section; `@container` lets its grids size off the frame's own
 *   width (the hero column, a full-width phone, a partner's iframe) instead
 *   of the viewport's.
 * - ToolResult: the calculator's one result. A sentence-case label on the
 *   2px graphite rule (the one place it survives: under a key figure's label
 *   row), the key figure in the display face (LedgerTotal, no draw: the
 *   highlight is the Offer Ceiling's), then the verdict and a note.
 *   The figure is in ink; green and orange belong to the verdict, and only
 *   when it is a pass or miss against a rule (LedgerVerdict). The block is a
 *   polite live region, read whole (label, figure, verdict, note) when an
 *   edit changes it; the text is not duplicated for screen readers, because
 *   the e2e specs find the figure and the verdict by their one text node.
 *   `lead` sets it above the fields while the frame is one column (a phone,
 *   a narrow iframe), so the answer comes first; in the two-column frame it
 *   stays beside them. A widget that sets its own result block (it owns a
 *   separate status line) takes the same classes from TOOL_RESULT_LEAD_CLASS
 *   and its label from TOOL_RESULT_LABEL_CLASS.
 * - ToolFormula: a formula printed between two 1px lines, in the text face
 *   at 600, left-aligned, with an optional worked
 *   example. A formula written in words ("Monthly rent ≥ 1% of purchase
 *   price") is a sentence, not a figure to compare, so it stays out of DM
 *   Mono (DESIGN.md "The Ledger Rule"), where it read as code; and neither
 *   loaded latin subset carries "≥", so in the mono line the sign fell back
 *   to a face of another width and weight. `not-prose`, so it keeps its own
 *   type inside an article body.
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
      className={cn("@container min-w-0 rounded-lg border border-border bg-card p-5 shadow-sm sm:p-6", className)}
      {...props}
    >
      {children}
    </section>
  );
}

/**
 * The result's label row: sentence case, on the 2px graphite rule a key
 * figure keeps for its label.
 */
export const TOOL_RESULT_LABEL_CLASS =
  "border-b-2 border-foreground pb-2 text-sm leading-snug font-semibold text-foreground";

/**
 * A result that leads its frame while the frame is one column: first in the
 * visual order, closed by a 1px line over the fields, and back in source
 * order (no line) once the frame is 32rem wide and the widget's grid is two
 * columns. The parent must be a grid or flex container for `order` to apply.
 * Source order does not change, so reading and tab order do not either; keep
 * anything focusable out of a block that takes these.
 *
 * Every field sits under a block that leads, so its height must not change
 * as the visitor types: a field that moves under the thumb is a defect.
 * Either the block holds only the label and the figure (ARV, break-even), or
 * it reserves its tallest state while it leads (mortgage: `min-h-49
 * @lg:min-h-0`; closing cost: two lines for its note).
 */
export const TOOL_RESULT_LEAD_CLASS =
  "order-first border-b border-border pb-5 @lg:order-none @lg:border-b-0 @lg:pb-0";

export function ToolResult({
  label,
  figure,
  pending = false,
  lead = false,
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
  /**
   * Set the result above the fields in the one-column frame (see
   * TOOL_RESULT_LEAD_CLASS). For a widget that stacks enough fields to push
   * the answer off a phone's first screen. Do not also pass a top border in
   * `className`: the block is first, and closes on its own line.
   */
  lead?: boolean;
  /** A pass or miss against a rule, set with LedgerVerdict; omit without a result. */
  verdict?: ReactNode;
  /** The line under the verdict, in Ink 2. */
  note?: ReactNode;
  className?: string;
}) {
  return (
    <div
      aria-live="polite"
      aria-atomic="true"
      className={cn("min-w-0", lead && TOOL_RESULT_LEAD_CLASS, className)}
    >
      <p className={TOOL_RESULT_LABEL_CLASS}>{label}</p>
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
  /** The rule or formula itself, in the text face at 600. */
  formula: ReactNode;
  /** A worked example under it, in the text face. */
  example?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "not-prose my-8 border-y border-border py-4",
        className,
      )}
    >
      <p className="text-pretty text-lg font-semibold leading-snug">{formula}</p>
      {example ? (
        <p className="mt-2 text-pretty text-base leading-relaxed text-muted-foreground">
          {example}
        </p>
      ) : null}
    </div>
  );
}
