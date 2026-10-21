"use client";

/**
 * "What moves this deal" - a tornado-style readout of which assumptions most
 * swing monthly cash flow (and DSCR). Helps a user focus diligence on the
 * inputs that actually matter for THIS deal. Self-contained; reuses
 * computeAssumptionImpact (calc-analysis under the hood).
 *
 * Blueprint (2026-10): a heading on a 1px line and six rows on soft lines,
 * each with its swing in the figure face and a graphite bar, inside the
 * "Risks" section rather than a card of its own.
 */
import { useMemo } from "react";
import { InvestmentFormValues } from "@/lib/investcalc-schema";
import { computeAssumptionImpact } from "@/lib/assumption-impact";

const money = (n: number) => `$${Math.round(n).toLocaleString("en-US")}`;

export function AssumptionImpactCard({ values }: { values: InvestmentFormValues | null }) {
  const drivers = useMemo(() => (values ? computeAssumptionImpact(values) : []), [values]);

  if (!values || drivers.length === 0) return null;

  const max = drivers[0].cashFlowSwing || 1;
  const top = drivers.slice(0, 6);

  return (
    <div>
      <div className="border-b border-border pb-2">
        <p className="text-sm font-semibold text-foreground">What moves this deal</p>
        <p className="mt-0.5 text-sm text-muted-foreground">
          How monthly cash flow changes when each assumption moves. Use the
          largest swings for stress testing.
        </p>
      </div>

      <ul className="divide-y divide-rule-soft">
        {top.map((d) => {
          const widthPct = Math.max(4, Math.round((d.cashFlowSwing / max) * 100));
          return (
            <li key={d.key} className="py-2">
              <div className="mb-1 flex items-center justify-between gap-3 text-xs">
                <span className="font-medium text-foreground">
                  {d.label}{" "}
                  <span className="font-figure font-normal text-muted-foreground">{d.deltaLabel}</span>
                </span>
                <span className="font-figure font-semibold text-foreground">
                  ±{money(d.cashFlowSwing / 2)}/mo
                  {d.dscrSwing >= 0.01 ? (
                    <span className="font-normal text-muted-foreground"> · ±{(d.dscrSwing / 2).toFixed(2)} DSCR</span>
                  ) : null}
                </span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-sm bg-band">
                <div className="h-full rounded-sm bg-foreground/70" style={{ width: `${widthPct}%` }} />
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
