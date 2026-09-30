/**
 * Page parts for the marketing rollout (DESIGN.md "Components"): the blocks
 * the persona, pricing, comparison, proof and content pages repeat, set once
 * on the homepage's grammar so ~50 pages stop hand-rolling their own. Server
 * components; each is a thin arrangement of tokens and the Section wrapper.
 *
 * - PageHero: a page's H1 in the display voice, its lede, actions and the
 *   risk line, with an optional aside (a ProductShot, a ledger) in the wider
 *   column from 1024px, on the homepage hero's 5/7 grid (or, for a narrow
 *   phone capture, a fixed column on the container's right edge).
 * - RuledList: term and detail rows on rules instead of a grid of cards (the
 *   "What your client receives" pattern), one or two columns.
 * - StepList: a real sequence, numbered in DM Mono on rules.
 * - ActionRow: the primary and secondary actions side by side.
 * - Note: a ruled aside for a caveat or a boundary statement, instead of a
 *   tinted box.
 * - CloseSection: the page's closing ask on the heavy rule (FinalCta's
 *   grammar), stacked for buttons or split for a block such as a price table.
 */

import { Fragment, isValidElement, type ComponentProps, type ReactNode } from "react";
import { PAGE_CONTAINER, Section, SectionHeading } from "@/components/marketing/section";
import { cn } from "@/lib/utils";

/**
 * The hero's two columns from 1024px, when it has an aside. "wide": the
 * homepage's 5/7 grid, for an aside that fills the wide column (a ledger, a
 * desktop capture). "shot": the text takes the room and the aside a fixed
 * 306px column (19.125rem, a 612px-wide 2x phone capture at full size) on
 * the container's right edge, so a narrow raster neither floats mid-column
 * nor squeezes the H1 into the 5fr column.
 */
const HERO_ASIDE_COLUMNS = {
  wide: "lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]",
  shot: "lg:grid-cols-[minmax(0,1fr)_19.125rem]",
} as const;

export function PageHero({
  title,
  lede,
  actions,
  note,
  aside,
  asideWidth = "wide",
  children,
  className,
  ...props
}: {
  title: ReactNode;
  lede?: ReactNode;
  /** An ActionRow, or the page's own form. */
  actions?: ReactNode;
  /** The risk line under the actions ("Free. No card."). */
  note?: ReactNode;
  /** Set in the right column from 1024px; follows the text on phones. */
  aside?: ReactNode;
  /** The aside's column from 1024px (see HERO_ASIDE_COLUMNS). */
  asideWidth?: keyof typeof HERO_ASIDE_COLUMNS;
  /** Extra content under the note (an audience cue on its soft rule). */
  children?: ReactNode;
  className?: string;
} & Omit<ComponentProps<"section">, "title" | "className" | "children">) {
  return (
    // data-page-hero: the hero's bottom rule is the one rule under it; a ruled
    // Section that follows drops its own (components/marketing/section.tsx).
    <section data-page-hero="" className={cn("border-b border-border bg-background", className)} {...props}>
      <div
        className={cn(
          PAGE_CONTAINER,
          "grid grid-cols-[minmax(0,1fr)] gap-x-12 gap-y-10 pb-12 pt-6 sm:pb-16 sm:pt-10 lg:pb-18 lg:pt-12 xl:gap-x-16",
          aside ? `${HERO_ASIDE_COLUMNS[asideWidth]} lg:items-start` : null,
        )}
      >
        <div className={cn("min-w-0", aside ? null : "max-w-3xl")}>
          <h1 className="font-display hyphens-auto break-words text-balance text-display-sm text-foreground lg:text-display">
            {title}
          </h1>
          {typeof lede === "string" ? (
            <p className="mt-4 max-w-[52ch] text-pretty text-lg leading-normal text-foreground sm:mt-5">{lede}</p>
          ) : lede ? (
            <div className="mt-4 max-w-[52ch] text-pretty text-lg leading-normal text-foreground sm:mt-5">
              {lede}
            </div>
          ) : null}
          {actions ? <div className="mt-6 sm:mt-7">{actions}</div> : null}
          {note ? <p className="mt-3 text-sm text-muted-foreground">{note}</p> : null}
          {children}
        </div>
        {aside ? <div className="min-w-0 lg:pt-1.5">{aside}</div> : null}
      </div>
    </section>
  );
}

/** The primary action first, then the secondary; stacked full width on phones. */
export function ActionRow({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn("flex flex-col items-stretch gap-3 sm:flex-row sm:flex-wrap sm:items-center", className)}>
      {children}
    </div>
  );
}

export type RuledListItem = { term: ReactNode; detail?: ReactNode; key?: string };

