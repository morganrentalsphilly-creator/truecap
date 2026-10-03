/**
 * The article frame (DESIGN.md "Components" and "Typography"): the shell a
 * blog post renders through, so the posts stop hand-rolling their own root,
 * container, header classes and prose wrapper. Server components and class
 * strings only; nothing here reads cookies or headers, so a static post stays
 * static.
 *
 *   <ArticlePage>                              root: paper, clips sideways bleed
 *     <Header initialUser={null} initialEntitlements={null} />
 *     (the page's own JSON-LD objects via JsonLd)
 *     <ArticleMain>                           <main id="main">: container + 68ch column
 *       <article>
 *         <header className={ARTICLE_HEADER}>
 *           <h1 className={ARTICLE_TITLE}>{TITLE}</h1>
 *           <p className={ARTICLE_META}>
 *             <Link href="/blog" className={ARTICLE_META_LINK}>Blog</Link> ·{" "}
 *             {new Date(PUBLISHED_AT).toLocaleDateString(…)} · {READING_TIME} min read
 *           </p>
 *           <BlogByline />
 *           <UnderTitleAnalyzeLink />            the one "Analyze a deal free" link (P2-80)
 *           <p className={ARTICLE_LEDE}>…</p>
 *         </header>
 *         <ArticleBody>…</ArticleBody>          prose prose-ledger (app/globals.css)
 *           (<ToolFormula …/>, <ArticleTable …>…</ArticleTable> inside it)
 *         <FaqSection variant="inline" structuredData={false} … />
 *         <ArticleBody className="mt-16">…</ArticleBody>
 *       </article>
 *       <PostSources … />
 *       <RelatedContent … />
 *       <RelatedBlogPosts currentSlug={SLUG} />
 *     </ArticleMain>
 *     <ArticleEnd>                             after </main>, before the footer
 *       <BlogStickyCta inArticleColumn />      the column is ArticleEnd's, not the CTA's
 *     </ArticleEnd>
 *     <SiteFooter />
 *     <ScrollDepthTracker />
 *   </ArticlePage>
 *
 * The frame is a set of wrappers rather than one component with slots, on
 * purpose:
 *   · the page file keeps mounting what tests and the SEO skills read from
 *     page sources: the Header, the literal <h1>{TITLE}</h1> inside a
 *     <header>, the date line with <BlogByline /> directly after it
 *     (author-byline-bio.test.tsx), exactly one <BlogStickyCta … /> mount
 *     (<BlogStickyCta inArticleColumn /> inside <ArticleEnd>) and one
 *     <RelatedBlogPosts /> (passive-conversion-cta.test.ts), the page's own
 *     JSON-LD with the literal "FAQPage" (seo-guards.test.ts);
 *   · source order stays render order, so a post still reads top to bottom;
 *   · converting a post is a swap of its wrappers, not a restructure.
 * The one Disclaimer stays SiteFooter's: nothing here renders another.
 * app/blog/1-percent-rule-rental-property/page.tsx is the reference post on
 * this frame; the SEO loop writes new posts in its shape.
 *
 * Links: the reference post's internal links, its date line's included, go
 * through IntentPrefetchLink (@/components/marketing/intent-prefetch-link),
 * which prefetches on hover or keyboard focus, not as the reader scrolls; its
 * /analyze links stay next/link with prefetch={false}, which never prefetches
 * the analyzer. The SEO loop's skills still write plain <Link> on a post (the
 * date line above, as seo-gap-article prescribes it, and seo-internal-links'
 * one added link on a blog source), so a loop-written post or a loop-added
 * link stays next/link until those skills say otherwise. verify-static's
 * tier 0 already reads <Link>, <IntentPrefetchLink> and <a> alike
 * (INTERNAL_LINK_TAGS in seo/scripts/verify-static.ts), so the fence is not
 * what keeps them plain. lib/__tests__/intent-prefetch-shared.test.ts pins
 * only the reference post's converted links.
 *
 * Parts for the posts the template fan-out converts (each also below):
 *   · UnderTitleAnalyzeLink (from page-parts.tsx): the one short analyzer
 *     link under the H1, directly after <BlogByline />;
 *   · ARTICLE_META_NEXT: a second meta line directly under ARTICLE_META's, so
 *     an eyebrow's words ("Ranking · 9 min read") and a "Published X ·
 *     Updated Y" line keep their words on two lines under the H1, in the meta
 *     line's own style; the line BlogByline follows is still the date line;
 *   · ToolFormula (from components/tools/tool-parts.tsx): a formula card;
 *   · ArticleTable: a prose table that may be wider than a phone.
 * They come from here (or page-parts.tsx) because the SEO loop's import
 * allow-list (seo/config.json paths.importAllow) covers
 * @/components/marketing/* but not @/components/tools/* or
 * @/components/ledger/*.
 *
 * ArticleBody's link rule outranks a utility class on any link inside it
 * (app/globals.css, prose-ledger): it sets the weight, the underline and the
 * hover color. A component mounted inside an ArticleBody that styles its own
 * links (a related-links nav, a button-styled link on a bg-primary fill) must
 * carry `not-prose` on its root, or it takes the article's link look.
 */

import type { ComponentProps, ReactNode } from "react";
import { PAGE_CONTAINER } from "@/components/marketing/section";
import { ScrollX } from "@/components/ui/scroll-x";
import { cn } from "@/lib/utils";

