/**
 * Compatibility wrapper used by every article. The name is historical;
 * this is deliberately an inline, non-intrusive instance of the shared
 * contextual CTA.
 */

import { SeoAnalyzerCta } from "@/components/marketing/seo-analyzer-cta";

export function BlogStickyCta() {
  return (
    <SeoAnalyzerCta
      context="the property behind this topic"
      utmSource="blog"
      supportingText="Apply the idea to a real property with labeled starting assumptions, no signup, and no property details placed in the referral URL."
    />
  );
}
