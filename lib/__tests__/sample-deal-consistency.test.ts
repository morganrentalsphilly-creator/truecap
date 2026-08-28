import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { calculateAnalysis } from "../calc-analysis";
import {
  buildDealScoreInputFromAnalysis,
  computeDealScore,
} from "../deal-score";
import { calculateMaxAllowableOffer } from "../max-allowable-offer";
import { describeMaoTarget } from "../mao-targets";
import { calculateSampleDealOutcome } from "../sample-deal-analysis";
import { isFeatureReleased } from "../entitlements-catalog";
import {
  isTrueCapSyntheticSampleAddress,
  sampleProPreviewAddsCapability,
  SAMPLE_DEAL_FIXTURE,
} from "../sample-deal";

describe("versioned synthetic shared sample", () => {
  it("uses one complete fixture for the property, strategy, and visible targets", () => {
    expect(SAMPLE_DEAL_FIXTURE.fixtureVersion).toBe("synthetic-rental-v2");
    expect(SAMPLE_DEAL_FIXTURE.synthetic).toBe(true);
    expect(SAMPLE_DEAL_FIXTURE.values.analysisDate).toBe("2026-08-25");
    expect(SAMPLE_DEAL_FIXTURE.strategyKey).toBe("buy-hold");
    expect(SAMPLE_DEAL_FIXTURE.values.address).toBe(
      "TrueCap Synthetic Sample, Philadelphia, PA 19140, USA"
    );
    expect(SAMPLE_DEAL_FIXTURE.targetProfile).toEqual({
      id: "truecap-synthetic-sample-target",
      name: "Synthetic sample targets",
      version: "1.0",
      source: "selected-targets",
    });
    expect(describeMaoTarget(SAMPLE_DEAL_FIXTURE.maoTarget)).toBe(
      "cash flow ≥ $750/mo · DSCR ≥ 1.25"
    );
  });

  it("recognizes historical disposable sample drafts by their sentinel address", () => {
    expect(
      isTrueCapSyntheticSampleAddress(SAMPLE_DEAL_FIXTURE.values.address),
    ).toBe(true);
    expect(
      isTrueCapSyntheticSampleAddress(
        "  TRUECAP   SYNTHETIC SAMPLE, Philadelphia, PA 19140, USA  ",
      ),
    ).toBe(true);
    expect(
      isTrueCapSyntheticSampleAddress(
        "1700 W Erie Ave, Philadelphia, PA 19140, USA",
      ),
    ).toBe(false);
    expect(
      isTrueCapSyntheticSampleAddress(
        "TrueCap Synthetic Sample House, Philadelphia, PA 19140, USA",
      ),
    ).toBe(false);
    expect(isTrueCapSyntheticSampleAddress(null)).toBe(false);
  });

  it("returns identical homepage and opened-analysis decision numbers", () => {
    // Homepage path: the shared outcome helper used by MarketingHero.
    const homepage = calculateSampleDealOutcome();

    // Opened-analysis path: the real engines called from the values and target
    // loaded into the form. Keeping this independent catches fixture wiring
    // drift instead of merely comparing one helper to itself.
    const openedAnalysis = calculateAnalysis(SAMPLE_DEAL_FIXTURE.values);
    const openedScore = computeDealScore(
      buildDealScoreInputFromAnalysis(SAMPLE_DEAL_FIXTURE.values, openedAnalysis)
    );
    const openedMaxOffer = calculateMaxAllowableOffer(
      SAMPLE_DEAL_FIXTURE.values,
      SAMPLE_DEAL_FIXTURE.maoTarget
    );

    expect(openedMaxOffer?.maxPrice).toBe(homepage.maxOffer?.maxPrice);
    expect(openedScore.score).toBe(homepage.dealScore.score);
    expect(openedAnalysis.netCashFlow).toBe(homepage.analysis.netCashFlow);
    expect(openedAnalysis.capRate).toBe(homepage.analysis.capRate);
    expect(openedAnalysis.dscr).toBe(homepage.analysis.dscr);
    expect(homepage.maxOffer).not.toBeNull();
    expect(homepage.analysis.analysisDate).toBe(
      SAMPLE_DEAL_FIXTURE.values.analysisDate
    );
    expect(SAMPLE_DEAL_FIXTURE.values.purchasePrice).toBeGreaterThan(
      homepage.maxOffer!.maxPrice
    );
  });

  it("pins the deterministic sample decision against silent formula drift", () => {
    const { analysis, dealScore, maxOffer } = calculateSampleDealOutcome();
    expect({
      maxOffer: maxOffer?.maxPrice,
      dealScore: dealScore.score,
      cashFlow: Number(analysis.netCashFlow.toFixed(2)),
      capRate: Number(analysis.capRate.toFixed(4)),
      dscr: Number(analysis.dscr.toFixed(4)),
    }).toMatchInlineSnapshot(`
      {
        "capRate": 9.3328,
        "cashFlow": 554.04,
        "dealScore": 86,
        "dscr": 1.5222,
        "maxOffer": 236000,
      }
    `);
  });

  it("reconciles the homepage verdict with the sample price ceiling", () => {
    const hero = readFileSync(
      resolve(process.cwd(), "components/marketing/marketing-hero.tsx"),
      "utf8"
    );

    expect(hero).toContain('"Asking misses the sample targets"');
    expect(hero).not.toContain("Screening Index {Math.round(score.score)}/100");
    expect(hero).not.toContain("recommendationLabel(score.recommendation)");
  });

  it("seeds the fixture targets before the sample form submit can render", () => {
    const source = readFileSync(
      resolve(process.cwd(), "components/investcalc/investcalc-page.tsx"),
      "utf8"
    );
    const launchStart = source.indexOf("const handleTrySampleDeal = () =>");
    const launchEnd = source.indexOf("requestAnimationFrame(() =>", launchStart);
    const launch = source.slice(launchStart, launchEnd);

    expect(launch).toContain(
      "setAnalysisMaoTarget({ ...SAMPLE_DEAL_FIXTURE.maoTarget })"
    );
    expect(launch.indexOf("setAnalysisMaoTarget")).toBeLessThan(
      launch.indexOf("form.handleSubmit")
    );
    expect(source).toContain("analysisDateForExplicitV1Run({");
    expect(source).toContain("preserveExisting: pendingSampleRunRef.current");
  });
});

