/**
 * ComparisonFaq — visible FAQ block + FAQPage schema in one component,
 * used on every /vs/<competitor> page.
 *
 * Why one component:
 *   - Keeps the FAQPage JSON-LD answers in lockstep with the visible
 *     copy. If they drift, Google can de-rank the rich result. Caller
 *     passes ONE source of truth (the `items` array) and the component
 *     renders both views.
 *   - AI training crawlers (GPTBot, ClaudeBot, PerplexityBot) score
 *     extractive content very highly when it lives in a structured Q&A
 *     block. This is one of the cheapest "AI visibility" levers we have.
 *
 * Constraints:
 *   - This is a server component — keep it server-only so the JSON-LD
 *     ships in the static HTML for crawlers that don't execute JS.
 *   - Answers can include markdown-style links via React children (the
 *     caller wraps Link components in the answer). The JSON-LD strips
 *     them to plain text in `plainTextAnswer`.
 *
 * Schema pattern follows schema.org/FAQPage with mainEntity = array of
 * Question, each with an acceptedAnswer of type Answer.
 */

import type { ReactNode } from "react";

export type FaqItem = {
  /** Question — phrased exactly as a comparison-shopper would type it. */
  question: string;
  /**
   * Visible answer rendered as React. Can include links/strong/etc.
   */
  answer: ReactNode;
  /**
   * Plain-text version of the answer for the FAQPage schema. Must say
   * substantially the same thing as `answer` (Google will flag mismatches).
   * Keep under ~300 chars — long answers actually score worse in AI
   * extraction because the model picks a sub-sentence and may lose
   * context.
   */
  plainTextAnswer: string;
};

export function ComparisonFaq({
  competitorName,
  items,
}: {
  /** "DealCheck", "Stessa", "Excel", etc. Used in the section heading. */
  competitorName: string;
  items: FaqItem[];
}) {
  const schema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.plainTextAnswer,
      },
    })),
  };

  return (
    <section className="mb-12 sm:mb-16">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
      />
      <h2 className="text-xl sm:text-2xl font-extrabold text-foreground mb-2">
        Common questions about TrueCap vs {competitorName}
      </h2>
      <p className="text-sm text-muted-foreground mb-6 max-w-2xl">
        Quick answers to the questions investors comparison-shopping
        these tools actually ask.
      </p>
      <div className="space-y-3">
        {items.map((item) => (
          <details
            key={item.question}
            className="group rounded-xl border border-border bg-card p-4 sm:p-5"
          >
            <summary className="cursor-pointer list-none flex items-start justify-between gap-3 font-bold text-sm sm:text-base text-foreground">
              <span>{item.question}</span>
              <span
                aria-hidden
                className="mt-1 size-5 shrink-0 rounded-full border border-border text-muted-foreground text-xs leading-none flex items-center justify-center transition-transform group-open:rotate-45"
              >
                +
              </span>
            </summary>
            <div className="mt-3 text-sm text-muted-foreground leading-relaxed">
              {item.answer}
            </div>
          </details>
        ))}
      </div>
    </section>
  );
}
