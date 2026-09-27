/**
 * Article byline — the visible E-E-A-T author credit.
 *
 * Renders "By TrueCap · built by a Philadelphia rental investor" linking
 * to /about. The author is the TrueCap Organization and the founder is
 * never named (their request, 2026-09-07; restated 2026-09-27); /about
 * carries the Organization node that Article JSON-LD author nodes point
 * at. The text after "By TrueCap · " is AUTHOR_BYLINE_SUFFIX in
 * lib/author.ts, which must match seo/author.md's Byline.
 *
 * Rendered once per page, in the header:
 *   · every blog post, directly under the date line (standalone posts in
 *     their own header; the SourceFirstArticle posts through
 *     components/marketing/source-first-article.tsx);
 *   · every /vs/<slug> page, directly under the H1.
 * Add it to the header of every NEW post, right after the date line, and
 * point the post's Article `author` at the site Organization `@id`.
 * lib/__tests__/author-byline-bio.test.tsx renders every post and /vs page
 * and fails when one loses it.
 */

import Link from "next/link";
import { AUTHOR_BYLINE_SUFFIX } from "@/lib/author";

export function BlogByline() {
  return (
    <p className="mt-1.5 text-2xs uppercase tracking-widest text-muted-foreground font-bold">
      By{" "}
      <Link
        href="/about"
        className="text-foreground/80 underline decoration-border underline-offset-2 transition-colors hover:text-primary hover:decoration-primary"
      >
        TrueCap
      </Link>{" "}
      · {AUTHOR_BYLINE_SUFFIX}
    </p>
  );
}
