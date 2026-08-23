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
import { useEffect, useState, useTransition } from "react";
import * as Sentry from "@sentry/nextjs";
import { Loader2, NotebookPen } from "lucide-react";
import {
  getSavedDealNotesAction,
  updateSavedDealNotesAction,
} from "@/app/actions/saved-analyses";
import { useToast } from "@/hooks/use-toast";

const NOTES_MAX = 10_000;

export function DealNotesPanel({ savedDealId }: { savedDealId: string }) {
  const { toast } = useToast();
  const [notes, setNotes] = useState<string>("");
  const [initialLoaded, setInitialLoaded] = useState(false);
  const [migrationPending, setMigrationPending] = useState(false);
  const [savedTick, setSavedTick] = useState<number>(0);
  const [isPending, startTransition] = useTransition();
  const [lastSavedNotes, setLastSavedNotes] = useState<string>("");

  // Lazy-load the current notes on mount / when the saved deal changes.
  useEffect(() => {
    let cancelled = false;
    setInitialLoaded(false);
    setMigrationPending(false);
    // .catch contains action rejections from becoming unhandled
    // browser promise rejections. If the action throws (transient
    // Supabase outage, etc.), the panel just stays in its loading
    // state - no Sentry false-positive.
    void getSavedDealNotesAction(savedDealId)
      .then((result) => {
        if (cancelled) return;
        if (result.ok) {
          setNotes(result.notes ?? "");
          setLastSavedNotes(result.notes ?? "");
        } else if (result.code === "MIGRATION_PENDING") {
          setMigrationPending(true);
        }
        setInitialLoaded(true);
      })
      .catch((err) => {
        if (!cancelled) {
          console.warn("[deal-notes] load failed:", err);
          setInitialLoaded(true);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [savedDealId]);

  const persistOnBlur = () => {
    if (migrationPending) return;
    if (notes === lastSavedNotes) return;
    // Capture the deal id + notes snapshot AT submit time. If the user
    // switches to a different saved deal mid-save (e.g. clicks another
    // saved deal in the list before the server action returns), we
    // must not update lastSavedNotes for the new deal with values from
    // the previous deal - that would mark the new deal's textarea as
    // "saved" when it actually hasn't been touched yet.
    const dealIdAtSubmit = savedDealId;
    const notesAtSubmit = notes;
    startTransition(async () => {
      try {
        const result = await updateSavedDealNotesAction(dealIdAtSubmit, notesAtSubmit);
        if (dealIdAtSubmit !== savedDealId) {
          // User switched deals while this save was in flight - its
          // result is no longer relevant. Discard silently.
          return;
        }
        if (!result.ok) {
          if (result.code === "MIGRATION_PENDING") {
            setMigrationPending(true);
            return;
          }
          toast({
            title: "Could not save notes",
            description: result.message,
            variant: "destructive",
          });
          return;
        }
        setLastSavedNotes(notesAtSubmit);
        setSavedTick(Date.now());
      } catch (err) {
        // The action REJECTED (network blip, cold-start 500, stale-deploy
        // Server Action) rather than returning {ok:false}. Without this the
        // save silently no-ops: lastSavedNotes never advances, so the panel
        // just falls back to "Auto-saves" as if nothing happened. Tell the
        // user it's retryable — the typed text is untouched, so re-blurring
        // retries. Same stale-deal guard as the success path.
        Sentry.captureException(err, { tags: { feature: "deal-notes" } });
        if (dealIdAtSubmit !== savedDealId) return;
        toast({
          title: "Could not save notes",
          description: "Something interrupted the request. Check your connection and try again.",
          variant: "destructive",
        });
      }
    });
  };

  // Render nothing while we wait for the first fetch - avoids a flash
  // of empty notes before the saved content arrives.
  if (!initialLoaded) {
    return null;
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
  const showSaved =
    !isPending && savedTick > 0 && Date.now() - savedTick < 4000;

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
          {isPending ? (
            <span className="inline-flex items-center gap-1">
              <Loader2 className="size-3 animate-spin" /> Saving…
            </span>
          ) : showSaved ? (
            <span className="text-[var(--metric-positive,#16a34a)]">Saved</span>
          ) : (
            <span>Auto-saves</span>
          )}
        </div>
      </div>
      <label htmlFor="deal-notes" className="sr-only">
        Deal notes
      </label>
      <textarea
        id="deal-notes"
        value={notes}
        onChange={(event) => {
          const next = event.target.value;
          setNotes(next.length > NOTES_MAX ? next.slice(0, NOTES_MAX) : next);
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
