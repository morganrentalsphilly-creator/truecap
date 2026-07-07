"use client";

/**
 * Open a saved deal in the analyzer — the ONE code path for the storage
 * handoff that hands a saved deal's form + result snapshots to the
 * calculator on "/" (investcalc-page.tsx reads the matching key on mount and
 * restores the draft in edit mode).
 *
 * The handoff is NONCE-KEYED: each open writes its payload to a localStorage
 * key derived from a fresh crypto.randomUUID() and opens the tab at
 * `/?dealHandoff=<nonce>` (or `/?dealDuplicate=<nonce>`). A single shared
 * key can't work here — two quick opens overwrite each other and cross-wire
 * the tabs, and any unconsumed copy silently reopens the previous deal on
 * the user's next plain "/" visit. Never write the opener's sessionStorage:
 * window.open-created tabs COPY the opener's sessionStorage at creation, so
 * a copy written for open #1 shadows open #2's payload.
 *
 * Extracted from saved-analyses-page-v2.tsx so both My Deals and the deal
 * workspace ([id] page) open the analysis identically. The helper returns an
 * ok-union instead of toasting so each surface keeps its own error UI.
 */
import { useState } from "react";
import { ExternalLink, Loader2 } from "lucide-react";
import { getSavedDealForEditingAction } from "@/app/actions/saved-analyses";
import { useToast } from "@/hooks/use-toast";

/** Base of the nonce-keyed edit handoff (`<base>::<nonce>`), and the legacy
 *  shared key a previous deploy's tabs may still hold. Must match
 *  investcalc-page.tsx's reader. */
export const SAVED_ANALYSIS_EDIT_DRAFT_KEY = "truecap_saved_analysis_edit_draft";

/**
 * Duplicate handoff key base — distinct from the edit key so the analyzer
 * forks the deal's ASSUMPTIONS into a brand-new deal (no savedDealId,
 * property identity cleared) instead of opening it for edit-in-place.
 */
export const SAVED_ANALYSIS_DUPLICATE_DRAFT_KEY = "truecap_saved_analysis_duplicate_draft";

/** Query params carrying the handoff nonce. Must match investcalc-page.tsx. */
export const DEAL_EDIT_HANDOFF_PARAM = "dealHandoff";
export const DEAL_DUPLICATE_HANDOFF_PARAM = "dealDuplicate";

/**
 * A payload the reader never consumed (popup blocked, tab closed before "/"
 * mounted) must not accumulate forever — anything older than this is swept
 * at the next write. Long enough that a tab stuck behind a slow load or a
 * popup-blocker prompt still finds its payload.
 */
const HANDOFF_PAYLOAD_TTL_MS = 60 * 60 * 1000;

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
function writeNonceKeyedHandoffPayload(baseKey: string, payload: Record<string, unknown>): string {
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
    JSON.stringify({ ...payload, writtenAt: Date.now() })
  );
  return nonce;
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
  targetWindow: Window | null
): Promise<{ ok: true } | { ok: false; message: string }> {
  const result = await getSavedDealForEditingAction(id);
  if (!result.ok) {
    targetWindow?.close();
    return { ok: false, message: result.message };
  }
  const nonce = writeNonceKeyedHandoffPayload(SAVED_ANALYSIS_DUPLICATE_DRAFT_KEY, {
    formSnapshot: result.formSnapshot,
    templateFallback: result.templateFallback,
  });
  const href = `/?${DEAL_DUPLICATE_HANDOFF_PARAM}=${nonce}`;
  if (targetWindow) {
    targetWindow.location.href = href;
    return { ok: true };
  }
  window.open(href, "_blank", "noopener,noreferrer");
  return { ok: true };
}

/**
 * Fetch the saved deal for editing, stash the handoff payload under a fresh
 * nonce key, and point `targetWindow` (an already-opened about:blank tab —
 * popup-blocker safe) at the nonce URL. Falls back to window.open when no
 * target tab was pre-opened. On failure the pre-opened tab is closed and the
 * error is returned for the caller to surface (toast etc.).
 */
export async function openSavedDealInAnalysisTab(
  id: string,
  targetWindow: Window | null
): Promise<{ ok: true } | { ok: false; message: string }> {
  const result = await getSavedDealForEditingAction(id);
  if (!result.ok) {
    targetWindow?.close();
    return { ok: false, message: result.message };
  }

  const nonce = writeNonceKeyedHandoffPayload(SAVED_ANALYSIS_EDIT_DRAFT_KEY, {
    id: result.id,
    schemaVersion: result.schemaVersion,
    formSnapshot: result.formSnapshot,
    templateFallback: result.templateFallback,
    resultSnapshot: result.resultSnapshot,
  });
  const href = `/?${DEAL_EDIT_HANDOFF_PARAM}=${nonce}`;
  if (targetWindow) {
    targetWindow.location.href = href;
    return { ok: true };
  }
  window.open(href, "_blank", "noopener,noreferrer");
  return { ok: true };
}

/**
 * "Open full analysis" button for the deal workspace header — opens the full
 * underwrite (verdict, projections, tax strategy, exit scenarios) in a new
 * tab via the shared handoff above.
 */
export function OpenFullAnalysisButton({ savedDealId }: { savedDealId: string }) {
  const { toast } = useToast();
  const [isOpening, setIsOpening] = useState(false);

  const handleClick = () => {
    if (isOpening) return;
    // Open the tab synchronously (inside the click) so popup blockers allow
    // it, then navigate it once the server action resolves — same pattern as
    // My Deals' Open button.
    const targetWindow = window.open("about:blank", "_blank");
    if (targetWindow) targetWindow.opener = null;
    setIsOpening(true);
    void (async () => {
      try {
        const result = await openSavedDealInAnalysisTab(savedDealId, targetWindow);
        if (!result.ok) {
          toast({
            title: "Could not open saved deal",
            description: result.message,
            variant: "destructive",
          });
        }
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
      className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-lg border border-border bg-background px-3 text-xs font-semibold text-foreground transition-colors hover:bg-muted disabled:opacity-60"
    >
      {isOpening ? (
        <Loader2 aria-hidden className="size-3.5 animate-spin" />
      ) : (
        <ExternalLink aria-hidden className="size-3.5" />
      )}
      Open full analysis
    </button>
  );
}
