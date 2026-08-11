"use client";

/**
 * "What price makes this deal work?" - the Max Allowable Offer surface.
 *
 * Answers two questions from the same targets:
 *   1. Forward - the HIGHEST price you should pay to still hit every target
 *      (cap rate, cash-on-cash, monthly cash flow, DSCR).
 *   2. Inverse - to make YOUR CURRENT price work, the rent or rate you'd need.
 *
 * Self-contained state - never touches the form. Reuses calculateAnalysis via
 * the solvers in lib/max-allowable-offer.ts so the math stays consistent.
 */

import { useEffect, useId, useMemo, useState, type ChangeEvent } from "react";
import { Target } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { InvestmentFormValues } from "@/lib/investcalc-schema";
import { calculateAnalysis } from "@/lib/calc-analysis";
import {
  calculateMaxAllowableOffer,
  solveRequiredMonthlyRent,
  solveRequiredInterestRate,
  type MaoTarget,
} from "@/lib/max-allowable-offer";
import { chooseMaoTargetFromBuyBox, type BuyBoxReturnThresholds } from "@/lib/mao-targets";

interface MaxOfferCardProps {
  values: InvestmentFormValues | null;
  /** The user's primary buy-box return thresholds (reported up by
   *  BuyBoxVerdictCard on the same surface). When set, they seed the
   *  solver targets — the user's criteria beat our canonical defaults
   *  (lib/mao-targets rule 2) — labeled "From your buy box". Absent/null
   *  = canonical default seeds. Every field stays user-editable. */
  buyBoxThresholds?: BuyBoxReturnThresholds | null;
}

const numberOrUndefined = (s: string): number | undefined => {
  if (s.trim() === "") return undefined;
  const n = Number(s);
  return Number.isFinite(n) ? n : undefined;
};

const money = (n: number) => `$${Math.round(n).toLocaleString("en-US")}`;

