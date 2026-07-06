import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { tierHas } from "@/lib/entitlements-catalog";

/**
 * Regression guards for the "Deal Score is FREE" policy.
 *
 * Deal Score (0–100 score + subscore breakdown) moved to the free tier in
 * June 2026. A stale "Deal Score (Pro)" lock card lingered in the analyzer
 * long after — dead behind `canUseDealScore`, which both homepages hardcode
 * to `true`, so no real user saw it, but it was a live contradiction in the
 * code and a footgun (the prop defaulted to `false`). T2 removed it.
 *
 * These tests fail loudly if either the catalog policy or the in-product
 * gate regresses, so a future edit can't silently re-contradict pricing.
 */
describe("Deal Score is free — regression guards", () => {
  it("the catalog keeps Deal Score free for every tier", () => {
    expect(tierHas("free", "deal_score")).toBe(true);
    expect(tierHas("one_time_pdf", "deal_score")).toBe(true);
    expect(tierHas("pro", "deal_score")).toBe(true);
  });

  it("the analyzer no longer ships a 'Deal Score (Pro)' upsell gate", () => {
    // The Deal Score card was extracted from analysis-dashboard.tsx into
    // answer-hero-card.tsx (calculator redesign Phase 2), so the guard
    // scans both files - otherwise the extraction would silently take the
    // scored surface out from under this regression test.
    for (const file of [
      "../../components/investcalc/analysis-dashboard.tsx",
      "../../components/investcalc/answer-hero-card.tsx",
    ]) {
      const source = readFileSync(
        fileURLToPath(new URL(file, import.meta.url)),
        "utf8"
      );
      // The removed lock card rendered this exact label + a canUseDealScore gate.
      expect(source).not.toContain("Deal Score (Pro)");
      expect(source).not.toContain("canUseDealScore");
    }
  });
});
