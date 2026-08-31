import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const action = readFileSync(
  resolve(process.cwd(), "app/actions/saved-analyses.ts"),
  "utf8",
);
const page = readFileSync(
  resolve(process.cwd(), "components/investcalc/investcalc-page.tsx"),
  "utf8",
);
const compactPage = page.replace(/\s+/g, " ");

describe("duplicate-dialog scenario integrity", () => {
  it("reconciles a durable request key before capacity or property mutation", () => {
    const replay = action.indexOf('.eq("scenario_request_key", scenarioRequestKey)');
    const capacity = action.indexOf("hasSavedDealCapacity(entitlements");
    const claim = action.indexOf(
      '"claim_saved_analysis_property_for_scenario"',
    );

    expect(replay).toBeGreaterThan(-1);
    expect(capacity).toBeGreaterThan(replay);
    expect(claim).toBeGreaterThan(capacity);
    expect(action).toContain("idempotentReplay: true");
    expect(action).toContain("scenario_request_key: scenarioRequestKey");
  });

  it("links interactive duplicates to the verified source workspace", () => {
    expect(action).toContain("workspaceScenarioRequested");
    expect(action).toContain("scenarioSourceId");
    expect(action).toContain(
      "sourceAddress !== normalizedSavedAddress(addressTrimmed)",
    );
    expect(action).toContain("property_id: scenarioPropertyId");
    expect(action).toContain("scenario_name: scenarioName");
    expect(action).toContain("nextScenarioNumber(");
    expect(action).toContain("if (isDuplicateScenarioNameError(insertScenarioError)) continue");
  });

  it("reconciles every insert error before mapping a last-slot capacity race", () => {
    const insert = action.indexOf("const { data: insertedScenario");
    const insertError = action.indexOf("if (insertScenarioError)", insert);
    const ownerReplay = action.indexOf('.eq("user_id", user.id)', insertError);
    const requestReplay = action.indexOf(
      '.eq("scenario_request_key", scenarioRequestKey)',
      ownerReplay,
    );
    const capacity = action.indexOf(
      "isSavedAnalysisPlanCapacityError(insertScenarioError)",
      requestReplay,
    );
    const nameConflict = action.indexOf(
      "isDuplicateScenarioNameError(insertScenarioError)",
      capacity,
    );

    expect(insertError).toBeGreaterThan(insert);
    expect(ownerReplay).toBeGreaterThan(insertError);
    expect(requestReplay).toBeGreaterThan(ownerReplay);
    expect(capacity).toBeGreaterThan(requestReplay);
    expect(nameConflict).toBeGreaterThan(capacity);
    expect(action).toContain('error.code === "23514"');
    expect(action).toContain("saved_analyses_plan_capacity");
    expect(action.slice(capacity, nameConflict)).toContain(
      'code: "ENTITLEMENT_SAVE"',
    );
  });

  it("keeps captured-access rejection read-only before claiming a property", () => {
    const capacity = action.indexOf("hasSavedDealCapacity(entitlements");
    const capturedAccess = action.indexOf(
      "const capturedAccess = resolveOfferCeilingForAccess",
      capacity,
    );
    const capturedAccessRejection = action.indexOf(
      'if (capturedAccess.access !== "exact")',
      capturedAccess,
    );
    const claim = action.indexOf(
      '"claim_saved_analysis_property_for_scenario"',
      capacity,
    );

    expect(capturedAccess).toBeGreaterThan(capacity);
    expect(capturedAccessRejection).toBeGreaterThan(capturedAccess);
    expect(claim).toBeGreaterThan(capturedAccessRejection);
  });

  it("keeps public-share copies on their existing standalone idempotency path", () => {
    expect(action).toContain(
      "options?.saveAsNewScenario === true && !publicShareCopyOptionProvided",
    );
    expect(action).toContain("public_share_copy_key: publicShareCopyKey");
  });

  it("retains one browser UUID across ambiguous duplicate and conflict retries", () => {
    expect(page).toContain("scenarioClientRequestId: crypto.randomUUID()");
    expect(compactPage).toContain(
      "scenarioClientRequestId: duplicateCollision.scenarioClientRequestId",
    );
    expect(compactPage).toContain(
      "scenarioClientRequestId: conflict.scenarioClientRequestId",
    );
    expect(page).toContain("scenarioSourceId: duplicateCollision.existingId");
    expect(page).toContain("scenarioSourceId: conflict.savedDealId");
  });
});

describe("grouped property address integrity", () => {
  it("blocks a friendly preflight and maps the database race authority", () => {
    const siblingPreflight = action.indexOf(
      "const { data: propertySiblings, error: propertySiblingsError }",
    );
    const ordinaryAddressPrompt = action.indexOf(
      "if (addressChanged && options?.allowAddressChange !== true)",
    );

    expect(siblingPreflight).toBeGreaterThan(-1);
    expect(ordinaryAddressPrompt).toBeGreaterThan(siblingPreflight);
    expect(action).toContain('code: "GROUPED_ADDRESS_CHANGE"');
    expect(action).toContain("isGroupedAddressChangeError(error)");
    expect(action).toContain("saved_analyses_grouped_address_immutable");
    expect(action).toContain("normalizedSavedAddress(existingFormSnapshot?.address)");
  });

  it("offers only Save as new deal when a property has sibling scenarios", () => {
    expect(page).toContain("groupedScenarioLocked: true");
    expect(page).toContain(
      "Every scenario in this workspace must stay on the same property.",
    );
    expect(page).toContain(
      "!addressChangedPrompt?.groupedScenarioLocked ? (",
    );
  });
});
