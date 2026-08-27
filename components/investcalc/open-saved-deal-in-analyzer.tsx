"use client";

/**
 * Open a saved deal in the analyzer. Primary edit/reopen surfaces use a normal
 * Link to the durable owner-scoped `/dashboard/new?savedDeal=<id>` URL, which
 * is resolved on the authenticated server route and survives refresh, history,
 * bookmarks, and another signed-in device.
 *
 * Duplicate/fork remains a NONCE-KEYED handoff: each fork writes its payload to a localStorage
 * key derived from a fresh crypto.randomUUID() and opens the tab at
 * `/?dealHandoff=<nonce>` (or `/?dealDuplicate=<nonce>`). A single shared
 * key can't work here — two quick opens overwrite each other and cross-wire
 * the tabs, and any unconsumed copy silently reopens the previous deal on
 * the user's next plain "/" visit. Never write the opener's sessionStorage:
 * window.open-created tabs COPY the opener's sessionStorage at creation, so
 * a copy written for open #1 shadows open #2's payload.
 *
 * The exported window helper remains for duplicate/re-underwrite flows that
 * intentionally create a second working context. It returns an ok-union
 * instead of toasting so each caller keeps its own error UI.
 */
import { useState } from "react";
import Link from "next/link";
import { Eye, Loader2, PencilLine, RefreshCw } from "lucide-react";
import { getSavedDealForEditingAction } from "@/app/actions/saved-analyses";
import { addScenarioAction } from "@/app/actions/scenarios";
import { useToast } from "@/hooks/use-toast";
import { normalizeMaoTarget } from "@/lib/mao-target-editor";
import {
  normalizeOfferCeilingTargetSource,
  type OfferCeilingTargetSource,
} from "@/lib/offer-ceiling-contract";
import { isReleasedUnderwritingSnapshot } from "@/lib/underwriting-model-release";
import { normalizeAnalyzerStrategyKey } from "@/lib/analyzer-strategy-persistence";
import {
  normalizeOfferCeilingDecisionBasis,
  OFFER_CEILING_DECISION_BASIS_FIELD,
  type OfferCeilingDecisionBasis,
} from "@/lib/offer-ceiling-decision-basis";

/** Base of the nonce-keyed edit handoff (`<base>::<nonce>`), and the legacy
 *  shared key a previous deploy's tabs may still hold. Must match
 *  investcalc-page.tsx's reader. */
export const SAVED_ANALYSIS_EDIT_DRAFT_KEY =
  "truecap_saved_analysis_edit_draft";

/**
 * Duplicate handoff key base — distinct from the edit key so the analyzer
 * forks the deal's ASSUMPTIONS into a brand-new deal (no savedDealId,
 * property identity cleared) instead of opening it for edit-in-place.
 */
export const SAVED_ANALYSIS_DUPLICATE_DRAFT_KEY =
  "truecap_saved_analysis_duplicate_draft";

/** Legacy edit and current duplicate handoff params. Must match investcalc-page.tsx. */
export const DEAL_EDIT_HANDOFF_PARAM = "dealHandoff";
export const DEAL_DUPLICATE_HANDOFF_PARAM = "dealDuplicate";

/**
 * A payload the reader never consumed (popup blocked, tab closed before "/"
 * mounted) must not accumulate forever — anything older than this is swept
 * at the next write. Long enough that a tab stuck behind a slow load or a
 * popup-blocker prompt still finds its payload.
 */
const HANDOFF_PAYLOAD_TTL_MS = 60 * 60 * 1000;

export const POPUP_BLOCKED_MESSAGE =
  "Your browser blocked the new tab. Allow pop-ups for TrueCap, then try again.";
const HANDOFF_STORAGE_BLOCKED_MESSAGE =
  "Your browser blocked the site storage needed to open this deal safely. Allow site data for TrueCap, then try again.";

/** Open synchronously inside the click event so browsers can authorize it. */
export function openAnalyzerHandoffWindow(): Window | null {
  const targetWindow = window.open("about:blank", "_blank");
  if (targetWindow) targetWindow.opener = null;
  return targetWindow;
}

