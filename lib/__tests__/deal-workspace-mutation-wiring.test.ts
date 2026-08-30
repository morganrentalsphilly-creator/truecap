import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(join(process.cwd(), path), "utf8");

describe("saved-deal workspace mutation wiring", () => {
  const genericGuardedCards = [
    "components/investcalc/due-diligence-card.tsx",
    "components/investcalc/deal-comments-panel.tsx",
    "components/investcalc/deal-details-card.tsx",
    "components/investcalc/deal-stage-select.tsx",
    "components/investcalc/deal-client-select.tsx",
    "components/investcalc/saved-deal-watch-card.tsx",
    "components/investcalc/owned-equity-card.tsx",
    "components/investcalc/scenarios-card.tsx",
  ];

  it.each(genericGuardedCards)(
    "invalidates stale %s mutations during the route commit",
    (path) => {
      const source = read(path);
      expect(source).toContain("useLayoutEffect");
      expect(source).toContain("savedDealIdRef.current = savedDealId");
      expect(source).toContain("mutationRequestRef.current = null");
      expect(source).toContain("isCurrentDealWorkspaceMutation({");
      expect(source).toContain("currentDealId: savedDealIdRef.current");
      expect(source).toContain("currentRequestToken: mutationRequestRef.current");

      const identityStart = source.indexOf("useLayoutEffect(() =>");
      const identityEnd = source.indexOf("}, [savedDealId]);", identityStart);
      const identityBlock = source.slice(identityStart, identityEnd);
      expect(identityBlock).toContain("return () => {");
      expect(identityBlock).toContain(
        "if (savedDealIdRef.current !== savedDealId) return",
      );
      expect(identityBlock).toContain("savedDealIdRef.current = null");
      expect(identityBlock).toContain("mutationRequestRef.current = null");
    },
  );

  it("closes the same commit window for the notes save queue", () => {
    const source = read("components/investcalc/deal-notes-panel.tsx");
    const identitySync = source.slice(
      source.indexOf("useLayoutEffect(() =>"),
      source.indexOf("// Lazy-load", source.indexOf("useLayoutEffect(() =>")),
    );
    expect(identitySync).toContain("savedDealIdRef.current = savedDealId");
    expect(identitySync).toContain("saveRequestRef.current = null");
    expect(identitySync).toContain("queuedSaveRequestedRef.current = false");
    expect(identitySync).toContain("return () => {");
    expect(identitySync).toContain(
      "if (savedDealIdRef.current !== savedDealId) return",
    );
    expect(identitySync).toContain("savedDealIdRef.current = null");
    expect(identitySync).toContain('notesRef.current = ""');
    expect(identitySync).toContain('lastSavedNotesRef.current = ""');
    expect(source).toContain("isCurrentDealNotesSave({");
  });

  it("clears deal-scoped retry and queue identity during layout cleanup", () => {
    const comments = read("components/investcalc/deal-comments-panel.tsx");
    const details = read("components/investcalc/deal-details-card.tsx");
    const scenarios = read("components/investcalc/scenarios-card.tsx");

    expect(comments).toContain("addRequestRef.current = null");
    expect(details).toContain("queuedSaveKeysRef.current = []");
    expect(scenarios).toContain("scenarioClientRequestRef.current = null");
  });

  it("clears unsaved due-diligence input before a reused route can show it", () => {
    const source = read("components/investcalc/due-diligence-card.tsx");
    const identitySync = source.slice(
      source.indexOf("useLayoutEffect(() =>"),
      source.indexOf("useEffect(() =>"),
    );
    expect(identitySync).toContain('setNewLabel("")');
    expect(identitySync).toContain('noteAtOpenRef.current = ""');
    expect(identitySync).toContain("[savedDealId]");
  });

  it("captures rejected comment adds without clearing the user's draft", () => {
    const source = read("components/investcalc/deal-comments-panel.tsx");
    expect(source).not.toContain("addDealCommentV2Action(dealAtSubmit, body).catch");
    expect(source).toContain("Sentry.captureException(error, {");
    expect(source).toContain('tags: { feature: "deal-comments-add" }');
    expect(source).toContain("Your entry is still in the box - try again.");
    expect(source).toContain('setDraft((current) => (current.trim() === body ? "" : current))');
  });

  it("resynchronizes controlled workspace selectors when the deal changes", () => {
    const stage = read("components/investcalc/deal-stage-select.tsx");
    const client = read("components/investcalc/deal-client-select.tsx");
    expect(stage).toMatch(/setDisplayStage\(stage\);\s*\n\s*}, \[savedDealId, stage\]\);/);
    expect(client).toMatch(
      /setValue\(clientId \?\? UNASSIGNED\);\s*\n\s*}, \[clientId, savedDealId\]\);/,
    );
  });

  it("clears Watch settings before loading a different deal", () => {
    const source = read("components/investcalc/saved-deal-watch-card.tsx");
    const identitySync = source.slice(
      source.indexOf("useLayoutEffect(() =>"),
      source.indexOf("useEffect(() =>"),
    );
    expect(identitySync).toContain("setLoaded(false)");
    expect(identitySync).toContain("setAvailable(true)");
    expect(identitySync).toContain("setSettings(null)");
    expect(identitySync).toContain("[savedDealId]");
  });

  it("only hides Watch for expected unavailable codes and surfaces unexpected failures", () => {
    const source = read("components/investcalc/saved-deal-watch-card.tsx");
    expect(source).toContain('result.code === "FEATURE_DISABLED"');
    expect(source).toContain('result.code === "MIGRATION_PENDING"');
    expect(source).toContain('result.code === "ENTITLEMENT_REQUIRED"');
    expect(source).toContain('result.code === "NOT_FOUND"');
    expect(source).toContain("Couldn't load Watch setup");
    expect(source).toContain("description: result.message");
  });

  it("prevents an old scenario refresh from superseding a reused deal route", () => {
    const source = read("components/investcalc/scenarios-card.tsx");
    const identitySync = source.slice(
      source.indexOf("useLayoutEffect(() =>"),
      source.indexOf("const refresh = useMemo"),
    );
    expect(identitySync).toContain("loadRequestRef.current += 1");
    expect(identitySync).toContain("setScenarios([])");
    expect(identitySync).toContain("setAdding(false)");
    expect(identitySync).toContain('setName("")');
    expect(identitySync).toContain('setStrategy("")');
    expect(source).toContain("const dealIdAtLoad = savedDealId");
    expect(source).toContain(
      "if (savedDealIdRef.current !== dealIdAtLoad) return",
    );
    expect(source).toContain("sourceDealId: dealIdAtSubmit");
    expect(source).toContain("compareScenariosAction(dealIdAtSubmit)");

    const compareAwait = source.indexOf(
      "const result = await compareScenariosAction(dealIdAtSubmit)",
    );
    const postCompareGuard = source.indexOf(
      "if (!requestStillOwnsDeal()) return",
      compareAwait,
    );
    const compareNavigation = source.indexOf(
      'window.location.assign("/dashboard/compare")',
      postCompareGuard,
    );
    expect(compareAwait).toBeGreaterThan(-1);
    expect(postCompareGuard).toBeGreaterThan(compareAwait);
    expect(compareNavigation).toBeGreaterThan(postCompareGuard);
  });

  it("locks every scenario form exit or edit that could discard an in-flight draft", () => {
    const source = read("components/investcalc/scenarios-card.tsx");
    const nameStart = source.indexOf('id="scenario-name"');
    const nameControl = source.slice(nameStart, source.indexOf("/>", nameStart));
    const strategyStart = source.indexOf('id="scenario-strategy"');
    const strategyControl = source.slice(
      strategyStart,
      source.indexOf("</select>", strategyStart),
    );

    expect(nameStart).toBeGreaterThan(-1);
    expect(strategyStart).toBeGreaterThan(-1);
    expect(nameControl).toContain("disabled={isSaving}");
    expect(strategyControl).toContain("disabled={isSaving}");
    const cancelStart = source.indexOf('variant="ghost"', strategyStart);
    const cancelControl = source.slice(
      cancelStart,
      source.indexOf("</Button>", cancelStart),
    );
    expect(cancelControl).toContain("scenarioClientRequestRef.current = null");
    expect(cancelControl).toContain("setAdding(false)");
    expect(cancelControl).toContain("disabled={isSaving}");
  });

  it("keys comp loads and pulls by the full provider subject plus saved deal", () => {
    const source = read("components/investcalc/property-comps-card.tsx");
    const identitySync = source.slice(
      source.indexOf("useLayoutEffect(() =>"),
      source.indexOf("// On a saved deal"),
    );
    expect(source).toContain(
      "const queryFingerprint = propertyCompsUnderwritingFingerprint({",
    );
    expect(source).toContain("const queryFingerprintRef = useRef(queryFingerprint)");
    expect(source).toContain("const dataQueryFingerprintRef = useRef<string | null>(null)");
    expect(identitySync).toContain("savedDealIdRef.current = nextDealId");
    expect(identitySync).toContain("queryFingerprintRef.current = queryFingerprint");
    expect(identitySync).toContain("setData(null)");
    expect(identitySync).toContain("onDataChangeRef.current?.(null)");
    expect(source).toContain("const pullRequestRef = useRef<symbol | null>(null)");
    expect(source).toContain("pullRequestRef.current = null");
    expect(source).toContain("isCurrentMountedMutation({");
    expect(source).toContain("currentRequestToken: pullRequestRef.current");
    expect(source).toContain("const dealIdAtLoad = savedDealId");
    expect(source).toContain("savedDealIdRef.current === dealIdAtLoad");
    expect(source).toContain("queryFingerprintRef.current === fingerprintAtLoad");
    expect(source).toContain("getSavedDealCompsAction({");
    expect(source).toContain("const pulledDealId = savedDealId ?? null");
    expect(source).toContain("propertyCompsRequestStillOwnsSubject({");
    expect(source).toContain("requestedFingerprint: pulledFingerprint");
    expect(source).toContain("if (!pullStillOwnsWorkspace()) return");
    expect(source).toContain("dealId: pulledDealId ?? undefined");
    expect(source).toContain(
      "if (dataQueryFingerprintRef.current !== queryFingerprintRef.current) return",
    );
  });
});
