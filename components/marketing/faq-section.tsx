/**
 * FaqSection, in a module of its own (moved from landing-sections.tsx, which
 * re-exports it for its existing importers). An article imports it from
 * here: landing-sections.tsx also imports the homepage's client islands
 * (HeroAddressForm, AnalyzeCtaLink), and Next's client-entry pass follows
 * every import of a module a page imports, used or not, so importing the FAQ
 * from there would ship the hero address form's JavaScript on every post
 * that renders an FAQ. Server component; no client JavaScript.
 */

import type { ReactNode } from "react";
import { DisclosureMark } from "@/components/ledger/ledger-parts";
import { Section, SectionHeading } from "@/components/marketing/section";
import { JsonLd } from "@/components/seo/json-ld";
import { cn } from "@/lib/utils";

/**
 * One FAQ block, any audience (DESIGN.md "Components": FAQ). A ruled list of
 * native <details> rows: no JS, every row reachable by keyboard, answers
 * capped at 64ch. HomepageFaq and the /for-agents objection section render
 * through it so the markup, the a11y pattern and the optional FAQPage JSON-LD
 * stay identical. Only one URL should claim a given FAQ set in structured
 * data (structuredData=false on the copies).
 *
 * variant="inline" sets the same heading and ruled rows inside an article's
 * reading column (components/marketing/article.tsx) instead of a Section of
 * its own: no page container, no section rule, not-prose so an article
 * body's typography leaves it alone, and no "Email us" contact line unless
 * `contact` passes one. renderAnswer lets an answer keep its inline links
 * (they take the tc-link look) while the FAQPage JSON-LD still reads the
 * plain `a`; what it returns sits inside the answer's <p>, so it must be
 * inline content whose text reads exactly as `a`
 * (structured-data-f4.test.tsx checks the mirror). Without the new props,
 * every existing caller renders exactly as before.
 */
export function FaqSection<Item extends { q: string; a: string }>({
  heading,
  intro,
  items,
  structuredData = true,
  id,
  compact = false,
  layout = "stack",
  contact: contactOverride,
  variant = "section",
  renderAnswer,
}: {
  heading: string;
  intro?: string;
  items: readonly Item[];
  structuredData?: boolean;
  id?: string;
  /** Stacked directly under another FaqSection: no top rule, no top space. */
  compact?: boolean;
  /** "split": the heading beside the list from 1024px (the homepage). */
  layout?: "stack" | "split";
  /** Replaces the default contact line; null drops it. The inline variant has none unless passed. */
  contact?: ReactNode;
  /** "inline": inside an article's reading column, without a Section. */
  variant?: "section" | "inline";
  /** The visible answer, when it carries links; defaults to the plain `a`. */
  renderAnswer?: (item: Item) => ReactNode;
}) {
  const headingId = id ? `${id}-heading` : undefined;
  // The inline variant has no default contact line: an article's FAQ never
  // grew the "Email us" line, and adding it would be new copy and a new link
  // on every post.
  const contact =
    contactOverride !== undefined ? contactOverride : variant === "inline" ? null : (
      <p className="mt-4 text-base text-muted-foreground">
        Still have a question?{" "}
        <a href="mailto:hello@usetruecap.com" className="tc-link inline-flex min-h-11 items-center">
          Email us
        </a>
        .
      </p>
    );
  const rows = items.map((faq) => (
    <details key={faq.q} className="group border-b border-border">
      <summary className="flex min-h-12 cursor-pointer list-none items-start justify-between gap-4 py-4 [&::-webkit-details-marker]:hidden">
        {/* The question is the row's heading: balanced, so "…need this?"
            never leaves "this?" alone on the last line. The answer is body:
            pretty. */}
        <span className="text-balance text-lg font-semibold">{faq.q}</span>
        <DisclosureMark className="mt-1.5" />
      </summary>
      {/* A rendered answer's links take the tc-link look here: the row is
          not-prose, so an article body's link styling does not reach them. */}
      <p
        className={cn(
          "max-w-[64ch] text-pretty pb-5 text-base leading-relaxed text-muted-foreground",
          renderAnswer ? "[&_a]:tc-link" : null,
        )}
      >
        {renderAnswer ? renderAnswer(faq) : faq.a}
      </p>
    </details>
  ));
  const faqLd = structuredData ? (
    <JsonLd
      data={{
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: items.map((f) => ({
          "@type": "Question",
          name: f.q,
          acceptedAnswer: { "@type": "Answer", text: f.a },
        })),
      }}
    />
  ) : null;
  if (variant === "inline") {
    return (
      <>
        {/* data-faq-section: the list ends on its own rule, so a ruled block
            after it (AuthorBio) drops its top rule instead of stacking a
            second one 40px below. */}
        <section
          id={id}
          data-faq-section=""
          aria-labelledby={headingId}
          className={cn("not-prose", compact ? null : "mt-16")}
        >
          <SectionHeading id={headingId}>{heading}</SectionHeading>
          {intro ? (
            <p className="mt-3 max-w-[60ch] text-pretty text-lg leading-relaxed text-muted-foreground">
              {intro}
            </p>
          ) : null}
          <div className="mt-8 border-t-2 border-foreground">{rows}</div>
          {contact}
        </section>
        {/* Only one URL should claim this exact FAQ block in structured data. */}
        {faqLd}
      </>
    );
  }
  return (
    <>
      <Section
        id={id}
        rule={compact ? "none" : "rule"}
        containerClassName={compact ? "pt-0 sm:pt-0" : undefined}
        aria-labelledby={headingId}
      >
        {/* split: the hero's 5/7 grid with the hero's gaps, so the list
            starts where the hero's wide column does at every width. */}
        <div
          className={
            layout === "split"
              ? "grid gap-x-12 gap-y-8 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] xl:gap-x-16"
              : "max-w-3xl"
          }
        >
          <div>
            <SectionHeading id={headingId}>{heading}</SectionHeading>
            {intro ? (
              <p className="mt-3 max-w-[60ch] text-pretty text-lg leading-relaxed text-muted-foreground">
                {intro}
              </p>
            ) : null}
            {layout === "split" ? contact : null}
          </div>
          <div className={layout === "split" ? "border-t-2 border-foreground" : "mt-8 border-t-2 border-foreground"}>
            {rows}
          </div>
          {layout === "split" ? null : contact}
        </div>
      </Section>
      {/* Only one URL should claim this exact FAQ block in structured data. */}
      {faqLd}
    </>
  );
}