/** Remove orphaned per-nonce payloads under `<baseKey>::` past their TTL
 *  (or unparseable). Snapshot the keys first — removing while iterating
 *  localStorage.key(i) skips entries. */
function sweepStaleHandoffPayloads(baseKey: string): void {
  try {
    const prefix = `${baseKey}::`;
    const staleKeys: string[] = [];
    const now = Date.now();
    for (let i = 0; i < window.localStorage.length; i += 1) {
      const key = window.localStorage.key(i);
      if (!key || !key.startsWith(prefix)) continue;
      let writtenAt = 0;
      try {
        const parsed = JSON.parse(window.localStorage.getItem(key) ?? "") as {
          writtenAt?: unknown;
        };
        if (typeof parsed.writtenAt === "number") writtenAt = parsed.writtenAt;
      } catch {
        /* unparseable payload → treated as stale (writtenAt stays 0) */
      }
      if (now - writtenAt > HANDOFF_PAYLOAD_TTL_MS) staleKeys.push(key);
    }
    for (const key of staleKeys) window.localStorage.removeItem(key);
  } catch {
    /* storage unavailable — the fresh write below will surface it */
  }
}

/**
 * Stash `payload` under a fresh per-nonce localStorage key and return the
 * nonce for the URL. Also sweeps expired orphans (both handoff families) and
 * clears this tab's LEGACY shared sessionStorage copies — a pre-nonce deploy
 * wrote those into the opener, where they'd resurrect the old deal on this
 * tab's own next "/" navigation (the reader can only clean the copies in
 * the tab that consumes them).
 */
function writeNonceKeyedHandoffPayload(
  baseKey: string,
  payload: Record<string, unknown>,
): string {
  sweepStaleHandoffPayloads(SAVED_ANALYSIS_EDIT_DRAFT_KEY);
  sweepStaleHandoffPayloads(SAVED_ANALYSIS_DUPLICATE_DRAFT_KEY);
  try {
    window.sessionStorage.removeItem(SAVED_ANALYSIS_EDIT_DRAFT_KEY);
    window.sessionStorage.removeItem(SAVED_ANALYSIS_DUPLICATE_DRAFT_KEY);
  } catch {
    /* sessionStorage unavailable — nothing legacy to clean then */
  }
  const nonce = crypto.randomUUID();
  window.localStorage.setItem(
    `${baseKey}::${nonce}`,
    JSON.stringify({ ...payload, writtenAt: Date.now() }),
  );
  return nonce;
}

/**
 * Normalize the acquisition target once at the handoff boundary. Saved rows
 * can predate the current target schema, so neither an edit nor a duplicate
 * should transport an arbitrary legacy object into a fresh calculator tab.
 * Invalid/empty targets are omitted and the analyzer falls back to its normal
 * buy-box/default seed.
 */
function normalizeSavedDealHandoffTarget(
  resultSnapshot: Record<string, unknown>,
): {
  maxOfferTarget: ReturnType<typeof normalizeMaoTarget>;
  maxOfferTargetSource: OfferCeilingTargetSource;
  offerCeilingDecisionBasis: OfferCeilingDecisionBasis | null;
  resultSnapshot: Record<string, unknown>;
} {
  const maxOfferTarget = normalizeMaoTarget(resultSnapshot.maxOfferTarget);
  let maxOfferTargetSource =
    normalizeOfferCeilingTargetSource(resultSnapshot.maxOfferTargetSource) ??
    "selected-targets";
  const offerCeilingDecisionBasis = maxOfferTarget
    ? normalizeOfferCeilingDecisionBasis(
        resultSnapshot[OFFER_CEILING_DECISION_BASIS_FIELD],
        { target: maxOfferTarget, source: maxOfferTargetSource },
      )
    : null;
  if (
    maxOfferTarget &&
    maxOfferTargetSource === "buy-box" &&
    !offerCeilingDecisionBasis
  ) {
    maxOfferTargetSource = "selected-targets";
  }
  const normalizedResultSnapshot = { ...resultSnapshot };
  if (maxOfferTarget) {
    normalizedResultSnapshot.maxOfferTarget = maxOfferTarget;
    normalizedResultSnapshot.maxOfferTargetSource = maxOfferTargetSource;
  } else {
    delete normalizedResultSnapshot.maxOfferTarget;
    delete normalizedResultSnapshot.maxOfferTargetSource;
  }
  return {
    maxOfferTarget,
    maxOfferTargetSource,
    offerCeilingDecisionBasis,
    resultSnapshot: normalizedResultSnapshot,
  };
}

