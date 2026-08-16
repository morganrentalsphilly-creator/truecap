import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = process.cwd();
const read = (path: string) => readFileSync(join(ROOT, path), "utf8");

function section(source: string, start: string, end: string): string {
  const startAt = source.indexOf(start);
  const endAt = source.indexOf(end, startAt + start.length);
  expect(startAt).toBeGreaterThanOrEqual(0);
  expect(endAt).toBeGreaterThan(startAt);
  return source.slice(startAt, endAt);
}

describe("saved-deal workspace paid gates", () => {
  it("only computes the max-offer recommendation for the canonical paid entitlement", () => {
    const page = read("app/dashboard/saved-analyses/[id]/page.tsx");
    expect(page).toContain("hasPaidPlanSubscription(supabase, user.id)");
    expect(page).toContain(
      "if (isPremium && formValues && !isClosedDeal && (stage == null || isActiveStage(stage)))"
    );
  });

  it("renders checklist and document cards only in the paid branch", () => {
    const page = read("app/dashboard/saved-analyses/[id]/page.tsx");
    const workspace = section(
      page,
      "{isPremium ? (\n            <>",
      "{/* Notes + comments side by side"
    );
    expect(workspace).toContain("<DueDiligenceCard savedDealId={dealRow.id} />");
    expect(workspace).toContain("<DealDocumentsCard savedDealId={dealRow.id} />");
    expect(workspace).toContain("Due diligence &amp; documents");
    expect(workspace).toContain('href="/pricing#plans"');
    expect(workspace).toContain("Unlock with Pro");
  });

  it("fails checklist reads and mutations closed before touching deal data", () => {
    const actions = read("app/actions/saved-analyses.ts");
    const getAction = section(
      actions,
      "export async function getDealDueDiligenceAction",
      "/** Replace a saved deal's due-diligence checklist"
    );
    const updateAction = section(
      actions,
      "export async function updateDealDueDiligenceAction",
      "/**\n * Bulk archive or delete saved analyses."
    );

    for (const action of [getAction, updateAction]) {
      const entitlementAt = action.indexOf("hasPaidPlanSubscription(supabase, user.id)");
      expect(entitlementAt).toBeGreaterThanOrEqual(0);
      expect(action).toContain('code: "ENTITLEMENT_REQUIRED"');
      expect(entitlementAt).toBeLessThan(action.indexOf('.from("saved_analyses")'));
      expect(entitlementAt).toBeLessThan(action.indexOf('.from("deal_due_diligence")'));
    }
  });
});
