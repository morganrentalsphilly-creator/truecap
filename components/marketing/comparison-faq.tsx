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
 *     So does a line break or a block (<br>, <p>, <li>…): the page shows a
 *     break there and the joined JSON-LD text would glue the words together.
 *
 * Schema pattern follows schema.org/FAQPage with mainEntity = array of
 * Question, each with an acceptedAnswer of type Answer.
 *
 * Set in the homepage FAQ's grammar (DESIGN.md "Components": FAQ, and
 * FaqSection in landing-sections.tsx): a Section with the display-voice H2,
 * the list opening on the 2px ink rule, each question a native details row
 * on a rule with the SVG plus/minus (DisclosureMark), the answer capped at
 * 64ch. Nothing but the answer follows the summary inside a details row:
 * lib/__tests__/structured-data-f4.test.tsx reads that text as the visible
 * answer. The sources note is a Note, the price answer a ruled block (no
 * card), then one line for agents and the analyzer bridge.
 *
 * The sources note prints a review date only when the page passes
 * `reviewedDate` (see the prop). There is no shared default: one constant
 * once printed "last reviewed June 2026" on 35 pages nobody had re-checked.
 * lib/__tests__/vs-shared-truth-guards.test.tsx pins both forms of the note.
 */

import { Fragment, isValidElement, type ReactNode } from "react";
import { DisclosureMark } from "@/components/ledger/ledger-parts";
import { IntentPrefetchLink } from "@/components/marketing/intent-prefetch-link";
import { Note } from "@/components/marketing/page-parts";
import { Section, SectionHeading } from "@/components/marketing/section";
import { SeoAnalyzerCta } from "@/components/marketing/seo-analyzer-cta";
import { JsonLd } from "@/components/seo/json-ld";
import { isAgentProConfigured } from "@/lib/stripe/plan-prices";

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
 * HTML elements an answer may use: inline text that renders with no break of
 * its own, so their text joins its neighbours exactly as on the page.
 */
const INLINE_TEXT_TAGS: ReadonlySet<string> = new Set(["a", "abbr", "b", "code", "em", "i", "small", "span", "strong", "sub", "sup"]);

/**
 * The text a node renders, whitespace collapsed: strings and numbers, arrays
 * and fragments, inline HTML elements (INLINE_TEXT_TAGS) and components whose
 * text is their `children` (Link). Throws on a component element without
 * children (its text, if any, comes from other props), on any other HTML
 * element (a <br> or a block is a visible break the joined text would lose:
 * "a<br />b" would become "ab"), and on anything else it cannot read (a
 * promise, an iterable), so the JSON-LD never silently drops or glues part of
 * a visible answer. lib/__tests__/structured-data-f4.test.tsx checks the
 * result against the rendered page on every /vs page, word breaks included.
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
      if (typeof value.type === "string" && !INLINE_TEXT_TAGS.has(value.type)) {
        throw new TypeError(`plainTextOf: <${value.type}> in an FAQ answer (a line break or block the JSON-LD text cannot show); keep answers to text, links and inline emphasis`);
      }
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

/** The FAQ heading's id (aria-labelledby); ComparisonFaq renders once per page. */
const HEADING_ID = "comparison-faq-heading";

