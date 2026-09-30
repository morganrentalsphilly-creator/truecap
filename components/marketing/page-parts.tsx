/**
 * Page parts for the marketing rollout (DESIGN.md "Components"): the blocks
 * the persona, pricing, comparison, proof and content pages repeat, set once
 * on the homepage's grammar so ~50 pages stop hand-rolling their own. Server
 * components; each is a thin arrangement of tokens and the Section wrapper.
 *
 * - PageHero: a page's H1 in the display voice, its lede, actions and the
 *   risk line, with an optional aside (a ProductShot, a ledger) in the wider
 *   column from 1024px, on the homepage hero's 5/7 grid.
 * - RuledList: term and detail rows on rules instead of a grid of cards (the
 *   "What your client receives" pattern), one or two columns.
 * - StepList: a real sequence, numbered in DM Mono on rules.
 * - ActionRow: the primary and secondary actions side by side.
 * - Note: a ruled aside for a caveat or a boundary statement, instead of a
 *   tinted box.
 * - CloseSection: the page's closing ask on the heavy rule (FinalCta's form).
 */

import type { ComponentProps, ReactNode } from "react";
import { PAGE_CONTAINER, Section, SectionHeading } from "@/components/marketing/section";
import { cn } from "@/lib/utils";

export function PageHero({
  title,
  lede,
  actions,
  note,
  aside,
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
  /** Set in the wider right column from 1024px; follows the text on phones. */
  aside?: ReactNode;
  /** Extra content under the note (an audience cue on its soft rule). */
  children?: ReactNode;
  className?: string;
} & Omit<ComponentProps<"section">, "title" | "className" | "children">) {
  return (
    <section className={cn("border-b border-border bg-background", className)} {...props}>
      <div
        className={cn(
          PAGE_CONTAINER,
          "grid grid-cols-[minmax(0,1fr)] gap-x-12 gap-y-10 pb-12 pt-6 sm:pb-16 sm:pt-10 lg:pb-18 lg:pt-12 xl:gap-x-16",
          aside ? "lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:items-start" : null,
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
          <dt className="text-lg font-semibold">{item.term}</dt>
          {item.detail ? (
            <dd className="mt-1 max-w-[64ch] text-base leading-relaxed text-muted-foreground">{item.detail}</dd>
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
        <li key={index} className="flex gap-4 border-b border-rule-soft py-4">
          <span aria-hidden className="w-6 shrink-0 font-mono text-base tabular-nums text-muted-foreground">
            {index + 1}
          </span>
          <span className="min-w-0 text-lg leading-relaxed">{step}</span>
        </li>
      ))}
    </ol>
  );
}

/** A caveat or boundary statement, set on a rule rather than in a tinted box. */
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
    <aside className={cn("max-w-[68ch] border-t-2 border-foreground pt-3", className)}>
      {title ? <p className="text-base font-semibold">{title}</p> : null}
      <div className={cn("text-base leading-relaxed text-muted-foreground", title && "mt-1")}>{children}</div>
    </aside>
  );
}

/** The page's closing ask on the heavy rule: the case left, the actions right. */
export function CloseSection({
  heading,
  headingId,
  lede,
  actions,
  children,
}: {
  heading: ReactNode;
  headingId: string;
  lede?: ReactNode;
  actions: ReactNode;
  children?: ReactNode;
}) {
  return (
    <Section rule="heavy" aria-labelledby={headingId}>
      <div className="grid gap-x-16 gap-y-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:items-end">
        <div>
          <SectionHeading id={headingId}>{heading}</SectionHeading>
          {lede ? (
            <p className="mt-4 max-w-[56ch] text-lg leading-relaxed text-muted-foreground">{lede}</p>
          ) : null}
        </div>
        <div>
          {actions}
          {children}
        </div>
      </div>
    </Section>
  );
}
