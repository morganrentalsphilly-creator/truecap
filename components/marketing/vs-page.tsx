/**
 * The /vs comparison page frame (DESIGN.md "Components"; the hub at
 * app/vs/page.tsx is its sibling): the hero's frame, the comparison table on
 * the homepage ladder's grammar, and the class strings the 38 pages share.
 * Server components and class strings only, synchronous, with no copy of
 * their own.
 *
 *   <div className="relative overflow-x-clip">          root, as on the hub
 *     the Header, the page's WebPage JSON-LD, VsBreadcrumbSchema
 *     <main id="main" tabIndex={-1} className="min-w-0 outline-none">
 *       <VsHero>                                        PageHero's frame
 *         <h1 className={VS_H1}>…</h1>
 *         <BlogByline />
 *         <p className={VS_LEDE}>…</p>
 *         <ActionRow className={VS_ACTIONS}>            AnalyzeCtaLink + outline link
 *         <p className={VS_NOTE}>…</p>
 *       </VsHero>
 *       <Section rule="none" …>  the ProductShot, as a document
 *       <Section …>  TL;DR: two ruled lists (VS_TLDR_LABEL, VS_TLDR_LIST)
 *       <Section …>  the matrix: SectionHeading, VS_INTRO, ScrollX around
 *                    <VsMatrixTable />, the source note (VS_SOURCES)
 *       <Section …>  the fit section: SectionHeading over a VS_PROSE column
 *                    (a plain <ul> or <ol>, then its plain <p>s)
 *       <ComparisonFaq … />                             its own Section
 *       <CloseSection … />                              the heavy rule
 *       <Section rule="none" …>  RelatedContent, AuthorBio, Other comparisons
 *     </main>
 *     <SiteFooter /> <ScrollDepthTracker />
 *   </div>
 *
 * Wrappers and class strings, not one component with slots, on purpose (the
 * article frame in article.tsx made the same call):
 *   · every string stays in the page file. The SEO loop may write only
 *     app/vs/*\/page.tsx (ci.yml's fence, verify-static's vendorLinkAllow),
 *     and the claim guards (comparison-claim-guards, plan-claim-truth,
 *     unshipped-feature-claims, offer-copy-guards, …) scan app/vs only, so a
 *     string moved here would escape both. The page keeps its MATRIX rows with
 *     their literal `feature:`/`truecap:` keys and maps them into
 *     VsMatrixTable's rows;
 *   · the page keeps what tests read from its source: the literal <h1> with
 *     <BlogByline /> directly after it and <AuthorBio /> (author-byline-bio),
 *     analyticsSource="vs_hero" (analyzer-link-destinations), the first
 *     `<IntentPrefetchLink href="/tools/` and its lead-in
 *     (vs-page-copy-integrity), and prefetch={false} on every /analyze link;
 *   · below the hero every internal link is IntentPrefetchLink
 *     (components/marketing/intent-prefetch-link.tsx: it prefetches on hover
 *     or keyboard focus, never on scroll). Only the hero's own links keep
 *     next/link's default, and the /analyze links stay next/link with
 *     prefetch={false}. Every page imports IntentPrefetchLink, so a link the
 *     SEO loop adds needs no import; lib/__tests__/intent-prefetch-vs.test.ts
 *     fails a default-prefetch <Link> anywhere outside VsHero;
 *   · nothing here is async: lastmod-invents-none renders a page by calling
 *     it synchronously;
 *   · an element the SEO loop adds to a page needs no class constant and no
 *     import (its skills may add neither): the text blocks below style the
 *     plain <p>, <ul>, <ol> and <li> inside them and give any link in them
 *     the tc-link look. lib/__tests__/vs-design-pass.test.ts pins the /vs
 *     grammar.
 */

import type { ReactNode } from "react";
import { Check, Minus, X } from "lucide-react";
import { PAGE_CONTAINER } from "@/components/marketing/section";
import { cn } from "@/lib/utils";

/** The page H1: the display voice at the page-H1 sizes (PageHero's H1). */
export const VS_H1 =
  "font-display hyphens-auto break-words text-balance text-display-sm text-foreground lg:text-display";

/**
 * Every block below that holds running text gives a link inside it the
 * tc-link look (`[&_a]:tc-link`), with or without its class: the SEO loop's
 * seo-internal-links copies a file's link class, and a link written without
 * one would otherwise render as plain text (preflight inherits color and
 * decoration).
 */

/** The hero's opening paragraph, under the byline. */
export const VS_LEDE =
  "mt-6 max-w-[62ch] text-pretty text-lg leading-relaxed text-foreground [&_a]:tc-link";

