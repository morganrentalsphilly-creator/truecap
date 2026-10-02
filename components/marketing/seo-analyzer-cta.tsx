/**
 * SEO-page analyzer module — the free-analysis bridge from every
 * content page into the analyzer, with geographic prefill where the page
 * implies one (2026-08-17 offer rollout, Phase 4c).
 *
 * Server component: builds an analyzer handoff that the client link scrubs
 * before rendering. Exact values are staged only for an eligible same-tab
 * click, so a market page's CTA can prefill without exposing them in href.
 * Mounted once per
 * TEMPLATE (glossary/states/markets/combos) and once per shared component
 * for the hand-written families (tools via tools-conversion-cta, blog via
 * blog-sticky-cta, vs via comparison-faq).
 *
 * Set in the FinalCta grammar (DESIGN.md "Components"): it opens on the 2px
 * ink rule, the question in the display voice at the H3 step, the supporting
 * line in Ink 2, one marketing button, and no card, icon or glow. It carries
 * no Section or page container of its own: every mount places it inside its
 * page's column, so it fits a 3xl article column as well as a wider page.
 */

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  ANALYZER_ROUTE,
  buildAnalyzerHandoffUrl,
  type AnalyzerHandoff,
} from "@/lib/analyzer-handoff";
import {
  TrackedContentCtaLink,
  type ContentCtaType,
} from "@/components/analytics/tracked-content-cta-link";

export function SeoAnalyzerCta({
  context,
  handoff,
  utmSource,
  supportingText,
}: {
  /** One line naming what the reader was just looking at, e.g. "a Columbus deal". */
  context?: string;
  /** Optional analyzer prefill (address, strategy, …). */
  handoff?: AnalyzerHandoff;
  utmSource?: string;
  /** Optional page-specific bridge copy. It must not contain entered deal data. */
  supportingText?: string;
}) {
  // The page family must survive the no-handoff path too: most call sites
  // (glossary, vs, playbook) pass no prefill but still name where the click
  // came from. It travels as `from`, not `utm_source`: this is a hop inside
  // the site, and a utm_ parameter on it reaches analytics as a traffic
  // source and would overwrite the visitor's real one. Nothing reads the
  // value from the URL.
  // Every variant lands on /analyze: the analyzer moved off the homepage
  // (site overhaul Phase 2), so a homepage-fragment destination would drop the
  // visitor on the marketing hero and discard any staged prefill.
  const href = handoff
    ? buildAnalyzerHandoffUrl(handoff, {
        base: ANALYZER_ROUTE,
        ...(utmSource ? { utmSource } : {}),
      })
    : utmSource
      ? `${ANALYZER_ROUTE}?from=${encodeURIComponent(utmSource)}`
      : ANALYZER_ROUTE;
  const contentType: ContentCtaType =
    utmSource === "glossary"
      ? "glossary"
      : utmSource === "vs-page"
        ? "comparison"
        : utmSource === "playbook"
          ? "playbook"
          : utmSource === "blog"
            ? "blog"
            : utmSource === "tool"
              ? "tool"
              : "seo_content";
  return (
    <aside
      aria-label="Analyze your own deal"
      className="border-t-2 border-foreground pt-6 sm:grid sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end sm:gap-x-8"
    >
      <div className="min-w-0">
        <p className="font-display text-balance text-h3-sm sm:text-2xl">
          Ready to run {context ?? "a real deal"}?
        </p>
        <p className="mt-2 max-w-[56ch] text-pretty text-base leading-relaxed text-muted-foreground">
          {supportingText ??
            "Free 60-second analysis with labeled starting assumptions and no signup. Pro calculates your Offer Ceiling: the highest price that still meets your targets under the assumptions shown."}
        </p>
      </div>
      <TrackedContentCtaLink
        handoffHref={href}
        contentType={contentType}
        referralSource="inline_cta"
        className={cn(buttonVariants({ size: "cta" }), "mt-5 sm:mt-0")}
      >
        Analyze a property free
      </TrackedContentCtaLink>
    </aside>
  );
}
