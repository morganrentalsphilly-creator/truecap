/**
 * Compatibility wrapper used by public calculator pages. It delegates to
 * the same single, inline contextual CTA used across the public content
 * templates, so tools do not add signup detours or exit-intent overlays.
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
    <div className="mx-auto mt-12 max-w-3xl">
      <SeoAnalyzerCta
        context={`a full property after using the ${calculatorName.toLowerCase()}`}
        utmSource="tool"
        supportingText={
          hook ??
          "Run the released rental analyzer with labeled, editable assumptions. No signup is required for the first analysis."
        }
      />
    </div>
  );
}
