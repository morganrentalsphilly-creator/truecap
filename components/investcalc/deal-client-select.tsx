"use client";

/**
 * "For client" control on the DEAL WORKSPACE — the screen Morgan named when he
 * said assigning a deal to a client was confusing. The deal list has the same
 * control; this puts it where an agent actually decides ("I've read the
 * underwrite, this one fits the Nguyens") instead of making them go back.
 *
 * Renders nothing unless the viewer is an Agent Pro user with a roster, so no
 * other tier sees client chrome on their deal page.
 */

import { useLayoutEffect, useRef, useState, useTransition } from "react";
import * as Sentry from "@sentry/nextjs";
import { useRouter } from "next/navigation";
import { UserRound } from "lucide-react";
import { setSavedDealClientAction } from "@/app/actions/saved-analyses";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { isCurrentDealWorkspaceMutation } from "@/lib/deal-workspace-mutation-lifecycle";

const UNASSIGNED = "__none__";

export function DealClientSelect({
  savedDealId,
  clients,
  clientId,
}: {
  savedDealId: string;
  clients: { id: string; name: string }[];
  clientId: string | null;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [value, setValue] = useState(clientId ?? UNASSIGNED);
  const [isPending, startTransition] = useTransition();
  const savedDealIdRef = useRef(savedDealId);
  const mutationRequestRef = useRef<symbol | null>(null);

  useLayoutEffect(() => {
    savedDealIdRef.current = savedDealId;
    mutationRequestRef.current = null;
  }, [savedDealId]);
  useLayoutEffect(() => {
    setValue(clientId ?? UNASSIGNED);
  }, [clientId, savedDealId]);

  if (clients.length === 0) return null;

  const onChange = (next: string) => {
    const previous = value;
    const dealAtSubmit = savedDealId;
    const requestToken = Symbol("deal-client-save");
    mutationRequestRef.current = requestToken;
    const requestStillOwnsDeal = () =>
      isCurrentDealWorkspaceMutation({
        submittedDealId: dealAtSubmit,
        currentDealId: savedDealIdRef.current,
        requestToken,
        currentRequestToken: mutationRequestRef.current,
      });
    setValue(next); // optimistic — reverted below if the write fails
    const nextClientId = next === UNASSIGNED ? null : next;
    startTransition(async () => {
      try {
        const result = await setSavedDealClientAction(dealAtSubmit, nextClientId);
        if (!requestStillOwnsDeal()) return;
        if (!result.ok) {
          setValue(previous);
          toast({ title: "Could not assign client", description: result.message, variant: "destructive" });
          return;
        }
        const name = clients.find((c) => c.id === nextClientId)?.name;
        toast({
          title: nextClientId ? `Assigned to ${name ?? "client"}` : "Removed from client",
          description: nextClientId ? "It now shows on their portal." : "It no longer shows on their portal.",
        });
        router.refresh();
      } catch (err) {
        Sentry.captureException(err, { tags: { feature: "deal-client-select" } });
        if (!requestStillOwnsDeal()) return;
        setValue(previous);
        toast({ title: "Could not assign client", description: "Try again in a moment.", variant: "destructive" });
      } finally {
        if (mutationRequestRef.current === requestToken) {
          mutationRequestRef.current = null;
        }
      }
    });
  };

  return (
    <div className="flex items-center gap-1.5">
      <UserRound className="size-4 text-muted-foreground" aria-hidden />
      <Select value={value} onValueChange={onChange} disabled={isPending}>
        <SelectTrigger className="h-9 w-[170px] text-sm" aria-label="Assign this deal to a client">
          <SelectValue placeholder="For client" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={UNASSIGNED}>No client</SelectItem>
          {clients.map((c) => (
            <SelectItem key={c.id} value={c.id}>
              {c.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
