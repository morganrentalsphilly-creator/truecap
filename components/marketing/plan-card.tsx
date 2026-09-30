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
        "flex min-w-0 flex-col rounded-lg border border-border bg-card p-5 sm:p-[22px]",
        className,
      )}
      {...props}
    >
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <h3 className="font-display text-2xl">{name}</h3>
        {tag ? (
          <span className="rounded-sm border border-border px-1.5 py-0.5 text-sm font-medium">{tag}</span>
        ) : null}
      </div>
      <p className="mt-1 text-base text-muted-foreground">{audience}</p>
      {lead ? <p className="mt-3 text-base leading-relaxed">{lead}</p> : null}
      <p className="mt-4 flex flex-wrap items-baseline gap-x-1">
        <span className="font-mono text-section-sm font-medium tracking-[-0.02em] tabular-nums min-[380px]:text-key-sm">
          {price}
        </span>
        {period ? (
          <span className="text-base text-muted-foreground">{period}</span>
        ) : null}
      </p>
      {/* Every card reserves the same height here, so the definition lists
          and the actions line up across the row. */}
      <p className="mt-1.5 min-h-[2.75rem] text-sm text-muted-foreground">
        {priceNote}
      </p>
      <div className="mt-3 flex-1">
        {answersCaption ? (
          <p className="mb-2 text-sm font-medium text-muted-foreground">{answersCaption}</p>
        ) : null}
        <dl className="border-t border-border text-base">
          {answers.map((answer, index) => (
            <div
              key={answer.key ?? (typeof answer.term === "string" ? answer.term : index)}
              className="border-b border-rule-soft py-2.5"
            >
              <dt className={answer.detail ? "font-semibold" : undefined}>{answer.term}</dt>
              {answer.detail ? (
                <dd className="mt-0.5 text-muted-foreground">{answer.detail}</dd>
              ) : null}
            </div>
          ))}
        </dl>
        {note ? <p className="mt-3 text-sm text-muted-foreground">{note}</p> : null}
      </div>
      {/* Fine print sits above the action, so the actions of a row of
          cards stay on one line whichever card carries it. */}
      {footnote ? (
        <div className="mt-3 text-sm leading-relaxed text-muted-foreground">
          {footnote}
        </div>
      ) : null}
      <div className="mt-5">{action}</div>
    </article>
  );
}
