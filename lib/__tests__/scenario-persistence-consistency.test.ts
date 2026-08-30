import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const source = readFileSync(
  resolve(process.cwd(), "app/actions/scenarios.ts"),
  "utf8",
);
const compactSource = source.replace(/\s+/g, " ");

describe("strategy scenario persistence", () => {
  it("rejects unknown strategy ids at the public action boundary", () => {
    expect(source).toContain(
      "strategyKind: z.enum(STRATEGY_KINDS).nullable().optional()",
    );
    expect(source).toContain(
      "const strategyKind = parsed.data.strategyKind ?? null",
    );
  });

  it("rejects a changed preset against an incompatible frozen methodology", () => {
    expect(source).toContain("adjusted !== baseValues &&");
    expect(source).toContain(
      "shouldFreezeSavedMethodology(deal.methodology_version)",
    );
    expect(source).toContain("different underwriting version");
  });

  it("stamps current computation metadata and synchronizes changed assumptions", () => {
    expect(source).toContain(
      "clone.schema_version = INVESTCALC_SCHEMA_VERSION",
    );
    expect(source).toContain(
      "clone.methodology_version = result.methodologyVersion",
    );
    expect(source).toContain("buildCompareSnapshotPayload(");
    expect(source).toContain(
      "buildDealScoreInputFromAnalysis(adjusted, result)",
    );
    expect(source).toContain(
      "scoreMethodologyVersion: dealScore.scoreMethodologyVersion",
    );
    for (const assignment of [
      "clone.down_payment_pct = adjusted.downPaymentPct",
      "clone.maintenance_pct = adjusted.maintenancePct",
      "clone.vacancy_pct = adjusted.vacancyPct",
      "clone.management_pct = adjusted.mgmtPct",
      "clone.property_tax_pct = Math.round(result.propertyTaxPctEffective * 100) / 100",
    ]) {
      expect(compactSource).toContain(assignment);
    }
  });

  it("does not clone stale financing or confidence provenance", () => {
    expect(source).toContain("clone.user_id = user.id");
    expect(source).toContain("clone.financing_profile_id = null");
    expect(source).toContain("clone.financing_profile_version = null");
    expect(source).toContain("clone.financing_profile_snapshot = null");
    expect(source).toContain("delete clone.public_share_copy_key");
    expect(source).toContain("delete clone.underwriting_revision");
    expect(source).toContain("delete clone.notes_revision");
    expect(source).toContain("delete clone.last_activity_at");
    expect(source).toContain("delete clone.current_stage_history_event_id");
    expect(source).toContain(
      'if (!hasPlanFeature(entitlements, "pipeline")) clone.tags = [];',
    );
    expect(source).toContain(
      'if (!hasPlanFeature(entitlements, "client_buy_box")) clone.client_id = null;',
    );
    expect(source).toContain(
      'if (!hasPlanFeature(entitlements, "template_manage"))',
    );
    expect(source).toContain("clone.template_id = null");
    expect(source).toContain("clone.form_snapshot = detachedSnapshot");
    expect(source).toContain("clone.data_confidence = null");
  });

  it("retargets no-op scenarios without carrying a cross-strategy specialist result", () => {
    expect(source).toContain("resolveSavedAnalysisResult({");
    expect(source).toContain("if (!sourceResolution.result)");
    expect(source).toContain("if (!retargetedResult)");
    expect(source).toContain("const sourceAnalyzerStrategyKey");
    expect(source).toContain("const targetAnalyzerStrategyKey");
    expect(source).toContain("retargetUnchangedScenarioResultSnapshot({");
    expect(source).toContain("sourceResult: deal.result_snapshot");
  });

  it("creates an honest setup copy when the source cannot yet support the destination lens", () => {
    expect(source).toContain("if (!baseValues)");
    expect(source).toContain(
      "This saved analysis cannot safely create a strategy scenario.",
    );
    expect(source).toContain("buildScenarioStrategyTransition({");
    expect(source).toContain("transition.analyzerStrategyKey");
    expect(source).toContain(
      "strategySetupRequired = transition.setupRequired",
    );
    expect(source).not.toContain("const requiredAnalyzerStrategyKey");
    expect(source).not.toContain(
      "This strategy needs its required property and income setup first.",
    );
  });

  it("does not return success until the source link and inserted sibling are visible", () => {
    expect(source).toContain("const { data: linkedSource, error: linkErr }");
    expect(source).toContain('.is("deleted_at", null)');
    expect(source).toContain('.is("property_id", null)');
    expect(source).toContain('.select("id, property_id")');
    expect(source).toContain(
      "const { data: currentSource, error: currentSourceErr }",
    );
    expect(source).toContain("currentPropertyId === propertyId");
    expect(source).toContain("propertyId: currentPropertyId");
    expect(source).not.toContain("Reuse an existing property at this address");
    expect(compactSource).toContain('.from("properties") .delete()');
    expect(source).toContain(
      "(inserted as { property_id?: unknown }).property_id !== propertyId",
    );
    expect(source).not.toContain(
      "Link the source deal to the property (best-effort)",
    );
    expect(source).toContain(
      "saved_analyses_active_property_scenario_name_uidx",
    );
    expect(source).toContain('code: "DUPLICATE_SCENARIO_NAME"');
  });

  it("recognizes legacy Base case rows as the one base scenario", () => {
    expect(source).toContain('normalizedScenarioName === "base case"');
    expect(source).toContain(
      'scenarioName: isBase ? "Base case" : row.scenario_name!.trim()',
    );
  });

  it("rejects a second normalized base before grouping an unlinked source", () => {
    const earlyBaseRejection = source.indexOf(
      'if (sourceIsBase && normalizedScenarioName === "base case")',
    );
    const capacity = source.indexOf("hasSavedDealCapacity(entitlements");
    const propertyMutation = source.indexOf(
      "const resolved = await resolvePropertyId",
    );

    expect(source).toContain("!deal.property_id ||");
    expect(earlyBaseRejection).toBeGreaterThan(-1);
    expect(earlyBaseRejection).toBeLessThan(capacity);
    expect(earlyBaseRejection).toBeLessThan(propertyMutation);
  });

  it("keeps capacity and scenario validation read-only before property mutation", () => {
    const capacity = source.indexOf("hasSavedDealCapacity(entitlements");
    const transition = source.indexOf(
      "const transition = buildScenarioStrategyTransition",
    );
    const propertyMutation = source.indexOf(
      "const resolved = await resolvePropertyId",
    );
    const clashCheck = source.indexOf(
      "const { data: clash, error: clashErr }",
    );
    const scenarioInsert = source.indexOf(
      '.from("saved_analyses")\n    .insert(clone)',
    );

    expect(capacity).toBeGreaterThan(-1);
    expect(transition).toBeGreaterThan(capacity);
    expect(propertyMutation).toBeGreaterThan(transition);
    expect(clashCheck).toBeGreaterThan(propertyMutation);
    expect(scenarioInsert).toBeGreaterThan(clashCheck);
  });

  it("carries the captured Offer Ceiling target source with the target", () => {
    expect(source).toContain("normalizeOfferCeilingTargetSource(");
    expect(source).toContain("deal.result_snapshot?.maxOfferTargetSource");
    expect(source).toContain(
      "recomputedResultSnapshot.maxOfferTargetSource = sourceMaoTargetSource",
    );
    expect(source).toContain(
      "await hasPaidPlanSubscription(supabase, user.id)",
    );
    expect(source).toContain(
      "recomputedResultSnapshot.offerCeilingExact = capturedAccess.exact",
    );
  });
});
