/**
 * Ledger primitives (DESIGN.md "Components"): the pieces the Verdict Ledger is
 * set from, shared by the homepage hero and its walkthrough and meant for the
 * app's decision summary next. Server components, no client JS.
 *
 * Ledger grammar: a heavy rule opens it, column heads sit on a rule, figures
 * are DM Mono tabular numerals right-aligned in fixed columns, soft rules
 * separate rows, the binding row sits on the band, and the one total carries a
 * double rule.
 */

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Figure column widths, shared by every ledger grid and table on a page. */
export const LEDGER_FIGURE_COLUMN = "w-[5.5rem] sm:w-40 lg:w-52";
export const LEDGER_GRID =
  "grid grid-cols-[minmax(0,1fr)_5.5rem_5.5rem] sm:grid-cols-[minmax(0,1fr)_10rem_10rem] lg:grid-cols-[minmax(0,1fr)_13rem_13rem]";

export function LedgerFigure({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <span className={cn("font-mono tabular-nums", className)}>{children}</span>
  );
}

/** Pass or miss against a target: the only green and orange in a ledger. */
export function LedgerVerdict({
  pass,
  children,
}: {
  pass: boolean;
  children: ReactNode;
}) {
  return (
    <span
      className={cn(
        "font-semibold",
        pass ? "text-positive" : "text-caution-text",
      )}
    >
      {children}
    </span>
  );
}

/**
 * The ledger's one total: its figure over a double rule. With `draw`, the rule
 * draws in once after the figure has painted (`ledger-rule-draw` in
 * globals.css); a page gets one such moment, and reduced motion shows it still.
 */
export function LedgerTotal({
  children,
  className,
  draw = false,
}: {
  children: ReactNode;
  className?: string;
  draw?: boolean;
}) {
  return (
    <span
      className={cn(
        "ledger-rule inline-block font-mono font-medium leading-none tabular-nums tracking-[-0.02em]",
        draw && "ledger-rule-draw",
        className,
      )}
    >
      {children}
    </span>
  );
}

/** Caption row on the heavy rule that opens a ledger. */
export function LedgerCaption({
  id,
  title,
  note,
  className,
}: {
  id?: string;
  title: ReactNode;
  note?: ReactNode;
  className?: string;
}) {
  return (
    <figcaption
      id={id}
      className={cn(
        "flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5 border-b-2 border-foreground pb-2.5",
        className,
      )}
    >
      <span className="text-[15px] font-semibold sm:text-base">{title}</span>
      {note ? (
        <span className="text-[13px] text-muted-foreground sm:text-sm">
          {note}
        </span>
      ) : null}
    </figcaption>
  );
}