/**
 * The sample Pro preview is a marketing demo for a visitor who does NOT have
 * the paid report. It costs the viewer their own framing — the property is
 * relabelled "Philadelphia rental example" and the criteria are presented as
 * product examples — so it must switch OFF for anyone who already has every
 * panel it can show. The live regression: `tax_strategy` and `exit_scenarios`
 * were marked `shipped: false`, which pins them false for every plan, so the
 * old four-way "already fully Pro" conjunction could never be satisfied. A
 * subscriber who clicked Share on the sample and signed back in was demoted
 * into demo framing and lost the address off their own decision summary.
 */
describe("sample Pro preview only runs when it can still show something", () => {
  const fullyEntitled = {
    canUseProjections: true,
    canUseTaxStrategy: true,
    canUseExitScenarios: true,
    canUseDealScore: true,
  };

  it("stays off for a subscriber who already has every previewable panel", () => {
    expect(sampleProPreviewAddsCapability(fullyEntitled)).toBe(false);
  });

  it("never counts a panel the catalog has not released", () => {
    // The visitor has exactly what a released catalog can grant them. An
    // unreleased panel is missing for everyone and is not unlocked by the
    // preview either, so it must not keep the preview armed.
    expect(
      sampleProPreviewAddsCapability({
        ...fullyEntitled,
        canUseTaxStrategy: isFeatureReleased("tax_strategy"),
        canUseExitScenarios: isFeatureReleased("exit_scenarios"),
      }),
    ).toBe(false);
  });

  it("still previews the full report for a free or anonymous visitor", () => {
    expect(
      sampleProPreviewAddsCapability({
        canUseProjections: false,
        canUseTaxStrategy: false,
        canUseExitScenarios: false,
        // Screening Index is free for everyone; projections are not.
        canUseDealScore: true,
      }),
    ).toBe(true);
  });

  it("keeps the analyzer's arm flag routed through the released-panel gate", () => {
    const source = readFileSync(
      resolve(process.cwd(), "components/investcalc/investcalc-page.tsx"),
      "utf8",
    );

    expect(source).toContain("pendingSamplePreviewRef.current &&");
    expect(source).toContain("sampleProPreviewAddsCapability({");
    // The raw conjunction is the defect: it treats an unreleased panel as
    // proof the visitor is missing something.
    expect(source).not.toMatch(
      /canUseProjections\s*&&\s*canUseTaxStrategy\s*&&\s*canUseExitScenarios\s*&&\s*canUseDealScore/,
    );
  });

  it("substitutes the example label only while the preview is showing", () => {
    const normalize = (value: string) => value.replace(/\s+/g, " ");
    const dashboard = readFileSync(
      resolve(process.cwd(), "components/investcalc/analysis-dashboard.tsx"),
      "utf8",
    );
    const summary = readFileSync(
      resolve(
        process.cwd(),
        "components/investcalc/focused-decision-summary.tsx",
      ),
      "utf8",
    );

    // Preview → sample target profile → example label instead of the address.
    // Each hop must stay intact, or the gate above stops protecting anything.
    expect(normalize(dashboard)).toContain(
      normalize(
        "targetProfileId={ isSampleProPreview ? SAMPLE_DEAL_FIXTURE.targetProfile.id",
      ),
    );
    expect(normalize(summary)).toContain(
      normalize(
        `const isSampleCriteria = targetProfileId === "${SAMPLE_DEAL_FIXTURE.targetProfile.id}";`,
      ),
    );
    expect(normalize(summary)).toContain(
      normalize(
        `const displayAddress = isSampleCriteria ? "${SAMPLE_DEAL_FIXTURE.display.shortAddress}" : values.address;`,
      ),
    );
  });
});
