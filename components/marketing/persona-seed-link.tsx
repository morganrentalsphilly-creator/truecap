"use client";

/**
 * Seeded persona-card CTA. Lives in its own tiny client component so
 * landing-sections.tsx can stay a server component (a deliberate choice —
 * see its top-of-file NOTE).
 *
 * Why the onClick: the persona cards render on "/" — the same route as the
 * calculator — so this Link is a soft navigation. The URL gains ?strategy=
 * but the calculator's mount-time readAnalyzerHandoff never re-runs, which
 * left these seeds inert. Dispatching ANALYZER_STRATEGY_EVENT delivers the
 * strategy to the already-mounted calculator live (the hero address form's
 * handshake pattern); hard loads and open-in-new-tab still consume the URL
 * param at mount, so the href stays shareable.
 */

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import {
  ANALYZER_STRATEGY_EVENT,
  type AnalyzerStrategyEventDetail,
  type HandoffStrategyKey,
} from "@/lib/analyzer-handoff";

export function PersonaSeedLink({
  href,
  label,
  strategy,
}: {
  href: string;
  label: string;
  strategy: HandoffStrategyKey;
}) {
  return (
    <Link
      href={href}
      prefetch={false}
      onClick={() => {
        window.dispatchEvent(
          new CustomEvent<AnalyzerStrategyEventDetail>(ANALYZER_STRATEGY_EVENT, {
            detail: { strategy },
          })
        );
      }}
      className="mt-3 inline-flex min-h-11 items-center gap-1 rounded text-sm font-semibold text-primary underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      {label}
      <ArrowRight className="size-3.5" />
    </Link>
  );
}
