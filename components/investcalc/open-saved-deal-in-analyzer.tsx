"use client";

/**
 * Open a saved deal in the analyzer — the ONE code path for the
 * localStorage/sessionStorage handoff that hands a saved deal's form +
 * result snapshots to the calculator on "/" (investcalc-page.tsx reads the
 * same key on mount and restores the draft in edit mode).
 *
 * Extracted from saved-analyses-page-v2.tsx so both My Deals and the deal
 * workspace ([id] page) open the analysis identically. The helper returns an
 * ok-union instead of toasting so each surface keeps its own error UI.
 */
import { useState } from "react";
import { ExternalLink, Loader2 } from "lucide-react";
import { getSavedDealForEditingAction } from "@/app/actions/saved-analyses";
import { useToast } from "@/hooks/use-toast";

/** Must match the key investcalc-page.tsx reads on mount. */
export const SAVED_ANALYSIS_EDIT_DRAFT_KEY = "truecap_saved_analysis_edit_draft";

/**
 * Duplicate handoff key — distinct from the edit key so the analyzer forks
 * the deal's ASSUMPTIONS into a brand-new deal (no savedDealId, property
 * identity cleared) instead of opening it for edit-in-place.
 */
export const SAVED_ANALYSIS_DUPLICATE_DRAFT_KEY = "truecap_saved_analysis_duplicate_draft";

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
  const payload = JSON.stringify({
    formSnapshot: result.formSnapshot,
    templateFallback: result.templateFallback,
  });
  window.localStorage.setItem(SAVED_ANALYSIS_DUPLICATE_DRAFT_KEY, payload);
  window.sessionStorage.setItem(SAVED_ANALYSIS_DUPLICATE_DRAFT_KEY, payload);
  if (targetWindow) {
    targetWindow.location.href = "/";
    return { ok: true };
  }
  window.open("/", "_blank", "noopener,noreferrer");
  return { ok: true };
}

/**
 * Fetch the saved deal for editing, stash the handoff payload in web storage,
 * and point `targetWindow` (an already-opened about:blank tab — popup-blocker
 * safe) at "/". Falls back to window.open when no target tab was pre-opened.
 * On failure the pre-opened tab is closed and the error is returned for the
 * caller to surface (toast etc.).
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

  const payload = JSON.stringify({
    id: result.id,
    schemaVersion: result.schemaVersion,
    formSnapshot: result.formSnapshot,
    templateFallback: result.templateFallback,
    resultSnapshot: result.resultSnapshot,
  });
  window.localStorage.setItem(SAVED_ANALYSIS_EDIT_DRAFT_KEY, payload);
  window.sessionStorage.setItem(SAVED_ANALYSIS_EDIT_DRAFT_KEY, payload);
  if (targetWindow) {
    targetWindow.location.href = "/";
    return { ok: true };
  }
  window.open("/", "_blank", "noopener,noreferrer");
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
