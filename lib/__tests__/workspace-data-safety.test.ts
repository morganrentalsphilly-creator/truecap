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
    expect(card).toContain("const r = await updateDealDueDiligenceAction(");
    expect(card).toContain("request.items,");
    expect(card).toContain("revisionAtSubmit,");
    expect(card).toContain("setRevision(fresh.revision)");
  });

  it("serializes same-render checklist mutations and chains the latest snapshot", () => {
    const card = read("components/investcalc/due-diligence-card.tsx");

    expect(card).toContain(
      "const queuedSaveRef = useRef<QueuedDueDiligenceSave | null>(null)"
    );
    expect(card).toContain("if (mutationRequestRef.current !== null)");
    expect(card).toContain("queuedSaveRef.current = coalesceDueDiligenceSave(");
    expect(card).toContain("revision: r.revision");
    expect(card).toContain("previous: r.items");
    expect(card).toContain("startPersistRequest(");
    expect(card).toContain("queuedSaveRef.current = null");
    const migrationFailure = card.slice(
      card.indexOf('if (r.code === "MIGRATION_PENDING")'),
      card.indexOf("const fresh = await getDealDueDiligenceAction", card.indexOf('if (r.code === "MIGRATION_PENDING")')),
    );
    expect(migrationFailure).toContain("const queued = takeQueuedSave()");
    expect(migrationFailure).toContain("setItems(previous)");
    expect(migrationFailure).toContain("runRecoveries(queued)");
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

  it("settles note saves with an explicit, deal-scoped request lifecycle", () => {
    const notes = read("components/investcalc/deal-notes-panel.tsx");

    expect(notes).not.toContain("useTransition");
    expect(notes).toContain("const saveRequestRef = useRef<symbol | null>(null)");
    expect(notes).toContain("saveRequestRef.current !== null");
    expect(notes).toContain("queuedSaveRequestedRef.current = true");
    expect(notes).toContain('const requestToken = Symbol("deal-notes-save")');
    expect(notes).toContain("saveRequestRef.current === requestToken");
    expect(notes).toContain("dealIdAtSubmit === savedDealIdRef.current");
    expect(notes).toContain("const requestStillOwnsDeal = () =>");
    expect(notes.match(/if \(!requestStillOwnsDeal\(\)\)/g)?.length).toBeGreaterThanOrEqual(3);
    expect(notes).toContain("getQueuedDealNotesSave({");
    expect(notes).toContain("wasRequested: queuedSaveRequestedRef.current");
    expect(notes).toContain("returnedRevision: result.revision");
    expect(notes).toContain("queuedSave.expectedRevision");
    expect(notes).toContain("queuedSave.notes");
    expect(notes).toContain("setIsSaving(false)");
  });

  it("navigates to scenario comparison only after its server preparation succeeds", () => {
    const actions = read("app/actions/compare.ts");
    const actionStart = actions.indexOf("export async function compareScenariosAction");
    const actionEnd = actions.indexOf("export async function removeCompareDealAction", actionStart);
    const compareAction = actions.slice(actionStart, actionEnd);
    const card = read("components/investcalc/scenarios-card.tsx");
    const handlerStart = card.indexOf("function handleCompare");
    const handlerEnd = card.indexOf("if (!loaded || hidden)", handlerStart);
    const compareHandler = card.slice(handlerStart, handlerEnd);

    expect(compareAction).toContain("await setCompareCookie(ids)");
    expect(compareAction).toContain("return { ok: true }");
    expect(compareAction).not.toContain("redirect(");
    expect(compareHandler).toContain("if (!result.ok)");
    expect(compareHandler).toContain('window.location.assign("/dashboard/compare")');
    expect(compareHandler).not.toContain('router.push("/dashboard/compare")');
    expect(compareHandler.indexOf('window.location.assign("/dashboard/compare")')).toBeGreaterThan(
      compareHandler.indexOf("if (!result.ok)")
    );
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
      "expectedUnderwritingRevision: underwritingRevision"
    );
    expect(rateBanner).toContain("expectedUserId");
    expect(workspacePage).toContain("underwritingRevision={dealRow.underwriting_revision}");
  });

  it("drops a rate-alert apply continuation after a route change or unmount", () => {
    const banner = read(
      "components/investcalc/rate-alert-reunderwrite-banner.tsx"
    );

    expect(banner).toContain("useLayoutEffect(() => {");
    expect(banner).toContain("activeDealIdRef.current = null");
    expect(banner).toContain("applyRequestRef.current = null");
    expect(banner).toContain("isCurrentDealWorkspaceMutation({");
    expect(banner).toContain("const requestStillOwnsDeal = () =>");
    expect(
      banner.match(/if \(!requestStillOwnsDeal\(\)\) return;/g)?.length,
    ).toBeGreaterThanOrEqual(2);
    expect(banner).toContain(
      "router.replace(`/dashboard/saved-analyses/${dealIdAtSubmit}`"
    );
  });

  it("drops analyzer save continuations after its mounted instance is replaced", () => {
    const analyzer = read("components/investcalc/investcalc-page.tsx");
    const saveStart = analyzer.indexOf("const performSaveDeal = async");
    const saveEnd = analyzer.indexOf("const handleSaveDeal = async", saveStart);
    const saveHandler = analyzer.slice(saveStart, saveEnd);
    const awaitedSave = saveHandler.indexOf("const result = await saveDealAction(");
    const ownershipGuard = saveHandler.indexOf(
      "if (!saveRequestStillOwnsInstance()) return false;",
      awaitedSave,
    );
    const successBranch = saveHandler.indexOf("if (result.ok)", awaitedSave);

    expect(analyzer).toContain("useLayoutEffect(() => {");
    expect(analyzer).toContain("const saveRequestRef = useRef<symbol | null>(null)");
    expect(analyzer).toContain("saveRequestRef.current = null");
    expect(saveHandler).toContain('const saveRequestToken = Symbol("analyzer-save")');
    expect(saveHandler).toContain("isCurrentMountedMutation({");
    expect(ownershipGuard).toBeGreaterThan(awaitedSave);
    expect(ownershipGuard).toBeLessThan(successBranch);
    expect(
      saveHandler.match(
        /if \(!saveRequestStillOwnsInstance\(\)\) return false;/g,
      )?.length,
    ).toBeGreaterThanOrEqual(2);
    expect(saveHandler).toContain("if (saveRequestStillOwnsInstance()) {");
  });

  it("keeps delayed compare and share-copy completions on their owning route", () => {
    const assertGuardPrecedesNavigation = (input: {
      path: string;
      handlerStart: string;
      handlerEnd: string;
      awaitedAction: string;
      guard: string;
      navigation: string;
    }) => {
      const source = read(input.path);
      const start = source.indexOf(input.handlerStart);
      const end = source.indexOf(input.handlerEnd, start);
      const handler = source.slice(start, end === -1 ? undefined : end);
      const awaited = handler.indexOf(input.awaitedAction);
      const guard = handler.indexOf(input.guard, awaited);
      const navigation = handler.indexOf(input.navigation, awaited);

      expect(source).toContain("useLayoutEffect");
      expect(source).toContain("RequestRef.current = null");
      expect(awaited).toBeGreaterThanOrEqual(0);
      expect(guard).toBeGreaterThan(awaited);
      expect(navigation).toBeGreaterThan(guard);
      expect(handler).toContain("currentRequestToken:");
      expect(handler).toContain("current === requestToken");
    };

    assertGuardPrecedesNavigation({
      path: "components/investcalc/saved-analyses-page-v2.tsx",
      handlerStart: "const handleCompareSelected = () =>",
      handlerEnd: "const toggleOne =",
      awaitedAction: "await startCompareAction(selectedIds)",
      guard: "if (!requestStillOwnsPage()) return;",
      navigation: 'router.push("/dashboard/compare")',
    });
    assertGuardPrecedesNavigation({
      path: "components/investcalc/compare-deal-picker.tsx",
      handlerStart: "const onCompare = () =>",
      handlerEnd: "return (",
      awaitedAction: "await startCompareAction(selected)",
      guard: "if (!requestStillOwnsPicker()) return;",
      navigation: "router.refresh()",
    });
    assertGuardPrecedesNavigation({
      path: "components/investcalc/compare-deals-client.tsx",
      handlerStart: "const removeDeal =",
      handlerEnd: "// Buy-box fit",
      awaitedAction: "await removeCompareDealAction(deal.id)",
      guard: "if (!requestStillOwnsComparison()) return;",
      navigation: "router.refresh()",
    });
    assertGuardPrecedesNavigation({
      path: "components/dashboard/compare-with-another-deal-link.tsx",
      handlerStart: "function handleCompare()",
      handlerEnd: "return (",
      awaitedAction: "await startCompareAction([dealIdAtSubmit])",
      guard: "if (!requestStillOwnsDeal()) return;",
      navigation: 'router.push("/dashboard/compare")',
    });
    assertGuardPrecedesNavigation({
      path: "components/investcalc/investcalc-page.tsx",
      handlerStart: "const handleCompareDeals = async",
      handlerEnd: '/**\n   * "Try a sample deal"',
      awaitedAction: "await addDealToCompareAction(dealIdForCompare)",
      guard: "if (!requestStillOwnsInstance()) return;",
      navigation: 'router.push("/dashboard/compare")',
    });
    assertGuardPrecedesNavigation({
      path: "components/investcalc/read-only-analysis-view.tsx",
      handlerStart: "const copyToAccount = async",
      handlerEnd: "return (",
      awaitedAction: "await copyPublicShareToAccountAction({",
      guard: "if (!requestStillOwnsView()) return;",
      navigation: "router.push(",
    });
  });

  it("preserves comment drafts and confirms permanent deletion", () => {
    const comments = read("components/investcalc/deal-comments-panel.tsx");
    const submit = comments.indexOf("await addDealCommentV2Action");
    const clear = comments.indexOf("setDraft", submit);
    expect(clear).toBeGreaterThan(submit);
    expect(comments).toContain("Delete this comment?");
    expect(comments).toContain("There is no safe undo");
    expect(comments).toContain("confirmDeleteId");
  });

  it("keeps controlled detail drafts on failed writes and exposes retry", () => {
    const details = read("components/investcalc/deal-details-card.tsx");
    expect(details).toContain("draftsRef.current");
    expect(details).toContain("restoreSubmittedKeys()");
    expect(details).toContain("buildLatestDealLabelPatch(");
    expect(details).toContain("Couldn’t save");
    expect(details).toContain("Retry");
    expect(details).toContain("value={drafts[f.key] ?? \"\"}");
  });
});
