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
import { SeoAnalyzerCta } from "@/components/marketing/seo-analyzer-cta";

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
      <div className="tc-reveal space-y-3">
        {items.map((item) => (
          <details
            key={item.question}
            className="group rounded-xl border border-border bg-card p-4 transition-colors hover:border-primary/30 sm:p-5"
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

      {/* Sources & methodology — transparency note attached to every
          /vs comparison. Keeps the matrix defensible: we don't claim a
          competitor lacks a capability they publicly offer, and we date
          the review so stale claims are obvious. */}
      <p className="mt-6 max-w-2xl text-xs leading-relaxed text-muted-foreground">
        <span className="font-semibold text-foreground/80">Sources &amp; methodology:</span>{" "}
        Feature and pricing rows reflect {competitorName}&apos;s publicly listed
        information, last reviewed {reviewedDate}. Vendors change features
        and prices often — verify current details on {competitorName}&apos;s own
        site. Where TrueCap claims &ldquo;sourced defaults,&rdquo; that refers
        specifically to auto-filled HUD Fair Market Rent, the FRED 30-year
        mortgage rate, and state average effective property tax — not a general
        claim about property-data import, which several of these tools also offer.
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
          TrueCap&apos;s price buys is the decision layer, not more
          calculation: the exact maximum offer that still hits your targets, a
          pass/fail against your own Buy Box with reasons, the downside stress
          test, and assumptions that are sourced and labeled instead of
          silently defaulted. Overpaying by even 3% on a $250,000 rental costs
          $7,500 — the comparison that matters is against the mistake, not the
          subscription. And the risk is ours: analyze 10 deals in your first
          30 days as a Pro subscriber, and if you don&apos;t feel more
          confident about exactly what to offer, the{" "}
          <a href="/guarantee" className="font-semibold text-primary hover:underline">
            Never Overpay Guarantee
          </a>{" "}
          refunds every dollar.
        </p>
      </div>

      {/* Analyzer bridge (2026-08 offer rollout) — the comparison's real
          answer is running your own deal; this reaches all 40 /vs pages. */}
      <div className="mt-8">
        <SeoAnalyzerCta
          context="a real deal and compare the verdicts yourself"
          utmSource="vs-page"
        />
      </div>
    </section>
  );
}
