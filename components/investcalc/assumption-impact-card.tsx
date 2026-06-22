"use client";

/**
 * "What moves this deal" — a tornado-style readout of which assumptions most
 * swing monthly cash flow (and DSCR). Helps a user focus diligence on the
 * inputs that actually matter for THIS deal. Self-contained; reuses
 * computeAssumptionImpact (calc-analysis under the hood).
 */
import { useMemo } from "react";
import { Activity } from "lucide-react";
import { InvestmentFormValues } from "@/lib/investcalc-schema";
import { computeAssumptionImpact } from "@/lib/assumption-impact";
import { assumptionMeta, CONFIDENCE_LABEL } from "@/lib/assumption-confidence";

const money = (n: number) => `$${Math.round(n).toLocaleString("en-US")}`;

export function AssumptionImpactCard({ values }: { values: InvestmentFormValues | null }) {
  const drivers = useMemo(() => (values ? computeAssumptionImpact(values) : []), [values]);

  if (!values || drivers.length === 0) return null;

  const max = drivers[0].cashFlowSwing || 1;
  const top = drivers.slice(0, 6);

  return (
    <div className="bg-card rounded-2xl border border-border shadow-sm p-5 sm:p-6">
      <div className="flex items-center gap-2 mb-1.5">
        <Activity className="w-4 h-4 text-primary" />
        <span className="font-semibold text-sm text-foreground">What moves this deal</span>
      </div>
      <p className="text-xs text-muted-foreground mb-4">
        How much monthly cash flow swings when each assumption moves — plus where each number comes from
        and how confident it is. Verify the top, lowest-confidence ones first.
      </p>

      <div className="space-y-2.5">
        {top.map((d) => {
          const widthPct = Math.max(4, Math.round((d.cashFlowSwing / max) * 100));
          const meta = assumptionMeta(d.key);
          return (
            <div key={d.key}>
              <div className="mb-1 flex items-center justify-between text-xs">
                <span className="font-medium text-foreground">
                  {d.label} <span className="font-normal text-muted-foreground">{d.deltaLabel}</span>
                </span>
                <span className="font-semibold text-foreground">
                  ±{money(d.cashFlowSwing / 2)}/mo
                  {d.dscrSwing >= 0.01 ? (
                    <span className="font-normal text-muted-foreground"> · ±{(d.dscrSwing / 2).toFixed(2)} DSCR</span>
                  ) : null}
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-muted">
                <div className="h-full rounded-full bg-primary" style={{ width: `${widthPct}%` }} />
              </div>
              {meta ? (
                <div className="mt-1 flex items-center gap-1.5 text-[11px] text-muted-foreground">
                  <span
                    aria-hidden
                    className={`inline-block size-1.5 shrink-0 rounded-full ${
                      meta.confidence === "high"
                        ? "bg-emerald-500"
                        : meta.confidence === "medium"
                          ? "bg-amber-500"
                          : "bg-red-500"
                    }`}
                  />
                  <span className="truncate" title={`${CONFIDENCE_LABEL[meta.confidence]} — ${meta.verify}`}>
                    {meta.source} · {CONFIDENCE_LABEL[meta.confidence]}
                  </span>
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
