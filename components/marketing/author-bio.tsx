/**
 * End-of-article "About TrueCap" block: the unnamed author bio.
 *
 * Renders AUTHOR_BIO from lib/author.ts (which must equal seo/author.md's
 * Bio) with links to /about and /methodology. The author is the TrueCap
 * Organization; nothing here names a person (founder decision, 2026-09-27).
 *
 * Set like the homepage's BuiltByInvestor block: a narrow column on the
 * section rule, no card, no avatar or photo, no name.
 *
 * Mounted once per page:
 *   · every blog post, through RelatedBlogPosts — the block every post
 *     (standalone or SourceFirstArticle) already renders after its body;
 *   · every /vs/<slug> page, directly, after its related links.
 * lib/__tests__/author-byline-bio.test.tsx renders all of them and fails
 * when one loses the block or renders it twice. It stays a <section>
 * (never a <footer> or <nav>, which the SEO loop's main text strips).
 *
 * Always below the fold, so its links prefetch on hover or keyboard focus
 * (IntentPrefetchLink), not on scroll (lib/__tests__/intent-prefetch-shared.test.ts).
 */

import { IntentPrefetchLink } from "@/components/marketing/intent-prefetch-link";
import { AUTHOR_BIO } from "@/lib/author";
import { cn } from "@/lib/utils";

const LINK_CLASS = "tc-link inline-flex min-h-11 items-center";

/**
 * One rule per boundary: the bio opens on the section rule, unless the block
 * right before it is a post's FAQ (data-faq-section, directly or as the last
 * child of the <article> it ends), whose last row already closes on the same
 * 1px rule. Two identical rules 48px apart read as a stray double rule, which
 * the system keeps for a final total. After a Sources list the bio keeps its
 * rule: that list ends on an inset soft row rule, and the section rule is
 * what marks the boundary between two sections (DESIGN.md "Rules carry the
 * structure").
 *
 * mt-12: the one gap between the blocks after an article (the reading list
 * after the bio and the capture block inside it take the same step).
 */
const AFTER_FAQ_ROWS = "[[data-faq-section]+&]:border-t-0 [:has(>[data-faq-section]:last-child)+&]:border-t-0";

export function AuthorBio({ className = "" }: { className?: string }) {
  return (
    <section
      aria-labelledby="about-truecap-heading"
      data-author-bio=""
      className={cn("mt-12 border-t border-border pt-6", AFTER_FAQ_ROWS, className)}
    >
      <div className="max-w-[68ch]">
        <h2
          id="about-truecap-heading"
          className="font-display text-balance text-h3-sm sm:text-2xl"
        >
          About TrueCap
        </h2>
        <p className="mt-3 text-base leading-relaxed">{AUTHOR_BIO}</p>
        <p className="mt-2 flex flex-wrap gap-x-6 text-base">
          <IntentPrefetchLink href="/about" className={LINK_CLASS}>
            More about TrueCap
          </IntentPrefetchLink>
          <IntentPrefetchLink href="/methodology" className={LINK_CLASS}>
            How the numbers are built
          </IntentPrefetchLink>
        </p>
      </div>
    </section>
  );
}
