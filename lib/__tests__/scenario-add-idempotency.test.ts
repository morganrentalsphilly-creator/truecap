import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it, vi } from "vitest";
import {
  scenarioClientRequestForIntent,
  scenarioRequestIntentKey,
} from "@/components/investcalc/scenarios-card";
import { shouldRotateReunderwriteScenarioRequest } from "@/components/investcalc/open-saved-deal-in-analyzer";

const scenariosCardSource = readFileSync(
  resolve(process.cwd(), "components/investcalc/scenarios-card.tsx"),
  "utf8",
);
const reunderwriteSource = readFileSync(
  resolve(
    process.cwd(),
    "components/investcalc/open-saved-deal-in-analyzer.tsx",
  ),
  "utf8",
);

describe("Add Scenario client request idempotency", () => {
  it("normalizes an unchanged scenario intent deterministically", () => {
    const original = scenarioRequestIntentKey({
      savedDealId: "deal-1",
      name: "  Owner OCCUPANT  ",
      strategy: " HOUSE_HACK ",
    });
    const equivalent = scenarioRequestIntentKey({
      savedDealId: "deal-1",
      name: "owner occupant",
      strategy: "house_hack",
    });

    expect(original).toBe(equivalent);
  });

  it("reuses one request id for retries and rotates it when intent changes", () => {
    const createRequestId = vi
      .fn<() => string>()
      .mockReturnValueOnce("request-1")
      .mockReturnValueOnce("request-2");
    const first = scenarioClientRequestForIntent(
      null,
      '["deal-1","owner occupant","house_hack"]',
      createRequestId,
    );
    const retry = scenarioClientRequestForIntent(
      first,
      first.intentKey,
      createRequestId,
    );
    const changed = scenarioClientRequestForIntent(
      retry,
      '["deal-1","lower rate","house_hack"]',
      createRequestId,
    );

    expect(retry).toBe(first);
    expect(changed.clientRequestId).toBe("request-2");
    expect(createRequestId).toHaveBeenCalledTimes(2);
  });

  it("retains the card request through typed and rejected failures", () => {
    const addStart = scenariosCardSource.indexOf("function handleAdd()");
    const typedFailure = scenariosCardSource.indexOf(
      "if (!result.ok)",
      addStart,
    );
    const confirmedSuccessClear = scenariosCardSource.indexOf(
      "scenarioClientRequestRef.current?.clientRequestId",
      typedFailure,
    );
    const rejection = scenariosCardSource.indexOf(
      "} catch (err) {",
      confirmedSuccessClear,
    );
    const rejectionEnd = scenariosCardSource.indexOf(
      "} finally {",
      rejection,
    );

    expect(scenariosCardSource).toContain(
      "clientRequestId: clientRequest.clientRequestId",
    );
    expect(typedFailure).toBeGreaterThan(addStart);
    expect(confirmedSuccessClear).toBeGreaterThan(typedFailure);
    expect(
      scenariosCardSource.slice(typedFailure, confirmedSuccessClear),
    ).not.toContain("scenarioClientRequestRef.current = null");
    expect(
      scenariosCardSource.slice(rejection, rejectionEnd),
    ).not.toContain("scenarioClientRequestRef.current = null");
  });

  it("rotates definitive failures while retaining ambiguous and open retries", () => {
    for (const code of [
      "SIGN_IN_REQUIRED",
      "ENTITLEMENT_REQUIRED",
      "ENTITLEMENT_SAVE",
      "MIGRATION_PENDING",
      "NOT_FOUND",
      "DUPLICATE_SCENARIO_NAME",
      "VALIDATION_ERROR",
    ] as const) {
      expect(shouldRotateReunderwriteScenarioRequest(code)).toBe(true);
    }
    expect(shouldRotateReunderwriteScenarioRequest("SERVER_ERROR")).toBe(false);

    const componentStart = reunderwriteSource.indexOf(
      "export function ReunderwriteAsScenarioButton",
    );
    const actionCall = reunderwriteSource.indexOf(
      "const cloned = await addScenarioAction",
      componentStart,
    );
    const typedFailure = reunderwriteSource.indexOf(
      "if (!cloned.ok)",
      actionCall,
    );
    const definitiveRotation = reunderwriteSource.indexOf(
      "shouldRotateReunderwriteScenarioRequest(cloned.code)",
      typedFailure,
    );
    const openCall = reunderwriteSource.indexOf(
      "const opened = await openSavedDealInAnalysisTab",
      typedFailure,
    );
    const openFailure = reunderwriteSource.indexOf(
      "if (!opened.ok)",
      openCall,
    );
    const confirmedSuccessClear = reunderwriteSource.indexOf(
      "pendingScenarioRequestRef.current?.clientRequestId",
      openFailure,
    );
    const rejection = reunderwriteSource.indexOf(
      "} catch {",
      confirmedSuccessClear,
    );
    const rejectionEnd = reunderwriteSource.indexOf(
      "} finally {",
      rejection,
    );

    expect(reunderwriteSource).toContain(
      "clientRequestId: request.clientRequestId",
    );
    expect(reunderwriteSource).toContain(
      "requestSequence > 1 ? ` (${requestSequence})` : \"\"",
    );
    expect(typedFailure).toBeGreaterThan(actionCall);
    expect(definitiveRotation).toBeGreaterThan(typedFailure);
    expect(openCall).toBeGreaterThan(typedFailure);
    expect(openFailure).toBeGreaterThan(openCall);
    expect(confirmedSuccessClear).toBeGreaterThan(openFailure);
    expect(reunderwriteSource.slice(openFailure, confirmedSuccessClear)).toContain(
      "return",
    );
    expect(
      reunderwriteSource.slice(openFailure, confirmedSuccessClear),
    ).not.toContain("pendingScenarioRequestRef.current = null");
    expect(
      reunderwriteSource.slice(rejection, rejectionEnd),
    ).not.toContain("pendingScenarioRequestRef.current = null");
  });

  it("invalidates an in-flight re-underwrite when the saved-deal prop changes", () => {
    const componentStart = reunderwriteSource.indexOf(
      "export function ReunderwriteAsScenarioButton",
    );
    const routeSync = reunderwriteSource.indexOf(
      "useLayoutEffect(() =>",
      componentStart,
    );
    const clickStart = reunderwriteSource.indexOf(
      "const handleClick = () =>",
      routeSync,
    );
    const actionAwait = reunderwriteSource.indexOf(
      "const cloned = await addScenarioAction",
      clickStart,
    );
    const postActionGuard = reunderwriteSource.indexOf(
      "if (!requestStillOwnsDeal())",
      actionAwait,
    );
    const typedResult = reunderwriteSource.indexOf(
      "if (!cloned.ok)",
      postActionGuard,
    );
    const openAwait = reunderwriteSource.indexOf(
      "const opened = await openSavedDealInAnalysisTab",
      typedResult,
    );
    const postOpenGuard = reunderwriteSource.indexOf(
      "if (!requestStillOwnsDeal())",
      openAwait,
    );
    const openResult = reunderwriteSource.indexOf(
      "if (!opened.ok)",
      postOpenGuard,
    );
    const catchStart = reunderwriteSource.indexOf("} catch {", openResult);
    const catchGuard = reunderwriteSource.indexOf(
      "if (!requestStillOwnsDeal())",
      catchStart,
    );
    const catchToast = reunderwriteSource.indexOf("toast({", catchGuard);
    const finallyStart = reunderwriteSource.indexOf("} finally {", catchToast);
    const finallyGuard = reunderwriteSource.indexOf(
      "if (requestStillOwnsDeal())",
      finallyStart,
    );

    const routeBlock = reunderwriteSource.slice(routeSync, clickStart);
    expect(routeBlock).toContain("priorRequest.targetWindow.close()");
    expect(routeBlock).toContain(
      "activeSavedDealIdRef.current = savedDealId",
    );
    expect(routeBlock).toContain(
      "activeReunderwriteRequestRef.current = null",
    );
    expect(routeBlock).toContain("setIsOpening(false)");
    expect(routeBlock).toContain("return () => {");
    expect(routeBlock).toContain(
      "if (activeSavedDealIdRef.current !== savedDealId) return",
    );
    expect(routeBlock).toContain("activeSavedDealIdRef.current = null");
    expect(routeBlock).toContain("const activeRequest = activeReunderwriteRequestRef.current");
    expect(routeBlock).toContain("activeRequest?.targetWindow.close()");

    expect(postActionGuard).toBeGreaterThan(actionAwait);
    expect(typedResult).toBeGreaterThan(postActionGuard);
    expect(postOpenGuard).toBeGreaterThan(openAwait);
    expect(openResult).toBeGreaterThan(postOpenGuard);
    expect(catchGuard).toBeGreaterThan(catchStart);
    expect(catchToast).toBeGreaterThan(catchGuard);
    expect(finallyGuard).toBeGreaterThan(finallyStart);
    expect(
      reunderwriteSource.slice(postActionGuard, typedResult),
    ).toContain("targetWindow.close()");
    expect(reunderwriteSource.slice(postOpenGuard, openResult)).toContain(
      "targetWindow.close()",
    );
  });
});
