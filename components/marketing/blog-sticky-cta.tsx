/**
 * Compatibility wrapper used by every article. The name is historical;
 * this is deliberately an inline, non-intrusive instance of the shared
 * contextual CTA.
 *
 * Posts mount it after </main>, straight in the page root, so by default it
 * brings the article column with it: the same max-w-3xl column and gutters
 * as those posts' own main, which puts the CTA's rule on the article's left
 * edge instead of across the whole viewport.
 *
 * A post on the ledger article frame (components/marketing/article.tsx)
 * already sets its column: it mounts `<BlogStickyCta inArticleColumn />`
 * inside `<ArticleEnd>` (PAGE_CONTAINER and the 68ch reading column), and
 * the CTA renders without the max-w-3xl column and gutters of its own, so
 * its rule starts on the text's left edge. A post not yet on the frame keeps
 * the bare `<BlogStickyCta />` and renders exactly as before.
 *
 * Mount it exactly once per post: passive-conversion-cta.test.ts counts the
 * `<BlogStickyCta … />` mounts in every post.
 */

import { SeoAnalyzerCta } from "@/components/marketing/seo-analyzer-cta";

export function BlogStickyCta({
  inArticleColumn = false,
}: {
  /** The caller (ArticleEnd) already places it in the article's reading column. */
  inArticleColumn?: boolean;
} = {}) {
  const cta = (
    <SeoAnalyzerCta
      context="the property behind this topic"
      utmSource="blog"
      supportingText="Apply the idea to a real property with labeled starting assumptions, no signup, and no property details placed in the referral URL."
    />
  );
  if (inArticleColumn) return cta;
  return <div className="mx-auto max-w-3xl px-4 sm:px-6">{cta}</div>;
}
