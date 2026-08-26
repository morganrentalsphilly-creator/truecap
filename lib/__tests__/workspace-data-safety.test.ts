import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(join(process.cwd(), path), "utf8");

describe("saved workspace data safety", () => {
  it("uses a revision guard instead of an unconditional checklist replacement", () => {
    const actions = read("app/actions/saved-analyses.ts");
    const start = actions.indexOf("export type DealDueDiligenceResult");
    const end = actions.indexOf("export type BulkSavedDealActionResult", start);
    const checklist = actions.slice(start, end);

    expect(checklist).toContain('select("items, updated_at")');
    expect(checklist).toContain('code: "STALE_DATA"');
    expect(checklist).toContain('.eq("updated_at", revision)');
    expect(checklist).toContain('error.code === "23505"');
    expect(checklist).not.toContain(".upsert(");

    const card = read("components/investcalc/due-diligence-card.tsx");
    expect(card).toContain("updateDealDueDiligenceAction(dealIdAtSubmit, next, revisionAtSubmit)");
    expect(card).toContain("setRevision(fresh.revision)");
  });

  it.each([
    ["components/investcalc/due-diligence-card.tsx", "Couldn&apos;t load due diligence", '<ul className="space-y-1.5">'],
    ["components/investcalc/deal-notes-panel.tsx", "Couldn&apos;t load deal notes", "<textarea"],
    ["components/investcalc/scenarios-card.tsx", "Couldn&apos;t load scenarios", "{adding ? ("],
    ["components/investcalc/deal-comments-panel.tsx", "Couldn&apos;t load comments", "<textarea"],
    ["components/investcalc/deal-details-card.tsx", "Couldn&apos;t load deal details", "const fields"],
  ])("gates editing behind an explicit retryable read error in %s", (path, heading, editableToken) => {
    const source = read(path);
    expect(source).toContain("if (loadError)");
    expect(source).toContain(heading);
    expect(source).toContain("Try again");
    expect(source.indexOf("if (loadError)")).toBeLessThan(source.indexOf(editableToken));
  });

  it("keeps note drafts visible with durable save and retry states", () => {
    const notes = read("components/investcalc/deal-notes-panel.tsx");
    const actions = read("app/actions/saved-analyses.ts");
    const readStart = actions.indexOf("export async function getSavedDealNotesAction");
    const readEnd = actions.indexOf("export async function updateSavedDealLifecycleStateAction", readStart);
    const notesRead = actions.slice(readStart, readEnd);

    expect(notesRead).toContain('code: "NOT_FOUND"');
    expect(notesRead).toContain('if (!data)');
    expect(notes).toContain("notesRef.current = clipped");
    expect(notes).toContain("Saved just now");
    expect(notes).toContain("Couldn&apos;t save");
    expect(notes).toContain("Retry");
    expect(notes).not.toContain("Date.now() - savedTick");
  });

  it("rejects stale underwriting and note writes with independent revisions", () => {
    const actions = read("app/actions/saved-analyses.ts");
    const notes = read("components/investcalc/deal-notes-panel.tsx");
    const analyzer = read("components/investcalc/investcalc-page.tsx");
    const migration = read(
      "supabase/migrations/20260825210000_saved_analysis_concurrency_revisions.sql"
    );

    expect(actions).toContain('code: "STALE_DATA"');
    expect(actions).toContain('.eq("underwriting_revision", expectedUnderwritingRevision)');
    expect(actions).toContain('.eq("notes_revision", expectedNotesRevision)');
    expect(actions).toContain('.select("id, underwriting_revision")');
    expect(actions).toContain('.select("notes, notes_revision")');
    expect(notes).toContain("Save my version");
    expect(notes).toContain("Load latest");
    expect(notes).toContain("Restore my draft");
    expect(analyzer).toContain("expectedUnderwritingRevision");
    expect(analyzer).toContain("This underwriting changed elsewhere");
    expect(analyzer).toContain("Reload latest");
    expect(analyzer).toContain("Save edits as new scenario");
    expect(migration).toContain("underwriting_revision bigint not null default 1");
    expect(migration).toContain("notes_revision bigint not null default 1");
    expect(migration).toContain("else old.underwriting_revision + 1");
    expect(migration).toContain("else old.notes_revision + 1");
  });

  it("makes revision initialization database-owned and fails old schemas closed", () => {
    const migration = read(
      "supabase/migrations/20260825210000_saved_analysis_concurrency_revisions.sql"
    );

    expect(migration).toContain("begin;");
    expect(migration).toContain("('methodology_version')");
    expect(migration).toContain("('notes')");
    expect(migration).toContain("if tg_op = 'INSERT' then");
    expect(migration).toContain("new.underwriting_revision := 1");
    expect(migration).toContain("new.notes_revision := 1");
    expect(migration).toContain("before insert or update on public.saved_analyses");
    expect(migration).toContain("saved_analyses_underwriting_revision_safe_integer");
    expect(migration).toContain("saved_analyses_notes_revision_safe_integer");
    expect(migration.trimEnd()).toMatch(/commit;$/);
  });

  it("threads the underwriting revision through every saved-deal update entry point", () => {
    const analyzer = read("components/investcalc/investcalc-page.tsx");
    const templateAction = read("app/actions/analysis-templates.ts");
    const rateBanner = read(
      "components/investcalc/rate-alert-reunderwrite-banner.tsx"
    );
    const workspacePage = read("app/dashboard/saved-analyses/[id]/page.tsx");

    expect(analyzer).toContain("savedUnderwritingRevisionRef.current");
    expect(analyzer).toContain("expectedUnderwritingRevisionOverride");
    expect(templateAction).toContain(
      "expectedUnderwritingRevision: ("
    );
    expect(rateBanner).toContain(
      "{ expectedUnderwritingRevision: underwritingRevision }"
    );
    expect(workspacePage).toContain("underwritingRevision={dealRow.underwriting_revision}");
  });

  it("preserves comment drafts and confirms permanent deletion", () => {
    const comments = read("components/investcalc/deal-comments-panel.tsx");
    const submit = comments.indexOf("await addDealCommentAction");
    const clear = comments.indexOf("setDraft", submit);
    expect(clear).toBeGreaterThan(submit);
    expect(comments).toContain("Delete this comment?");
    expect(comments).toContain("There is no safe undo");
    expect(comments).toContain("confirmDeleteId");
  });

  it("keeps controlled detail drafts on failed writes and exposes retry", () => {
    const details = read("components/investcalc/deal-details-card.tsx");
    expect(details).toContain("draftsRef.current");
    expect(details).toContain("setFailedPatch(patch)");
    expect(details).toContain("Couldn’t save");
    expect(details).toContain("Retry");
    expect(details).toContain("value={drafts[f.key] ?? \"\"}");
  });
});
