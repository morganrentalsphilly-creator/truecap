"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Check, Loader2 } from "lucide-react";
import { startCompareAction } from "@/app/actions/compare";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

/**
 * Inline deal picker for the Compare page's empty state. Previously the empty
 * state only offered a "Go to Saved Analyses" button - the user had to leave,
 * tick boxes there, and come back. This lets them select 2-4 saved deals right
 * here and start the comparison in place (startCompareAction sets the selection
 * cookie; router.refresh re-runs the page's server component to render the
 * comparison).
 */

export type ComparePickerDeal = {
  id: string;
  label: string;
  score: number | null;
  signal: string | null;
  netCashFlow: number | null;
  capRate: number | null;
};

const MAX_COMPARE_ITEMS = 4;

const fmtMoney = (n: number | null) =>
  n == null ? "—" : `${n >= 0 ? "+" : "-"}$${Math.abs(Math.round(n)).toLocaleString()}/mo`;
const fmtPct = (n: number | null) => (n == null ? "—" : `${n.toFixed(1)}% cap`);

export function CompareDealPicker({ deals }: { deals: ComparePickerDeal[] }) {
  const router = useRouter();
  const { toast } = useToast();
  const [selected, setSelected] = useState<string[]>([]);
  const [isPending, startTransition] = useTransition();

  const toggle = (id: string) => {
    setSelected((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= MAX_COMPARE_ITEMS) {
        toast({
          title: "Up to 4 deals",
          description: "You can compare up to 4 deals at a time.",
        });
        return prev;
      }
      return [...prev, id];
    });
  };

  const canCompare = selected.length >= 2;

  const onCompare = () => {
    if (!canCompare || isPending) return;
    startTransition(async () => {
      const result = await startCompareAction(selected);
      if (result.ok) {
        // Cookie is now set server-side; re-run the page's server component so
        // it reads the new selection and renders the comparison in place.
        router.refresh();
      } else {
        toast({
          title: "Could not start comparison",
          description: result.message,
          variant: "destructive",
        });
      }
    });
  };

  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-5">
      <ul className="space-y-2">
        {deals.map((deal) => {
          const isSel = selected.includes(deal.id);
          return (
            <li key={deal.id}>
              <button
                type="button"
                onClick={() => toggle(deal.id)}
                aria-pressed={isSel}
                className={cn(
                  "flex w-full items-center gap-3 rounded-xl border p-3 text-left transition",
                  isSel
                    ? "border-primary bg-primary/5 ring-1 ring-primary/30"
                    : "border-border bg-background hover:border-primary/40"
                )}
              >
                <span
                  className={cn(
                    "flex size-5 shrink-0 items-center justify-center rounded-md border",
                    isSel
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-muted-foreground/40"
                  )}
                >
                  {isSel ? <Check className="size-3.5" /> : null}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold text-foreground">
                    {deal.label}
                  </span>
                  <span className="mt-0.5 block text-xs text-muted-foreground">
                    {fmtMoney(deal.netCashFlow)} · {fmtPct(deal.capRate)}
                    {deal.signal ? ` · ${deal.signal}` : ""}
                  </span>
                </span>
                {deal.score != null ? (
                  <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-xs font-bold text-foreground">
                    {Math.round(deal.score)}
                  </span>
                ) : null}
              </button>
            </li>
          );
        })}
      </ul>

      <div className="mt-4 flex items-center justify-between gap-3">
        <p className="text-xs text-muted-foreground">
          {selected.length} of {MAX_COMPARE_ITEMS} selected
          {selected.length < 2 ? " - pick at least 2" : ""}
        </p>
        <button
          type="button"
          onClick={onCompare}
          disabled={!canCompare || isPending}
          className="inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition disabled:opacity-40"
        >
          {isPending ? <Loader2 className="size-4 animate-spin" /> : null}
          {canCompare ? `Compare ${selected.length} deals` : "Compare"}
          {!isPending ? <ArrowRight className="size-4" /> : null}
        </button>
      </div>
    </div>
  );
}
