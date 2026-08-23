import { describe, expect, it } from "vitest";

import { calculateAnalysis } from "../calc-analysis";
import {
  calculateMaxAllowableOffer,
  solveRequiredInterestRate,
  solveRequiredMonthlyRent,
} from "../max-allowable-offer";
import { describeMaoTarget } from "../mao-targets";
import { buildReportMaxOffer, resolveReportMaoTarget } from "../report-max-offer";
import { SAMPLE_DEAL_FIXTURE } from "../sample-deal";
import { buildOfferCeilingPresentation } from "../offer-ceiling";

describe("report Max Offer and Deal Doctor", () => {
  it("uses the supplied saved target for every acquisition number and its basis", () => {
    const values = SAMPLE_DEAL_FIXTURE.values;
    const result = calculateAnalysis(values);
    const target = SAMPLE_DEAL_FIXTURE.maoTarget;
    const expectedMaxOffer = calculateMaxAllowableOffer(values, target);
    const expectedRent = solveRequiredMonthlyRent(values, target);
    const expectedRate = solveRequiredInterestRate(values, target);

    const report = buildReportMaxOffer({
      values,
      result,
      targetInput: target,
      targetSourceInput: "buy-box",
    });
    const presentation = buildOfferCeilingPresentation({
      values,
      result: expectedMaxOffer!,
      source: "buy-box",
    });

    expect(expectedMaxOffer).not.toBeNull();
    expect(report).not.toBeNull();
    expect(report).toEqual({
      maxPrice: expectedMaxOffer!.maxPrice,
      basis: describeMaoTarget(target),
      source: "buy-box",
      sourceLabel: "Under your Buy Box",
      currentPriceGap: expectedMaxOffer!.maxPrice - values.purchasePrice,
      bindingConstraints: presentation.bindingConstraints.map((item) => item.criterion),
      nextConstraint: presentation.nextConstraint?.criterion ?? null,
      range: presentation.range,
      achieved: {
        monthlyCashFlow: expectedMaxOffer!.achieved.netCashFlow,
        cocReturn: expectedMaxOffer!.achieved.cocReturn,
        capRate: expectedMaxOffer!.achieved.capRate,
        dscr: expectedMaxOffer!.achieved.dscr,
      },
      requiredMonthlyRent: expectedRent
        ? {
            value: expectedRent.value,
            alreadyMet: expectedRent.alreadyMet,
            unreachable: expectedRent.unreachable,
          }
        : null,
      requiredInterestRate: expectedRate
        ? {
            value: expectedRate.value,
            alreadyMet: expectedRate.alreadyMet,
            unreachable: expectedRate.unreachable,
          }
        : null,
    });

    const canonical = buildReportMaxOffer({ values, result, targetInput: undefined });
    expect(canonical?.maxPrice).not.toBe(report?.maxPrice);
  });

  it("fails closed to the canonical basis for an invalid persisted target", () => {
    const invalid = resolveReportMaoTarget(
      { dscr: "1.25", recommendation: "buy" },
      { isCashPurchase: false }
    );

    expect(invalid).toEqual({ monthlyCashFlow: 0, dscr: 1.25 });
    expect(describeMaoTarget(invalid)).toBe("break-even cash flow · DSCR ≥ 1.25");
  });

  it("drops DSCR for cash purchases and retains another valid saved criterion", () => {
    expect(
      resolveReportMaoTarget(
        { monthlyCashFlow: 750, dscr: 1.25 },
        { isCashPurchase: true }
      )
    ).toEqual({ monthlyCashFlow: 750 });

    expect(resolveReportMaoTarget({ dscr: 1.25 }, { isCashPurchase: true })).toEqual({
      monthlyCashFlow: 0,
    });
  });
});
