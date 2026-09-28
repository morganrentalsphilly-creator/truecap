/**
 * ComparisonFaq — visible FAQ block + FAQPage schema in one component,
 * used on every /vs/<competitor> page.
 *
 * Why one component:
 *   - Keeps the FAQPage JSON-LD in lockstep with the visible copy: the
 *     caller passes ONE source of truth (the `items` array) and the
 *     component renders both views. Each JSON-LD answer is the visible
 *     answer's own text (plainTextOf, F4), not a separately written
 *     summary: FAQ markup must match what the page shows, and a hand-kept
 *     `plainTextAnswer` had drifted into a paraphrase on every /vs page.
 *   - AI training crawlers (GPTBot, ClaudeBot, PerplexityBot) score
 *     extractive content very highly when it lives in a structured Q&A
 *     block. This is one of the cheapest "AI visibility" levers we have.
 *
 * Constraints:
 *   - This is a server component — keep it server-only so the JSON-LD
 *     ships in the static HTML for crawlers that don't execute JS.
 *   - Answers can include links and emphasis (a, Link, strong, em) as
 *     React children. plainTextOf reads the text out of them; an element
 *     whose text does not come from its children makes it throw, so an
 *     answer can never lose words in the JSON-LD without failing the build.
 *
 * Schema pattern follows schema.org/FAQPage with mainEntity = array of
 * Question, each with an acceptedAnswer of type Answer.
 */

import { Fragment, isValidElement, type ReactNode } from "react";
import { SeoAnalyzerCta } from "@/components/marketing/seo-analyzer-cta";
import { JsonLd } from "@/components/seo/json-ld";

/**
 * Manual last-reviewed date for the comparison content (feature rows +
 * pricing) shown on every /vs page. This is intentionally NOT auto-`now()`:
 * a "last reviewed" date must reflect a real human review, not the render
 * time. Update this when the comparison tables are actually re-checked.
 */
const COMPARISON_REVIEWED = "June 2026";

export type FaqItem = {
  /** Question — phrased exactly as a comparison-shopper would type it. */
  question: string;
  /**
   * Visible answer rendered as React: text, fragments, and elements whose
   * text is their children (a, Link, strong, em). Its text is also the
   * FAQPage answer (plainTextOf).
   */
  answer: ReactNode;
};

/**
 * The text a node renders, whitespace collapsed: strings and numbers, arrays
 * and fragments, and elements whose text is their `children`. Throws on a
 * component element without children (its text, if any, comes from other
 * props) and on anything else it cannot read (a promise, an iterable), so
 * the JSON-LD never silently drops part of a visible answer.
 * lib/__tests__/structured-data-f4.test.tsx checks the result against the
 * rendered page on every /vs page.
 */
export function plainTextOf(node: ReactNode): string {
  const parts: string[] = [];
  const visit = (value: ReactNode): void => {
    if (value === null || value === undefined || typeof value === "boolean") return;
    if (typeof value === "string" || typeof value === "number" || typeof value === "bigint") {
      parts.push(String(value));
      return;
    }
    if (Array.isArray(value)) {
      value.forEach(visit);
      return;
    }
    if (isValidElement<{ children?: ReactNode }>(value)) {
      const isComponent = typeof value.type !== "string" && value.type !== Fragment;
      if (isComponent && value.props.children === undefined) {
        throw new TypeError("plainTextOf: a component without children in an FAQ answer (its text would be missing from the JSON-LD)");
      }
      visit(value.props.children);
      return;
    }
    throw new TypeError("plainTextOf: an FAQ answer may hold only text, fragments and elements whose text is their children");
  };
  visit(node);
  return parts.join("").replace(/\s+/g, " ").trim();
}

export function ComparisonFaq({
  competitorName,
  items,
  reviewedDate = COMPARISON_REVIEWED,
}: {
  /** "DealCheck", "Stessa", "Excel", etc. Used in the section heading. */
  competitorName: string;
  items: FaqItem[];
  /** Date this page's competitor claims were actually checked. */
  reviewedDate?: string;
}) {
  const schema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: plainTextOf(item.answer),
      },
    })),
  };

  return (
    <section className="mb-12 sm:mb-16">
      <JsonLd data={schema} />
      <h2 className="text-xl sm:text-2xl font-extrabold text-foreground mb-2">
        Common questions about TrueCap vs {competitorName}
      </h2>
      <p className="text-sm text-muted-foreground mb-6 max-w-2xl">
        Quick answers to the questions investors comparison-shopping these tools
        actually ask.
      </p>
      <div className="tc-reveal space-y-3">
        {items.map((item) => (
          <details
            key={item.question}
            className="group rounded-xl border border-border bg-card p-4 transition-colors hover:border-primary/30 sm:p-5"
          >
            <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 rounded-md text-sm font-bold text-foreground focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 sm:text-base">
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

      {/* Sources & methodology — transparency note attached to every
          /vs comparison. Keeps the matrix defensible: we don't claim a
          competitor lacks a capability they publicly offer, and we date
          the review so stale claims are obvious. */}
      <p className="mt-6 max-w-2xl text-xs leading-relaxed text-muted-foreground">
        <span className="font-semibold text-foreground/80">
          Sources &amp; methodology:
        </span>{" "}
        Feature and pricing rows reflect {competitorName}&apos;s publicly listed
        information, last reviewed {reviewedDate}. Vendors change features and
        prices often — verify current details on {competitorName}&apos;s own
        site. Where TrueCap claims &ldquo;sourced defaults,&rdquo; that refers
        specifically to an editable HUD area-rent benchmark and the FRED
        owner-occupied 30-year mortgage-rate benchmark. Property tax is a manual
        local input with a disclosed generic fallback, not a state-data
        auto-fill.
      </p>

      {/* Price objection, answered directly (2026-08 rollout) — honest
          tone, keeps the "check their live pricing" convention, closes
          with the guarantee. Reaches all 40 /vs pages. */}
      <div className="mt-8 rounded-2xl border border-border bg-card p-5 sm:p-6">
        <h3 className="text-base font-extrabold text-foreground">
          On price, plainly
        </h3>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          Tools in this space run from free to well above TrueCap — check{" "}
          {competitorName}&apos;s live pricing for their current number. What
          TrueCap&apos;s price buys is the decision layer, not more calculation:
          an Offer Ceiling for your targets, Buy Box fit with reasons, the downside stress test, and assumptions
          that are source-labeled instead of silently defaulted. Whether that
          workflow justifies the price depends on your volume, verification
          process, and existing tools.
        </p>
      </div>

      {/* Analyzer bridge (2026-08 offer rollout) — the comparison's real
          answer is running your own deal; this reaches all 40 /vs pages. */}
      <div className="mt-8">
        <SeoAnalyzerCta
          context="a real deal and compare the screening results yourself"
          utmSource="vs-page"
        />
      </div>
    </section>
  );
}