export function MaxOfferCard({ values, buyBoxThresholds }: MaxOfferCardProps) {
  // Cash purchases have no debt service: calc-analysis reports dscr 0, so a
  // DSCR floor could never pass. Omit that target at this call site (the
  // solver's documented contract) instead of showing "no price works".
  const isCashDeal = useMemo(() => {
    if (!values) return false;
    try {
      return calculateAnalysis(values).monthlyPayment <= 0;
    } catch {
      return false;
    }
  }, [values]);

  // Buy-box seed: when the user's box carries return thresholds, THOSE are
  // the initial targets (lib/mao-targets rule 2 — their criteria beat our
  // defaults). Null = seed the canonical basis instead.
  const seedTarget = useMemo(
    () => chooseMaoTargetFromBuyBox(buyBoxThresholds, { isCashPurchase: isCashDeal }),
    [buyBoxThresholds, isCashDeal]
  );

  // Initial targets = the buy-box seed when present, else the canonical MAO
  // basis (break-even cash flow + DSCR 1.25 — see lib/mao-targets, CONFLICT
  // #6) so the first number this solver shows equals the wholesale
  // StrategyOutcomeCard headline and the deal workspace's max-offer line.
  // Every field stays user-editable.
  const [capRateInput, setCapRateInput] = useState(() =>
    seedTarget?.capRate != null ? String(seedTarget.capRate) : ""
  );
  const [cocInput, setCocInput] = useState(() =>
    seedTarget?.cocReturn != null ? String(seedTarget.cocReturn) : ""
  );
  const [cashFlowInput, setCashFlowInput] = useState(() =>
    seedTarget ? (seedTarget.monthlyCashFlow != null ? String(seedTarget.monthlyCashFlow) : "") : "0"
  );
  const [dscrInput, setDscrInput] = useState(() =>
    seedTarget ? (seedTarget.dscr != null ? String(seedTarget.dscr) : "") : "1.25"
  );

  // The box report arrives async (BuyBoxVerdictCard fetches it), so this
  // card can mount before the seed exists. Apply a late-arriving seed once
  // — and never clobber targets the user already edited. State (not a
  // ref) because the "From your buy box" label renders from it.
  const [touched, setTouched] = useState(false);
  const seedKey = seedTarget ? JSON.stringify(seedTarget) : null;
  const [appliedSeedKey, setAppliedSeedKey] = useState<string | null>(seedKey);
  useEffect(() => {
    if (!seedTarget || touched || seedKey === appliedSeedKey) return;
    setAppliedSeedKey(seedKey);
    setCapRateInput(seedTarget.capRate != null ? String(seedTarget.capRate) : "");
    setCocInput(seedTarget.cocReturn != null ? String(seedTarget.cocReturn) : "");
    setCashFlowInput(seedTarget.monthlyCashFlow != null ? String(seedTarget.monthlyCashFlow) : "");
    setDscrInput(seedTarget.dscr != null ? String(seedTarget.dscr) : "");
  }, [seedTarget, seedKey, touched, appliedSeedKey]);

  // Label the seed source only while the inputs still ARE the seed — one
  // edit and the targets are the user's, not the box's.
  const showBuyBoxSeedLabel = seedTarget != null && !touched && seedKey === appliedSeedKey;

  // Shared onChange wrapper: any edit marks the targets as the user's own.
  const edit =
    (set: (v: string) => void) => (e: ChangeEvent<HTMLInputElement>) => {
      setTouched(true);
      set(e.target.value);
    };

  const target: MaoTarget = useMemo(
    () => ({
      capRate: numberOrUndefined(capRateInput),
      cocReturn: numberOrUndefined(cocInput),
      monthlyCashFlow: numberOrUndefined(cashFlowInput),
      dscr: isCashDeal ? undefined : numberOrUndefined(dscrInput),
    }),
    [capRateInput, cocInput, cashFlowInput, dscrInput, isCashDeal]
  );

  const noneSet =
    target.capRate === undefined &&
    target.cocReturn === undefined &&
    target.monthlyCashFlow === undefined &&
    target.dscr === undefined;

  const active = Boolean(values) && !noneSet;
  const mao = useMemo(() => (active ? calculateMaxAllowableOffer(values!, target) : null), [active, values, target]);
  const reqRent = useMemo(() => (active ? solveRequiredMonthlyRent(values!, target) : null), [active, values, target]);
  const reqRate = useMemo(() => (active ? solveRequiredInterestRate(values!, target) : null), [active, values, target]);

  const currentPrice = values ? Number(values.purchasePrice) : null;
  const currentMeets = reqRent?.alreadyMet ?? reqRate?.alreadyMet ?? false;

  // A11Y: the target labels were bare <Label>s with no htmlFor, so clicking a
  // label did nothing and each <Input> had no accessible name (screen readers
  // announced "edit text" with no context). useId() gives stable, collision-
  // safe ids so multiple instances (e.g. compare view) never share an id.
  // This card also ships on the public /d/ share viewer, so the fields must be
  // usable on assistive tech.
  const uid = useId();
  const capRateId = `${uid}-cap-rate`;
  const cocId = `${uid}-coc`;
  const cashFlowId = `${uid}-cash-flow`;
  const dscrId = `${uid}-dscr`;

  return (
    <div className="bg-card rounded-2xl border border-border shadow-sm p-5 sm:p-6">
      <div className="flex items-center gap-2 mb-1.5">
        <Target className="w-4 h-4 text-primary" />
        <span className="font-semibold text-sm text-foreground">What price makes this deal work?</span>
        {showBuyBoxSeedLabel ? (
          <span className="rounded-full border border-primary/30 bg-[var(--brand-blue-light)] px-2 py-0.5 text-[10px] font-semibold text-primary">
            From your buy box
          </span>
        ) : null}
      </div>
      <p className="text-xs text-muted-foreground mb-4">
        Set your return targets - we solve the highest price you should pay, and what it&apos;d take to
        make your current price work. Uses your current rent, financing, and operating assumptions.
      </p>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
        <div>
          <Label htmlFor={capRateId} className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-1.5 block">
            Target Cap Rate <span className="font-normal lowercase tracking-normal">(opt)</span>
          </Label>
          <div className="relative">
            <Input id={capRateId} type="number" inputMode="decimal" step="0.1" value={capRateInput} onChange={edit(setCapRateInput)} placeholder="Any" className="pr-7 border-input bg-background" />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">%</span>
          </div>
        </div>
        <div>
          <Label htmlFor={cocId} className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-1.5 block">
            Target Cash-on-Cash <span className="font-normal lowercase tracking-normal">(opt)</span>
          </Label>
          <div className="relative">
            <Input id={cocId} type="number" inputMode="decimal" step="0.1" value={cocInput} onChange={edit(setCocInput)} placeholder="Any" className="pr-7 border-input bg-background" />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">%</span>
          </div>
        </div>
        <div>
          <Label htmlFor={cashFlowId} className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-1.5 block">
            Min Cash Flow
          </Label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">$</span>
            <Input id={cashFlowId} type="number" inputMode="numeric" step="50" value={cashFlowInput} onChange={edit(setCashFlowInput)} placeholder="0" className="pl-7 border-input bg-background" />
          </div>
        </div>
        <div>
          <Label htmlFor={dscrId} className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-1.5 block">
            Min DSCR{" "}
            <span className="font-normal lowercase tracking-normal">
              {isCashDeal ? "(n/a — cash purchase)" : "(opt)"}
            </span>
          </Label>
          <Input id={dscrId} type="number" inputMode="decimal" step="0.05" value={dscrInput} onChange={edit(setDscrInput)} placeholder="1.25" disabled={isCashDeal} className="border-input bg-background" />
        </div>
      </div>

      {/* Forward: max offer */}
      <div className="mt-5 rounded-xl border border-border bg-[var(--background)] p-4 sm:p-5">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Max offer</div>
            <div className={cn("mt-1 font-mono text-3xl font-extrabold tabular-nums tracking-tight sm:text-4xl", mao ? "text-primary" : "text-muted-foreground")}>
              {!values ? "—" : noneSet ? "Set a target" : mao ? money(mao.maxPrice) : "No price hits these targets"}
            </div>
          </div>
          {mao && (
            <div className="text-xs text-muted-foreground sm:text-right space-y-0.5">
              <div>At this price you&apos;d get:</div>
              <div>
                <span className="font-semibold text-foreground">{mao.achieved.capRate.toFixed(1)}%</span> cap ·{" "}
                <span className="font-semibold text-foreground">{mao.achieved.cocReturn.toFixed(1)}%</span> CoC ·{" "}
                <span className="font-semibold text-foreground">${mao.achieved.netCashFlow.toLocaleString("en-US")}</span>/mo ·{" "}
                <span className="font-semibold text-foreground">{mao.achieved.dscr > 0 ? mao.achieved.dscr.toFixed(2) : "—"}</span> DSCR
              </div>
            </div>
          )}
        </div>
        {!mao && !noneSet && values && (
          <p className="text-xs text-muted-foreground mt-2">
            Try loosening one of your targets - these returns aren&apos;t reachable at any reasonable price given the rent and expenses entered.
          </p>
        )}
      </div>

      {/* Inverse: make the current price work */}
      {active && currentPrice ? (
        <div className="mt-4 rounded-xl border border-dashed border-border p-4 sm:p-5">
          <div className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
            Or - make your current price work
          </div>
          {currentMeets ? (
            <p className="mt-1.5 text-sm text-foreground">
              Your current price ({money(currentPrice)}) already clears these targets. ✓
            </p>
          ) : (
            <div className="mt-1.5 space-y-1 text-sm text-foreground">
              <p className="text-xs text-muted-foreground">At {money(currentPrice)}, you&apos;d need:</p>
              <p>
                Rent{" "}
                {reqRent && !reqRent.unreachable ? (
                  <>
                    ≥ <span className="font-bold text-primary">{money(reqRent.value)}/mo</span>
                  </>
                ) : (
                  <span className="text-muted-foreground">— not reachable by rent alone</span>
                )}
              </p>
              {reqRate === null ? null : (
                <p>
                  or rate{" "}
                  {!reqRate.unreachable ? (
                    <>
                      ≤ <span className="font-bold text-primary">{reqRate.value}%</span>
                    </>
                  ) : (
                    <span className="text-muted-foreground">— not reachable by rate alone</span>
                  )}
                </p>
              )}
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
