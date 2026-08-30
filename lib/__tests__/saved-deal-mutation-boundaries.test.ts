import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(join(process.cwd(), path), "utf8");
const actions = read("app/actions/saved-analyses.ts");

function actionSource(name: string, nextName?: string): string {
  const start = actions.indexOf(`export async function ${name}`);
  const end = nextName
    ? actions.indexOf(`export async function ${nextName}`, start + 1)
    : actions.length;
  expect(start).toBeGreaterThanOrEqual(0);
  expect(end).toBeGreaterThan(start);
  return actions.slice(start, end);
}

describe("saved-deal mutation runtime boundaries", () => {
  it("distinguishes a client-roster query failure from a missing client", () => {
    const source = actionSource(
      "setSavedDealClientAction",
      "listSavedDealsBriefAction",
    );
    const lookup = source.indexOf('.from("agent_clients")');
    const errorCheck = source.indexOf("if (ownedClientError)", lookup);
    const missingCheck = source.indexOf("if (!ownedClient)", lookup);

    expect(source).toContain("error: ownedClientError");
    expect(errorCheck).toBeGreaterThan(lookup);
    expect(missingCheck).toBeGreaterThan(errorCheck);
    expect(source.slice(errorCheck, missingCheck)).toContain(
      '"saved-analyses-client-assignment"',
    );
  });

  it("makes bulk soft-delete idempotent for already deleted rows", () => {
    const source = actionSource("bulkUpdateSavedDealsAction");
    const softDelete = source.indexOf(".update({ deleted_at: nowIso })");
    const select = source.indexOf('.select("id")', softDelete);
    expect(softDelete).toBeGreaterThan(-1);
    expect(select).toBeGreaterThan(softDelete);
    expect(source.slice(softDelete, select)).toContain(
      '.is("deleted_at", null)',
    );
  });

  it("validates notes before issuing the update", () => {
    const source = actionSource(
      "updateSavedDealNotesAction",
      "getSavedDealNotesAction",
    );
    const normalize = source.indexOf("normalizeSavedDealNotesInput(notes)");
    const validation = source.indexOf('message: "Invalid notes text."');
    const write = source.indexOf('.from("saved_analyses")');
    expect(normalize).toBeGreaterThan(-1);
    expect(validation).toBeGreaterThan(normalize);
    expect(write).toBeGreaterThan(validation);
    expect(source).not.toContain('(notes ?? "").slice');
  });

  it("surfaces unexpected financing-profile loads but keeps expected absence quiet", () => {
    const source = read("components/investcalc/financing-profile-selector.tsx");
    expect(source).toContain('result.code !== "FEATURE_DISABLED"');
    expect(source).toContain('result.code !== "SIGN_IN_REQUIRED"');
    expect(source).toContain('result.code !== "MIGRATION_PENDING"');
    expect(source).toContain("Couldn't load financing profiles");
    expect(source).toContain("description: result.message");
    expect(source).toMatch(/}, \[toast\]\);/);
  });
});
