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

export type PlanCardAnswer = { term: string; detail: ReactNode };

export function PlanCard({
  name,
  audience,
  price,
  period,
  priceNote,
  answers,
  action,
  footnote,
  className,
  ...props
}: {
  name: string;
  audience: string;
  /** Already formatted from the catalog or the Stripe display price. */
  price: string;
  /** "/mo", or nothing for Free. */
  period?: string;
  /** The line under the price: the annual charge, or what free means. */
  priceNote?: ReactNode;
  answers: readonly PlanCardAnswer[];
  action: ReactNode;
  footnote?: ReactNode;
  className?: string;
} & Record<`data-${string}`, string>) {
  return (
    <article
      className={cn(
        "flex min-w-0 flex-col rounded-lg border border-border bg-card p-5 sm:p-[22px]",
        className,
      )}
      {...props}
    >
      <h3 className="font-display text-2xl">{name}</h3>
      <p className="mt-1 text-[15px] text-muted-foreground">{audience}</p>
      <p className="mt-4 flex items-baseline gap-1">
        <span className="font-mono text-[2rem] font-medium leading-none tracking-[-0.02em] tabular-nums">
          {price}
        </span>
        {period ? (
          <span className="text-[15px] text-muted-foreground">{period}</span>
        ) : null}
      </p>
      {/* Every card reserves the same height here, so the definition lists
          and the actions line up across the row. */}
      <p className="mt-1.5 min-h-[2.75rem] text-sm text-muted-foreground">
        {priceNote}
      </p>
      <dl className="mt-3 flex-1 border-t border-border text-[15px]">
        {answers.map((answer) => (
          <div key={answer.term} className="border-b border-rule-soft py-2.5">
            <dt className="font-semibold">{answer.term}</dt>
            <dd className="mt-0.5 text-muted-foreground">{answer.detail}</dd>
          </div>
        ))}
      </dl>
      {/* Fine print sits above the action, so the actions of a row of
          cards stay on one line whichever card carries it. */}
      {footnote ? (
        <p className="mt-3 text-[13px] leading-relaxed text-muted-foreground">
          {footnote}
        </p>
      ) : null}
      <div className="mt-5">{action}</div>
    </article>
  );
}
