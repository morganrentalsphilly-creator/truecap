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
// The hero ledger sits in half the page between 1024 and 1279px, so its
// figure columns step down to 9rem there and return to 13rem from xl, where
// it gets 7/12.
export const LEDGER_FIGURE_COLUMN = "w-[5.5rem] sm:w-40 lg:w-36 xl:w-52";
// The walkthrough runs the full page width, so it keeps 13rem from lg. Its
// group rows (a grid) and their sub-rows (tables) share these widths so the
// figures line up.
export const LEDGER_WIDE_FIGURE_COLUMN = "w-[5.5rem] sm:w-40 lg:w-52";
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

/**
 * The disclosure mark for <details> rows, shared by the ledger and the FAQ:
 * a plus when closed, a minus when open, one stroke, sized to the text. The
 * parent <details> needs the `group` class.
 */
export function DisclosureMark({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 16 16"
      className={cn("size-4 shrink-0", className)}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
    >
      <path d="M2 8h12" />
      <path d="M8 2v12" className="group-open:hidden" />
    </svg>
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
      <span className="text-base font-semibold">{title}</span>
      {note ? (
        <span className="text-sm text-muted-foreground">
          {note}
        </span>
      ) : null}
    </figcaption>
  );
}
