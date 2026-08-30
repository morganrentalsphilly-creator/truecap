"use client";

/**
 * Deal details - optional investor labels for a saved deal: a nickname (used
 * as the deal's display name across My Deals when set) plus market +
 * neighborhood for organizing a portfolio by area. Free per-deal annotation
 * (no entitlement), saves on blur, mirrors the Deal Notes / Due Diligence
 * cards. Renders a graceful notice until the labels migration is applied.
 */
import { useEffect, useLayoutEffect, useRef, useState, useTransition } from "react";
import * as Sentry from "@sentry/nextjs";
import { useRouter } from "next/navigation";
import { Loader2, MapPin } from "lucide-react";
import { getDealLabelsAction, updateDealLabelsAction, type DealLabels } from "@/app/actions/deal-labels";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { isCurrentDealWorkspaceMutation } from "@/lib/deal-workspace-mutation-lifecycle";
import {
  buildLatestDealLabelPatch,
  coalesceDealLabelSaveKeys,
  dealLabelPatchKeys,
  type DealLabelKey,
} from "@/lib/deal-label-save-lifecycle";

const EMPTY: DealLabels = { nickname: null, market: null, neighborhood: null };

export function DealDetailsCard({ savedDealId }: { savedDealId: string }) {
  const router = useRouter();
  const { toast } = useToast();
  const [drafts, setDrafts] = useState<DealLabels>(EMPTY);
  const [loaded, setLoaded] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [migrationPending, setMigrationPending] = useState(false);
  const [, startSaving] = useTransition();
  const [saveStatus, setSaveStatus] = useState<"idle" | "dirty" | "saving" | "saved" | "error">("idle");
  const [failedPatch, setFailedPatch] = useState<Partial<DealLabels> | null>(null);
  const draftsRef = useRef<DealLabels>(EMPTY);
  const labelsRef = useRef<DealLabels>(EMPTY);
  const savedDealIdRef = useRef(savedDealId);
  const mutationRequestRef = useRef<symbol | null>(null);
  const queuedSaveKeysRef = useRef<DealLabelKey[]>([]);

  useLayoutEffect(() => {
    savedDealIdRef.current = savedDealId;
    mutationRequestRef.current = null;
    queuedSaveKeysRef.current = [];
    draftsRef.current = EMPTY;
    labelsRef.current = EMPTY;
    setLoaded(false);
    setSaveStatus("idle");
    setFailedPatch(null);
  }, [savedDealId]);

  useEffect(() => {
    let cancelled = false;
    setLoaded(false);
    setLoadError(null);
    setMigrationPending(false);
    setSaveStatus("idle");
    setFailedPatch(null);
    void getDealLabelsAction(savedDealId)
      .then((r) => {
        if (cancelled) return;
        if (r.ok) {
          labelsRef.current = r.labels;
          setDrafts(r.labels);
          draftsRef.current = r.labels;
        } else if (r.code === "MIGRATION_PENDING") {
          setMigrationPending(true);
        } else {
          setLoadError(r.message || "We couldn't load these deal details.");
        }
        setLoaded(true);
      })
      .catch((err) => {
        if (!cancelled) {
          Sentry.captureException(err, { tags: { feature: "deal-details-load" } });
          setLoadError("We couldn't load these deal details. Check your connection and try again.");
          setLoaded(true);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [loadAttempt, savedDealId]);

  // Only blurred fields enter this queue. Concurrent blurs are serialized into
  // one latest-draft patch after the owner request settles, so a fast second
  // blur can neither overlap nor disappear behind the first save.
  function flushQueuedSave() {
    if (
      mutationRequestRef.current !== null ||
      queuedSaveKeysRef.current.length === 0 ||
      loadError ||
      migrationPending
    ) {
      return;
    }

    const submittedKeys = queuedSaveKeysRef.current;
    queuedSaveKeysRef.current = [];
    const patch = buildLatestDealLabelPatch(
      submittedKeys,
      draftsRef.current,
    );
    const dealAtSubmit = savedDealId;
    const requestToken = Symbol("deal-label-save");
    mutationRequestRef.current = requestToken;
    const requestStillOwnsDeal = () =>
      isCurrentDealWorkspaceMutation({
        submittedDealId: dealAtSubmit,
        currentDealId: savedDealIdRef.current,
        requestToken,
        currentRequestToken: mutationRequestRef.current,
      });
    setSaveStatus("saving");
    setFailedPatch(null);
    startSaving(async () => {
      let saved = false;
      const restoreSubmittedKeys = () => {
        // A failed owner request and every blur queued behind it are one retry
        // unit. Values are rebuilt from draftsRef when Retry is clicked, so
        // typing after the failure is preserved too.
        queuedSaveKeysRef.current = coalesceDealLabelSaveKeys(
          submittedKeys,
          queuedSaveKeysRef.current,
        );
        setFailedPatch(
          buildLatestDealLabelPatch(
            queuedSaveKeysRef.current,
            draftsRef.current,
          ),
        );
        setSaveStatus("error");
      };
      try {
        const r = await updateDealLabelsAction(dealAtSubmit, patch);
        if (!requestStillOwnsDeal()) return;
        if (!r.ok) {
          restoreSubmittedKeys();
          if (r.code === "MIGRATION_PENDING") setMigrationPending(true);
          else toast({ title: "Could not save deal details", description: r.message, variant: "destructive" });
          return;
        }
        saved = true;
        labelsRef.current = r.labels;
        // Only normalize fields that still contain the submitted value. If the
        // user kept typing while this request was in flight, their newer draft
        // remains on screen and is correctly marked unsaved.
        const nextDrafts = { ...draftsRef.current };
        for (const key of submittedKeys) {
          if ((nextDrafts[key] ?? null) === (patch[key] ?? null)) {
            nextDrafts[key] = r.labels[key];
          }
        }
        draftsRef.current = nextDrafts;
        setDrafts(nextDrafts);
        const hasNewerDraft = (Object.keys(draftsRef.current) as Array<keyof DealLabels>).some(
          (key) => (draftsRef.current[key]?.trim() || null) !== (r.labels[key] ?? null)
        );
        setFailedPatch(null);
        setSaveStatus(
          queuedSaveKeysRef.current.length > 0 || hasNewerDraft
            ? "dirty"
            : "saved",
        );
        // The nickname leads the workspace h1 and the My Deals rows — both are
        // server-rendered, so without a refresh the Router Cache keeps serving
        // the old name on back-navigation until some other mutation purges it.
        router.refresh();
      } catch (err) {
        // The action REJECTED rather than returning {ok:false} (network blip,
        // cold-start 500, stale-deploy Server Action). The blurred input still
        // shows the typed value, so without this the change silently vanishes
        // on the next server render with no signal. Tell the user it's
        // retryable; the stale-deal guard mirrors the success path.
        if (!requestStillOwnsDeal()) return;
        Sentry.captureException(err, { tags: { feature: "deal-details" } });
        restoreSubmittedKeys();
        toast({
          title: "Could not save deal details",
          description: "Something interrupted the request. Check your connection and try again.",
          variant: "destructive",
        });
      } finally {
        if (mutationRequestRef.current === requestToken) {
          mutationRequestRef.current = null;
        }
      }
      if (
        saved &&
        dealAtSubmit === savedDealIdRef.current &&
        mutationRequestRef.current === null &&
        queuedSaveKeysRef.current.length > 0
      ) {
        flushQueuedSave();
      }
    });
  }

  // Save only explicitly blurred fields. Values are intentionally resolved
  // from draftsRef by the serialized flush rather than frozen here.
  function save(patch: Partial<DealLabels>) {
    queuedSaveKeysRef.current = coalesceDealLabelSaveKeys(
      queuedSaveKeysRef.current,
      dealLabelPatchKeys(patch),
    );
    if (loadError || migrationPending) {
      setSaveStatus("dirty");
      return;
    }
    if (mutationRequestRef.current !== null) {
      setSaveStatus("saving");
      return;
    }
    flushQueuedSave();
  }

  if (!loaded) return null;

  if (loadError) {
    return (
      <section aria-label="Deal details" className="rounded-2xl border border-destructive/25 bg-destructive/5 p-4">
        <div role="alert">
          <p className="text-sm font-semibold text-foreground">Couldn&apos;t load deal details</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {loadError} Editing stays disabled until the saved labels are available.
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
        aria-label="Deal details"
        className="rounded-2xl border border-dashed border-border bg-muted/20 p-4 text-xs text-muted-foreground"
      >
        <MapPin className="mr-1.5 inline size-3.5" />
        Deal nickname, market &amp; neighborhood will be available once the latest schema update is applied.
      </section>
    );
  }

  const fields: { key: keyof DealLabels; label: string; placeholder: string }[] = [
    { key: "nickname", label: "Nickname", placeholder: "e.g. The blue duplex" },
    { key: "market", label: "Market", placeholder: "e.g. Philadelphia" },
    { key: "neighborhood", label: "Neighborhood", placeholder: "e.g. Fishtown" },
  ];

  return (
    <section aria-label="Deal details" className="rounded-2xl border border-border bg-card p-4 sm:p-5">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <MapPin className="size-4 text-primary" />
          <h3 className="text-xs font-bold uppercase tracking-widest text-foreground">Deal details</h3>
        </div>
        <span aria-live="polite" aria-atomic="true" className="inline-flex min-h-6 items-center gap-1 text-[11px] text-muted-foreground">
          {saveStatus === "saving" ? (
            <>
            <Loader2 className="size-3 animate-spin" /> Saving…
            </>
          ) : saveStatus === "saved" ? (
            "Saved just now"
          ) : saveStatus === "error" ? (
            <span className="inline-flex items-center gap-2">
              <span className="font-semibold text-destructive">Couldn’t save</span>
              <button
                type="button"
                className="min-h-11 rounded-md px-2 font-semibold text-primary underline underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                onClick={() => {
                  if (!failedPatch) return;
                  save(failedPatch);
                }}
              >
                Retry
              </button>
            </span>
          ) : saveStatus === "dirty" ? (
            "Unsaved changes"
          ) : (
            "Not edited"
          )}
        </span>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        {fields.map((f) => (
          <label key={f.key} className="flex flex-col gap-1">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{f.label}</span>
            <Input
              type="text"
              value={drafts[f.key] ?? ""}
              placeholder={f.placeholder}
              maxLength={80}
              className="min-h-11"
              onChange={(event) => {
                const next = { ...draftsRef.current, [f.key]: event.target.value };
                draftsRef.current = next;
                setDrafts(next);
                setSaveStatus(() => {
                  if (mutationRequestRef.current !== null) return "saving";
                  if (failedPatch) return "error";
                  return (Object.keys(next) as Array<keyof DealLabels>).some(
                    (key) => (next[key]?.trim() || null) !== (labelsRef.current[key] ?? null)
                  )
                    ? "dirty"
                    : "saved";
                });
              }}
              onBlur={(e) => {
                const value = e.target.value.trim();
                // A same-field blur can intentionally revert the draft to the
                // pre-save value while an older value is still being written.
                // Queue that intent before comparing with stale saved labels.
                if (mutationRequestRef.current !== null) {
                  save({ [f.key]: value || null });
                  return;
                }
                if ((labelsRef.current[f.key] ?? "") === value) {
                  const next = {
                    ...draftsRef.current,
                    [f.key]: labelsRef.current[f.key],
                  };
                  draftsRef.current = next;
                  setDrafts(next);
                  setSaveStatus(() => {
                    if (mutationRequestRef.current !== null) return "saving";
                    if (failedPatch) return "error";
                    return (Object.keys(next) as Array<keyof DealLabels>).some(
                      (key) => (next[key]?.trim() || null) !== (labelsRef.current[key] ?? null)
                    )
                      ? "dirty"
                      : "saved";
                  });
                  return;
                }
                save({ [f.key]: value || null });
              }}
            />
          </label>
        ))}
      </div>
      <p className="mt-2 text-[11px] text-muted-foreground">
        A nickname shows in place of the address across My Deals. Market &amp; neighborhood are optional columns there.
      </p>
    </section>
  );
}
