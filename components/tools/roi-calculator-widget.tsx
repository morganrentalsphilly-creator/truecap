"use client";

/**
 * Standalone rental property ROI calculator widget.
 *
 *   Total ROI = (Annual cash flow + Annual principal paydown + Annual
 *                appreciation) ÷ Total cash invested
 *
 * Combines three modeled return components. It remains an estimate from the
 * values entered here, not a recommendation or a market benchmark.
 */

import { useMemo, useState } from "react";
import { AnalyzerHandoffLink } from "@/components/analyzer-handoff-link";
import { ArrowUpRight, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { buildAnalyzerHandoffUrl } from "@/lib/analyzer-handoff";
import { ToolNumberField } from "@/components/tools/tool-number-field";
import { validateToolNumber } from "@/lib/public-tool-validation";

const fmtMoney = (n: number) =>
  `${n < 0 ? "-" : ""}$${Math.abs(Math.round(n)).toLocaleString("en-US")}`;
const fmtPct = (n: number) => `${n.toFixed(2)}%`;

function classify(roi: number): { label: string; color: string; note: string } {
  if (roi < 0) {
    return {
      label: "Negative modeled ROI",
      color: "text-[var(--metric-negative)]",
      note: "The entered return components total less than zero. Review each assumption before relying on the result.",
    };
  }
  if (roi < 4) {
    return {
      label: "Modeled ROI below 4%",
      color: "text-amber-700",
      note: "This is the combined modeled return from cash flow, principal paydown, and appreciation entered above.",
    };
  }
  if (roi < 8) {
    return {
      label: "Modeled ROI from 4% to 8%",
      color: "text-foreground",
      note: "Compare the result with your own targets, risks, and alternative uses of capital.",
    };
  }
  if (roi < 12) {
    return {
      label: "Modeled ROI from 8% to 12%",
      color: "text-foreground",
      note: "Verify rent, expenses, financing, and appreciation before treating the estimate as decision-ready.",
    };
  }
  if (roi < 18) {
    return {
      label: "Modeled ROI from 12% to 18%",
      color: "text-[var(--metric-positive)]",
      note: "A higher modeled return can reflect leverage or optimistic assumptions; review the components below.",
    };
  }
  return {
    label: "Modeled ROI of 18% or more — verify",
    color: "text-[var(--metric-positive)]",
    note: "Stress-test the assumptions behind this result, especially appreciation, cash flow, and cash invested.",
  };
}

export function RoiCalculatorWidget() {
  const [purchasePrice, setPurchasePrice] = useState("300000");
  const [cashInvested, setCashInvested] = useState("75000");
  const [annualCashFlow, setAnnualCashFlow] = useState("5400");
  const [annualPrincipalPaydown, setAnnualPrincipalPaydown] = useState("3200");
  const [appreciationRate, setAppreciationRate] = useState("3.5");

  const validated = useMemo(
    () => ({
      purchasePrice: validateToolNumber(purchasePrice, {
        label: "Purchase price",
        min: 0,
        minExclusive: true,
        max: 100_000_000,
      }),
      cashInvested: validateToolNumber(cashInvested, {
        label: "Total cash invested",
        min: 0,
        minExclusive: true,
        max: 100_000_000,
      }),
      annualCashFlow: validateToolNumber(annualCashFlow, {
        label: "Annual cash flow",
        min: -100_000_000,
        max: 100_000_000,
      }),
      annualPrincipalPaydown: validateToolNumber(annualPrincipalPaydown, {
        label: "Annual principal paydown",
        min: 0,
        max: 100_000_000,
      }),
      appreciationRate: validateToolNumber(appreciationRate, {
        label: "Appreciation rate",
        min: -100,
        max: 100,
      }),
    }),
    [
      annualCashFlow,
      annualPrincipalPaydown,
      appreciationRate,
      cashInvested,
      purchasePrice,
    ],
  );

  const result = useMemo(() => {
    if (
      !validated.purchasePrice.ok ||
      !validated.cashInvested.ok ||
      !validated.annualCashFlow.ok ||
      !validated.annualPrincipalPaydown.ok ||
      !validated.appreciationRate.ok
    ) {
      return null;
    }
    const cash = validated.cashInvested.value;
    const cf = validated.annualCashFlow.value;
    const principal = validated.annualPrincipalPaydown.value;
    const apprPctInput = validated.appreciationRate.value;
    const apprAmt = (validated.purchasePrice.value * apprPctInput) / 100;
    const totalReturn = cf + principal + apprAmt;
    return {
      totalReturn,
      roi: (totalReturn / cash) * 100,
      cashFlowPct: (cf / cash) * 100,
      principalPct: (principal / cash) * 100,
      apprPct: (apprAmt / cash) * 100,
      apprAmt,
    };
  }, [validated]);

  const verdict = result ? classify(result.roi) : null;

  // Carry the user's purchase price into the full analyzer (P2-2 handoff).
  // This widget collects an annual cash-flow figure, not a monthly rent, so
  // only the purchase price maps cleanly onto the analyzer's inputs.
  const handoffHref = buildAnalyzerHandoffUrl(
    validated.purchasePrice.ok
      ? { purchasePrice: validated.purchasePrice.value }
      : {},
    { utmSource: "roi-calculator" },
  );

  return (
    <div className="rounded-2xl border border-border bg-card p-5 sm:p-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <ToolNumberField
          id="roi-price"
          label="Purchase price"
          prefix="$"
          min={0.01}
          max={100_000_000}
          value={purchasePrice}
          onChange={(e) => setPurchasePrice(e.target.value)}
          error={validated.purchasePrice.error}
        />
        <ToolNumberField
          id="roi-cash"
          label="Total cash invested"
          prefix="$"
          min={0.01}
          max={100_000_000}
          value={cashInvested}
          onChange={(e) => setCashInvested(e.target.value)}
          error={validated.cashInvested.error}
        />
        <ToolNumberField
          id="roi-cf"
          label="Annual cash flow"
          prefix="$"
          min={-100_000_000}
          max={100_000_000}
          value={annualCashFlow}
          onChange={(e) => setAnnualCashFlow(e.target.value)}
          error={validated.annualCashFlow.error}
        />
        <ToolNumberField
          id="roi-principal"
          label="Annual principal paydown"
          prefix="$"
          min={0}
          max={100_000_000}
          value={annualPrincipalPaydown}
          onChange={(e) => setAnnualPrincipalPaydown(e.target.value)}
          error={validated.annualPrincipalPaydown.error}
        />
        <ToolNumberField
          id="roi-appr"
          label="Appreciation rate (%/yr)"
          suffix="%"
          min={-100}
          max={100}
          step={0.1}
          value={appreciationRate}
          onChange={(e) => setAppreciationRate(e.target.value)}
          error={validated.appreciationRate.error}
          hint="Use a property- and market-specific assumption. Negative values model depreciation."
          className="sm:col-span-2"
        />
      </div>

      <div className="mt-6 rounded-xl border border-border bg-muted/30 p-5">
        <span
          className="sr-only"
          role="status"
          aria-live="polite"
          aria-atomic="true"
        >
          {result && verdict
            ? `${verdict.label}. Total modeled ROI ${fmtPct(result.roi)}. Annual modeled return ${fmtMoney(result.totalReturn)}.`
            : "Fix the highlighted inputs to calculate total modeled ROI."}
        </span>
        <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
          Total ROI
        </p>
        <p
          className={cn(
            "mt-1 text-4xl font-extrabold tabular-nums",
            verdict?.color ?? "text-muted-foreground",
          )}
        >
          {result ? fmtPct(result.roi) : "—"}
        </p>
        <p className="mt-1 text-sm text-muted-foreground tabular-nums">
          {result
            ? `${fmtMoney(result.totalReturn)} annual modeled return on cash invested`
            : "Fix the highlighted inputs to calculate"}
        </p>
        <div className="mt-4 grid grid-cols-3 gap-3 text-[11px]">
          <div>
            <p className="font-bold uppercase tracking-widest text-muted-foreground">
              Cash flow
            </p>
            <p className="mt-1 text-base font-bold text-foreground tabular-nums">
              {result ? fmtPct(result.cashFlowPct) : "—"}
            </p>
          </div>
          <div>
            <p className="font-bold uppercase tracking-widest text-muted-foreground">
              Principal
            </p>
            <p className="mt-1 text-base font-bold text-foreground tabular-nums">
              {result ? fmtPct(result.principalPct) : "—"}
            </p>
          </div>
          <div>
            <p className="font-bold uppercase tracking-widest text-muted-foreground">
              Appreciation
            </p>
            <p className="mt-1 text-base font-bold text-foreground tabular-nums">
              {result ? fmtPct(result.apprPct) : "—"}
            </p>
          </div>
        </div>
        {verdict ? (
          <p className="mt-4 text-sm">
            <span className={cn("font-bold", verdict.color)}>
              {verdict.label}.
            </span>{" "}
            <span className="text-muted-foreground">{verdict.note}</span>
          </p>
        ) : null}
      </div>

      <AnalyzerHandoffLink
        handoffHref={handoffHref}
        target="_top"
        className="mt-6 inline-flex min-h-11 items-center gap-2 rounded-md text-sm font-bold text-primary hover:underline"
      >
        <Sparkles className="w-4 h-4" />
        Run the free core analysis; projections appear when your access includes
        them
        <ArrowUpRight className="w-4 h-4" />
      </AnalyzerHandoffLink>
    </div>
  );
}
