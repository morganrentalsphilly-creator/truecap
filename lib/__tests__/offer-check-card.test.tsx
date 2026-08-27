import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { InputConfidenceCard } from "@/components/investcalc/input-confidence-card";
import {
  buildInputConfidence,
  INPUT_CONFIDENCE_FIELD_KEYS,
  type InputConfidenceFieldKey,
} from "@/lib/input-confidence";
import type { InvestmentFormValues } from "@/lib/investcalc-schema";
import { SAMPLE_DEAL_VALUES } from "@/lib/sample-deal";

function renderOfferChecks(
  values: InvestmentFormValues,
  strategy: "buy-hold" | "house-hack" | "short-term" = "buy-hold",
  verified: readonly InputConfidenceFieldKey[] = [],
): string {
  const confidence = buildInputConfidence({
    values,
    now: new Date("2026-08-27T12:00:00.000Z"),
    verified,
  });

  return renderToStaticMarkup(
    <InputConfidenceCard
      confidence={confidence}
      values={values}
      advocacyContractEnabled
      analyzerStrategyKey={strategy}
      onEditAssumptions={vi.fn()}
      onReviewInput={vi.fn()}
      onToggleVerified={vi.fn()}
    />,
  );
}

describe("offer check card", () => {
  it("shows only two direct, sensitivity-ranked checks without a save or checklist detour", () => {
    const markup = renderOfferChecks(SAMPLE_DEAL_VALUES);

    expect(markup).toContain("Before you offer");
    expect(markup).toContain(
      "Double-check the biggest cash-flow drivers. Edit anything that looks wrong.",
    );
    expect(markup.match(/<li/g)).toHaveLength(2);
    expect(markup.match(/<button/g)).toHaveLength(2);
    const rentIndex = markup.indexOf("Rent ·");
    const priceIndex = markup.indexOf("Purchase price ·");
    expect(rentIndex).toBeGreaterThan(-1);
    expect(priceIndex).toBeGreaterThan(rentIndex);
    expect(markup).not.toContain("Edit rate");
    expect(markup).not.toContain("Verify before relying");
    expect(markup).not.toContain("material assumption");
    expect(markup).not.toContain("Save to use checklist");
    expect(markup).not.toContain("Open deal checklist");
    expect(markup).not.toContain("<details");
  });

  it("uses the real short-term revenue controls and source wording", () => {
    const markup = renderOfferChecks(
      {
        ...SAMPLE_DEAL_VALUES,
        avgDailyRate: 225,
        occupancyPct: 68,
      },
      "short-term",
    );

    expect(markup).toContain("Nightly rate and occupancy");
    expect(markup).toContain("$225/night · 68% occupancy");
    expect(markup).toContain("Your entered nightly rate and occupancy");
    expect(markup).toContain("Edit rate &amp; occupancy");
    expect(markup).not.toContain("All unit rents");
  });

  it("describes house-hack income as rental-unit rents and excludes mortgage rate for cash", () => {
    const houseHackValues = {
      ...SAMPLE_DEAL_VALUES,
      propertyType: "owner-occupant",
      monthlyRent: 0,
      units: [
        {
          bedrooms: 2,
          monthlyRent: 0,
          isOwnerOccupied: true,
        },
        {
          bedrooms: 2,
          monthlyRent: 1_650,
          isOwnerOccupied: false,
        },
      ],
      downPaymentPct: 100,
    } as InvestmentFormValues;
    const markup = renderOfferChecks(houseHackValues, "house-hack");

    expect(markup).toContain("Rental-unit rents");
    expect(markup).toContain("$1,650/mo total");
    expect(markup).toContain("Your entered rental-unit rents");
    expect(markup).toContain("Edit rental-unit rents");
    expect(markup).not.toContain("Mortgage rate");
    expect(markup).not.toContain("Edit rate");
  });

  it("does not nag inputs the investor already confirmed", () => {
    const markup = renderOfferChecks(
      SAMPLE_DEAL_VALUES,
      "buy-hold",
      INPUT_CONFIDENCE_FIELD_KEYS,
    );

    expect(markup).toContain("The key inputs were previously confirmed.");
    expect(markup).not.toContain("<li");
    expect(markup.match(/<button/g)).toHaveLength(1);
    expect(markup).toContain("Edit assumptions");
  });

  it("announces a blocked criteria draft and disables every edit action", () => {
    const confidence = buildInputConfidence({ values: SAMPLE_DEAL_VALUES });
    const markup = renderToStaticMarkup(
      <InputConfidenceCard
        confidence={confidence}
        values={SAMPLE_DEAL_VALUES}
        advocacyContractEnabled
        actionsBlocked
        actionsBlockedReason="Apply or cancel your criteria edits before reviewing inputs."
        onEditAssumptions={vi.fn()}
        onReviewInput={vi.fn()}
        onToggleVerified={vi.fn()}
      />,
    );

    expect(markup).toContain('role="status"');
    expect(markup).toContain(
      "Apply or cancel your criteria edits before reviewing inputs.",
    );
    expect(markup.match(/disabled=""/g)).toHaveLength(2);
  });
});