/**
 * The ledger's figure and verdict, for a post's prose (DESIGN.md "Do and
 * don't": compared figures in DM Mono tabular; green and orange only for a
 * pass or a miss against a target). A post takes them from the frame: the SEO
 * loop's import allow-list (seo/config.json paths.importAllow) covers
 * @/components/marketing/* but not @/components/ledger/*, so a direct import
 * would make verify-static refuse every later loop edit to the post.
 */
export { LedgerFigure, LedgerVerdict } from "@/components/ledger/ledger-parts";

/**
 * A formula printed between rules, in place of a post's formula card: the
 * calculator template's ToolFormula (`formula`, optional worked `example`;
 * not-prose, so it keeps its own type inside ArticleBody). Re-exported for
 * the same import fence as the ledger parts above.
 */
export { ToolFormula } from "@/components/tools/tool-parts";

/** The one "Analyze a deal free" link under the H1 (page-parts.tsx; audit row P2-80). */
export { UnderTitleAnalyzeLink } from "@/components/marketing/page-parts";

/**
 * The reading column. 68ch of the 16px base is about 60ch of the 18px body,
 * inside the 60-68ch measure; the header and the footer share its left edge
 * through PAGE_CONTAINER.
 */
const ARTICLE_COLUMN = "max-w-[68ch]";

/** The post header: space, not a rule, between it and the body. */
export const ARTICLE_HEADER = "mb-10 sm:mb-12";

/** The post's H1: the display voice at the page-H1 sizes (PageHero's H1). */
export const ARTICLE_TITLE =
  "font-display hyphens-auto break-words text-balance text-display-sm text-foreground lg:text-display";

/** The meta line under the H1: "Blog · Jun 23, 2026 · 10 min read". Nothing sits above the H1. */
export const ARTICLE_META = "mt-4 text-sm text-muted-foreground";

/**
 * A second meta line directly under the first: the same 14px Ink 2 line, 4px
 * under it, for words a post already shows that the first line does not hold
 * (an eyebrow's "Ranking · 9 min read" above, "Published X · Updated Y" here).
 */
export const ARTICLE_META_NEXT = "mt-1 text-sm text-muted-foreground";

/** The hub link inside the meta line: a tc-link with a 44px target that keeps the line's height. */
export const ARTICLE_META_LINK = "tc-link -my-3 inline-block py-3";

/**
 * The lede under the byline: in ink, as PageHero's lede and the homepage
 * hero's paragraph are, across the whole reading column so it shares the
 * body's right edge. Ink 2 stays on the meta and byline lines above it.
 */
export const ARTICLE_LEDE = "mt-6 text-pretty text-xl leading-snug text-foreground";

/** The page root: paper, and a clip for any sideways bleed (app/page.tsx's root). */
export function ArticlePage({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={cn("relative overflow-x-clip bg-background", className)}>{children}</div>;
}

/**
 * The skip link's target: <main id="main"> in the page container, the
 * content in a left-aligned reading column, at the tight rhythm.
 */
export function ArticleMain({
  children,
  className,
  ...props
}: {
  children: ReactNode;
  className?: string;
} & Omit<ComponentProps<"main">, "id" | "tabIndex" | "className" | "children">) {
  return (
    <main
      id="main"
      tabIndex={-1}
      className={cn(PAGE_CONTAINER, "min-w-0 py-12 outline-none sm:py-16", className)}
      {...props}
    >
      <div className={ARTICLE_COLUMN}>{children}</div>
    </main>
  );
}

/**
 * What follows the article outside <main> (its analyzer CTA), in the same
 * column so it lines up with the text above it instead of running full bleed.
 * Kept outside <main> so the SEO loop's main text does not count it.
 */
export function ArticleEnd({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn(PAGE_CONTAINER, className)}>
      <div className={ARTICLE_COLUMN}>{children}</div>
    </div>
  );
}

/** The article's running text: the typography plugin with the ledger mapping (app/globals.css). */
export function ArticleBody({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("prose prose-ledger max-w-none", className)}>{children}</div>;
}

/**
 * A table in a post's prose that may be wider than a phone. The bare <table>
 * inside takes prose-ledger's ruled look (sentence-case heads on the rule,
 * rows on soft rules), so it needs no classes; the wrapper is ScrollX, which
 * scrolls it inside the reading column, says "Scroll for more" while it
 * overflows and pins the first column (pass stickyFirstColumn={false} when
 * that column is long text). The pinned cells take the paper rather than
 * ScrollX's raised card and band, so the column does not read as a panel.
 * `label` names the scroll region for screen readers; keep the label the
 * table had. ScrollX is a client island: a page that imports this module
 * ships its few hundred bytes whether or not it renders a table.
 */
export function ArticleTable({
  label,
  stickyFirstColumn = true,
  children,
}: {
  label: string;
  stickyFirstColumn?: boolean;
  children: ReactNode;
}) {
  return (
    <ScrollX
      cue
      stickyFirstColumn={stickyFirstColumn}
      label={label}
      className={
        stickyFirstColumn
          ? "[&_table_td:first-child]:bg-background [&_table_th:first-child]:bg-background"
          : undefined
      }
    >
      {children}
    </ScrollX>
  );
}