/** The hero's action row (ActionRow), spaced as PageHero spaces its actions. */
export const VS_ACTIONS = "mt-6 sm:mt-7";

/** A short meta line in the hero: the risk line under the actions, a reviewed date. */
export const VS_NOTE = "mt-3 text-sm text-muted-foreground [&_a]:tc-link";

/** The paragraph under a section heading. */
export const VS_INTRO =
  "mt-3 max-w-[62ch] text-pretty text-lg leading-relaxed text-muted-foreground [&_a]:tc-link";

/** The TL;DR grid: two columns from 640px, each a label over a ruled list. */
export const VS_TLDR_GRID = "mt-8 grid max-w-5xl grid-cols-[minmax(0,1fr)] gap-x-12 gap-y-10 sm:grid-cols-2";

/** A TL;DR column's label ("Pick TrueCap if"). */
export const VS_TLDR_LABEL = "text-lg font-semibold";

/**
 * A TL;DR list: it opens on the 2px ink rule and each row sits on a soft
 * rule (RuledList's grammar). The rows are the page's plain <li>s, so a row
 * added to the page needs no class of its own.
 */
export const VS_TLDR_LIST =
  "mt-3 border-t-2 border-foreground text-base leading-relaxed [&>li]:border-b [&>li]:border-rule-soft [&>li]:py-3 [&>li]:text-pretty [&_a]:tc-link";

/** A note under the TL;DR lists (a roundup link, an honest take). */
export const VS_FOOTNOTE =
  "mt-8 max-w-[68ch] text-pretty text-base leading-relaxed text-muted-foreground [&_a]:tc-link";

/** The comparison table's source note, and any other small print under it. */
export const VS_SOURCES =
  "mt-4 max-w-[68ch] text-pretty text-sm leading-relaxed text-muted-foreground [&_a]:tc-link";

/**
 * A reading column of running text (always a <div>): under a section heading,
 * under the table, after the TL;DR lists. The marketing body at 60ch of its
 * 18px text, the article column's measure (ArticleMain's 68ch of the 16px
 * base), 24px between its blocks, run-in <strong> labels at 600, and every
 * link in the tc-link look even without its class.
 *
 * Everything in it is the page's plain elements, styled from here, so a
 * paragraph, list or row the SEO loop adds needs no class and no import
 * (.claude/skills/seo-refresh and seo-striking-distance say so):
 *   · a <p> is a paragraph;
 *   · a <ul> is a list of points: on the 2px ink rule, a soft rule under each
 *     row (RuledList's grammar). Alternatives whose order carries nothing
 *     ("if you want X", "if you want Y") are a <ul>;
 *   · an <ol> is a real sequence (how the two tools are used in turn), on the
 *     same rules and numbered in DM Mono Ink 2 (StepList's grammar). The
 *     numbers are CSS counters, so its <li>s stay plain.
 * Only the column's direct children are styled, so the TL;DR and small-print
 * lists elsewhere on the page keep their own grammar.
 */
export const VS_PROSE = [
  "mt-6 max-w-[60ch] text-pretty text-lg leading-relaxed [&>*+*]:mt-6 [&_a]:tc-link [&_strong]:font-semibold",
  // <ul> and <ol>: on the ink rule, a soft rule under each row.
  "[&>ul]:border-t-2 [&>ul]:border-foreground [&>ul>li]:border-b [&>ul>li]:border-rule-soft [&>ul>li]:py-4",
  "[&>ol]:border-t-2 [&>ol]:border-foreground [&>ol>li]:border-b [&>ol>li]:border-rule-soft [&>ol>li]:py-4",
  // <ol> only: the DM Mono step number.
  "[&>ol]:[counter-reset:vs-step] [&>ol>li]:relative [&>ol>li]:pl-10 [&>ol>li]:[counter-increment:vs-step] [&>ol>li]:before:absolute [&>ol>li]:before:left-0 [&>ol>li]:before:font-mono [&>ol>li]:before:text-base [&>ol>li]:before:tabular-nums [&>ol>li]:before:text-muted-foreground [&>ol>li]:before:content-[counter(vs-step)]",
].join(" ");

/** A standalone link row: a tc-link with a 44px target ("Other comparisons"). */
export const VS_LINK_ROW = "tc-link inline-flex min-h-11 items-center text-base";

/**
 * The hero's frame: PageHero's container, padding and single reading column,
 * on the rule that closes it. Not PageHero itself, because PageHero writes the
 * H1 and a /vs page must write its own <h1> with <BlogByline /> right after it.
 * One column, no aside: /vs H1s run to 100 characters, which the homepage's
 * 5/7 column would stack six lines deep, so the screenshot gets its own
 * section under the hero.
 */
