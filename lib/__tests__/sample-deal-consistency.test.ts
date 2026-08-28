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
import {
  isTrueCapSyntheticSampleAddress,
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
