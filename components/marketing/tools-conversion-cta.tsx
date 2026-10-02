/**
 * Compatibility wrapper used by public calculator pages. It delegates to
 * the same single, inline contextual CTA used across the public content
 * templates, so tools do not add signup detours or exit-intent overlays.
 *
 * The wrapper only spaces the CTA from the tool content above it. It sets no
 * width or centering of its own: the CTA takes its page's column, whether
 * that is a calculator page's own centered main (the pages not yet on the
 * ledger layout) or a converted page's Section.
 */

import { SeoAnalyzerCta } from "@/components/marketing/seo-analyzer-cta";

interface ToolsConversionCtaProps {
  /** Name of the calculator the user just used — shown in the pitch. */
  calculatorName: string;
  /** Optional one-liner that ties the pitch to this specific tool. */
  hook?: string;
}

export function ToolsConversionCta({
  calculatorName,
  hook,
}: ToolsConversionCtaProps) {
  return (
    <div className="mt-12">
      <SeoAnalyzerCta
        context={`a full property after using the ${calculatorName.toLowerCase()}`}
        utmSource="tool"
        supportingText={
          hook ??
          "Run the rental analyzer with labeled, editable assumptions. No signup is required for the first analysis."
        }
      />
    </div>
  );
}
