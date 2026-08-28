import { describe, it, expect } from "vitest";
import {
  FEATURE_CATALOG,
  tierHas,
  featuresForTier,
  featureLimit,
  ladderCellsForFeature,
  type FeatureKey,
} from "@/lib/entitlements-catalog";

/**
 * Policy guards. These lock the entitlement decisions so a future copy edit
 * can't silently re-contradict them (the original bug: Deal Score shown Free
 * on /pricing but Pro on ~25 surfaces).
 */
describe("entitlements catalog — policy guards", () => {
  it("Deal Score (incl. subscore breakdown) is FREE for every tier", () => {
    expect(tierHas("free", "deal_score")).toBe(true);
    expect(tierHas("one_time_pdf", "deal_score")).toBe(true);
    expect(tierHas("pro", "deal_score")).toBe(true);
    expect(FEATURE_CATALOG.deal_score.label.toLowerCase()).toContain("breakdown");
  });

  it("Free can save up to 5 deals; Pro unlimited", () => {
    expect(tierHas("free", "save_deal")).toBe(true);
    expect(featureLimit("save_deal", "free")).toBe("up to 5");
    expect(featureLimit("save_deal", "pro")).toBe("unlimited");
  });

  it("Pro-only features are NOT in free", () => {
    const proOnly: FeatureKey[] = [
      "compare_deals", "tax_strategy", "projections", "exit_scenarios",
      "pdf_export", "custom_branding", "buy_box", "pipeline",
      "template_manage", "mao", "sensitivity", "strategies",
      "dashboard_insights",
    ];
    for (const k of proOnly) {
      expect(tierHas("free", k)).toBe(false);
      expect(tierHas("pro", k)).toBe(true);
    }
  });

  it("Shareable read-only links are FREE (the growth loop), not Pro-gated", () => {
    expect(tierHas("free", "share_links")).toBe(true);
    expect(tierHas("pro", "share_links")).toBe(true);
  });

  it("layers the browser-bound first decision above plan-tier entitlements", () => {
    expect(tierHas("free", "pdf_export")).toBe(false);
    expect(ladderCellsForFeature("pdf_export")[0]).toBe("One exact deal");
    expect(ladderCellsForFeature("mao")[0]).toBe("One exact deal");
    expect(FEATURE_CATALOG.pdf_export.evaluationLimit).toContain("three");
  });

  it("$5 one-time report includes Max Offer and export, but not custom branding", () => {
    expect(tierHas("one_time_pdf", "pdf_export")).toBe(true);
    expect(tierHas("one_time_pdf", "mao")).toBe(true);
    expect(featureLimit("mao", "one_time_pdf")).toBe("In the PDF");
    expect(tierHas("one_time_pdf", "custom_branding")).toBe(false);
  });

  it("every feature has a non-empty label and at least one tier", () => {
    for (const f of Object.values(FEATURE_CATALOG)) {
      expect(f.label.trim().length).toBeGreaterThan(0);
      expect(f.tiers.length).toBeGreaterThan(0);
    }
  });

  it("featuresForTier surfaces the expected anchors", () => {
    expect(featuresForTier("free").some((f) => f.key === "deal_score")).toBe(true);
    expect(featuresForTier("free").some((f) => f.key === "save_deal")).toBe(true);
    expect(featuresForTier("pro").some((f) => f.key === "buy_box")).toBe(true);
  });
});
