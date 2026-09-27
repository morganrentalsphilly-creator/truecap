/**
 * End-of-article "About TrueCap" block: the unnamed author bio.
 *
 * Renders AUTHOR_BIO from lib/author.ts (which must equal seo/author.md's
 * Bio) with links to /about and /methodology. The author is the TrueCap
 * Organization; nothing here names a person (founder decision, 2026-09-27).
 *
 * Mounted once per page:
 *   · every blog post, through RelatedBlogPosts — the block every post
 *     (standalone or SourceFirstArticle) already renders after its body;
 *   · every /vs/<slug> page, directly, after its related links.
 * lib/__tests__/author-byline-bio.test.tsx renders all of them and fails
 * when one loses the block or renders it twice.
 */

import Link from "next/link";
import { AUTHOR_BIO } from "@/lib/author";

const LINK_CLASS =
  "inline-flex min-h-11 items-center text-sm font-semibold text-foreground underline decoration-border underline-offset-4 transition-colors hover:decoration-primary focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50";

export function AuthorBio({ className = "" }: { className?: string }) {
  return (
    <section
      aria-labelledby="about-truecap-heading"
      data-author-bio=""
      className={`mt-10 rounded-2xl border border-border bg-card p-5 sm:p-6 ${className}`.trim()}
    >
      <h2
        id="about-truecap-heading"
        className="text-2xs font-bold uppercase tracking-widest text-muted-foreground"
      >
        About TrueCap
      </h2>
      <p className="mt-2 max-w-[68ch] text-sm leading-relaxed text-foreground">
        {AUTHOR_BIO}
      </p>
      <p className="mt-2 flex flex-wrap gap-x-6">
        <Link href="/about" className={LINK_CLASS}>
          More about TrueCap
        </Link>
        <Link href="/methodology" className={LINK_CLASS}>
          How the numbers are built
        </Link>
      </p>
    </section>
  );
}
