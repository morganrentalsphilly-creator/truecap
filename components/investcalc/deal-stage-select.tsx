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
import { useRouter } from "next/navigation";
import { updateSavedDealStageAction } from "@/app/actions/saved-analyses";
import { useToast } from "@/hooks/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PIPELINE_STAGES, pipelineStageLabel, type PipelineStage } from "@/lib/pipeline";

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

  const handleChange = (value: string) => {
    const next = value as PipelineStage;
    if (next === stage) return;
    setDisplayStage(next);
    startSaving(async () => {
      try {
        const result = await updateSavedDealStageAction(savedDealId, next);
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
          title: "Stage updated",
          description: `Moved to ${pipelineStageLabel(next)}.`,
          variant: "success",
        });
        router.refresh();
      } catch {
        // The action REJECTED rather than returning {ok:false} (network blip,
        // cold-start 500, stale-deploy Server Action). The optimistic display
        // still shows the NEW stage — a lie the server never stored — so roll
        // it back to the server-truth prop and tell the user it's retryable.
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
      <SelectTrigger aria-label="Pipeline stage" className="h-8 w-[150px] rounded-md text-xs">
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