export function ComparisonFaq({
  competitorName,
  items,
  retired,
  reviewedDate,
}: {
  /** "DealCheck", "Stessa", "Excel", etc. Used in the section heading. */
  competitorName: string;
  items: FaqItem[];
  /**
   * The competitor's product is no longer offered (/vs/cozy: Cozy moved to
   * Apartments.com in mid-2021), so its rows restate the vendor's archived
   * site. The note says so instead of sending the reader to a live site, and
   * the price block drops its "check <vendor>'s live pricing" clause: there
   * is no live pricing to check.
   */
  retired?: boolean;
  /**
   * The date this page's competitor claims were checked, as the note prints
   * it ("October 2026", "August 27, 2026"). Pass it only after every
   * competitor row, price and FAQ statement on the page was compared with the
   * vendor's own pricing and feature pages. It is never the render time and
   * has no default: without it the note states no review at all.
   */
  reviewedDate?: string;
}) {
  // /for-agents redirects to /pricing while Agent Pro's Stripe Price is
  // absent, and the link-graph guard forbids linking a redirect
  // (lib/__tests__/internal-link-graph.test.tsx), so the agent line renders
  // only where the persona page does (the footer resolves its link the same
  // way).
  const agentProConfigured = isAgentProConfigured();
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
    <Section aria-labelledby={HEADING_ID}>
      <JsonLd data={schema} />
      <div className="max-w-3xl">
        <SectionHeading id={HEADING_ID}>
          Common questions about TrueCap vs {competitorName}
        </SectionHeading>
        <p className="mt-3 max-w-[60ch] text-pretty text-lg leading-relaxed text-muted-foreground">
          Quick answers to the questions investors comparison-shopping these tools
          actually ask.
        </p>
        <div className="mt-8 border-t-2 border-foreground">
          {items.map((item) => (
            <details key={item.question} className="group border-b border-border">
              {/* Touch-sized (48px) and focus-visible through the global 3px
                  outline floor in app/globals.css, whose selector lists
                  summary: the row sets no focus style of its own. */}
              <summary className="flex min-h-12 cursor-pointer list-none items-start justify-between gap-4 py-4 [&::-webkit-details-marker]:hidden">
                <span className="text-lg font-semibold">{item.question}</span>
                <DisclosureMark className="mt-1.5" />
              </summary>
              <p className="max-w-[64ch] pb-5 text-pretty text-base leading-relaxed text-muted-foreground">
                {item.answer}
              </p>
            </details>
          ))}
        </div>

        {/* Sources & methodology — the note attached to every /vs
            comparison. A page that passes reviewedDate says its rows were
            reviewed and when. A page that passes none claims no review: the
            note then says only that the rows are TrueCap's summary, may be
            out of date, and where to check. */}
        <Note className="mt-10">
          <span className="font-semibold text-foreground">
            Sources &amp; methodology:
          </span>{" "}
          {retired ? (
            <>
              {competitorName} is no longer offered; the rows about{" "}
              {competitorName} describe it as its own archived site did.
            </>
          ) : reviewedDate ? (
            <>
              Feature and pricing rows reflect {competitorName}&apos;s publicly
              listed information, last reviewed {reviewedDate}. Vendors change
              features and prices often — verify current details on{" "}
              {competitorName}&apos;s own site.
            </>
          ) : (
            <>
              Rows about {competitorName} are TrueCap&apos;s summary and may be
              out of date. Vendors change features and prices often, so check
              the vendor&apos;s own site for current details.
            </>
          )}{" "}
          Where TrueCap claims &ldquo;sourced defaults,&rdquo; that refers
          specifically to an editable HUD rent benchmark and the FRED
          owner-occupied 30-year mortgage-rate benchmark. Property tax is a manual
          local input with a disclosed generic default, not a state-data
          auto-fill.
        </Note>

        {/* Price objection, answered directly (2026-08 rollout) — honest
            tone, keeps the "check their live pricing" convention, closes
            with the guarantee. Reaches all 40 /vs pages. On a rule, not in
            a card: plan cards are the only cards on marketing pages. The
            rule spans the column like the FAQ list's; only the text is
            capped at the reading measure. */}
        <div className="mt-10 border-t border-border pt-6">
          <h3 className="font-display text-balance text-h3-sm sm:text-2xl">
            On price, plainly
          </h3>
          <p className="mt-3 max-w-[68ch] text-pretty text-base leading-relaxed text-muted-foreground">
            Tools in this space run from free to well above TrueCap
            {retired ? (
              "."
            ) : (
              <>
                {" "}
                — check {competitorName}&apos;s live pricing for their current
                number.
              </>
            )}{" "}
            What
            TrueCap&apos;s price buys is the decision layer, not more calculation:
            an Offer Ceiling for your targets, Buy Box fit with reasons, the downside stress test, and assumptions
            that are source-labeled instead of silently defaulted. Whether that
            workflow justifies the price depends on your volume, verification
            process, and existing tools.
          </p>
        </div>

        {/* One line for agents: the comparison pages otherwise speak only
            to investors. It states what the catalog's client_buy_box
            feature does (lib/entitlements-catalog.ts; the roster, assigning
            a saved deal to a client and the one-client-per-deal screening
            are spelled out on /for-agents).
            An inline link in a sentence, through IntentPrefetchLink like
            every /vs link below the hero. */}
        {agentProConfigured ? (
          <p className="mt-6 max-w-[68ch] text-pretty text-base leading-relaxed text-muted-foreground">
            Screening listings for investor clients?{" "}
            <IntentPrefetchLink href="/for-agents" className="tc-link">
              TrueCap for agents
            </IntentPrefetchLink>{" "}
            keeps a client roster and screens each deal against the Buy Box of
            the client you assign it to.
          </p>
        ) : null}

        {/* Analyzer bridge (2026-08 offer rollout) — the comparison's real
            answer is running your own deal; this reaches all 40 /vs pages.
            SeoAnalyzerCta sets its own chrome; this wrapper only spaces it. */}
        <div className="mt-10">
          <SeoAnalyzerCta
            context="a real deal and compare the screening results yourself"
            utmSource="vs-page"
          />
        </div>
      </div>
    </Section>
  );
}
