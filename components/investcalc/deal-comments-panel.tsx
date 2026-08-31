"use client";

/**
 * Deal comments - an append-only, dated log on a saved deal (seller updates,
 * agent notes, your evolving reasoning over time). Distinct from the single
 * Deal Notes blob: a sequence you can scroll back through. Free per-deal
 * annotation; entries are immutable (add / delete). Renders a graceful notice
 * until the deal_comments migration is applied.
 */
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import * as Sentry from "@sentry/nextjs";
import { Loader2, MessageSquare, Send, X } from "lucide-react";
import {
  addDealCommentV2Action,
  deleteDealCommentV2Action,
  listDealCommentsAction,
  type DealComment,
} from "@/app/actions/deal-comments";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { isCurrentDealWorkspaceMutation } from "@/lib/deal-workspace-mutation-lifecycle";

function formatWhen(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export function DealCommentsPanel({ savedDealId }: { savedDealId: string }) {
  const { toast } = useToast();
  const [comments, setComments] = useState<DealComment[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [migrationPending, setMigrationPending] = useState(false);
  const [draft, setDraft] = useState("");
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(false);
  const savedDealIdRef = useRef<string | null>(savedDealId);
  const mutationRequestRef = useRef<symbol | null>(null);
  const addRequestRef = useRef<{ body: string; requestId: string } | null>(null);

  useLayoutEffect(() => {
    savedDealIdRef.current = savedDealId;
    mutationRequestRef.current = null;
    addRequestRef.current = null;
    setIsBusy(false);
    setLoaded(false);
    return () => {
      if (savedDealIdRef.current !== savedDealId) return;
      savedDealIdRef.current = null;
      mutationRequestRef.current = null;
      addRequestRef.current = null;
    };
  }, [savedDealId]);

  useEffect(() => {
    let cancelled = false;
    setLoaded(false);
    setLoadError(null);
    setMigrationPending(false);
    setConfirmDeleteId(null);
    // Never carry an unsent comment into a different deal if the route reuses
    // this component instance.
    setDraft("");
    void listDealCommentsAction(savedDealId)
      .then((r) => {
        if (cancelled) return;
        if (r.ok) setComments(r.comments);
        else if (r.code === "MIGRATION_PENDING") setMigrationPending(true);
        else setLoadError(r.message || "We couldn't load this comment log.");
        setLoaded(true);
      })
      .catch((err) => {
        if (!cancelled) {
          Sentry.captureException(err, { tags: { feature: "deal-comments-load" } });
          setLoadError("We couldn't load this comment log. Check your connection and try again.");
          setLoaded(true);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [loadAttempt, savedDealId]);

  const showMutationFailure = (result: {
    code: string;
    message: string;
  }) => {
    if (result.code === "MIGRATION_PENDING") setMigrationPending(true);
    else
      toast({
        title: "Could not save comment",
        description: result.message,
        variant: "destructive",
      });
  };

  const add = () => {
    const body = draft.trim();
    // The ref closes the same-tick window before React can paint isBusy. It
    // also covers ⌘/Ctrl+Enter, which bypasses the disabled Send button.
    if (!body || isBusy || mutationRequestRef.current !== null) return;
    const dealAtSubmit = savedDealId;
    // Preserve the key while this exact draft remains in the box. If the
    // INSERT committed but the response was interrupted, clicking again sends
    // the same key and the server returns the existing immutable row instead
    // of appending a duplicate comment.
    const existingRequest = addRequestRef.current;
    const requestId =
      existingRequest?.body === body
        ? existingRequest.requestId
        : crypto.randomUUID();
    addRequestRef.current = { body, requestId };
    const requestToken = Symbol("deal-comment-add");
    mutationRequestRef.current = requestToken;
    const requestStillOwnsDeal = () =>
      isCurrentDealWorkspaceMutation({
        submittedDealId: dealAtSubmit,
        currentDealId: savedDealIdRef.current,
        requestToken,
        currentRequestToken: mutationRequestRef.current,
      });
    setIsBusy(true);
    void (async () => {
      // The draft is the only copy of what was typed, so it survives until
      // the server confirms the row. Clearing before the await meant any
      // failure (session expiry, archived deal, dropped connection) silently
      // destroyed the entry. A rejected promise gets its own retry toast.
      try {
        const r = await addDealCommentV2Action(dealAtSubmit, body, requestId);
        if (!requestStillOwnsDeal()) return;
        if (!r.ok) {
          showMutationFailure(r);
          return;
        }
        addRequestRef.current = null;
        // Only drop what we actually sent - anything typed while the save was
        // in flight stays put.
        setDraft((current) => (current.trim() === body ? "" : current));
        setComments((current) => [
          r.comment,
          ...current.filter((comment) => comment.id !== r.comment.id),
        ]);
      } catch (error) {
        if (!requestStillOwnsDeal()) return;
        Sentry.captureException(error, {
          tags: { feature: "deal-comments-add" },
        });
        toast({
          title: "Could not save comment",
          description: "We couldn't reach the server. Your entry is still in the box - try again.",
          variant: "destructive",
        });
      } finally {
        if (mutationRequestRef.current === requestToken) {
          mutationRequestRef.current = null;
          setIsBusy(false);
        }
      }
    })();
  };
  const remove = (commentId: string) => {
    if (isBusy || mutationRequestRef.current !== null) return;
    const dealAtSubmit = savedDealId;
    const requestToken = Symbol("deal-comment-delete");
    mutationRequestRef.current = requestToken;
    const requestStillOwnsDeal = () =>
      isCurrentDealWorkspaceMutation({
        submittedDealId: dealAtSubmit,
        currentDealId: savedDealIdRef.current,
        requestToken,
        currentRequestToken: mutationRequestRef.current,
      });
    setIsBusy(true);
    void (async () => {
      try {
        const r = await deleteDealCommentV2Action(dealAtSubmit, commentId);
        if (!requestStillOwnsDeal()) return;
        if (!r.ok) {
          showMutationFailure(r);
          return;
        }
        setConfirmDeleteId(null);
        setComments((current) =>
          current.filter(
            (comment) => comment.id !== r.deletedCommentId,
          ),
        );
      } catch (err) {
        // The action REJECTED rather than returning {ok:false} (network blip,
        // cold-start 500, stale-deploy Server Action). Without this the delete
        // silently no-ops — the row stays on screen with no signal. Mirror the
        // add() path: a retryable toast, and honor the stale-deal guard.
        if (!requestStillOwnsDeal()) return;
        Sentry.captureException(err, { tags: { feature: "deal-comments" } });
        toast({
          title: "Could not delete comment",
          description: "We couldn't reach the server. Try again.",
          variant: "destructive",
        });
      } finally {
        if (mutationRequestRef.current === requestToken) {
          mutationRequestRef.current = null;
          setIsBusy(false);
        }
      }
    })();
  };

  if (!loaded) return null;

  if (loadError) {
    return (
      <section aria-label="Deal comments" className="rounded-2xl border border-destructive/25 bg-destructive/5 p-4">
        <div role="alert">
          <p className="text-sm font-semibold text-foreground">Couldn&apos;t load comments</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {loadError} Adding and deleting stay disabled until the saved log is available.
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
        aria-label="Deal comments"
        className="rounded-2xl border border-dashed border-border bg-muted/20 p-4 text-xs text-muted-foreground"
      >
        <MessageSquare className="mr-1.5 inline size-3.5" />
        The deal comment log will be available once the latest schema update is applied.
      </section>
    );
  }

  return (
    <section aria-label="Deal comments" className="rounded-2xl border border-border bg-card p-4 sm:p-5">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <MessageSquare className="size-4 text-primary" />
          <h3 className="text-xs font-bold uppercase tracking-widest text-foreground">Comments</h3>
        </div>
        {isBusy ? (
          <span role="status" aria-live="polite" className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
            <Loader2 className="size-3 animate-spin" /> Saving…
          </span>
        ) : (
          <span role="status" aria-live="polite" className="text-[11px] text-muted-foreground">
            {comments.length} {comments.length === 1 ? "entry" : "entries"}
          </span>
        )}
      </div>

      <div className="flex gap-2">
        <label htmlFor="deal-comment-draft" className="sr-only">
          Add a deal comment
        </label>
        <textarea
          id="deal-comment-draft"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
              e.preventDefault();
              add();
            }
          }}
          rows={2}
          maxLength={2000}
          placeholder="Log an update - seller motivation, agent call, a decision… (⌘/Ctrl+Enter)"
          className="min-h-[2.5rem] flex-1 resize-y rounded-md border border-input bg-transparent px-2.5 py-2 text-sm text-foreground outline-none transition-[color,box-shadow] placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
        />
        <Button type="button" size="sm" variant="outline" className="h-11 self-end" onClick={add} disabled={!draft.trim() || isBusy} aria-label="Add comment">
          <Send className="size-4" aria-hidden />
        </Button>
      </div>

      {comments.length > 0 ? (
        <ul className="mt-3 space-y-2.5">
          {comments.map((c) => (
            <li key={c.id} className="group rounded-xl border border-border/60 bg-muted/20 p-3">
              <div className="mb-1 flex items-center justify-between gap-2">
                <span className="text-[11px] font-semibold text-muted-foreground">
                  {c.authorName ? `${c.authorName} · ` : ""}
                  {formatWhen(c.createdAt)}
                </span>
                <Popover
                  open={confirmDeleteId === c.id}
                  onOpenChange={(open) => setConfirmDeleteId(open ? c.id : null)}
                >
                  <PopoverTrigger asChild>
                    <button
                      type="button"
                      aria-label="Delete comment"
                      disabled={isBusy}
                      className="inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-md text-muted-foreground/50 transition-colors hover:bg-destructive/10 hover:text-destructive focus-visible:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
                    >
                      <X className="size-3.5" />
                    </button>
                  </PopoverTrigger>
                  <PopoverContent align="end" className="w-72">
                    <p className="text-sm font-semibold text-foreground">Delete this comment?</p>
                    <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                      This removes the dated entry permanently. There is no safe undo after it leaves the server.
                    </p>
                    <div className="mt-3 flex justify-end gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="min-h-11"
                        disabled={isBusy}
                        onClick={() => setConfirmDeleteId(null)}
                      >
                        Cancel
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="destructive"
                        className="min-h-11"
                        disabled={isBusy}
                        onClick={() => remove(c.id)}
                      >
                        Delete
                      </Button>
                    </div>
                  </PopoverContent>
                </Popover>
              </div>
              <p className="whitespace-pre-wrap text-sm text-foreground">{c.body}</p>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 text-xs text-muted-foreground">
          No comments yet. Keep a dated trail of what you learn as the deal moves.
        </p>
      )}
    </section>
  );
}
