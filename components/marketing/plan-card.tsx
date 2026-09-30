/**
 * The plan card (DESIGN.md "Components"): the one card on marketing pages,
 * because plans are the one thing a visitor compares side by side. Raised
 * paper, a 1px rule border, 6px radius, no shadow. The plan name is the
 * heading, an audience line sits under it, the price is set in DM Mono from
 * the catalog, the answers are a ruled definition list, and there is one
 * primary action.
 *
 * Server component. The action is passed in so each page keeps its own link
 * and analytics island.
 *
 * Row alignment: the card is a CSS subgrid over five of its parent grid's
 * rows (PLAN_CARD_ROWS), so every card in a row shares the same five bands
 * and the prices, the answer lists' opening rules and the actions line up
 * across the row whatever each card's lead, price note or caption holds. The
 * parent needs no row template: auto rows are enough (the homepage plans
 * grid, /pricing's row). Each band always has content in every card (name,
 * audience, price, answers, action), because a band that is empty in every
 * card would still keep the parent's row gap around it; the optional parts
 * ride inside a band instead. The card zeroes its own row gap, so its spacing
 * is the bands' padding, not the parent's gap. Stacked on a phone, each card
 * takes its own five rows and the parent's gap still separates the cards.
 */

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export type PlanCardAnswer = {
  term: ReactNode;
  /** Optional: a term-only row is a plain feature line. */
  detail?: ReactNode;
  /** Required when the term is not a string. */
  key?: string;
};

/** The five parent rows a PlanCard spans (see the note at the top). */
const PLAN_CARD_ROWS = "row-span-5";

export function PlanCard({
  id,
  name,
  tag,
  audience,
  lead,
  price,
  period,
  priceNote,
  answersCaption,
  answers,
  note,
  action,
  footnote,
  className,
  ...props
}: {
  /** A fragment target (/pricing#pro). */
  id?: string;
  name: ReactNode;
  /** A 2px tag beside the name: "Current", "Recommended". */
  tag?: ReactNode;
  audience: ReactNode;
  /** A sentence under the audience line: what the plan is for. */
  lead?: ReactNode;
  /** Already formatted from the catalog or the Stripe display price. */
  price: string;
  /** "/mo", or nothing for Free. */
  period?: string;
  /** The line under the price: the annual charge, or what free means. */
  priceNote?: ReactNode;
  /** A line above the answers ("Everything in Free, plus"). */
  answersCaption?: ReactNode;
  answers: readonly PlanCardAnswer[];
  /** A line after the answers ("Plus everything in Pro"). */
  note?: ReactNode;
  action: ReactNode;
  /** Fine print; block content is allowed (a div, not a p). */
  footnote?: ReactNode;
  className?: string;
} & Record<`data-${string}`, string>) {
  return (
    <article
      id={id}
      className={cn(
        PLAN_CARD_ROWS,
        "grid min-w-0 grid-rows-subgrid gap-y-0 rounded-lg border border-border bg-card p-5 sm:p-[22px]",
        className,
      )}
      {...props}
    >
      {/* 1. The name, with its tag. */}
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <h3 className="font-display text-2xl">{name}</h3>
        {tag ? (
          <span className="rounded-sm border border-border px-1.5 py-0.5 text-sm font-semibold">{tag}</span>
        ) : null}
      </div>
      {/* 2. Who it is for, and what it is for. */}
      <div className="pt-1">
        <p className="text-base text-muted-foreground">{audience}</p>
        {lead ? <p className="mt-3 text-pretty text-base leading-relaxed">{lead}</p> : null}
      </div>
      {/* 3. The price on the band's first line, so prices read across the
          row; the caption at the band's foot, against the list it opens.
          Without a caption the band keeps the approved homepage's space
          under a one-line price note: 28px here and band 4's 8px, the 36px
          the old 44px note reserve and its 12px margin left. */}
      <div className={cn("flex flex-col pt-4", answersCaption ? null : "pb-7")}>
        <p className="flex flex-wrap items-baseline gap-x-1">
          <span className="font-mono text-section-sm font-medium tracking-[-0.02em] tabular-nums min-[380px]:text-key-sm">
            {price}
          </span>
          {period ? (
            <span className="text-base text-muted-foreground">{period}</span>
          ) : null}
        </p>
        {priceNote ? <p className="mt-1.5 text-sm text-muted-foreground">{priceNote}</p> : null}
        {answersCaption ? (
          <p className="mt-auto pt-3 text-sm font-semibold text-muted-foreground">{answersCaption}</p>
        ) : null}
      </div>
      {/* 4. The answers: their opening rule is level across the row. */}
      <div className="pt-2">
        <dl className="border-t border-border text-base">
          {answers.map((answer, index) => (
            <div
              key={answer.key ?? (typeof answer.term === "string" ? answer.term : index)}
              className="border-b border-rule-soft py-2.5"
            >
              <dt className={answer.detail ? "font-semibold" : undefined}>{answer.term}</dt>
              {answer.detail ? (
                <dd className="mt-0.5 text-pretty text-muted-foreground">{answer.detail}</dd>
              ) : null}
            </div>
          ))}
        </dl>
        {note ? <p className="mt-3 text-sm text-muted-foreground">{note}</p> : null}
      </div>
      {/* 5. Fine print above the action, and the action at the band's foot,
          so the actions of a row stay on one line whichever card carries
          the fine print. */}
      <div className={cn("flex flex-col gap-5", footnote ? "pt-3" : "pt-5")}>
        {footnote ? (
          <div className="text-sm leading-relaxed text-muted-foreground">{footnote}</div>
        ) : null}
        <div className="mt-auto">{action}</div>
      </div>
    </article>
  );
}