/**
 * "Duplicate" / "New deal from this" — open the analyzer carrying the deal's
 * form snapshot as a NEW deal: the calculator restores the financing/expense
 * assumptions but clears the address/price/rent so the user just enters the
 * new property. The spreadsheet "copy a row, change 3 cells" workflow, and it
 * fixes the silent overwrite when a user "Opened" a saved deal to model a
 * different address. Same fetch + popup-safe tab pattern as the open helper.
 */
export async function duplicateSavedDealInAnalyzer(
  id: string,
  targetWindow: Window | null,
): Promise<{ ok: true } | { ok: false; message: string }> {
  if (!targetWindow) return { ok: false, message: POPUP_BLOCKED_MESSAGE };

  let result: Awaited<ReturnType<typeof getSavedDealForEditingAction>>;
  try {
    result = await getSavedDealForEditingAction(id, {
      allowArchivedSource: true,
    });
  } catch {
    // The action REJECTED rather than returning {ok:false} (network blip,
    // cold-start 500, stale-deploy Server Action). Close the pre-opened tab and
    // hand the caller a normal failure so its existing !ok toast fires, instead
    // of leaking an unhandled rejection and stranding the blank tab.
    targetWindow?.close();
    return {
      ok: false,
      message: "Something interrupted the request. Please try again.",
    };
  }
  if (!result.ok) {
    targetWindow?.close();
    return { ok: false, message: result.message };
  }
  if (!isReleasedUnderwritingSnapshot(result.formSnapshot)) {
    targetWindow?.close();
    return {
      ok: false,
      message: "This underwriting model is not available yet.",
    };
  }
  const {
    maxOfferTarget,
    maxOfferTargetSource,
    offerCeilingDecisionBasis,
  } =
    normalizeSavedDealHandoffTarget(result.resultSnapshot);
  const analyzerStrategyKey = normalizeAnalyzerStrategyKey(
    result.resultSnapshot.analyzerStrategyKey,
  );
  let nonce: string;
  try {
    nonce = writeNonceKeyedHandoffPayload(SAVED_ANALYSIS_DUPLICATE_DRAFT_KEY, {
      formSnapshot: result.formSnapshot,
      templateFallback: result.templateFallback,
      ...(analyzerStrategyKey ? { analyzerStrategyKey } : {}),
      ...(maxOfferTarget ? { maxOfferTarget, maxOfferTargetSource } : {}),
      ...(offerCeilingDecisionBasis
        ? { offerCeilingDecisionBasis }
        : {}),
    });
  } catch {
    targetWindow.close();
    return { ok: false, message: HANDOFF_STORAGE_BLOCKED_MESSAGE };
  }
  const href = `/dashboard/new?${DEAL_DUPLICATE_HANDOFF_PARAM}=${nonce}`;
  try {
    if (targetWindow.closed) throw new Error("Target tab closed");
    targetWindow.location.href = href;
    return { ok: true };
  } catch {
    try {
      window.localStorage.removeItem(
        `${SAVED_ANALYSIS_DUPLICATE_DRAFT_KEY}::${nonce}`,
      );
    } catch {
      // Best-effort cleanup only; the normal TTL sweep removes the payload.
    }
    return {
      ok: false,
      message:
        "The new tab closed before the deal was ready. Try opening it again.",
    };
  }
}

