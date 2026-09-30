/**
 * Compatibility wrapper used by every article. The name is historical;
 * this is deliberately an inline, non-intrusive instance of the shared
 * contextual CTA.
 *
 * Posts mount it after </main>, straight in the page root, so it brings the
 * article column with it: the same max-w-3xl column and gutters as the
 * posts' own main, which puts the CTA's rule on the article's left edge
 * instead of across the whole viewport.
 *
 * This column is tied to the posts' current layout. When the posts move to
 * the ledger article layout (PAGE_CONTAINER and a 68ch reading column),
 * change this wrapper to match in the same commit, or the CTA sits off the
 * article's left edge. Keep it prop-free: passive-conversion-cta.test.ts
 * counts the literal `<BlogStickyCta />` in every post.
 */

import { SeoAnalyzerCta } from "@/components/marketing/seo-analyzer-cta";

export function BlogStickyCta() {
  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6">
      <SeoAnalyzerCta
        context="the property behind this topic"
        utmSource="blog"
        supportingText="Apply the idea to a real property with labeled starting assumptions, no signup, and no property details placed in the referral URL."
      />
    </div>
  );
}
