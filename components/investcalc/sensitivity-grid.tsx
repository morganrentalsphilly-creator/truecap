"use client";

/**
 * Sensitivity grid - visualizes how cash flow, cap rate, CoC, and DSCR
 * change when rent / vacancy / interest rate move from the entered base.
 *
 * Self-contained, additive to the analysis dashboard. Reads the current
 * form values, runs the existing calc in mutated scenarios, renders a
 * 3-row grid. Does not modify form state.
 *
 * Blueprint (2026-10): one card, a heading on a 1px line, the three axes
 * as rows on soft lines, every figure in the figure face. No inner box.
 */

import { useMemo } from "react";
import { cn } from "@/lib/utils";
import { InvestmentFormValues } from "@/lib/investcalc-schema";
import {
  buildSensitivityReport,
  type SensitivityRow,
} from "@/lib/sensitivity-analysis";
import { AnalysisResult } from "@/lib/calc-analysis";
import { NO_DEBT_SERVICE_DSCR_LABEL } from "@/lib/financial-presentation";

interface SensitivityGridProps {
  values: InvestmentFormValues | null;
}

const fmtCash = (n: number) =>
  `${n >= 0 ? "" : "-"}$${Math.round(Math.abs(n)).toLocaleString("en-US")}`;
const fmtPct = (n: number) => `${n >= 0 ? "+" : ""}${n.toFixed(1)}%`;

function pickColor(scenarioName: string, baseRefValue: number, value: number) {
  if (scenarioName === "Base") return "text-foreground";
  // Better than base is green; worse is red (the Sign rule: a pass or a
  // miss against the base, never emphasis).
  const better = value >= baseRefValue;
  return better ? "text-positive" : "text-negative";
}

/** Non-color cue (▲ better / ▼ worse than base) so the direction survives
 *  color-blindness and grayscale print. Empty for the Base column. */
function pickGlyph(scenarioName: string, baseRefValue: number, value: number): string {
  if (scenarioName === "Base") return "";
  return value >= baseRefValue ? "▲" : "▼";
}

function ScenarioCell({
  result,
  baseResult,
  scenarioName,
}: {
  result: AnalysisResult;
  baseResult: AnalysisResult;
  scenarioName: string;
}) {
  // Cash purchases have no debt service - DSCR is N/A. Show "no debt"
  // rather than a misleading "DSCR 0.00" in every cell.
  const isCashPurchase = result.monthlyPayment <= 0;
  return (
    <div className="space-y-0.5">
      <div className={cn("font-figure text-sm font-semibold", pickColor(scenarioName, baseResult.netCashFlow, result.netCashFlow))}>
        {pickGlyph(scenarioName, baseResult.netCashFlow, result.netCashFlow) ? (
          <span aria-hidden="true" className="mr-0.5">
            {pickGlyph(scenarioName, baseResult.netCashFlow, result.netCashFlow)}
          </span>
        ) : null}
        {fmtCash(result.netCashFlow)}/mo
      </div>
      <div className="font-figure text-2xs text-muted-foreground">
        <span className={cn(pickColor(scenarioName, baseResult.capRate, result.capRate))}>
          {fmtPct(result.capRate)} cap
        </span>{" "}
        ·{" "}
        <span
          className={cn(
            result.totalCashRequired > 0
              ? pickColor(scenarioName, baseResult.cocReturn, result.cocReturn)
              : "text-muted-foreground"
          )}
        >
          {result.totalCashRequired > 0 ? `${fmtPct(result.cocReturn)} CoC` : "CoC N/A"}
        </span>{" "}
        ·{" "}
        {isCashPurchase ? (
          <span className="text-muted-foreground">
            DSCR {NO_DEBT_SERVICE_DSCR_LABEL}
          </span>
        ) : (
          <span className={cn(pickColor(scenarioName, baseResult.dscr, result.dscr))}>
            DSCR {result.dscr.toFixed(2)}
          </span>
        )}
      </div>
    </div>
  );
}

function Row({ row }: { row: SensitivityRow }) {
  const base = row.scenarios.find((s) => s.name === "Base")!;
  return (
    <div className="py-3">
      {/* Mobile: stacked label header + 1-col scenarios; sm+: 4-col grid */}
      <div className="sm:hidden">
        <div className="mb-2 text-xs font-medium text-muted-foreground">
          {row.label}
        </div>
        <div className="space-y-2.5">
          {row.scenarios.map((s) => (
            <div key={s.name} className="flex items-start justify-between gap-3">
              <div className="shrink-0 min-w-[88px]">
                <div className="text-xs font-semibold text-muted-foreground">
                  {s.name}
                </div>
                <div className="font-figure text-2xs text-muted-foreground">{s.deltaLabel}</div>
              </div>
              <div className="flex-1 min-w-0 text-right">
                <ScenarioCell result={s.result} baseResult={base.result} scenarioName={s.name} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* sm+: original 4-col grid */}
      <div className="hidden sm:grid grid-cols-4 gap-4 items-start">
        <div>
          <div className="text-xs font-medium text-muted-foreground">
            {row.label}
          </div>
          <div className="mt-0.5 text-2xs text-muted-foreground">±change</div>
        </div>
        {row.scenarios.map((s) => (
          <div key={s.name}>
            <div className="mb-1 text-xs font-semibold text-muted-foreground">
              {s.name} · <span className="font-figure font-normal text-muted-foreground">{s.deltaLabel}</span>
            </div>
            <ScenarioCell result={s.result} baseResult={base.result} scenarioName={s.name} />
          </div>
        ))}
      </div>
    </div>
  );
}

export function SensitivityGrid({ values }: SensitivityGridProps) {
  const report = useMemo(() => {
    if (!values) return null;
    return buildSensitivityReport(values);
  }, [values]);

  return (
    <div className="rounded-lg border border-border bg-card p-5 shadow-sm sm:p-6">
      <div className="border-b border-border pb-3">
        <p className="text-sm font-semibold text-foreground">
          Sensitivity analysis
        </p>
        <p className="mt-0.5 text-sm text-muted-foreground">
          How the deal holds up if rent comes in lower, vacancy spikes, or rates
          move 1pp against you. The base column is what you entered.
        </p>
      </div>

      {report ? (
        <div className="divide-y divide-rule-soft">
          {report.map((row) => (
            <Row key={row.axis} row={row} />
          ))}
        </div>
      ) : (
        <div className="pt-3 text-xs text-muted-foreground">
          Enter purchase price, rent, and financing to see sensitivity.
        </div>
      )}
    </div>
  );
}
