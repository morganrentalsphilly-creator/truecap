/**
 * The site's author: the TrueCap Organization, unnamed.
 *
 * Founder decision (2026-09-07, restated 2026-09-27): stay unnamed. The
 * author is the TrueCap Organization; pages carry the unnamed byline and a
 * name-free bio. Nothing here, or anywhere that renders it, names a person
 * or adds credentials, experience claims or a Person node.
 *
 * The human-editable copy is seo/author.md. This module must say exactly
 * what that file says: lib/__tests__/author-byline-bio.test.tsx fails when
 * the two drift, so edit both together.
 *
 * Rendered by:
 *   · AUTHOR_BYLINE_SUFFIX → components/marketing/blog-byline.tsx, in the
 *     header of every blog post and every /vs/<slug> page;
 *   · AUTHOR_BIO → app/about/page.tsx ("Who builds this") and
 *     components/marketing/author-bio.tsx, at the end of every blog post
 *     (through RelatedBlogPosts) and every /vs/<slug> page.
 *
 * Pure data: no imports.
 */

/** The byline after "By TrueCap · ". */
export const AUTHOR_BYLINE_SUFFIX = "built by a Philadelphia rental investor";

/** The bio: the founder's own published, name-free "Who builds this" paragraph from /about. */
export const AUTHOR_BIO =
  "TrueCap is built by one person, a rental investor in Philadelphia. It started as the tool he wanted for his own underwriting — a way to get from an address to a source-labeled first-pass answer in about a minute — and it's still how he runs the deals he considers.";
