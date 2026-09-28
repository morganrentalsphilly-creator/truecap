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
 * Server component: the JSON-LD ships in the static HTML.
 */

import type { DataFaqItem } from "@/lib/markets/data-copy";
import { formatIsoDate } from "@/lib/markets/data-copy";
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
    <section data-faq="" className="mt-12" aria-labelledby="data-faq-heading">
      <JsonLd data={buildFaqPageLd(items)} />
      <h2 id="data-faq-heading" className="text-2xl font-extrabold text-foreground">
        {heading}
      </h2>
      <div className="mt-4 space-y-4">
        {items.map((item) => (
          <div
            key={item.question}
            data-faq-item=""
            className="rounded-xl border border-border bg-card p-4 sm:p-5"
          >
            <h3 className="text-base font-bold text-foreground">{item.question}</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{item.answer}</p>
            {item.sources.length > 0 ? (
              <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                Source:{" "}
                {item.sources.map((source, index) => (
                  <span key={source.href}>
                    {index > 0 ? "; " : ""}
                    <a
                      href={source.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline decoration-dotted underline-offset-2 hover:text-foreground"
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
