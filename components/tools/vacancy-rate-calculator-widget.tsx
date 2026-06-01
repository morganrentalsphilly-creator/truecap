"use client";

/**
 * Standalone vacancy rate calculator widget.
 *
 * Computes effective vacancy rate from annual vacant days OR from a
 * monthly basis. Also reverses the math to show the rent loss in dollars.
 * Vacancy is one of the most under-modeled line items in rental pro
 * formas — most sellers quote 5% but the honest national average runs
 * 7-9%.
 */

import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const num = (s: string) => {
  const n = Number(s);
  return Number.isFinite(n) ? n : 0;
};

const fmtMoney = (n: number) =>
  `${n < 0 ? "-" : ""}$${Math.abs(Math.round(n)).toLocaleString("en-US")}`;
const fmtPct = (n: number) => `${n.toFixed(2)}%`;

export function VacancyRateCalculatorWidget() {
  const [monthlyRent, setMonthlyRent] = useState("1500");
  const [vacantDays, setVacantDays] = useState("21");
  const [turnoverCost, setTurnoverCost] = useState("400");

  const result = useMemo(() => {
    const rent = num(monthlyRent);
    const days = num(vacantDays);
    const turnover = num(turnoverCost);
    const annualRent = rent * 12;
    const dailyRent = annualRent / 365;
    const lostRent = dailyRent * days;
    const totalLoss = lostRent + turnover;
    const vacancyPct = annualRent > 0 ? (totalLoss / annualRent) * 100 : 0;
    const effectiveAnnualRent = annualRent - totalLoss;
    return {
      annualRent,
      lostRent,
      turnover,
      totalLoss,
      vacancyPct,
      effectiveAnnualRent,
    };
  }, [monthlyRent, vacantDays, turnoverCost]);

  const verdict =
    result.vacancyPct < 5
      ? "Aggressive (low)"
      : result.vacancyPct < 8
      ? "Realistic"
      : result.vacancyPct < 12
      ? "Conservative"
      : "Distressed";
  const verdictColor =
    result.vacancyPct < 5
      ? "text-amber-600"
      : result.vacancyPct < 12
      ? "text-[var(--metric-positive)]"
      : "text-[var(--metric-negative)]";

  return (
    <div className="rounded-2xl border border-border bg-card p-5 sm:p-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <Label
            htmlFor="vr-rent"
            className="text-xs font-bold uppercase tracking-widest text-muted-foreground"
          >
            Monthly rent
          </Label>
          <div className="mt-1 relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
              $
            </span>
            <Input
              id="vr-rent"
              type="number"
              inputMode="decimal"
              min="0"
              value={monthlyRent}
              onChange={(e) => setMonthlyRent(e.target.value)}
              className="pl-7"
            />
          </div>
        </div>
        <div>
          <Label
            htmlFor="vr-days"
            className="text-xs font-bold uppercase tracking-widest text-muted-foreground"
          >
            Vacant days / year
          </Label>
          <Input
            id="vr-days"
            type="number"
            inputMode="decimal"
            min="0"
            value={vacantDays}
            onChange={(e) => setVacantDays(e.target.value)}
            className="mt-1"
          />
        </div>
      </div>

      <div className="mt-4">
        <Label
          htmlFor="vr-turn"
          className="text-xs text-muted-foreground"
        >
          Turnover cost (cleaning, repairs, listing fees)
        </Label>
        <div className="mt-1 relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
            $
          </span>
          <Input
            id="vr-turn"
            type="number"
            inputMode="decimal"
            min="0"
            value={turnoverCost}
            onChange={(e) => setTurnoverCost(e.target.value)}
            className="pl-7"
          />
        </div>
      </div>

      <div className="mt-6 rounded-xl border border-border bg-muted/30 p-5">
        <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
          Effective vacancy rate
        </p>
        <p
          className={cn(
            "mt-1 text-4xl font-extrabold tabular-nums",
            verdictColor
          )}
        >
          {fmtPct(result.vacancyPct)}
        </p>
        <p className="mt-1 text-sm text-muted-foreground tabular-nums">
          {fmtMoney(result.totalLoss)} lost per year ·{" "}
          <span className={cn("font-semibold", verdictColor)}>
            {verdict}
          </span>
        </p>
        <details className="mt-3 group">
          <summary className="cursor-pointer text-xs font-semibold text-muted-foreground hover:text-foreground">
            Breakdown
          </summary>
          <ul className="mt-2 space-y-1 text-xs text-muted-foreground tabular-nums">
            <li className="flex justify-between">
              <span>Annual gross rent</span>
              <span>{fmtMoney(result.annualRent)}</span>
            </li>
            <li className="flex justify-between">
              <span>Lost rent (vacant days)</span>
              <span>{fmtMoney(result.lostRent)}</span>
            </li>
            <li className="flex justify-between">
              <span>Turnover cost</span>
              <span>{fmtMoney(result.turnover)}</span>
            </li>
            <li className="flex justify-between border-t border-border pt-1 mt-1 font-semibold text-foreground">
              <span>Effective annual rent</span>
              <span>{fmtMoney(result.effectiveAnnualRent)}</span>
            </li>
          </ul>
        </details>
      </div>

      <p className="mt-4 text-xs text-muted-foreground leading-relaxed">
        National average vacancy on long-term residential rentals runs
        7-9%. Sellers and listing brochures typically quote 5%. Anything
        under 5% is aggressive — adjust your offer accordingly.
      </p>
    </div>
  );
}
