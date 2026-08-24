import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { SAMPLE_DEAL_FIXTURE } from "@/lib/sample-deal";
import {
  isExactSharedSampleRequest,
  resolveOfferCeilingForAccess,
} from "@/lib/offer-ceiling-server";
import type { InvestmentFormValues } from "@/lib/investcalc-schema";

const repoFile = (path: string) =>
  readFileSync(resolve(process.cwd(), path), "utf8");

describe("Offer Ceiling server entitlement boundary", () => {
  it("returns exact output to paid access without changing the canonical solver", () => {
    const payload = resolveOfferCeilingForAccess({
      values: SAMPLE_DEAL_FIXTURE.values,
      target: SAMPLE_DEAL_FIXTURE.maoTarget,
      source: "selected-targets",
      paidAccess: true,
    });

    expect(payload.access).toBe("exact");
    if (payload.access !== "exact") return;
    expect(payload.exact?.presentation.ceiling).toBeGreaterThan(0);
    expect(payload.exact?.presentation.source).toBe("selected-targets");
    expect(payload.exact?.makePriceWork).toBeDefined();
  });

  it("allows only the exact shared sample fixture as an anonymous exact demo", () => {
    expect(
      isExactSharedSampleRequest(
        SAMPLE_DEAL_FIXTURE.values,
        SAMPLE_DEAL_FIXTURE.maoTarget
      )
    ).toBe(true);

    const sample = resolveOfferCeilingForAccess({
      values: SAMPLE_DEAL_FIXTURE.values,
      target: SAMPLE_DEAL_FIXTURE.maoTarget,
      source: "screening-defaults",
      paidAccess: false,
    });
    expect(sample.access).toBe("exact");

    const changedValues = {
      ...SAMPLE_DEAL_FIXTURE.values,
      purchasePrice: SAMPLE_DEAL_FIXTURE.values.purchasePrice + 500,
    } as InvestmentFormValues;
    expect(
      isExactSharedSampleRequest(changedValues, SAMPLE_DEAL_FIXTURE.maoTarget)
    ).toBe(false);
    const changedDeal = resolveOfferCeilingForAccess({
      values: changedValues,
      target: SAMPLE_DEAL_FIXTURE.maoTarget,
      source: "screening-defaults",
      paidAccess: false,
    });
    expect(changedDeal.access).toBe("preview");
    expect(JSON.stringify(changedDeal)).not.toContain("presentation");
    expect(JSON.stringify(changedDeal)).not.toContain("makePriceWork");

    const changedTarget = resolveOfferCeilingForAccess({
      values: SAMPLE_DEAL_FIXTURE.values,
      target: { ...SAMPLE_DEAL_FIXTURE.maoTarget, monthlyCashFlow: 725 },
      source: "selected-targets",
      paidAccess: false,
    });
    expect(changedTarget.access).toBe("preview");
  });

  it("returns only a coarse interval to Free and never embeds an exact midpoint", () => {
    const values = {
      ...SAMPLE_DEAL_FIXTURE.values,
      address: "100 Preview Only Ave, Philadelphia, PA 19100",
    } as InvestmentFormValues;
    const payload = resolveOfferCeilingForAccess({
      values,
      target: SAMPLE_DEAL_FIXTURE.maoTarget,
      source: "selected-targets",
      paidAccess: false,
    });

    expect(payload.access).toBe("preview");
    if (payload.access !== "preview") return;
    expect(payload.range).not.toBeNull();
    if (!payload.range) return;
    expect(payload.range.lower % 25_000).toBe(0);
    expect(payload.range.upper % 25_000).toBe(0);
    expect(Object.keys(payload)).toEqual(["access", "range"]);
  });

  it("cannot use repeated hard-cap queries as an exact-solver oracle", () => {
    const values = {
      ...SAMPLE_DEAL_FIXTURE.values,
      address: "101 Preview Oracle Ave, Philadelphia, PA 19100",
    } as InvestmentFormValues;
    const target = {
      monthlyCashFlow: 0,
      dscr: 1.25,
    };
    const baseline = resolveOfferCeilingForAccess({
      values,
      target,
      source: "selected-targets",
      paidAccess: false,
    });
    expect(baseline.access).toBe("preview");

    // An attacker can choose caps at arbitrary, non-grid values and repeat
    // requests around a suspected exact boundary. Every response must remain
    // identical to the uncapped coarse preview; no cap may be echoed back.
    for (let maxPurchasePrice = 100_123; maxPurchasePrice <= 400_123; maxPurchasePrice += 7_919) {
      const response = resolveOfferCeilingForAccess({
        values,
        target: { ...target, maxPurchasePrice },
        source: "selected-targets",
        paidAccess: false,
      });
      expect(response).toEqual(baseline);
      if (response.access !== "preview" || !response.range) continue;
      expect(response.range.lower % 25_000).toBe(0);
      expect(response.range.upper % 25_000).toBe(0);
      expect(response.range.lower).not.toBe(maxPurchasePrice);
      expect(response.range.upper).not.toBe(maxPurchasePrice);
    }
  });

  it("requires a relevant adopted target when cash financing makes DSCR inapplicable", () => {
    const cashValues = {
      ...SAMPLE_DEAL_FIXTURE.values,
      address: "100 Cash Deal Ave, Philadelphia, PA 19100",
      downPaymentPct: 100,
    } as InvestmentFormValues;
    const payload = resolveOfferCeilingForAccess({
      values: cashValues,
      target: { dscr: 1.25 },
      source: "selected-targets",
      paidAccess: true,
    });

    expect(payload).toEqual({ access: "preview", range: null });
  });

  it("keeps all active browser paths free of exact and inverse solver imports", () => {
    const activeClientPaths = [
      "components/investcalc/analysis-dashboard.tsx",
      "components/investcalc/investcalc-page.tsx",
      "components/investcalc/focused-decision-summary.tsx",
      "components/investcalc/read-only-analysis-view.tsx",
      "components/investcalc/strategy-outcome-card.tsx",
      "components/investcalc/make-price-work-card.tsx",
    ];
    for (const path of activeClientPaths) {
      const source = repoFile(path);
      expect(source, path).not.toMatch(/\bcalculateMaxAllowableOffer\b/);
      expect(source, path).not.toMatch(/\bsolveRequiredMonthlyRent\b/);
      expect(source, path).not.toMatch(/\bsolveRequiredInterestRate\b/);
    }
    expect(repoFile("components/investcalc/focused-decision-summary.tsx"))
      .not.toContain("buildWhatNeedsToBeTrue");
  });

  it("does not trust the browser capability flag and handles transport rejection", () => {
    const action = repoFile("app/actions/offer-ceiling.ts");
    const dashboard = repoFile("components/investcalc/analysis-dashboard.tsx");
    const summary = repoFile("components/investcalc/focused-decision-summary.tsx");
    expect(action).toContain("hasPaidPlanSubscription(supabase, user.id)");
    expect(action).not.toContain("canUseMaxOffer");
    expect(dashboard).toContain(".catch(() => {");
    expect(summary).toContain("Retry Offer Ceiling");
  });
});
