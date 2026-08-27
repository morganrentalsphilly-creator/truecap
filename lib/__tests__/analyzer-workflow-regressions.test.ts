import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  NEW_ANALYSIS_REQUEST_EVENT,
  requestMountedNewAnalysis,
  shouldStartFreshAnalysis,
} from "@/lib/new-analysis-navigation";

const ROOT = process.cwd();
const read = (path: string) => readFileSync(join(ROOT, path), "utf8");
const compact = (source: string) => source.replace(/\s+/g, " ").trim();

function section(source: string, startMarker: string, endMarker: string): string {
  const start = source.indexOf(startMarker);
  expect(start, `missing source marker: ${startMarker}`).toBeGreaterThanOrEqual(0);
  const end = source.indexOf(endMarker, start + startMarker.length);
  expect(
    end,
    `missing source marker after ${startMarker}: ${endMarker}`,
  ).toBeGreaterThan(start);
  return source.slice(start, end);
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("dashboard-shell New Analysis continuity", () => {
  it("dispatches one stable reset request to an already-mounted analyzer", () => {
    const browser = new EventTarget();
    const received = vi.fn();
    browser.addEventListener(NEW_ANALYSIS_REQUEST_EVENT, received);
    vi.stubGlobal("window", browser);

    requestMountedNewAnalysis();

    expect(NEW_ANALYSIS_REQUEST_EVENT).toBe("truecap:new-analysis-request");
    expect(received).toHaveBeenCalledOnce();
    expect(received.mock.calls[0]?.[0]).toBeInstanceOf(Event);
  });

  it("is safe when rendered or imported without a browser window", () => {
    vi.stubGlobal("window", undefined);
    expect(() => requestMountedNewAnalysis()).not.toThrow();
  });

  it("makes every shell New Analysis control reset the current route instead of no-oping", () => {
    const sidebar = read("components/dashboard/Sidebar.tsx");
    const topbar = read("components/dashboard/Topbar.tsx");

    const sidebarHandler = section(
      sidebar,
      "onClick={(event) => {",
      "title={item.enabled",
    );
    expect(sidebarHandler).toContain('item.href.startsWith("/dashboard/new")');
    expect(sidebarHandler).toContain('pathname === "/dashboard/new"');
    expect(sidebarHandler).toContain("event.preventDefault()");
    expect(sidebarHandler).toContain("requestMountedNewAnalysis()");

    const topbarActions = section(
      topbar,
      '<div className="flex items-center gap-2 ml-auto">',
      '<div className="pl-3 ml-1 border-l border-border">',
    );
    expect(
      topbarActions.match(/href="\/dashboard\/new\?fresh=1"/g),
    ).toHaveLength(2);
    expect(topbarActions.match(/pathname === "\/dashboard\/new"/g)).toHaveLength(2);
    expect(topbarActions.match(/event\.preventDefault\(\)/g)).toHaveLength(2);
    expect(topbarActions.match(/requestMountedNewAnalysis\(\)/g)).toHaveLength(2);

    const calculator = read("components/investcalc/investcalc-page.tsx");
    const listener = section(
      calculator,
      "// Dashboard-shell New Analysis controls stay mounted",
      '/**\n   * "Analyze another like this"',
    );
    expect(listener).toContain(
      "window.addEventListener(NEW_ANALYSIS_REQUEST_EVENT, onRequest)",
    );
    expect(listener).toContain(
      "window.removeEventListener(NEW_ANALYSIS_REQUEST_EVENT, onRequest)",
    );
    expect(listener).toContain("const onRequest = () => handleNewAnalysis()");
  });

  it("starts fresh across routes but preserves specific saved, handoff, and billing continuations", () => {
    const base = {
      requested: true,
      hasInitialSavedDeal: false,
      hasEditHandoff: false,
      hasDuplicateHandoff: false,
      hasAnalyzerHandoff: false,
      hasBillingReturn: false,
    };

    expect(shouldStartFreshAnalysis(base)).toBe(true);
    for (const protectedPath of [
      "hasInitialSavedDeal",
      "hasEditHandoff",
      "hasDuplicateHandoff",
      "hasAnalyzerHandoff",
      "hasBillingReturn",
    ] as const) {
      expect(
        shouldStartFreshAnalysis({ ...base, [protectedPath]: true }),
      ).toBe(false);
    }
    expect(shouldStartFreshAnalysis({ ...base, requested: false })).toBe(false);
  });

  it("consumes the fresh instruction once before draft restore or a later save", () => {
    const calculator = read("components/investcalc/investcalc-page.tsx");
    const mountInitialization = section(
      calculator,
      "Initialize from a one-time saved-analysis handoff",
      "const reopenPayloadRaw",
    );
    expect(mountInitialization).toContain(
      'const requestedExplicitFreshAnalysis = handoffParams.get("fresh") === "1"',
    );
    expect(mountInitialization).toContain('url.searchParams.delete("fresh")');
    expect(mountInitialization).toContain("shouldStartFreshAnalysis({");
    expect(mountInitialization).toContain('resetToNewAnalysis("single-family")');
    expect(mountInitialization.indexOf('url.searchParams.delete("fresh")')).toBeLessThan(
      mountInitialization.indexOf("shouldStartFreshAnalysis({"),
    );

    const savedDeals = read(
      "components/investcalc/saved-analyses-page-v2.tsx",
    );
    expect(savedDeals.match(/href="\/dashboard\/new\?fresh=1"/g)).toHaveLength(2);
  });

  it("lets the dedicated reset handler own the warning instead of prompting twice", () => {
    const calculator = read("components/investcalc/investcalc-page.tsx");
    const navigationGuard = section(
      calculator,
      "Same protection for IN-APP navigation",
      "const handleCompareDeals = async",
    );
    expect(navigationGuard).toContain(
      'window.location.pathname === "/dashboard/new"',
    );
    expect(navigationGuard).toContain(
      'destination.pathname === "/dashboard/new"',
    );
    expect(navigationGuard.indexOf('destination.pathname === "/dashboard/new"')).toBeLessThan(
      navigationGuard.indexOf("window.confirm("),
    );
  });

  it("restores a saved deal from a refresh-safe, owner-scoped dashboard URL", () => {
    const route = read("app/dashboard/new/page.tsx");

    expect(route).toContain("searchParams?: Promise<{");
    expect(route).toContain("savedDeal?: string;");
    expect(route).toContain("requestedSavedDealId");
    expect(route).toContain(
      "await getSavedDealForEditingAction(requestedSavedDealId)",
    );
    expect(route).toContain("initialSavedDeal={initialSavedDeal}");
    expect(route).toContain('key={requestedSavedDealId ?? "new-analysis"}');
    expect(route).toMatch(/\^\[0-9a-f\]\{8\}.*\[0-9a-f\]\{12\}\$\/i/);
    expect(route).not.toContain("sessionStorage");
    expect(route).not.toContain("localStorage");
  });
});

describe("atomic Save & compare", () => {
  const calculator = read("components/investcalc/investcalc-page.tsx");
  const summary = read("components/investcalc/focused-decision-summary.tsx");

  it("persists the exact current analysis before adding its completed id", () => {
    const flow = section(
      calculator,
      "const handleCompareDeals = async",
      '/**\n   * "Try a sample deal"',
    );

    expect(flow).toContain("if (compareInFlightRef.current) return");
    expect(flow).toContain("lastCompletedSaveDealIdRef.current = null");
    expect(flow).toContain("await handleSaveDeal(maoTarget, source)");
    expect(flow).toContain("if (saved !== true) return");
    expect(flow).toContain(
      "dealIdForCompare = lastCompletedSaveDealIdRef.current",
    );
    expect(flow).toContain("await addDealToCompareAction(dealIdForCompare)");
    expect(
      flow.indexOf("await handleSaveDeal(maoTarget, source)"),
    ).toBeLessThan(
      flow.indexOf("await addDealToCompareAction(dealIdForCompare)"),
    );
    expect(flow.indexOf("if (!result.ok)")).toBeLessThan(
      flow.indexOf('router.push("/dashboard/compare")'),
    );
    expect(flow).not.toContain('title: "Save required"');
  });

  it("offers Save & compare without disabling an eligible unsaved result", () => {
    expect(summary).toContain('!isSaved ? "Save & compare" : "Compare deals"');
    expect(summary).toContain("targetAdopted ? target : undefined");
    expect(summary).toContain("targetAdopted ? targetSource : undefined");
    expect(summary).toContain(
      "disabled={resultActionsBlocked || isSaving || isComparing}",
    );
    expect(summary).not.toContain("disabled={!isSaved || isComparing}");
    expect(summary).toContain(
      "Your current analysis and Offer criteria will be saved before it is",
    );
  });
});

describe("pre-run Offer Ceiling criteria", () => {
  const calculator = read("components/investcalc/investcalc-page.tsx");
  const editor = read("components/investcalc/pre-run-criteria-editor.tsx");

  it("requires visible criteria only for the general Buy & Hold and Wholesale ceiling promises", () => {
    const gate = section(
      calculator,
      "const activeRunPromisesOfferCeiling =",
      "const proposedPreRunTarget =",
    );
    const normalized = compact(gate);

    expect(normalized).toContain("analysisRunPromisesOfferCeiling({");
    expect(normalized).toContain("canCalculateMaxOffer: canUseMaxOffer");
    expect(normalized).toContain("strategyKey: activeStrategyKey");
    expect(normalized).toContain(
      "activeRunPromisesOfferCeiling && (!hasAdoptedAnalysisTarget || hasExplicitPreRunCriteriaChoice)",
    );
    expect(normalized).not.toContain("!isEditingAssumptions");
  });

  it("shows the exact proposed basis before the CTA explicitly adopts it", () => {
    const decisionPanel = section(
      calculator,
      "{activeRunPromisesOfferCeiling ? (",
      "{/* Calculate button",
    );
    const actions = section(
      calculator,
      "const primaryActionLabel =",
      "useEffect(() => {\n    if (postAnalysisMode)",
    );

    expect(decisionPanel).toContain('aria-label="Offer Ceiling criteria"');
    expect(decisionPanel).toContain("decisionTargetLabel");
    expect(decisionPanel).toContain("Will use Buy Box");
    expect(decisionPanel).toContain("Will use TrueCap starter criteria");
    expect(decisionPanel).toContain("Change criteria");
    expect(decisionPanel).toContain("PreRunCriteriaEditor");
    expect(decisionPanel).toContain("eligiblePreRunBuyBoxes.map");
    expect(decisionPanel).not.toContain("!isEditingAssumptions");
    expect(actions).toContain("Analyze deal & calculate ceiling");
    expect(actions).toContain("commitPreRunTarget(");
    expect(actions).toContain("analysisMaoTargetRef.current = target");
    expect(actions).toContain("setAnalysisMaoTargetSource(source)");
    expect(actions).toContain('"starter-criteria"');
    expect(actions).toContain("captureNonBuyBoxDecisionBasis");
    expect(actions).toContain("writeCalcDraftWithMaoTarget(");
    expect(actions.indexOf("analysisMaoTargetRef.current = target")).toBeLessThan(
      actions.indexOf("form.handleSubmit(onSubmit, onError)"));
  });

  it("makes the visible draft the only one-click calculation source", () => {
    expect(compact(editor)).toContain("onChange( nextValidation.target");
    expect(editor).not.toContain("Use these criteria");
    expect(calculator).toContain("const preRunCriteriaInvalid =");
    expect(calculator).toContain("activePreRunCriteriaDraft?.dirty");
    expect(calculator).toContain(
      "Correct the highlighted value or choose at least one criterion",
    );
    expect(calculator).toContain("hasExplicitPreRunCriteriaChoice");
    expect(calculator).toContain("decisionBasisNeedsReviewRef.current");
  });

  it("allows one explicit operating-economics run without converting missing criteria into an error", () => {
    const submitGate = section(
      calculator,
      "const explicitlyTargetless = explicitTargetlessRunRef.current",
      "// Warm the dynamic AnalysisDashboard chunk",
    );
    const actionHandler = section(
      calculator,
      "const handlePrimaryRunAction = async",
      "useEffect(() => {\n    if (postAnalysisMode)",
    );

    expect(actionHandler).toContain("if (options?.withoutOfferCeiling)");
    expect(actionHandler).toContain("explicitTargetlessRunRef.current = true");
    expect(actionHandler).toContain("analysisMaoTargetRef.current = null");
    expect(actionHandler).toContain('setAnalysisMaoTargetSource("screening-defaults")');
    expect(actionHandler).toContain("form.handleSubmit(onSubmit, onError)");
    expect(calculator).toContain("Analyze cash flow without an Offer Ceiling");

    expect(submitGate).toContain("explicitTargetlessRunRef.current = false");
    expect(submitGate).toContain("!explicitlyTargetless");
    expect(submitGate).toContain("Choose decision criteria first");
  });

  it("continues hero and listing imports through the same one-click criteria path", () => {
    const handoff = section(
      calculator,
      "const submitProgrammaticHandoff = () =>",
      "// Latest-closure assignment for the hero address handoff",
    );
    const hero = section(
      calculator,
      "heroAnalyzeHandlerRef.current = (detail: HeroAnalyzeDetail)",
      "/**\n   * Live provenance + raw capture getters",
    );

    expect(handoff).toContain("analysisRunPromisesOfferCeiling({");
    expect(handoff).toContain("!analysisMaoTargetRef.current");
    expect(handoff).toContain('preRunBuyBoxStateRef.current === "loading"');
    expect(handoff).toContain(
      "pendingProgrammaticHandoffGenerationRef.current =",
    );
    expect(handoff).toContain("forkGenerationRef.current");
    expect(handoff).toContain("We’ll continue the analysis automatically");
    expect(handoff).toContain("primaryRunActionRef.current()");
    expect(handoff).not.toContain("Review your decision criteria");
    expect(handoff).not.toContain('document.getElementById("decision-criteria")');
    expect(hero.match(/submitProgrammaticHandoff\(\)/g)).toHaveLength(2);
    expect(hero).not.toContain("form.handleSubmit(onSubmit, onError)");

    expect(calculator).toContain(
      "primaryRunActionRef.current = handlePrimaryRunAction",
    );
    expect(compact(calculator)).toContain(
      compact(
        'pendingGeneration === null || preRunBuyBoxState === "loading"',
      ),
    );
    expect(calculator).toContain(
      "pendingGeneration !== forkGenerationRef.current",
    );
  });
});

describe("assumption editing return path", () => {
  it("keeps an immediate, visible way back to a validated result", () => {
    const calculator = read("components/investcalc/investcalc-page.tsx");
    const editingBanner = section(
      calculator,
      "{isEditingAssumptions && analysisResult ? (",
      "{/* Guided step rail",
    );

    expect(editingBanner).toContain('aria-label="Editing analysis assumptions"');
    expect(editingBanner).toContain("Editing this analysis");
    expect(editingBanner).toContain("needsPreRunTargetChoice");
    expect(editingBanner).toContain("visible decision criteria below");
    expect(editingBanner).toContain("primaryActionLabel");
    expect(editingBanner).toContain("void handlePrimaryRunAction()");
    expect(editingBanner).toContain("decisionCriteriaBlockPrimaryAction");
    expect(editingBanner).toContain("View live result");
    expect(editingBanner).toContain("handleBackToResult");
    expect(editingBanner).toContain('data-edit-live-readout="true"');
    expect(editingBanner).toContain("Live · unsaved");
    expect(editingBanner).toContain(
      "Last complete result · fix the highlighted input",
    );
    expect(editingBanner).toContain("analysisResult.netCashFlow");
    expect(editingBanner).toContain("analysisResult.capRate");
    expect(editingBanner).toContain("analysisResult.dscr");
  });
});

describe("keyboard progression", () => {
  it("moves plain Enter only through underwriting fields, never arbitrary action buttons", () => {
    const calculator = read("components/investcalc/investcalc-page.tsx");
    const enterHandler = section(
      calculator,
      "Plain Enter should never surprise-run a financial analysis",
      "noValidate",
    );

    expect(enterHandler).toContain(
      "input:not([disabled]):not([type='hidden']), select:not([disabled])",
    );
    expect(enterHandler).not.toContain("button:not([disabled])");
    expect(enterHandler).toContain("fields[index + 1]?.focus()");
  });
});

describe("address request and enrichment sequencing", () => {
  const autocomplete = read("components/investcalc/address-autocomplete.tsx");
  const calculator = read("components/investcalc/investcalc-page.tsx");

  it("discards out-of-order suggestion and place-detail responses", () => {
    const predictions = section(
      autocomplete,
      "const fetchPredictions = async",
      "// Deferred-load race",
    );
    const selection = section(
      autocomplete,
      "const handleSelect = async",
      "/** Pick the state/county/zip",
    );

    expect(autocomplete).toContain("const predictionRequestRef = useRef(0)");
    expect(autocomplete).toContain("const selectionRequestRef = useRef(0)");
    expect(predictions).toContain("const requestId = ++predictionRequestRef.current");
    expect(predictions).toContain("requestId !== predictionRequestRef.current");
    expect(predictions).toContain("input !== lastValueRef.current");
    expect(selection).toContain("const selectionId = ++selectionRequestRef.current");
    expect(selection).toContain("selectedFromValue !== lastValueRef.current");
    expect(autocomplete).toContain("selectionRequestRef.current += 1");
  });

  it("makes an empty lookup visible and associates the status with the combobox", () => {
    expect(autocomplete).toContain("setNoMatches(preds.length === 0)");
    expect(autocomplete).toContain("noMatches ? noMatchesId : null");
    expect(autocomplete).toContain("aria-describedby={describedBy}");
    expect(autocomplete).toContain("id={noMatchesId}");
    expect(autocomplete).toContain('role="status"');
    expect(autocomplete).toContain(
      "No address matches yet. Keep typing or paste the complete street,",
    );
  });

  it("lets an accidental property selection truly return to the prior address", () => {
    const propertySwap = section(
      calculator,
      "const preparePropertySwap = useCallback",
      "/** Address-selected entry point",
    );
    const addressChange = section(
      calculator,
      "const handleAddressSelected = useCallback",
      "/**\n   * After an address has been picked",
    );

    expect(propertySwap).toContain("hasPropertySpecificValues");
    expect(propertySwap).toContain("Choose Cancel to return to the previous address");
    expect(propertySwap).toContain(
      'form.setValue("address", previousAddress',
    );
    expect(propertySwap).toContain('title: "Kept the previous property"');
    expect(addressChange).toContain("if (!preparePropertySwap(place)) return");
    expect(addressChange.indexOf("preparePropertySwap(place)")).toBeLessThan(
      addressChange.indexOf("lastSelectedAddressRef.current = place"),
    );
    expect(propertySwap).toContain("getDefaultUnitsForPropertyType");
    expect(propertySwap).toContain('form.setValue("yearBuilt", undefined');
    expect(propertySwap).toContain('form.setValue("propertyTaxAnnual", undefined');
    expect(propertySwap).toContain('form.setValue("insuranceMonthly", undefined');
    expect(propertySwap).not.toContain("Previous values kept for review");
  });

  it("seeds prior-property identity before the first swap after every restore path", () => {
    const identityHelper = section(
      calculator,
      "const seedRestoredAddressIdentity =",
      "/**\n   * One source-of-truth",
    );
    expect(identityHelper).toContain("lastSelectedAddressRef.current = restoredPlace");
    expect(identityHelper).toContain("lastEnrichedAddressRef.current = formattedAddress");
    expect(identityHelper).toContain("lastEnrichedGeoRef.current =");

    const restoreFlow = section(
      calculator,
      "Initialize from a one-time saved-analysis handoff",
      "const handleTrySampleDeal = () =>",
    );
    expect(restoreFlow.match(/seedRestoredAddressIdentity\(/g)?.length ?? 0).toBeGreaterThanOrEqual(3);
    expect(restoreFlow).toContain("form.reset(hydratedValues)");
    expect(restoreFlow).toContain("seedRestoredAddressIdentity(hydratedValues.address)");
    expect(restoreFlow).toContain("form.reset(lenient)");
    expect(restoreFlow).toContain("seedRestoredAddressIdentity(lenient.address)");
    expect(restoreFlow).toContain("form.reset(normalized)");
    expect(restoreFlow).toContain("seedRestoredAddressIdentity(normalized.address)");
  });

  it("waits for the active enrichment before validating and running", () => {
    const tracker = section(
      calculator,
      "const runTrackedPropertyEnrichment = useCallback(",
      "/** Address-selected entry point",
    );
    const submit = section(
      calculator,
      "const onSubmit = async",
      "// Warm the dynamic AnalysisDashboard chunk",
    );

    expect(tracker).toContain("addressEnrichmentPromiseRef.current = request");
    expect(tracker).toContain("setIsAddressEnrichmentPending(true)");
    expect(tracker).toContain("addressEnrichmentPromiseRef.current !== request");
    expect(tracker).toContain("setIsAddressEnrichmentPending(false)");
    expect(submit).toContain("await pendingEnrichment");
    expect(submit).toContain("Finishing the property lookup");
    expect(submit).toContain("form.handleSubmit(onSubmit, onError)");
  });

  it("rejects enrichment that returns after the property model changed", () => {
    const enrichment = section(
      calculator,
      "const runPropertyEnrichment = useCallback",
      "const runTrackedPropertyEnrichment = useCallback",
    );

    expect(enrichment).toContain(
      'form.getValues("propertyType") !== currentPropertyType',
    );
  });
});

describe("async score consistency", () => {
  const calculator = read("components/investcalc/investcalc-page.tsx");

  it("cannot pair a stale server score with newly edited metrics", () => {
    const loader = section(
      calculator,
      "const loadDealScore = async",
      "const form = useForm",
    );

    expect(calculator).toContain("const dealScoreRequestRef = useRef(0)");
    expect(loader).toContain("const scoreRequest = ++dealScoreRequestRef.current");
    expect(loader).toContain("scoreInputFingerprint");
    expect(loader).toContain(
      "formSnapshotForCompare(form.getValues()) !== scoreInputFingerprint",
    );
    expect(calculator).toContain("dealScoreRequestRef.current += 1");
  });
});

describe("result editing and deleted-deal recovery", () => {
  const calculator = read("components/investcalc/investcalc-page.tsx");

  it("hides the stale result surface and disables result navigation while assumptions are edited", () => {
    const resultMount = section(
      calculator,
      "{/* Results - wrapped in an error boundary",
      "</main>",
    );

    expect(compact(calculator)).toContain(
      "const focusedResultsMode = Boolean(analysisResult) && showResults && !isCalculating && !isEditingAssumptions",
    );
    expect(compact(calculator)).toContain(
      "const postAnalysisMode = Boolean(analysisResult) && showResults && !isCalculating && !isEditingAssumptions",
    );
    expect(compact(calculator)).toContain(
      "const areAnalysisTabsEnabled = Boolean(analysisResult) && !isCalculating && !isEditingAssumptions",
    );
    expect(resultMount).toContain("{!isEditingAssumptions &&");
    expect(compact(calculator)).toContain(
      'isEditingAssumptions ? "Update analysis"',
    );
    expect(calculator).toContain("{activeRunPromisesOfferCeiling ? (");
  });

  it("detaches a remotely deleted ID, saves a local recovery draft, and offers a forced insert", () => {
    const deletedBranch = section(
      calculator,
      'if (result.code === "DEAL_DELETED") {',
      'if (result.code === "DUPLICATE_ADDRESS") {',
    );

    expect(deletedBranch).toContain("setSavedDealId(null)");
    expect(deletedBranch).toContain("savedDealIdRef.current = null");
    expect(deletedBranch).toContain("replaceSavedDealUrl(null)");
    expect(deletedBranch).toContain("writeCalcDraftWithMaoTarget(");
    expect(deletedBranch).toContain("const recoveryValues = form.getValues()");
    expect(deletedBranch).toContain("analysisMaoTargetRef.current");
    expect(deletedBranch).toContain("setHasUnsavedChanges(true)");
    expect(deletedBranch).toContain("setDeletedDealRecoveryActive(true)");
    expect(deletedBranch).toContain("performSaveDeal({ forceInsert: true })");

    expect(calculator).toContain("Your edits are safe on this device");
    expect(calculator).toContain("Save as new deal");
    expect(calculator).toContain("setDeletedDealRecoveryActive(false)");
  });
});
