import { describe, expect, it } from "vitest";

import { calculateAnalysis } from "@/lib/calc-analysis";
import {
  parseOneTimePdfDraft,
  resolveLegacyCompatibleOneTimePdfReportBinding,
  resolveOneTimePdfReportBinding,
} from "@/lib/one-time-pdf-report-binding";
import { buildMaoTarget } from "@/lib/mao-targets";
import { SAMPLE_DEAL_FIXTURE } from "@/lib/sample-deal";
import { parseOneTimePdfClaimSecret } from "@/lib/one-time-pdf-return";

describe("one-time PDF report binding restoration", () => {
  it("decodes only the versioned raw claim secret used by verification and export", () => {
    const secret = "s".repeat(43);
    expect(
      parseOneTimePdfClaimSecret(
        JSON.stringify({ v: 1, secret, savedAt: Date.now() })
      )
    ).toBe(secret);
    expect(parseOneTimePdfClaimSecret(secret)).toBeNull();
    expect(parseOneTimePdfClaimSecret(JSON.stringify({ v: 2, secret }))).toBeNull();
    expect(parseOneTimePdfClaimSecret(JSON.stringify({ v: 1, secret: "short" }))).toBeNull();
    expect(parseOneTimePdfClaimSecret("not-json")).toBeNull();
  });

  it("restores the production v2 draft with the historical screening defaults", () => {
    const values = SAMPLE_DEAL_FIXTURE.values;
    const restored = parseOneTimePdfDraft(
      JSON.stringify({ v: 2, values, savedAt: Date.now() })
    );
    const isCashPurchase = calculateAnalysis(values).monthlyPayment <= 0;

    expect(restored).toEqual({
      values,
      target: buildMaoTarget(null, { isCashPurchase }),
      source: "screening-defaults",
      legacyDefaulted: true,
    });
  });

  it("uses the cash-safe historical default for a legacy all-cash draft", () => {
    const values = {
      ...SAMPLE_DEAL_FIXTURE.values,
      downPaymentPct: 100,
    };

    expect(
      parseOneTimePdfDraft(JSON.stringify({ v: 2, values, savedAt: 1 }))
    ).toMatchObject({
      target: { monthlyCashFlow: 0 },
      source: "screening-defaults",
      legacyDefaulted: true,
    });
  });

  it("preserves an explicit current target and provenance", () => {
    const values = SAMPLE_DEAL_FIXTURE.values;
    const target = { monthlyCashFlow: 250, dscr: 1.3 };

    expect(
      parseOneTimePdfDraft(
        JSON.stringify({
          v: 4,
          values,
          maxOfferTarget: target,
          maxOfferTargetSource: "buy-box",
          savedAt: 1,
        })
      )
    ).toEqual({
      values,
      target,
      source: "buy-box",
      legacyDefaulted: false,
    });
  });

  it("does not reinterpret a target-less current draft as legacy", () => {
    expect(
      parseOneTimePdfDraft(
        JSON.stringify({
          v: 4,
          values: SAMPLE_DEAL_FIXTURE.values,
          savedAt: 1,
        })
      )
    ).toBeNull();
  });

  it("allows a legacy row to bind only to its historical target and source", () => {
    const values = SAMPLE_DEAL_FIXTURE.values;
    const historical = { monthlyCashFlow: 0, dscr: 1.25 };

    expect(
      resolveLegacyCompatibleOneTimePdfReportBinding({ values })
    ).toMatchObject({
      target: historical,
      source: "screening-defaults",
    });
    expect(
      resolveLegacyCompatibleOneTimePdfReportBinding({
        values,
        maxOfferTarget: historical,
        maxOfferTargetSource: "screening-defaults",
      })
    ).toMatchObject({ target: historical, source: "screening-defaults" });
    expect(
      resolveLegacyCompatibleOneTimePdfReportBinding({
        values,
        maxOfferTarget: historical,
        maxOfferTargetSource: "selected-targets",
      })
    ).toBeNull();
    expect(
      resolveLegacyCompatibleOneTimePdfReportBinding({
        values,
        maxOfferTarget: { monthlyCashFlow: 500, dscr: 1.25 },
        maxOfferTargetSource: "screening-defaults",
      })
    ).toBeNull();
  });

  it("defaults only a fully omitted legacy pair, never partial or malformed input", () => {
    const values = SAMPLE_DEAL_FIXTURE.values;

    expect(
      resolveOneTimePdfReportBinding(
        { values, maxOfferTargetSource: "selected-targets" },
        { allowLegacyDefault: true }
      )
    ).toBeNull();
    expect(
      resolveOneTimePdfReportBinding(
        { values, maxOfferTarget: { monthlyCashFlow: 100 } },
        { allowLegacyDefault: true }
      )
    ).toBeNull();
    expect(
      resolveOneTimePdfReportBinding(
        {
          values,
          maxOfferTarget: { monthlyCashFlow: "100" },
          maxOfferTargetSource: "selected-targets",
        },
        { allowLegacyDefault: true }
      )
    ).toBeNull();
    expect(
      resolveOneTimePdfReportBinding(
        { values },
        { allowLegacyDefault: false }
      )
    ).toBeNull();
  });
});
