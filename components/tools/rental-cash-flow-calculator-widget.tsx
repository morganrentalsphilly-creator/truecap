"use client";

/**
 * Standalone rental property cash flow calculator widget for
 * /tools/rental-cash-flow-calculator. Self-contained; computes monthly
 * cash flow inline as the user types and shows the NOI / debt-service
 * split underneath.
 *
 * Conventions deliberately mirror lib/calc-analysis.ts so this widget
 * never disagrees with the full analyzer on the same inputs:
 *   - Property tax + insurance are annual % of price (defaults 1.1 / 0.5).
 *   - Vacancy / management / maintenance / CapEx are % of rent.
 *   - NOI and DSCR EXCLUDE the CapEx reserve (lender-standard definition,
 *     same as the engine + glossary); cash flow still subtracts it.
 *   - Cash purchase (no loan) → DSCR is N/A, not 0-coverage.
 * Defaults match lib/investcalc-schema.ts defaultValues.
 */

import { useId, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { buildAnalyzerHandoffUrl } from "@/lib/analyzer-handoff";

const num = (s: string) => {
  const n = Number(s);
  return Number.isFinite(n) ? n : 0;
};

const fmtMoney = (n: number) =>
  `${n < 0 ? "-" : ""}$${Math.abs(Math.round(n)).toLocaleString("en-US")}`;

function classify(cf: number): { label: string; color: string; note: string } {
  // Bands mirror lib/verdict.ts's cash-flow cutoffs ($400 Strong gate,
  // $100 Solid gate, -$200 Negative gate) — don't invent new thresholds.
  if (cf < -200)
    return {
      label: "Deeply negative",
      color: "text-[var(--metric-negative)]",
      note: "Loses real money every month. The price, rent, or financing has to change for this to work.",
    };
  if (cf < 0)
    return {
      label: "Negative",
      color: "text-[var(--metric-negative)]",
      note: "You subsidize the property monthly — only defensible as a deliberate appreciation bet.",
    };
  if (cf < 100)
    return {
      label: "Break-even territory",
      color: "text-amber-700",
      note: "Technically positive, but one vacancy or repair wipes out the year's cash flow.",
    };
  if (cf < 400)
    return {
      label: "Solid",
      color: "text-[var(--metric-positive)]",
      note: "Real cushion after conservative reserves — worth a full underwrite.",
    };
  return {
    label: "Strong",
    color: "text-[var(--metric-positive)]",
    note: "Clears the $400/mo bar TrueCap's verdict engine weighs most heavily (alongside DSCR and CoC).",
  };
}

function calcMonthlyPayment(principal: number, annualRatePct: number, years: number): number {
  // Match the defensive guards used by lib/calc-analysis.ts so an empty
  // field can't produce Infinity/NaN in the live readout.
  if (!Number.isFinite(principal) || principal <= 0) return 0;
  if (!Number.isFinite(years) || years <= 0) return 0;
  if (!Number.isFinite(annualRatePct) || annualRatePct < 0) return 0;
  const r = annualRatePct / 100 / 12;
  const n = years * 12;
  if (r === 0) return principal / n;
  return (principal * r) / (1 - Math.pow(1 + r, -n));
}

export function RentalCashFlowCalculatorWidget() {
  // Financing defaults match lib/investcalc-schema.ts defaultValues
  // (20% down, 6.75%, 30yr); expense defaults match the analyzer's
  // (tax 1.1% / insurance 0.5% of price; vacancy 5 / mgmt 8 /
  // maintenance 10 / CapEx 5% of rent).
  const [price, setPrice] = useState("250000");
  const [downPct, setDownPct] = useState("20");
  const [ratePct, setRatePct] = useState("6.75");
  const [termYrs, setTermYrs] = useState("30");
  const [rent, setRent] = useState("2400");
  const [taxPct, setTaxPct] = useState("1.1");
  const [insPct, setInsPct] = useState("0.5");
  const [vacancyPct, setVacancyPct] = useState("5");
  const [mgmtPct, setMgmtPct] = useState("8");
  const [maintPct, setMaintPct] = useState("10");
  const [capexPct, setCapexPct] = useState("5");

  const result = useMemo(() => {
    const p = num(price);
    const r = num(rent);
    const loan = p - (p * num(downPct)) / 100;
    const piMonthly = calcMonthlyPayment(loan, num(ratePct), num(termYrs));

    const tax = (p * num(taxPct)) / 100 / 12;
    const insurance = (p * num(insPct)) / 100 / 12;
    const vacancy = (r * num(vacancyPct)) / 100;
    const management = (r * num(mgmtPct)) / 100;
    const maintenance = (r * num(maintPct)) / 100;
    const capex = (r * num(capexPct)) / 100;

    // NOI / DSCR exclude the CapEx reserve (matches lib/calc-analysis.ts +
    // the glossary's lender-standard definition); cash flow includes it.
    const opExExCapex = tax + insurance + vacancy + management + maintenance;
    const noiMonthly = r - opExExCapex;
    const dscr = piMonthly > 0 ? noiMonthly / piMonthly : NaN;
    const cashFlow = noiMonthly - capex - piMonthly;

    return {
      loan,
      piMonthly,
      opEx: opExExCapex + capex,
      capex,
      noiMonthly,
      noiAnnual: noiMonthly * 12,
      dscr,
      cashFlow,
      annualCashFlow: cashFlow * 12,
      isCashPurchase: piMonthly <= 0,
      pmiLikely: loan > 0 && num(downPct) < 20,
    };
  }, [price, downPct, ratePct, termYrs, rent, taxPct, insPct, vacancyPct, mgmtPct, maintPct, capexPct]);

  const c = classify(result.cashFlow);

  // Moment-of-result handoff into the full analyzer (P2-2 pattern shared by
  // the other tool widgets) — carries price + rent so the user doesn't
  // re-type them.
  const handoffHref = buildAnalyzerHandoffUrl(
    { purchasePrice: num(price), monthlyRent: num(rent) },
    { utmSource: "rental-cash-flow-calculator" }
  );

  return (
    <div className="bg-card rounded-2xl border border-border shadow-sm p-5 sm:p-7">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
        {/* Inputs */}
        <div className="space-y-4">
          <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground">
            Cash Flow Calculator
          </h2>

          <FieldMoney label="Purchase Price" value={price} setValue={setPrice} />
          <FieldMoney label="Monthly Rent" value={rent} setValue={setRent} />
          <div className="grid grid-cols-2 gap-3">
            <FieldPct label="Down Payment" value={downPct} setValue={setDownPct} />
            <FieldPct label="Interest Rate" value={ratePct} setValue={setRatePct} step="0.125" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <FieldNum label="Loan Term (yrs)" value={termYrs} setValue={setTermYrs} />
            <FieldPct label="Property Tax (%/yr of price)" value={taxPct} setValue={setTaxPct} step="0.1" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <FieldPct label="Insurance (%/yr of price)" value={insPct} setValue={setInsPct} step="0.1" />
            <FieldPct label="Vacancy (% of rent)" value={vacancyPct} setValue={setVacancyPct} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <FieldPct label="Management (% of rent)" value={mgmtPct} setValue={setMgmtPct} />
            <FieldPct label="Maintenance (% of rent)" value={maintPct} setValue={setMaintPct} />
          </div>
          <FieldPct label="CapEx Reserve (% of rent)" value={capexPct} setValue={setCapexPct} />
        </div>

        {/* Output */}
        <div className="bg-[var(--background)] rounded-xl border border-border p-5 sm:p-6 flex flex-col justify-between">
          <div>
            <div className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
              Monthly cash flow
            </div>
            <div className={cn("text-5xl sm:text-6xl font-extrabold mt-1 tabular-nums", c.color)}>
              {fmtMoney(result.cashFlow)}
            </div>
            <div className={cn("text-sm font-semibold mt-1", c.color)}>{c.label}</div>
            <p className="text-xs text-muted-foreground mt-1">{c.note}</p>
          </div>

          <div className="mt-5 pt-5 border-t border-border space-y-1.5 text-xs">
            <Row label="Monthly NOI (excl. CapEx)" value={fmtMoney(result.noiMonthly)} bold />
            <Row
              label="Monthly debt service (P&I)"
              value={result.isCashPurchase ? "$0 (no loan)" : fmtMoney(result.piMonthly)}
            />
            <Row label="CapEx reserve" value={fmtMoney(result.capex)} />
            <Row label="Annual cash flow" value={fmtMoney(result.annualCashFlow)} bold />
            <Row
              label="DSCR (NOI ÷ debt service)"
              value={result.isCashPurchase ? "N/A (no loan)" : result.dscr.toFixed(2)}
            />
          </div>
          {result.pmiLikely && (
            <p className="mt-3 text-[11px] text-muted-foreground leading-relaxed">
              Under 20% down usually adds monthly PMI on top of P&amp;I — the
              full analyzer models it automatically.
            </p>
          )}
        </div>
      </div>

      <Link
        href={handoffHref} target="_top"
        className="mt-6 inline-flex items-center gap-2 text-sm font-bold text-primary hover:underline"
      >
        <Sparkles className="w-4 h-4" />
        Open the free core deal screen with these numbers — Pro adds projections, tax, and modeled exits
        <ArrowUpRight className="w-4 h-4" />
      </Link>
    </div>
  );
}

function FieldMoney({ label, value, setValue }: { label: string; value: string; setValue: (v: string) => void }) {
  const id = useId();
  return (
    <div>
      <Label htmlFor={id} className="text-sm font-medium text-foreground mb-1.5 block">{label}</Label>
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">$</span>
        <Input
          id={id}
          type="number"
          inputMode="numeric"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="pl-7 border-input bg-background text-base"
        />
      </div>
    </div>
  );
}

function FieldPct({ label, value, setValue, step = "0.5" }: { label: string; value: string; setValue: (v: string) => void; step?: string }) {
  const id = useId();
  return (
    <div>
      <Label htmlFor={id} className="text-sm font-medium text-foreground mb-1.5 block">{label}</Label>
      <div className="relative">
        <Input
          id={id}
          type="number"
          inputMode="decimal"
          step={step}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="pr-8 border-input bg-background text-base"
        />
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">%</span>
      </div>
    </div>
  );
}

function FieldNum({ label, value, setValue }: { label: string; value: string; setValue: (v: string) => void }) {
  const id = useId();
  return (
    <div>
      <Label htmlFor={id} className="text-sm font-medium text-foreground mb-1.5 block">{label}</Label>
      <Input
        id={id}
        type="number"
        inputMode="numeric"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className="border-input bg-background text-base"
      />
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