/**
 * Point an already-opened, popup-safe tab at the stable saved-deal URL. Data is
 * resolved server-side after navigation and never transported through browser
 * storage.
 */
export async function openSavedDealInAnalysisTab(
  id: string,
  targetWindow: Window | null,
): Promise<{ ok: true } | { ok: false; message: string }> {
  if (!targetWindow) return { ok: false, message: POPUP_BLOCKED_MESSAGE };
  // The saved row ID is not secret; the authenticated server route performs
  // the ownership check before returning any data. A stable URL is durable
  // across refresh, history, bookmarks, and another signed-in device.
  const href = `/dashboard/new?savedDeal=${encodeURIComponent(id)}`;
  try {
    if (targetWindow.closed) throw new Error("Target tab closed");
    targetWindow.location.href = href;
    return { ok: true };
  } catch {
    return {
      ok: false,
      message:
        "The new tab closed before the deal was ready. Try opening it again.",
    };
  }
}

/**
 * "Open full analysis" button for the deal workspace header. This is a normal
 * same-tab link: opening an existing deal is part of the primary workflow, so
 * it should preserve Back/history and must not depend on popup permission.
 */
export function OpenFullAnalysisButton({
  savedDealId,
  recorded = false,
}: {
  savedDealId: string;
  /** Recorded methodology snapshots open read-only; current analyses can update in place. */
  recorded?: boolean;
}) {
  return (
    <Link
      href={`/dashboard/new?savedDeal=${encodeURIComponent(savedDealId)}`}
      className="inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-lg border border-border bg-background px-3 text-xs font-semibold text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
    >
      {recorded ? (
        <Eye aria-hidden className="size-3.5" />
      ) : (
        <PencilLine aria-hidden className="size-3.5" />
      )}
      {recorded ? "View recorded analysis" : "Edit assumptions"}
    </Link>
  );
}

/**
 * Clone first, then open the clone in the analyzer. An explicit re-underwrite
 * can therefore update only the new scenario; the recorded parent row and any
 * share/PDF bound to it remain immutable history.
 */
export function ReunderwriteAsScenarioButton({
  savedDealId,
}: {
  savedDealId: string;
}) {
  const { toast } = useToast();
  const [isOpening, setIsOpening] = useState(false);

  const handleClick = () => {
    if (isOpening) return;
    const targetWindow = openAnalyzerHandoffWindow();
    if (!targetWindow) {
      toast({
        title: "Could not open new tab",
        description: POPUP_BLOCKED_MESSAGE,
        variant: "destructive",
      });
      return;
    }
    setIsOpening(true);
    void (async () => {
      try {
        const now = new Date();
        const scenarioName = `Copy ${now.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        })} ${now.toLocaleTimeString("en-US", {
          hour: "numeric",
          minute: "2-digit",
          second: "2-digit",
        })}`;
        const cloned = await addScenarioAction({
          sourceDealId: savedDealId,
          scenarioName,
          strategyKind: null,
        });
        if (!cloned.ok) {
          targetWindow?.close();
          toast({
            title: "Could not duplicate this deal",
            description: cloned.message,
            variant: "destructive",
          });
          return;
        }
        const opened = await openSavedDealInAnalysisTab(
          cloned.scenarioId,
          targetWindow,
        );
        if (!opened.ok) {
          toast({
            title: "Scenario created, but could not open it",
            description: opened.message,
            variant: "destructive",
          });
        }
      } catch {
        targetWindow?.close();
        toast({
          title: "Could not duplicate this deal",
          description: "Something interrupted the request. Please try again.",
          variant: "destructive",
        });
      } finally {
        setIsOpening(false);
      }
    })();
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isOpening}
      className="inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-lg border border-border bg-background px-3 text-xs font-bold text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-60"
    >
      {isOpening ? (
        <Loader2 aria-hidden className="size-3.5 animate-spin" />
      ) : (
        <RefreshCw aria-hidden className="size-3.5" />
      )}
      Duplicate as new scenario
    </button>
  );
}
