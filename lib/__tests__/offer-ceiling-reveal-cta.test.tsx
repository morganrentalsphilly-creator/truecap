import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  usePathname: () => "/analyze",
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));

import { FocusedDecisionSummary } from "@/components/investcalc/focused-decision-summary";
import { calculateAnalysis } from "@/lib/calc-analysis";
import type { OfferCeilingRangePreview } from "@/lib/offer-ceiling-contract";
import { SAMPLE_DEAL_FIXTURE, SAMPLE_DEAL_VALUES } from "@/lib/sample-deal";

/**
 * The anonymous range-preview reveal is presentation only: the server decides
 * exact vs. range access (app/actions/offer-ceiling.ts), and this CTA merely
 * explains the range and routes through the existing anonymous Save hand-off.
 */
function render({
  isAuthenticated,
  canShowPriceCeiling,
  rangePreview,
}: {
  isAuthenticated: boolean;
  canShowPriceCeiling: boolean;
  rangePreview: OfferCeilingRangePreview | null;
}): string {
  const values = SAMPLE_DEAL_VALUES;
  return renderToStaticMarkup(
    <FocusedDecisionSummary
      values={values}
      result={calculateAnalysis(values)}
      offerCeiling={null}
      rangePreview={rangePreview}
      target={SAMPLE_DEAL_FIXTURE.maoTarget}
      targetLabel="Cash flow ≥ $200/mo"
      targetSource="selected-targets"
      targetAdopted
      canShowPriceCeiling={canShowPriceCeiling}
      canTunePriceCeiling
      onExportPdf={vi.fn()}
      onTargetChange={vi.fn()}
      onAdoptTarget={vi.fn()}
      onTuneTargetsOpened={vi.fn()}
      onEditAssumptions={vi.fn()}
      onSave={vi.fn()}
      onCompareDeals={vi.fn()}
      onAnalyzeAnotherLikeThis={vi.fn()}
      onNewAnalysis={vi.fn()}
      onUpgrade={vi.fn()}
      isSaving={false}
      isAuthenticated={isAuthenticated}
    />,
  );
}

const asking = Number(SAMPLE_DEAL_VALUES.purchasePrice);
const belowAsking: OfferCeilingRangePreview = {
  lower: asking - 75_000,
  upper: asking - 50_000,
  increment: 25_000,
  downsideFeasible: true,
  upsideFeasible: true,
};

describe("anonymous Offer Ceiling reveal CTA", () => {
  it("invites an anonymous range-preview visitor to create a free account", () => {
    const markup = render({
      isAuthenticated: false,
      canShowPriceCeiling: false,
      rangePreview: belowAsking,
    });
    expect(markup).toContain("data-offer-ceiling-reveal");
    expect(markup).toContain(
      "This deal misses your targets at asking. TrueCap found the price where it works.",
    );
    expect(markup).toContain("Create a free account to reveal it");
  });

  it("never renders for signed-in users or when the exact ceiling is shown", () => {
    expect(
      render({
        isAuthenticated: true,
        canShowPriceCeiling: false,
        rangePreview: belowAsking,
      }),
    ).not.toContain("data-offer-ceiling-reveal");
    expect(
      render({
        isAuthenticated: false,
        canShowPriceCeiling: true,
        rangePreview: null,
      }),
    ).not.toContain("data-offer-ceiling-reveal");
  });
});