export function RuledList({
  items,
  columns = 1,
  className,
}: {
  items: readonly RuledListItem[];
  /** 2: two columns from 640px, rows ruled in each. */
  columns?: 1 | 2;
  className?: string;
}) {
  return (
    <dl
      className={cn(
        "border-t-2 border-foreground",
        columns === 2 && "grid sm:grid-cols-2 sm:gap-x-12",
        className,
      )}
    >
      {items.map((item, index) => (
        <div key={item.key ?? index} className="border-b border-rule-soft py-4">
          {/* A term is a row heading (balanced); a detail is body (pretty):
              neither leaves one word alone on its last line. */}
          <dt className="text-balance text-lg font-semibold">{item.term}</dt>
          {item.detail ? (
            <dd className="mt-1 max-w-[64ch] text-pretty text-base leading-relaxed text-muted-foreground">
              {item.detail}
            </dd>
          ) : null}
        </div>
      ))}
    </dl>
  );
}

/** Only for a real sequence (DESIGN.md: structure encodes something true). */
export function StepList({ steps, className }: { steps: readonly ReactNode[]; className?: string }) {
  return (
    // role="list": Safari drops list semantics from a list-style:none list,
    // and the step count is part of what a real sequence tells you.
    <ol role="list" className={cn("max-w-[68ch] border-t-2 border-foreground", className)}>
      {steps.map((step, index) => (
        // items-baseline: the 16px numeral sits on the first line of the 18px
        // step, not at the top of its taller line box.
        <li key={index} className="flex items-baseline gap-4 border-b border-rule-soft py-4">
          <span aria-hidden className="w-6 shrink-0 font-mono text-base tabular-nums text-muted-foreground">
            {index + 1}
          </span>
          <span className="min-w-0 text-pretty text-lg leading-relaxed">{step}</span>
        </li>
      ))}
    </ol>
  );
}

/**
 * A caveat or boundary statement, set on a rule rather than in a tinted box.
 * The 1px rule, not the 2px ink rule: a caveat qualifies what is above it, it
 * does not open a ledger or a section (DESIGN.md "Rules carry the structure").
 *
 * One rule per boundary: straight after a list of FAQ rows (an element whose
 * last child is a <details>, as in ComparisonFaq on every /vs page), whose
 * last row already closes on the 1px rule, the note drops its own, so the
 * two do not read as a stray double rule 40px apart.
 */
const AFTER_FAQ_ROWS = "[:has(>details:last-child)+&]:border-t-0";

export function Note({
  title,
  children,
  className,
}: {
  title?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <aside className={cn("max-w-[68ch] border-t border-border pt-3", AFTER_FAQ_ROWS, className)}>
      {title ? <p className="text-base font-semibold">{title}</p> : null}
      <div className={cn("text-pretty text-base leading-relaxed text-muted-foreground", title && "mt-1")}>
        {children}
      </div>
    </aside>
  );
}

/**
 * The page's closing ask on the heavy rule, in one of two layouts:
 *
 * - "stack", for a close whose actions are buttons: the heading, the lede and
 *   then the actions in one left-aligned reading column, the way PageHero
 *   sets its actions under its lede and the homepage sets "Built by a rental
 *   investor". A button row cannot fill the 7fr column that the homepage's
 *   address field fills (FinalCta); set there, it floats in empty paper.
 * - "split", for a close that carries a block beside the case (the
 *   /for-agents price table): the hero's 5/7 grid with the hero's gaps, both
 *   columns from the top, so the heading sits level with the heavy rule that
 *   opens the block beside it and the columns land on the hero's.
 *
 * By default a fragment of actions (a composed block: the /for-agents table
 * and its buttons) is "split" and a single element (an ActionRow, one
 * button) is "stack"; `layout` overrides it.
 *
 * The close is the last section before SiteFooter, whose 48px top margin
 * stacks on the section's bottom padding; the close gives that margin back
 * (pb-6 / sm:pb-12), so its ask sits centered in its band, not high in it.
 */
export function CloseSection({
  heading,
  headingId,
  lede,
  actions,
  children,
  layout,
}: {
  heading: ReactNode;
  headingId: string;
  lede?: ReactNode;
  actions: ReactNode;
  children?: ReactNode;
  layout?: "stack" | "split";
}) {
  const resolved = layout ?? (isValidElement(actions) && actions.type === Fragment ? "split" : "stack");
  const theCase = (
    <>
      <SectionHeading id={headingId}>{heading}</SectionHeading>
      {lede ? (
        <p className="mt-4 max-w-[56ch] text-pretty text-lg leading-relaxed text-muted-foreground">{lede}</p>
      ) : null}
    </>
  );
  return (
    <Section rule="heavy" aria-labelledby={headingId} containerClassName="pb-6 sm:pb-12">
      {resolved === "stack" ? (
        <div data-close-layout="stack" className="max-w-[68ch]">
          {theCase}
          <div className="mt-6 sm:mt-7">
            {actions}
            {children}
          </div>
        </div>
      ) : (
        <div
          data-close-layout="split"
          className="grid gap-x-12 gap-y-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:items-start xl:gap-x-16"
        >
          <div className="min-w-0">{theCase}</div>
          <div className="min-w-0">
            {actions}
            {children}
          </div>
        </div>
      )}
    </Section>
  );
}
