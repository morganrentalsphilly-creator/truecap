"use client";

/**
 * Stage select for the deal workspace header — lets the user move a deal
 * through the pipeline from the page where stage changes actually happen
 * (checking off due diligence when the offer is accepted), instead of only
 * from the My Deals overflow menu.
 *
 * Same write path as My Deals: updateSavedDealStageAction (which enforces the
 * "pipeline" entitlement server-side) + router.refresh() so the
 * server-rendered NextActionBanner, aging nudge, and owned-equity card all
 * recompute for the new stage. The page only mounts this for users with the
 * pipeline entitlement, mirroring My Deals' canUsePipeline gate.
 */
import { useLayoutEffect, useRef, useState, useTransition } from "react";
import * as Sentry from "@sentry/nextjs";
import { useRouter } from "next/navigation";
import {
  undoPassedSavedDealStageAction,
  updateSavedDealStageAction,
} from "@/app/actions/saved-analyses";
import { useToast } from "@/hooks/use-toast";
import { ToastAction } from "@/components/ui/toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PIPELINE_STAGES, pipelineStageLabel, type PipelineStage } from "@/lib/pipeline";
import {
  confirmPipelineStageChange,
  promptForPipelinePassReason,
} from "@/lib/pipeline-pass-confirmation";
import { trackEvent } from "@/lib/analytics";
import { isCurrentDealWorkspaceMutation } from "@/lib/deal-workspace-mutation-lifecycle";

