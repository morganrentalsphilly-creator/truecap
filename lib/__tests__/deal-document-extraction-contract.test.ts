import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Trust contract for deal-document extraction (v1). The pure matcher battery
 * is tested in document-extraction.test.ts; these pins hold the ACTION and
 * the CARD to the contract that makes extraction safe to trust:
 * ownership-by-construction, propose-don't-write, reuse of the one save
 * engine, and honesty about scans.
 */

const action = readFileSync(
  join(process.cwd(), "app/actions/deal-document-extraction.ts"),
  "utf8",
);
const card = readFileSync(
  join(process.cwd(), "components/investcalc/deal-documents-card.tsx"),
  "utf8",
);

describe("extraction action", () => {
  it("enforces ownership by construction before any storage read", () => {
    const gate = action.indexOf("path.startsWith(`${user.id}/${savedDealId}/`)");
    const download = action.indexOf(".download(path)");
    expect(gate).toBeGreaterThan(-1);
    expect(gate).toBeLessThan(download);
  });

  it("downloads under the USER session so bucket RLS is a second gate", () => {
    // The admin client would bypass RLS; this feature must not.
    expect(action).not.toContain("createAdminSupabaseClient");
  });

  it("refuses scans honestly instead of guessing", () => {
    expect(action).toContain('"NO_TEXT_LAYER"');
    expect(action).toContain("never guesses");
  });

  it("apply reuses saveDealAction rather than a parallel persistence path", () => {
    expect(action).toContain("await saveDealAction(next, savedDealId, undefined, {");
    expect(action).not.toMatch(/\.from\("saved_analyses"\)\s*\.update\(/);
  });

  it("apply proves which revision it read — without this every apply dies STALE_DATA", () => {
    // saveDealAction's update path hasOwnProperty-checks the option and
    // refuses unconditionally when absent; the row select must carry the
    // revision so the option can be populated, never fabricated.
    expect(action).toContain(
      'select("form_snapshot, property_type, underwriting_revision")',
    );
    expect(action).toContain("expectedUnderwritingRevision");
    // A real concurrent edit still loses politely, with card-appropriate copy.
    expect(action).toContain(
      "This deal changed since the numbers were extracted.",
    );
  });

  it("apply refuses multi-family rent instead of corrupting unit data", () => {
    expect(action).toContain('values.propertyType !== "single-family"');
  });

  it("mode fields flip together with their values", () => {
    // Writing propertyTaxAnnual while the mode stays "percent" is the
    // state-written-never-read defect this codebase has shipped four times.
    expect(action).toMatch(/propertyTaxInputMode = "annual";\s*\n\s*next\.propertyTaxAnnual = value/);
    expect(action).toMatch(/insuranceInputMode = "monthly";\s*\n\s*next\.insuranceMonthly = value/);
  });
});

describe("review card", () => {
  it("renders the source snippet — the user verifies before anything writes", () => {
    expect(card).toContain("candidate.snippet");
  });

  it("labels weak matches for verification", () => {
    expect(card).toContain("Verify — loose match");
  });

  it("only offers extraction on PDFs", () => {
    expect(card).toContain('doc.path.toLowerCase().endsWith(".pdf")');
  });

  it("refreshes the workspace after an apply so the numbers on screen are the saved ones", () => {
    const apply = card.slice(card.indexOf("const handleApply"));
    expect(apply.slice(0, 1600)).toContain("router.refresh()");
  });
});
