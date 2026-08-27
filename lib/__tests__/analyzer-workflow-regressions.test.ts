import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  NEW_ANALYSIS_REQUEST_EVENT,
  requestMountedNewAnalysis,
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
    expect(sidebarHandler).toContain('item.href === "/dashboard/new"');
    expect(sidebarHandler).toContain('pathname === "/dashboard/new"');
    expect(sidebarHandler).toContain("event.preventDefault()");
    expect(sidebarHandler).toContain("requestMountedNewAnalysis()");

    const topbarActions = section(
      topbar,
      '<div className="flex items-center gap-2 ml-auto">',
      '<div className="pl-3 ml-1 border-l border-border">',
    );
    expect(topbarActions.match(/href="\/dashboard\/new"/g)).toHaveLength(2);
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

    expect(route).toContain("searchParams?: Promise<{ savedDeal?: string }>");
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

describe("pre-run Offer Ceiling criteria", () => {
  const calculator = read("components/investcalc/investcalc-page.tsx");

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
      "activeRunPromisesOfferCeiling && !hasAdoptedAnalysisTarget",
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

    expect(decisionPanel).toContain('aria-label="Decision criteria"');
    expect(decisionPanel).toContain("decisionTargetLabel");
    expect(decisionPanel).toContain("Starting criteria — not yet applied");
    expect(decisionPanel).toContain("Review before use");
    expect(decisionPanel).not.toContain("!isEditingAssumptions");
    expect(actions).toContain("Use my Buy Box & calculate ceiling");
    expect(actions).toContain("Use these criteria & calculate ceiling");
    expect(actions).toContain("analysisMaoTargetRef.current = target");
    expect(actions).toContain("setAnalysisMaoTargetSource(proposedPreRunSource)");
    expect(actions).toContain("writeCalcDraftWithMaoTarget(");
    expect(actions.indexOf("analysisMaoTargetRef.current = target")).toBeLessThan(
      actions.indexOf("form.handleSubmit(onSubmit, onError)"),
    );
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
    expect(calculator).toContain(
      "Analyze operating economics without an Offer Ceiling",
    );

    expect(submitGate).toContain("explicitTargetlessRunRef.current = false");
    expect(submitGate).toContain("!explicitlyTargetless");
    expect(submitGate).toContain("Choose decision criteria first");
  });

  it("stops hero and listing auto-runs before results when Pro criteria need review", () => {
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
    expect(handoff).toContain("Review your decision criteria");
    expect(handoff).toContain('document.getElementById("decision-criteria")');
    expect(hero.match(/submitProgrammaticHandoff\(\)/g)).toHaveLength(2);
    expect(hero).not.toContain("form.handleSubmit(onSubmit, onError)");
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
    expect(editingBanner).toContain(
      '(needsPreRunTargetChoice && preRunBuyBoxState === "loading")',
    );
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
    expect(autocomplete).toContain('id={noMatchesId}');
    expect(autocomplete).toContain('role="status"');
    expect(autocomplete).toContain(
      "No address matches yet. Keep typing or paste the complete street,",
    );
  });

  it("lets an accidental property selection truly return to the prior address", () => {
    const addressChange = section(
      calculator,
      "const handleAddressSelected = useCallback",
      "/**\n   * After an address has been picked",
    );

    expect(addressChange).toContain("hasPropertySpecificValues");
    expect(addressChange).toContain("Choose Cancel to return to the previous address");
    expect(addressChange).toContain(
      'form.setValue("address", previousPlace!.formattedAddress',
    );
    expect(addressChange).toContain('title: "Kept the previous property"');
    expect(addressChange.indexOf('title: "Kept the previous property"')).toBeLessThan(
      addressChange.indexOf("lastSelectedAddressRef.current = place"),
    );
    expect(addressChange).toContain('`units.${index}.bedrooms`');
    expect(addressChange).toContain('`units.${index}.bathrooms`');
    expect(addressChange).toContain('`units.${index}.sqft`');
    expect(addressChange).not.toContain("Previous values kept for review");
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
    expect(calculator).toContain('isEditingAssumptions\n              ? "View updated result"');
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
