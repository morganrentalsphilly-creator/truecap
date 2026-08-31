"use client";

/**
 * Quiet workspace → Compare cross-link for the deal-workspace header area:
 * "is THIS one better than my others?" answered where the question actually
 * comes up. Seeds the compare selection with this deal via the SAME cookie
 * mechanism the manual picker uses (startCompareAction), then lands on
 * /dashboard/compare — this deal fills the first column and the grid's "Add"
 * tile fills the rest.
 *
 * Invisible until useful: the server page only mounts this when the user has
 * ≥2 active deals, this deal is itself active (the action validates
 * active-only), and the compare_deals entitlement holds — the action
 * re-enforces auth + entitlement regardless, so an error here degrades to a
 * toast, never a broken redirect.
 */

import { useLayoutEffect, useRef, useTransition } from "react";
import { useRouter } from "next/navigation";
import { GitCompare } from "lucide-react";
import { startCompareAction } from "@/app/actions/compare";
import { useToast } from "@/hooks/use-toast";
import { isCurrentDealWorkspaceMutation } from "@/lib/deal-workspace-mutation-lifecycle";

export function CompareWithAnotherDealLink({ savedDealId }: { savedDealId: string }) {
  const router = useRouter();
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  const compareRequestInFlightRef = useRef(false);
  const savedDealIdRef = useRef<string | null>(savedDealId);
  const compareRequestRef = useRef<symbol | null>(null);

  useLayoutEffect(() => {
    savedDealIdRef.current = savedDealId;
    compareRequestRef.current = null;
    compareRequestInFlightRef.current = false;
    return () => {
      if (savedDealIdRef.current !== savedDealId) return;
      savedDealIdRef.current = null;
      compareRequestRef.current = null;
      compareRequestInFlightRef.current = false;
    };
  }, [savedDealId]);

  function handleCompare() {
    if (compareRequestInFlightRef.current || isPending) return;
    const dealIdAtSubmit = savedDealId;
    const requestToken = Symbol("workspace-compare");
    compareRequestInFlightRef.current = true;
    compareRequestRef.current = requestToken;
    const requestStillOwnsDeal = () =>
      isCurrentDealWorkspaceMutation({
        submittedDealId: dealIdAtSubmit,
        currentDealId: savedDealIdRef.current,
        requestToken,
        currentRequestToken: compareRequestRef.current,
      });
    startTransition(async () => {
      try {
        const result = await startCompareAction([dealIdAtSubmit]);
        if (!requestStillOwnsDeal()) return;
        if (!result.ok) {
          toast({
            title: "Couldn't start compare",
            description: result.message,
            variant: "destructive",
          });
          return;
        }
        router.push("/dashboard/compare");
      } catch {
        if (!requestStillOwnsDeal()) return;
        // The action REJECTED rather than returning {ok:false} (network blip,
        // cold-start 500, deploy skew). Without this the click is silent —
        // the button just re-enables with no redirect and no signal. Surface
        // a retryable error, matching the {ok:false} branch's copy.
        toast({
          title: "Couldn't start compare",
          description: "Something interrupted the request. Check your connection and try again.",
          variant: "destructive",
        });
      } finally {
        if (compareRequestRef.current === requestToken) {
          compareRequestRef.current = null;
          compareRequestInFlightRef.current = false;
        }
      }
    });
  }

  return (
    <button
      type="button"
      onClick={handleCompare}
      disabled={isPending}
      className="inline-flex min-h-11 items-center gap-1.5 rounded-lg px-2 text-xs font-semibold text-primary hover:bg-primary/5 hover:underline disabled:opacity-60"
    >
      <GitCompare className="size-3.5" />
      Compare with another deal →
    </button>
  );
}
