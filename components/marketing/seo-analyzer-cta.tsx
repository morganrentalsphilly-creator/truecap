/**
 * SEO-page analyzer module — the "Get My Max Offer" bridge from every
 * content page into the analyzer, with geographic prefill where the page
 * implies one (2026-08-17 offer rollout, Phase 4c).
 *
 * Server component: renders a Link built by lib/analyzer-handoff.ts
 * (?address=&strategy= etc. — the analyzer consumes these at mount, so a
 * market page's CTA lands with the city pre-typed). Mounted once per
 * TEMPLATE (glossary/states/markets/combos) and once per shared component
 * for the hand-written families (tools via tools-conversion-cta, blog via
 * related-blog-posts, vs via comparison-faq).
 */

import Link from "next/link";
import { ArrowRight, Calculator } from "lucide-react";
import { buildAnalyzerHandoffUrl, type AnalyzerHandoff } from "@/lib/analyzer-handoff";

export function SeoAnalyzerCta({
  context,
  handoff,
  utmSource,
}: {
  /** One line naming what the reader was just looking at, e.g. "a Columbus deal". */
  context?: string;
  /** Optional analyzer prefill (address, strategy, …). */
  handoff?: AnalyzerHandoff;
  utmSource?: string;
}) {
  // Attribution must survive the no-handoff path too — most call sites
  // (glossary, vs, playbook) pass no prefill but still need utm_source.
  const href = handoff
    ? buildAnalyzerHandoffUrl(handoff, utmSource ? { utmSource } : undefined)
    : utmSource
      ? `/?utm_source=${encodeURIComponent(utmSource)}#main`
      : "/#main";
  return (
    <div className="rounded-2xl border border-border bg-card p-5 sm:flex sm:items-center sm:justify-between sm:gap-6 sm:p-6">
      <div>
        <p className="text-sm font-bold text-foreground">
          Ready to run {context ?? "a real deal"}?
        </p>
        <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
          Free 60-second analysis, sourced assumptions, no signup — and Pro
          solves the exact maximum offer that still hits your targets.
        </p>
      </div>
      <Link
        href={href}
        prefetch={false}
        className="mt-3 inline-flex h-10 shrink-0 items-center gap-1.5 rounded-lg bg-primary px-4 text-sm font-bold text-primary-foreground shadow-[0_8px_22px_rgba(0,112,196,0.24)] hover:bg-primary/95 sm:mt-0"
      >
        <Calculator className="size-4" />
        Get My Max Offer
        <ArrowRight className="size-4" />
      </Link>
    </div>
  );
}
