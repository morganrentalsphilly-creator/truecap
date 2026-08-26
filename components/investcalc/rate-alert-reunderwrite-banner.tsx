"use client";

/**
 * Rate-alert deep-link banner for the deal workspace — shown only while a
 * valid `?rate=` param (from the rate-alert email's per-deal link) is present.
 * The page re-underwrites the deal at the alert's rate server-side
 * (lib/rate-alerts buildRateReUnderwrite — same calculateAnalysis-with-rate-
 * substituted math as the email) and this banner shows the delta with ONE
 * action: apply the rate to the saved deal via the existing update path
 * (saveDealAction with existingId — server-side auth + entitlement + address
 * guards all apply). Merely opening the link never mutates the deal; dismissal
 * is implicit — navigate anywhere (or apply) and the param, and banner, are gone.
 */
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Bell } from "lucide-react";
import { saveDealAction } from "@/app/actions/saved-analyses";
import { useToast } from "@/hooks/use-toast";
import type { InvestmentFormValues } from "@/lib/investcalc-schema";
import type { RateAlertMetrics } from "@/lib/rate-alerts";

const fmtMoney = (n: number) =>
  `${n < 0 ? "-" : ""}$${Math.abs(Math.round(n)).toLocaleString("en-US")}`;

/** "$412/mo → $538/mo" style delta cell. */
function Delta({ label, before, after }: { label: string; before: string; after: string }) {
  return (
    <span className="inline-flex items-baseline gap-1.5 whitespace-nowrap">
      <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
        {label}
      </span>
      <span className="text-sm tabular-nums text-muted-foreground">{before}</span>
      <span aria-hidden className="text-xs text-muted-foreground">
        →
      </span>
      <span className="text-sm font-semibold tabular-nums text-foreground">{after}</span>
    </span>
  );
}

export function RateAlertReUnderwriteBanner({
  savedDealId,
  values,
  underwritingRevision,
  savedRatePct,
  alertRatePct,
  before,
  after,
}: {
  savedDealId: string;
  /** Current-engine form values with the SAVED rate — the alert rate is
   *  substituted only when the user explicitly applies it. */
  values: InvestmentFormValues;
  /** OCC token read with the same saved form snapshot. */
  underwritingRevision: number;
  savedRatePct: number;
  alertRatePct: number;
  before: RateAlertMetrics;
  after: RateAlertMetrics;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [isApplying, startApplying] = useTransition();

  const handleApply = () => {
    startApplying(async () => {
      try {
        const result = await saveDealAction(
          { ...values, interestRate: alertRatePct },
          savedDealId,
          undefined,
          { expectedUnderwritingRevision: underwritingRevision }
        );
        if (!result.ok) {
          toast({
            title: "Could not apply the rate",
            description: result.message ?? "Please try again.",
            variant: "destructive",
          });
          return;
        }
        toast({
          title: "Rate applied",
          description: `This deal now underwrites at ${alertRatePct.toFixed(2)}%.`,
          variant: "success",
        });
        // Strip the ?rate= param (the banner's only mount condition) and
        // re-render the workspace from the just-updated snapshot.
        router.replace(`/dashboard/saved-analyses/${savedDealId}`, { scroll: false });
        router.refresh();
      } catch {
        // The action REJECTED rather than returning {ok:false} (network blip,
        // cold-start 500, stale-deploy Server Action). Without this the "Apply"
        // button clears its "Applying…" label with no signal and the saved deal
        // is untouched. Tell the user it's retryable — nothing was mutated.
        toast({
          title: "Could not apply the rate",
          description: "Something interrupted the request. Check your connection and try again.",
          variant: "destructive",
        });
      }
    });
  };

  return (
    <div className="flex items-start gap-3 rounded-2xl border border-primary/30 bg-primary/5 p-4">
      <Bell aria-hidden className="mt-0.5 size-5 shrink-0 text-primary" />
      <div className="min-w-0 flex-1">
        <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
          Rate alert preview
        </div>
        <div className="text-sm font-bold text-foreground">
          Viewing this deal at {alertRatePct.toFixed(2)}% — your saved rate is{" "}
          {savedRatePct.toFixed(2)}%
        </div>
        <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1.5">
          <Delta
            label="Cash flow"
            before={`${fmtMoney(before.monthlyCashFlow)}/mo`}
            after={`${fmtMoney(after.monthlyCashFlow)}/mo`}
          />
          <Delta label="DSCR" before={before.dscr.toFixed(2)} after={after.dscr.toFixed(2)} />
          {before.tier !== after.tier ? (
            <Delta label="Screening result" before={before.tier} after={after.tier} />
          ) : null}
        </div>
        <div className="mt-1 text-xs text-muted-foreground">
          Numbers above are a preview — the saved deal is unchanged until you apply the rate.
        </div>
      </div>
      <button
        type="button"
        onClick={handleApply}
        disabled={isApplying}
        className="shrink-0 self-center rounded-lg bg-primary px-2.5 py-1.5 text-xs font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-60"
      >
        {isApplying ? "Applying…" : "Apply this rate to the deal"}
      </button>
    </div>
  );
}
