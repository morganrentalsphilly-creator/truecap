"use client";

/**
 * "What decides this deal" - a single, prominent, plain-English insight that
 * names the ONE assumption the deal is most sensitive to, and which direction
 * is the risk. The full ranked tornado lives in the Cash Flow tab's
 * AssumptionImpactCard; this elevates only its #1 finding to a headline next
 * to the verdict, where every user sees it - the thing that makes a beginner
 * feel the tool is smarter than them.
 *
 * Pure presentation over computeAssumptionImpact (the same engine as the
 * tornado card), so the numbers always agree. Self-gates: renders nothing
 * until there's a result with a measurable top driver.
 */
import { useMemo } from "react";
import { Crosshair } from "lucide-react";
import type { InvestmentFormValues } from "@/lib/investcalc-schema";
import type { AnalysisResult } from "@/lib/calc-analysis";
import { computeAssumptionImpact } from "@/lib/assumption-impact";

/** Per-driver, risk-directional one-liner. Keyed to computeAssumptionImpact keys. */
const DRIVER_ADVICE: Record<string, { noun: string; risk: string }> = {
  rent: {
    noun: "rent",
    risk: "If rent comes in below your estimate, cash flow erodes fast — confirm it against real comps before recording a decision.",
  },
  interestRate: {
    noun: "your interest rate",
    risk: "A rate higher than quoted eats your margin quickest — get a real lender quote and lock it.",
  },
  purchasePrice: {
    noun: "your purchase price",
    risk: "Overpaying hurts here more than anything — the modeled purchase-price assumption is the lever you control most.",
  },
  vacancyPct: {
    noun: "vacancy",
    risk: "A longer-than-planned vacancy is the biggest threat — pad this assumption for the local market.",
  },
  mgmtPct: {
    noun: "management cost",
    risk: "If management runs higher than assumed, it bites hardest — verify your property manager's rate.",
  },
  maintenancePct: {
    noun: "maintenance",
    risk: "Under-budgeting maintenance hits this deal hardest — older homes need a bigger reserve.",
  },
  capexPct: {
    noun: "CapEx reserves",
    risk: "Big-ticket replacements swing this deal most — make sure your reserve covers roof/HVAC/etc.",
  },
  propertyTaxPct: {
    noun: "property tax",
    risk: "A reassessment after purchase moves this deal most — check the post-sale assessed value.",
  },
};

export function DealDriverInsight({
  values,
  result,
  marketRentEstimate,
}: {
  values: InvestmentFormValues | null;
  result: AnalysisResult | null;
  /** HUD area rent benchmark — turns the rent advice into a concrete check. */
  marketRentEstimate?: number | null;
}) {
  const drivers = useMemo(
    () => (values ? computeAssumptionImpact(values) : []),
    [values]
  );

  if (!values || !result) return null;
  const top = drivers[0];
  if (!top) return null;
  // cashFlowSwing is the full +/- range; halve it for the "± per move" figure.
  const swing = Math.round(top.cashFlowSwing / 2);
  if (swing < 1) return null;

  const advice = DRIVER_ADVICE[top.key];
  const noun = advice?.noun ?? top.label.toLowerCase();

  // Concrete rent reality-check vs the HUD area benchmark — only for the rent
  // driver, single-family, and only when we actually fetched a benchmark for
  // this address. Turns "verify your rent" into a ground-truth comparison.
  const enteredRent =
    values.propertyType === "single-family" && typeof values.monthlyRent === "number"
      ? Math.round(values.monthlyRent)
      : null;
  const market =
    typeof marketRentEstimate === "number" && marketRentEstimate > 0
      ? Math.round(marketRentEstimate)
      : null;
  const rentDiffPct =
    top.key === "rent" && enteredRent != null && market != null
      ? Math.round(((enteredRent - market) / market) * 100)
      : null;

  return (
    // Neutral chrome (not the blue tint): the blue treatment is reserved
    // for the interactive what-if affordance so exactly one element pops.
    <div className="flex items-start gap-3 rounded-2xl border border-border bg-muted/30 p-4 sm:p-5">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-card text-primary">
        <Crosshair className="size-4" />
      </span>
      <div className="min-w-0 space-y-1">
        <p className="text-[10px] font-bold uppercase tracking-widest text-primary">
          What decides this deal
        </p>
        <p className="text-sm font-bold text-foreground">
          {top.label} is the swing factor — a {top.deltaLabel} move changes your monthly cash flow by{" "}
          <span className="text-primary">±${swing.toLocaleString()}</span>.
        </p>
        {rentDiffPct != null && market != null && enteredRent != null ? (
          <p className="text-xs leading-relaxed text-foreground/70">
            {Math.abs(rentDiffPct) < 4 ? (
              <>
                Your <strong className="text-foreground">${enteredRent.toLocaleString()}</strong> rent is in
                line with the <strong className="text-foreground">${market.toLocaleString()}</strong> HUD area
                estimate — a good sign it&apos;s achievable.
              </>
            ) : rentDiffPct > 0 ? (
              <>
                Your <strong className="text-foreground">${enteredRent.toLocaleString()}</strong> rent is{" "}
                <strong className="text-foreground">{rentDiffPct}% above</strong> the ${market.toLocaleString()}{" "}
                HUD area estimate — verify it against local evidence, or the screening result weakens fast.
              </>
            ) : (
              <>
                Your <strong className="text-foreground">${enteredRent.toLocaleString()}</strong> rent is{" "}
                <strong className="text-foreground">{Math.abs(rentDiffPct)}% below</strong> the $
                {market.toLocaleString()} HUD area estimate — you may be leaving upside on the table.
              </>
            )}
          </p>
        ) : advice ? (
          <p className="text-xs leading-relaxed text-foreground/70">{advice.risk}</p>
        ) : (
          <p className="text-xs leading-relaxed text-foreground/70">
            It&apos;s the assumption worth verifying first — small changes in {noun} move this deal more than anything else.
          </p>
        )}
      </div>
    </div>
  );
}
