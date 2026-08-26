"use client";

/**
 * Deal Notes Panel.
 *
 * Free-text notes attached to a saved deal - seller context, agent
 * commentary, inspector findings, your offer-strategy reasoning, etc.
 * The kind of stuff that doesn't fit into structured form fields but
 * is essential when you re-open a deal a week later.
 *
 * Behavior:
 *   - Renders only when there's a savedDealId (no notes for previews)
 *   - Lazy-fetches the current notes on first mount via server action
 *   - Saves on blur (no Save button needed - keeps the surface clean)
 *   - Shows "Saved" status briefly after successful save
 *   - Soft cap at 10,000 chars (matches server)
 *
 * Defensive: gracefully handles the case where the DB migration hasn't
 * been applied yet - shows a quiet inline notice instead of crashing.
 */
import { useEffect, useRef, useState, useTransition } from "react";
import * as Sentry from "@sentry/nextjs";
import { Loader2, NotebookPen } from "lucide-react";
import {
  getSavedDealNotesAction,
  updateSavedDealNotesAction,
} from "@/app/actions/saved-analyses";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";

const NOTES_MAX = 10_000;

type NotesConflict = {
  latestNotes: string;
  latestRevision: number;
};

export function DealNotesPanel({ savedDealId }: { savedDealId: string }) {
  const { toast } = useToast();
  const [notes, setNotes] = useState<string>("");
  const [initialLoaded, setInitialLoaded] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [migrationPending, setMigrationPending] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [lastSavedNotes, setLastSavedNotes] = useState<string>("");
  const [revision, setRevision] = useState<number | null>(null);
  const [conflict, setConflict] = useState<NotesConflict | null>(null);
  const [recoverableDraft, setRecoverableDraft] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<
    "idle" | "dirty" | "saving" | "saved" | "error" | "conflict"
  >("idle");
  const notesRef = useRef("");
  const savedDealIdRef = useRef(savedDealId);

  useEffect(() => {
    savedDealIdRef.current = savedDealId;
  }, [savedDealId]);

  // Lazy-load the current notes on mount / when the saved deal changes.
  useEffect(() => {
    let cancelled = false;
    setInitialLoaded(false);
    setLoadError(null);
    setMigrationPending(false);
    setSaveStatus("idle");
    setRevision(null);
    setConflict(null);
    setRecoverableDraft(null);
    // A rejected read must never fall through to an editable empty textarea:
    // surface a retry state and keep writes unavailable until server truth loads.
    void getSavedDealNotesAction(savedDealId)
      .then((result) => {
        if (cancelled) return;
        if (result.ok) {
          const stored = result.notes ?? "";
          notesRef.current = stored;
          setNotes(stored);
          setLastSavedNotes(stored);
          setRevision(result.revision);
        } else if (result.code === "MIGRATION_PENDING") {
          setMigrationPending(true);
        } else {
          setLoadError(result.message || "We couldn't load these notes.");
        }
        setInitialLoaded(true);
      })
      .catch((err) => {
        if (!cancelled) {
          console.warn("[deal-notes] load failed:", err);
          setLoadError("We couldn't load these notes. Check your connection and try again.");
          setInitialLoaded(true);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [loadAttempt, savedDealId]);

  const persistNotes = (
    revisionOverride?: number,
    allowConflictResolution = false
  ) => {
    if (
      migrationPending ||
      loadError ||
      isPending ||
      (conflict && !allowConflictResolution)
    ) {
      return;
    }
    const currentNotes = notesRef.current;
    if (currentNotes === lastSavedNotes) {
      if (allowConflictResolution) setConflict(null);
      setSaveStatus("saved");
      return;
    }
    const revisionAtSubmit = revisionOverride ?? revision;
    if (revisionAtSubmit === null) {
      setMigrationPending(true);
      return;
    }
    // Capture the deal id + notes snapshot AT submit time. If the user
    // switches to a different saved deal mid-save (e.g. clicks another
    // saved deal in the list before the server action returns), we
    // must not update lastSavedNotes for the new deal with values from
    // the previous deal - that would mark the new deal's textarea as
    // "saved" when it actually hasn't been touched yet.
    const dealIdAtSubmit = savedDealId;
    const notesAtSubmit = currentNotes;
    setSaveStatus("saving");
    startTransition(async () => {
      try {
        const result = await updateSavedDealNotesAction(
          dealIdAtSubmit,
          notesAtSubmit,
          revisionAtSubmit
        );
        if (dealIdAtSubmit !== savedDealIdRef.current) {
          // User switched deals while this save was in flight - its
          // result is no longer relevant. Discard silently.
          return;
        }
        if (!result.ok) {
          if (result.code === "MIGRATION_PENDING") {
            setMigrationPending(true);
            return;
          }
          if (result.code === "STALE_DATA") {
            const fresh = await getSavedDealNotesAction(dealIdAtSubmit).catch(
              () => null
            );
            if (dealIdAtSubmit !== savedDealIdRef.current) return;
            if (fresh?.ok) {
              const latestNotes = fresh.notes ?? "";
              setRevision(fresh.revision);
              setLastSavedNotes(latestNotes);
              setConflict({
                latestNotes,
                latestRevision: fresh.revision,
              });
              setSaveStatus("conflict");
              toast({
                title: "Notes changed elsewhere",
                description:
                  "Your draft is preserved. Review the latest saved text, then load it or explicitly save your version.",
                variant: "destructive",
              });
              return;
            }
          }
          setSaveStatus("error");
          toast({
            title: "Could not save notes",
            description: result.message,
            variant: "destructive",
          });
          return;
        }
        setRevision(result.revision);
        setConflict(null);
        setLastSavedNotes(notesAtSubmit);
        setSaveStatus(notesRef.current === notesAtSubmit ? "saved" : "dirty");
      } catch (err) {
        // The action REJECTED (network blip, cold-start 500, stale-deploy
        // Server Action) rather than returning {ok:false}. Without this the
        // save silently no-ops: lastSavedNotes never advances, so the panel
        // just falls back to "Auto-saves" as if nothing happened. Tell the
        // user it's retryable — the typed text is untouched, so re-blurring
        // retries. Same stale-deal guard as the success path.
        Sentry.captureException(err, { tags: { feature: "deal-notes" } });
        if (dealIdAtSubmit !== savedDealIdRef.current) return;
        setSaveStatus("error");
        toast({
          title: "Could not save notes",
          description: "Something interrupted the request. Check your connection and try again.",
          variant: "destructive",
        });
      }
    });
  };

  const persistOnBlur = () => persistNotes();

  const loadLatestNotes = () => {
    if (!conflict) return;
    const localDraft = notesRef.current;
    setRecoverableDraft(
      localDraft === conflict.latestNotes ? null : localDraft
    );
    notesRef.current = conflict.latestNotes;
    setNotes(conflict.latestNotes);
    setLastSavedNotes(conflict.latestNotes);
    setRevision(conflict.latestRevision);
    setConflict(null);
    setSaveStatus("saved");
  };

  const restoreRecoverableDraft = () => {
    if (recoverableDraft === null) return;
    notesRef.current = recoverableDraft;
    setNotes(recoverableDraft);
    setRecoverableDraft(null);
    setSaveStatus(recoverableDraft === lastSavedNotes ? "saved" : "dirty");
  };

  // Render nothing while we wait for the first fetch - avoids a flash
  // of empty notes before the saved content arrives.
  if (!initialLoaded) {
    return null;
  }

  if (loadError) {
    return (
      <section
        aria-label="Deal notes"
        className="rounded-2xl border border-destructive/25 bg-destructive/5 p-4"
      >
        <div role="alert">
          <p className="text-sm font-semibold text-foreground">Couldn&apos;t load deal notes</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {loadError} Editing stays disabled until the saved notes are available, so they cannot be overwritten.
          </p>
        </div>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="mt-3 min-h-11"
          onClick={() => setLoadAttempt((attempt) => attempt + 1)}
        >
          Try again
        </Button>
      </section>
    );
  }

  if (migrationPending) {
    return (
      <section
        aria-label="Deal notes"
        className="rounded-2xl border border-dashed border-border bg-muted/20 p-4 text-xs text-muted-foreground"
      >
        <NotebookPen className="mr-1.5 inline size-3.5" />
        Deal notes will be available once the latest schema update is applied.
      </section>
    );
  }

  const remaining = NOTES_MAX - notes.length;
  return (
    <section
      aria-label="Deal notes"
      className="rounded-2xl border border-border bg-card p-4 sm:p-5"
    >
      <div className="mb-2 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <NotebookPen className="size-4 text-primary" />
          <h3 className="text-xs font-bold uppercase tracking-widest text-foreground">
            Deal notes
          </h3>
        </div>
        <div role="status" aria-live="polite" className="flex items-center gap-2 text-[11px] text-muted-foreground">
          {isPending || saveStatus === "saving" ? (
            <span className="inline-flex items-center gap-1">
              <Loader2 className="size-3 animate-spin" /> Saving…
            </span>
          ) : saveStatus === "saved" ? (
            <span className="text-[var(--metric-positive,#16a34a)]">Saved just now</span>
          ) : saveStatus === "error" ? (
            <span className="inline-flex items-center gap-2">
              <span className="font-semibold text-destructive">Couldn&apos;t save</span>
              <button
                type="button"
                onClick={persistOnBlur}
                className="min-h-11 rounded-md px-2 font-semibold text-primary underline underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                Retry
              </button>
            </span>
          ) : saveStatus === "conflict" ? (
            <span className="font-semibold text-amber-700">Needs review</span>
          ) : saveStatus === "dirty" ? (
            <span>Unsaved changes</span>
          ) : (
            <span>Saved</span>
          )}
        </div>
      </div>
      {conflict ? (
        <div
          role="alert"
          className="mb-3 rounded-xl border border-amber-500/35 bg-amber-500/10 p-3"
        >
          <p className="text-sm font-semibold text-foreground">
            A newer note was saved elsewhere
          </p>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            Your version remains in the editor. The latest saved version is
            shown below; nothing will be overwritten until you choose.
          </p>
          <div className="mt-2 max-h-36 overflow-auto whitespace-pre-wrap rounded-lg border border-border bg-background p-2 text-xs text-foreground">
            {conflict.latestNotes || "(The latest saved note is empty.)"}
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="min-h-11"
              onClick={loadLatestNotes}
              disabled={isPending}
            >
              Load latest
            </Button>
            <Button
              type="button"
              size="sm"
              className="min-h-11"
              onClick={() =>
                persistNotes(conflict.latestRevision, true)
              }
              disabled={isPending}
            >
              Save my version
            </Button>
          </div>
        </div>
      ) : null}
      {recoverableDraft !== null ? (
        <div
          role="status"
          className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border bg-muted/30 p-3 text-xs text-muted-foreground"
        >
          <span>Your prior unsaved draft is preserved.</span>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="min-h-11"
            onClick={restoreRecoverableDraft}
          >
            Restore my draft
          </Button>
        </div>
      ) : null}
      <label htmlFor="deal-notes-input" className="sr-only">
        Deal notes
      </label>
      <textarea
        id="deal-notes-input"
        value={notes}
        onChange={(event) => {
          const next = event.target.value;
          const clipped = next.length > NOTES_MAX ? next.slice(0, NOTES_MAX) : next;
          notesRef.current = clipped;
          setNotes(clipped);
          setSaveStatus(
            conflict
              ? "conflict"
              : clipped === lastSavedNotes
                ? "saved"
                : "dirty"
          );
        }}
        onBlur={persistOnBlur}
        rows={4}
        maxLength={NOTES_MAX}
        placeholder="Seller motivation, inspector findings, offer strategy — anything to remember about this deal."
        className="w-full resize-none rounded-xl border border-border bg-background p-3 text-base md:text-sm leading-relaxed text-foreground placeholder:text-muted-foreground/70 focus:outline-none focus:ring-2 focus:ring-primary/40"
      />
      <p className="mt-1.5 text-right text-[10px] text-muted-foreground">
        {remaining.toLocaleString()} characters left
      </p>
    </section>
  );
}
