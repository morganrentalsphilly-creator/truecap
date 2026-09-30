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
 */

import Link from "next/link";
import { AUTHOR_BIO } from "@/lib/author";
import { cn } from "@/lib/utils";

const LINK_CLASS = "tc-link inline-flex min-h-11 items-center";

export function AuthorBio({ className = "" }: { className?: string }) {
  return (
    <section
      aria-labelledby="about-truecap-heading"
      data-author-bio=""
      className={cn("mt-10 border-t border-border pt-6", className)}
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
          <Link href="/about" className={LINK_CLASS}>
            More about TrueCap
          </Link>
          <Link href="/methodology" className={LINK_CLASS}>
            How the numbers are built
          </Link>
        </p>
      </div>
    </section>
  );
}