export function VsHero({ children }: { children: ReactNode }) {
  return (
    <section className="border-b border-border bg-background">
      <div className={cn(PAGE_CONTAINER, "pb-12 pt-6 sm:pb-16 sm:pt-10 lg:pb-18 lg:pt-12")}>
        <div className="min-w-0 max-w-3xl">{children}</div>
      </div>
    </section>
  );
}

/** Which side a matrix row favors. Workflow matrices score nothing and omit it. */
export type VsMatrixWinner = "truecap" | "competitor" | "tie";

export type VsMatrixRow = {
  /** The row's label (the page's `feature` or `workflow`); also its key. */
  label: string;
  truecap: ReactNode;
  competitor: ReactNode;
  winner?: VsMatrixWinner;
};

/** The mark beside a cell: the side the row favors, an even row, the other side. */
function MatrixMark({
  winner,
  side,
  winnerMark,
}: {
  winner: VsMatrixWinner;
  side: "truecap" | "competitor";
  winnerMark: "ink" | "positive";
}) {
  const className = "mt-0.5 size-4 shrink-0 sm:mt-1";
  if (winner === "tie") return <Minus aria-hidden className={cn(className, "text-muted-foreground")} />;
  if (winner === side) {
    return (
      <Check
        aria-hidden
        className={cn(className, winnerMark === "positive" ? "text-positive" : "text-foreground")}
      />
    );
  }
  return <X aria-hidden className={cn(className, "text-muted-foreground")} />;
}

function MatrixCell({
  row,
  side,
  winnerMark,
}: {
  row: VsMatrixRow;
  side: "truecap" | "competitor";
  winnerMark: "ink" | "positive";
}) {
  const text = side === "truecap" ? row.truecap : row.competitor;
  if (!row.winner) return <>{text}</>;
  return (
    <span className="flex items-start gap-2">
      <MatrixMark winner={row.winner} side={side} winnerMark={winnerMark} />
      <span className="min-w-0">{text}</span>
    </span>
  );
}

/**
 * The comparison table, set in the homepage ladder's grammar
 * (landing-sections.tsx, under the plan cards): no fill and no radius, the 2px
 * ink rule over sentence-case heads, a rule under the heads, soft rules between
 * rows, the row label as the row's header. The winner marks are quiet: an ink
 * check beside the side a row favors, an Ink 2 cross beside the other and an
 * Ink 2 dash on both sides of an even row. Which side "wins" is the page's
 * reading of fit, not a pass or fail against a target, so the check is not
 * Ledger Green (DESIGN.md "Color": the Sign Rule). `winnerMark="positive"`
 * exists for a page whose own copy describes a green check, until that copy
 * changes. The marks are aria-hidden, as they were.
 *
 * The page wraps it in <ScrollX label="Comparison table"> so a phone can reach
 * a table that overflows. Fixed columns (a quarter for the labels, the rest
 * split evenly) keep one long cell from squeezing the other side. At 375px a
 * long label hyphenates in its narrow column, and any word that still does not
 * fit breaks rather than widen the page.
 */
export function VsMatrixTable({
  head,
  rows,
  winnerMark = "ink",
}: {
  /** The three column heads, as the page writes them: label column, TrueCap, the competitor. */
  head: readonly [ReactNode, ReactNode, ReactNode];
  rows: readonly VsMatrixRow[];
  winnerMark?: "ink" | "positive";
}) {
  return (
    <table className="w-full table-fixed border-collapse border-t-2 border-foreground text-sm break-words sm:text-base">
      <colgroup>
        <col className="w-1/4" />
        <col className="w-3/8" />
        <col className="w-3/8" />
      </colgroup>
      <thead>
        <tr className="border-b border-border">
          {head.map((label, index) => (
            <th
              key={index}
              scope="col"
              className={cn("py-3 text-left align-bottom font-semibold", index < 2 && "pr-3 sm:pr-4")}
            >
              {label}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={row.label} className="border-b border-rule-soft align-top">
            <th scope="row" className="py-3 pr-3 text-left font-semibold hyphens-auto sm:pr-4">
              {row.label}
            </th>
            <td className="py-3 pr-3 leading-relaxed sm:pr-4">
              <MatrixCell row={row} side="truecap" winnerMark={winnerMark} />
            </td>
            <td className="py-3 leading-relaxed">
              <MatrixCell row={row} side="competitor" winnerMark={winnerMark} />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
