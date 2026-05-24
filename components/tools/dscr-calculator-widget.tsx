"use client";

/**
 * Standalone DSCR (Debt Service Coverage Ratio) calculator widget for
 * the /tools/dscr-calculator public page. Self-contained; computes
 * DSCR inline as the user types and classifies the result against
 * standard lender thresholds.
 */

import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const num = (s: string): number => {
  const n = Number(s);
  return Number.isFinite(n) ? n : 0;
};

const fmtMoney = (n: number) =>
  `${n < 0 ? "-" : ""}$${Math.abs(Math.round(n)).toLocaleString("en-US")}`;

function classify(dscr: number): { label: string; color: string; note: string } {
  if (dscr <= 0)
    return {
      label: "No coverage",
      color: "text-[var(--metric-negative)]",
      note: "NOI is zero or negative — the property doesn't cover any debt.",
    };
  if (dscr < 1.0)
    return {
      label: "Underwater",
      color: "text-[var(--metric-negative)]",
      note: "Operating income doesn't cover the mortgage. Owner subsidizes monthly.",
    };
  if (dscr < 1.15)
    return {
      label: "Tight",
      color: "text-[var(--metric-negative)]",
      note: "Above break-even but below most lender thresholds.",
    };
  if (dscr < 1.25)
    return {
      label: "Marginal",
      color: "text-foreground",
      note: "Acceptable for some products; most conventional lenders want ≥1.25.",
    };
  if (dscr < 1.5)
    return {
      label: "Bankable",
      color: "text-[var(--metric-positive)]",
      note: "Clears the typical ≥1.25 conventional / DSCR-loan threshold.",
    };
  return {
    label: "Strong",
    color: "text-[var(--metric-positive)]",
    note: "Well above lender minimums — the property comfortably covers debt.",
  };
}

export function DscrCalculatorWidget() {
  const [noiInput, setNoiInput] = useState("28000");
  const [debtInput, setDebtInput] = useState("21500");

  const result = useMemo(() => {
    const noi = num(noiInput);
    const debt = num(debtInput);
    const dscr = debt > 0 ? noi / debt : 0;
    const monthly = debt > 0 ? noi / 12 - debt / 12 : 0;
    return { noi, debt, dscr, monthly };
  }, [noiInput, debtInput]);

  const c = classify(result.dscr);

  return (
    <div className="bg-card rounded-2xl border border-border shadow-sm p-5 sm:p-7">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
        {/* Inputs */}
        <div className="space-y-4">
          <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground">
            DSCR Calculator
          </h2>

          <div>
            <Label className="text-sm font-medium text-foreground mb-1.5 block">
              Annual NOI (Net Operating Income)
            </Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">$</span>
              <Input
                type="number"
                inputMode="numeric"
                value={noiInput}
                onChange={(e) => setNoiInput(e.target.value)}
                placeholder="28000"
                className="pl-7 border-input bg-background text-base"
              />
            </div>
            <p className="text-xs text-muted-foreground mt-1.5">
              Gross rent minus all operating expenses. Excludes mortgage P&amp;I.
            </p>
          </div>

          <div>
            <Label className="text-sm font-medium text-foreground mb-1.5 block">
              Annual Debt Service
            </Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">$</span>
              <Input
                type="number"
                inputMode="numeric"
                value={debtInput}
                onChange={(e) => setDebtInput(e.target.value)}
                placeholder="21500"
                className="pl-7 border-input bg-background text-base"
              />
            </div>
            <p className="text-xs text-muted-foreground mt-1.5">
              Mortgage principal &amp; interest, annualized (monthly P&amp;I × 12).
            </p>
          </div>
        </div>

        {/* Output */}
        <div className="bg-[var(--background)] rounded-xl border border-border p-5 sm:p-6 flex flex-col justify-between">
          <div>
            <div className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
              DSCR
            </div>
            <div className={cn("text-5xl sm:text-6xl font-black mt-1 tabular-nums", c.color)}>
              {result.dscr.toFixed(2)}
            </div>
            <div className={cn("text-sm font-semibold mt-1", c.color)}>{c.label}</div>
            <p className="text-xs text-muted-foreground mt-1">{c.note}</p>
          </div>

          <div className="mt-5 pt-5 border-t border-border space-y-1.5 text-xs">
            <Row label="Annual NOI" value={fmtMoney(result.noi)} />
            <Row label="Annual debt service" value={fmtMoney(result.debt)} />
            <Row label="Monthly cushion (NOI − debt)" value={`${fmtMoney(result.monthly)}/mo`} bold />
          </div>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className="flex justify-between gap-2">
      <span className="text-muted-foreground">{label}</span>
      <span className={cn("tabular-nums", bold ? "font-bold text-foreground" : "text-foreground")}>
        {value}
      </span>
    </div>
  );
}