export function DealStageSelect({
  savedDealId,
  stage,
}: {
  savedDealId: string;
  stage: PipelineStage;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [isSaving, startSaving] = useTransition();
  // Optimistic display value: a controlled Select bound to the server prop
  // snaps back to the OLD stage for the whole save+refresh round-trip,
  // which reads as "my change didn't take". Show the picked stage
  // immediately; revert on error; re-sync when the server prop updates.
  const [displayStage, setDisplayStage] = useState<PipelineStage>(stage);
  const savedDealIdRef = useRef(savedDealId);
  const mutationRequestRef = useRef<symbol | null>(null);
  useLayoutEffect(() => {
    savedDealIdRef.current = savedDealId;
    mutationRequestRef.current = null;
  }, [savedDealId]);
  useLayoutEffect(() => {
    setDisplayStage(stage);
  }, [savedDealId, stage]);

  const handleChange = (value: string) => {
    const next = value as PipelineStage;
    if (next === stage) return;
    if (
      !confirmPipelineStageChange({
        previousStage: stage,
        nextStage: next,
        confirm: (message) => window.confirm(message),
      })
    ) {
      return;
    }
    const reason = promptForPipelinePassReason({
      previousStage: stage,
      nextStage: next,
      prompt: (message) => window.prompt(message),
    });
    if (next === "passed" && !reason) {
      toast({
        title: "Pass reason required",
        description: "Add the reason you are passing so the Deal Log stays useful.",
        variant: "destructive",
      });
      return;
    }
    const dealAtSubmit = savedDealId;
    const stageAtSubmit = stage;
    const requestToken = Symbol("deal-stage-save");
    mutationRequestRef.current = requestToken;
    const requestStillOwnsDeal = () =>
      isCurrentDealWorkspaceMutation({
        submittedDealId: dealAtSubmit,
        currentDealId: savedDealIdRef.current,
        requestToken,
        currentRequestToken: mutationRequestRef.current,
      });
    setDisplayStage(next);
    startSaving(async () => {
      try {
        const result = await updateSavedDealStageAction(
          dealAtSubmit,
          next,
          reason ? { reason } : undefined,
        );
        if (!requestStillOwnsDeal()) return;
        if (!result.ok) {
          setDisplayStage(stageAtSubmit);
          toast({
            title: "Could not update stage",
            description: result.message,
            variant: "destructive",
          });
          return;
        }
        const passHistoryEventId =
          next === "passed" ? result.historyEventId : null;
        toast({
          title: next === "passed" ? "Marked as Passed" : "Stage updated",
          description:
            next === "passed"
              ? passHistoryEventId
                ? `Reason recorded in Deal Log. Undo restores ${pipelineStageLabel(stageAtSubmit)}.`
                : "This deal was already marked as Passed."
              : `Moved to ${pipelineStageLabel(next)}.`,
          variant: "success",
          action:
            next === "passed" && passHistoryEventId ? (
              <ToastAction
                altText="Undo marking deal as Passed"
                className="min-h-11"
                onClick={() => {
                  if (savedDealIdRef.current !== dealAtSubmit) return;
                  const undoToken = Symbol("deal-stage-undo");
                  mutationRequestRef.current = undoToken;
                  const undoStillOwnsDeal = () =>
                    isCurrentDealWorkspaceMutation({
                      submittedDealId: dealAtSubmit,
                      currentDealId: savedDealIdRef.current,
                      requestToken: undoToken,
                      currentRequestToken: mutationRequestRef.current,
                    });
                  startSaving(async () => {
                    try {
                      const undo = await undoPassedSavedDealStageAction(
                        dealAtSubmit,
                        stageAtSubmit,
                        passHistoryEventId,
                        { note: "Pass decision undone." },
                      );
                      if (!undoStillOwnsDeal()) return;
                      if (!undo.ok) {
                        if (undo.code === "STALE_DATA") {
                          toast({
                            title: "Undo expired",
                            description: undo.message,
                          });
                          router.refresh();
                          return;
                        }
                        toast({
                          title: "Could not undo",
                          description: undo.message,
                          variant: "destructive",
                        });
                        return;
                      }
                      setDisplayStage(stageAtSubmit);
                      toast({
                        title: "Pass undone",
                        description: `Restored ${pipelineStageLabel(stageAtSubmit)}.`,
                        variant: "success",
                      });
                      trackEvent("pipeline_stage_changed", {
                        from_stage: "passed",
                        to_stage: stageAtSubmit,
                        moved_to_offer_ready: stageAtSubmit === "offer_ready",
                      });
                      router.refresh();
                    } catch (error) {
                      Sentry.captureException(error, {
                        tags: { feature: "deal-stage-pass-undo" },
                      });
                      if (!undoStillOwnsDeal()) return;
                      toast({
                        title: "Could not undo",
                        description: "Check your connection and try again.",
                        variant: "destructive",
                      });
                      router.refresh();
                    } finally {
                      if (mutationRequestRef.current === undoToken) {
                        mutationRequestRef.current = null;
                      }
                    }
                  });
                }}
              >
                Undo
              </ToastAction>
            ) : undefined,
        });
        trackEvent("pipeline_stage_changed", {
          from_stage: stageAtSubmit,
          to_stage: next,
          moved_to_offer_ready: next === "offer_ready",
        });
        router.refresh();
      } catch (err) {
        // The action REJECTED rather than returning {ok:false} (network blip,
        // cold-start 500, stale-deploy Server Action). The optimistic display
        // still shows the NEW stage — a lie the server never stored — so roll
        // it back to the server-truth prop and tell the user it's retryable.
        Sentry.captureException(err, { tags: { feature: "deal-stage" } });
        if (!requestStillOwnsDeal()) return;
        setDisplayStage(stageAtSubmit);
        toast({
          title: "Could not update stage",
          description: "Something interrupted the request. Check your connection and try again.",
          variant: "destructive",
        });
      } finally {
        if (mutationRequestRef.current === requestToken) {
          mutationRequestRef.current = null;
        }
      }
    });
  };

  return (
    <Select value={displayStage} onValueChange={handleChange} disabled={isSaving}>
      <SelectTrigger aria-label="Pipeline stage" className="h-11 w-[150px] rounded-md text-xs">
        <SelectValue placeholder="Stage" />
      </SelectTrigger>
      <SelectContent>
        {PIPELINE_STAGES.map((s) => (
          <SelectItem key={s.id} value={s.id}>
            {s.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
