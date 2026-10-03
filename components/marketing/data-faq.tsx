/**
 * DataFaq — a visible FAQ and its FAQPage JSON-LD, built from ONE array.
 *
 * Used by the market and state pages (F8). Answers are plain text, so the
 * JSON-LD `acceptedAnswer.text` is exactly the visible answer and every
 * `Question.name` is exactly the visible question: Google requires FAQ markup
 * to mirror visible content, and seo/scripts/jsonld-validate.ts fails a page
 * whose FAQ questions are not in its main text. Each answer lists its source.
 * With no items it renders nothing, and no FAQPage.
 *
 * Set as the FAQ's ruled list (DESIGN.md "Components"): the heading in the
 * display voice, the list opening on the 2px ink rule, each question and its
 * answer a row on a soft rule, answers capped at 64ch. The rows are not
 * <details>: every answer is data and stays visible. No card.
 *
 * Server component: the JSON-LD ships in the static HTML.
 */

import type { DataFaqItem } from "@/lib/markets/data-copy";
import { formatIsoDate } from "@/lib/markets/data-copy";
import { SectionHeading } from "@/components/marketing/section";
import { JsonLd } from "@/components/seo/json-ld";

/** The FAQPage node for `items` (exported so tests compare it to the visible Q&A). */
export function buildFaqPageLd(items: readonly DataFaqItem[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: { "@type": "Answer", text: item.answer },
    })),
  };
}

export function DataFaq({
  heading,
  items,
}: {
  heading: string;
  items: readonly DataFaqItem[];
}) {
  if (items.length === 0) return null;
  return (
    <section data-faq="" className="mt-16" aria-labelledby="data-faq-heading">
      <JsonLd data={buildFaqPageLd(items)} />
      <SectionHeading id="data-faq-heading">{heading}</SectionHeading>
      <div className="mt-6 border-t-2 border-foreground">
        {items.map((item) => (
          <div
            key={item.question}
            data-faq-item=""
            className="border-b border-rule-soft py-5"
          >
            <h3 className="text-pretty text-lg font-semibold text-foreground">{item.question}</h3>
            <p className="mt-2 max-w-[64ch] text-pretty text-base leading-relaxed text-muted-foreground">{item.answer}</p>
            {item.sources.length > 0 ? (
              <p className="mt-2 max-w-[64ch] text-sm leading-relaxed text-muted-foreground">
                Source:{" "}
                {item.sources.map((source, index) => (
                  <span key={source.href}>
                    {index > 0 ? "; " : ""}
                    <a
                      href={source.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="tc-link"
                    >
                      {source.label}
                    </a>
                    {source.retrievedAt ? `, retrieved ${formatIsoDate(source.retrievedAt)}` : ""}
                  </span>
                ))}
              </p>
            ) : null}
          </div>
        ))}
      </div>
    </section>
  );
}
