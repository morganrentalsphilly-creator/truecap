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
import { useEffect, useState, useTransition } from "react";
import * as Sentry from "@sentry/nextjs";
import { useRouter } from "next/navigation";
import { updateSavedDealStageAction } from "@/app/actions/saved-analyses";
import { useToast } from "@/hooks/use-toast";
import { useActionConfirm } from "@/components/ui/action-confirm-dialog";
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
  useEffect(() => setDisplayStage(stage), [stage]);

  const { confirmDialog, promptDialog } = useActionConfirm();

  const handleChange = async (value: string) => {
    const next = value as PipelineStage;
    if (next === stage) return;
    if (
      !(await confirmPipelineStageChange({
        previousStage: stage,
        nextStage: next,
        confirm: (title, body) =>
          confirmDialog({ title, body, confirmLabel: "Mark as Passed" }),
      }))
    ) {
      return;
    }
    const reason = await promptForPipelinePassReason({
      previousStage: stage,
      nextStage: next,
      prompt: (title, body) =>
        promptDialog({
          title,
          body,
          placeholder: "e.g. Numbers don't clear my buy box at this price",
          confirmLabel: "Save reason",
        }),
    });
    if (next === "passed" && !reason) {
      toast({
        title: "Pass reason required",
        description: "Add the reason you are passing so the Deal Log stays useful.",
        variant: "destructive",
      });
      return;
    }
    setDisplayStage(next);
    startSaving(async () => {
      try {
        const result = await updateSavedDealStageAction(
          savedDealId,
          next,
          reason ? { reason } : undefined,
        );
        if (!result.ok) {
          setDisplayStage(stage);
          toast({
            title: "Could not update stage",
            description: result.message,
            variant: "destructive",
          });
          return;
        }
        toast({
          title: next === "passed" ? "Marked as Passed" : "Stage updated",
          description:
            next === "passed"
              ? `Reason recorded in Deal Log. Undo restores ${pipelineStageLabel(stage)}.`
              : `Moved to ${pipelineStageLabel(next)}.`,
          variant: "success",
          action:
            next === "passed" ? (
              <ToastAction
                altText="Undo marking deal as Passed"
                className="min-h-11"
                onClick={() => {
                  setDisplayStage(stage);
                  startSaving(async () => {
                    try {
                      const undo = await updateSavedDealStageAction(
                        savedDealId,
                        stage,
                        { note: "Pass decision undone." },
                      );
                      if (!undo.ok) {
                        setDisplayStage("passed");
                        toast({
                          title: "Could not undo",
                          description: undo.message,
                          variant: "destructive",
                        });
                        return;
                      }
                      trackEvent("pipeline_stage_changed", {
                        from_stage: "passed",
                        to_stage: stage,
                        moved_to_offer_ready: stage === "offer_ready",
                      });
                      router.refresh();
                    } catch (error) {
                      Sentry.captureException(error, {
                        tags: { feature: "deal-stage-pass-undo" },
                      });
                      setDisplayStage("passed");
                      toast({
                        title: "Could not undo",
                        description: "Check your connection and try again.",
                        variant: "destructive",
                      });
                    }
                  });
                }}
              >
                Undo
              </ToastAction>
            ) : undefined,
        });
        trackEvent("pipeline_stage_changed", {
          from_stage: stage,
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
        setDisplayStage(stage);
        toast({
          title: "Could not update stage",
          description: "Something interrupted the request. Check your connection and try again.",
          variant: "destructive",
        });
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
