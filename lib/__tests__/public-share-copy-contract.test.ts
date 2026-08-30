import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = join(__dirname, "..", "..");
const read = (path: string) => readFileSync(join(ROOT, path), "utf8");

describe("revocable public-share copy contract", () => {
  it("authenticates, validates, and freshly resolves the capability before saving", () => {
    const source = read("app/actions/public-shares.ts");
    const start = source.indexOf(
      "export async function copyPublicShareToAccountAction",
    );
    const end = source.indexOf("export type PublicShareListItem", start);
    const block = source.slice(start, end);
    const auth = block.indexOf("await supabase.auth.getUser()");
    const validation = block.indexOf("isWellFormedShareToken");
    const resolution = block.indexOf("await resolvePublicShare");
    const addressGate = block.indexOf(
      'resolved.snapshot.meta.addressVisibility !== "full"',
    );
    const save = block.indexOf("await saveDealAction");

    expect(start).toBeGreaterThan(-1);
    expect(auth).toBeGreaterThan(-1);
    expect(validation).toBeGreaterThan(auth);
    expect(resolution).toBeGreaterThan(validation);
    expect(addressGate).toBeGreaterThan(resolution);
    expect(save).toBeGreaterThan(addressGate);
    expect(block).toContain('code: "SIGN_IN_REQUIRED"');
    expect(block).toContain('code: "SHARE_UNAVAILABLE"');
    expect(block).toContain('code: "ADDRESS_HIDDEN"');
  });

  it("delegates to the entitlement boundary and always inserts a new scenario", () => {
    const source = read("app/actions/public-shares.ts");
    const start = source.indexOf(
      "export async function copyPublicShareToAccountAction",
    );
    const end = source.indexOf("export type PublicShareListItem", start);
    const block = source.slice(start, end);

    expect(block).toContain("resolved.snapshot.values");
    expect(block).toContain("saveAsNewScenario: true");
    expect(block).toContain("publicShareCopyKey");
    expect(block).toContain('maxOfferTargetSource: "selected-targets"');
    expect(block).toContain('saved.code === "ENTITLEMENT_SAVE"');
    expect(block).toContain('code: "ENTITLEMENT_REQUIRED"');
    expect(block).not.toMatch(/\bownerId\b/);
    expect(block).not.toMatch(/\bdealId\b/);
  });

  it("makes replay/concurrency idempotent without persisting the capability", () => {
    const action = read("app/actions/public-shares.ts");
    const saved = read("app/actions/saved-analyses.ts");
    const migration = read(
      "supabase/migrations/20260829140000_public_share_copy_idempotency.sql",
    );

    expect(action).toContain('.update("truecap-public-share-copy-v1")');
    expect(action).toContain(".update(parsed.data.token)");
    expect(action).toContain("canonicalAnalyticsEventId(");
    expect(action).toContain('"shared_analysis_copied"');
    expect(saved).toContain('.eq("public_share_copy_key", publicShareCopyKey)');
    expect(saved).toContain("idempotentReplay: true");
    const scenarioRetryEnd = saved.indexOf(
      "Several scenarios were added at once",
    );
    const insertStart = saved.indexOf(
      'const { data, error } = await supabase\n    .from("saved_analyses")',
      scenarioRetryEnd,
    );
    const insertEnd = saved.indexOf(
      "const insertedRevision = parseSavedAnalysisRevision",
      insertStart,
    );
    const insertErrorBlock = saved.slice(insertStart, insertEnd);
    const replayLookup = insertErrorBlock.indexOf(
      '.eq("public_share_copy_key", publicShareCopyKey)',
    );
    const capacityClassification = insertErrorBlock.indexOf(
      "isSavedAnalysisPlanCapacityError(error)",
    );
    const schemaClassification = insertErrorBlock.indexOf(
      "isMissingPublicShareCopyKeyColumn(error)",
    );

    expect(insertStart).toBeGreaterThan(-1);
    expect(replayLookup).toBeGreaterThan(-1);
    expect(capacityClassification).toBeGreaterThan(replayLookup);
    expect(schemaClassification).toBeGreaterThan(replayLookup);
    expect(insertErrorBlock).not.toContain(
      'publicShareCopyKey && error.code === "23505"',
    );
    expect(migration).toContain(
      "create unique index if not exists saved_analyses_public_share_copy_key_unique",
    );
    expect(migration).toContain("public_share_copy_key is not null");
    expect(migration).toContain("public share copy identity is immutable");
    expect(migration).not.toContain("token_hash");
  });

  it("emits one privacy-safe event only after the recipient insert succeeds", () => {
    const source = read("app/actions/public-shares.ts");
    const start = source.indexOf(
      "export async function copyPublicShareToAccountAction",
    );
    const end = source.indexOf("export type PublicShareListItem", start);
    const block = source.slice(start, end);
    const save = block.indexOf("await saveDealAction");
    const successGate = block.indexOf("if (!saved.ok)", save);
    const event = block.indexOf("await captureServerEvent", successGate);
    const eventBlock = block.slice(
      event,
      block.indexOf("return { ok: true", event),
    );

    expect(event).toBeGreaterThan(successGate);
    expect(eventBlock).toContain('event: "shared_analysis_copied"');
    expect(eventBlock).toContain(
      'properties: { referral_source: "opaque_share" }',
    );
    expect(eventBlock).toContain("eventId: canonicalAnalyticsEventId(");
    expect(eventBlock).not.toMatch(
      /token|ownerId|dealId|address|purchasePrice/,
    );
  });

  it("offers durable copy only on /s while legacy and portal shares stay run-only", () => {
    const opaque = read("app/s/[token]/page.tsx");
    const legacy = read("app/d/[encoded]/page.tsx");
    const portal = read("app/portal/[token]/d/[dealId]/page.tsx");
    const shell = read("components/investcalc/shared-deal-shell.tsx");
    const viewer = read("components/investcalc/read-only-analysis-view.tsx");

    expect(opaque).toContain("copyShareToken={token}");
    expect(legacy).not.toContain("copyShareToken=");
    expect(portal).not.toContain("copyShareToken=");
    expect(shell).toContain("copyShareToken={copyShareToken}");
    expect(viewer).toContain("copyPublicShareToAccountAction");
    expect(viewer).toContain("copyShareToken && addressIncluded");
    expect(viewer).toContain("Copy this analysis to your account");
    expect(viewer).toContain("Run this property with your assumptions");
    expect(viewer).not.toContain("shared_scenario_forked");
  });

  it("uses a same-origin auth return path and never adds capability/account ids to referrals", () => {
    const viewer = read("components/investcalc/read-only-analysis-view.tsx");
    const start = viewer.indexOf("const copyToAccount = async");
    const end = viewer.indexOf("return (", start);
    const copyUi = viewer.slice(start, end);

    expect(copyUi).toContain("window.location.pathname");
    expect(copyUi).not.toContain("window.location.href");
    expect(copyUi).toContain("/auth/login?next=");
    expect(copyUi).toContain("utm_source=shared_analysis&utm_medium=copy");
    expect(copyUi).not.toMatch(/\bownerId\b/);
    expect(copyUi).not.toMatch(/\bdealId\b/);
  });
});
