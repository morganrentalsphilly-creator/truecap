"use client";

/**
 * Standalone NOI (Net Operating Income) calculator widget for the
 * /tools/noi-calculator public page. Inputs: gross rent (monthly),
 * vacancy %, and individual operating-expense line items. Output:
 * monthly and annual NOI plus the operating-expense ratio.
 */

import { useId, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { buildAnalyzerHandoffUrl } from "@/lib/analyzer-handoff";

const num = (s: string): number => {
  const n = Number(s);
  return Number.isFinite(n) ? n : 0;
};

const fmtMoney = (n: number) =>
  `${n < 0 ? "-" : ""}$${Math.abs(Math.round(n)).toLocaleString("en-US")}`;

const fmtPct = (n: number) =>
  Number.isFinite(n) ? `${n.toFixed(1)}%` : "—";

export function NoiCalculatorWidget() {
  const [rentInput, setRentInput] = useState("2950");
  const [vacancyInput, setVacancyInput] = useState("5");
  const [taxInput, setTaxInput] = useState("367");
  const [insuranceInput, setInsuranceInput] = useState("123");
  const [maintenanceInput, setMaintenanceInput] = useState("236");
  const [mgmtInput, setMgmtInput] = useState("236");
  const [capexInput, setCapexInput] = useState("148");
  const [hoaInput, setHoaInput] = useState("0");
  const [utilitiesInput, setUtilitiesInput] = useState("0");

  const result = useMemo(() => {
    const monthlyRent = num(rentInput);
    const vacancyPct = Math.max(0, Math.min(100, num(vacancyInput))) / 100;
    const annualGross = monthlyRent * 12;
    const annualVacancy = annualGross * vacancyPct;
    const effectiveRent = annualGross - annualVacancy;
    const monthlyOpex =
      num(taxInput) +
      num(insuranceInput) +
      num(maintenanceInput) +
      num(mgmtInput) +
      num(capexInput) +
      num(hoaInput) +
      num(utilitiesInput);
    const annualOpex = monthlyOpex * 12;
    const annualNoi = effectiveRent - annualOpex;
    const monthlyNoi = annualNoi / 12;
    const opexRatio = effectiveRent > 0 ? (annualOpex / effectiveRent) * 100 : 0;
    return { monthlyRent, annualGross, annualVacancy, effectiveRent, monthlyOpex, annualOpex, annualNoi, monthlyNoi, opexRatio };
  }, [rentInput, vacancyInput, taxInput, insuranceInput, maintenanceInput, mgmtInput, capexInput, hoaInput, utilitiesInput]);

  // Carry the user's monthly rent into the full analyzer (P2-2 handoff).
  const handoffHref = buildAnalyzerHandoffUrl(
    { monthlyRent: num(rentInput) },
    { utmSource: "noi-calculator" }
  );

  return (
    <div className="bg-card rounded-2xl border border-border shadow-sm p-5 sm:p-7">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
        {/* Inputs */}
        <div className="space-y-4">
          <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground">
            NOI Calculator
          </h2>

          <FieldMoney label="Monthly Rent (gross)" value={rentInput} setValue={setRentInput} />
          <FieldPct label="Vacancy Rate" value={vacancyInput} setValue={setVacancyInput} />

          <div className="pt-2">
            <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2">
              Monthly Operating Expenses
            </p>
            <div className="grid grid-cols-2 gap-3">
              <FieldMoney label="Property Tax" value={taxInput} setValue={setTaxInput} />
              <FieldMoney label="Insurance" value={insuranceInput} setValue={setInsuranceInput} />
              <FieldMoney label="Maintenance" value={maintenanceInput} setValue={setMaintenanceInput} />
              <FieldMoney label="Management" value={mgmtInput} setValue={setMgmtInput} />
              <FieldMoney label="CapEx reserve" value={capexInput} setValue={setCapexInput} />
              <FieldMoney label="HOA" value={hoaInput} setValue={setHoaInput} />
              <FieldMoney label="Utilities (owner)" value={utilitiesInput} setValue={setUtilitiesInput} />
            </div>
          </div>
        </div>

        {/* Output */}
        <div className="bg-[var(--background)] rounded-xl border border-border p-5 sm:p-6 flex flex-col justify-between">
          <div>
            <div className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
              Annual NOI
            </div>
            <div className={cn(
              "text-5xl sm:text-6xl font-extrabold mt-1 tabular-nums",
              result.annualNoi >= 0 ? "text-[var(--metric-positive)]" : "text-[var(--metric-negative)]"
            )}>
              {fmtMoney(result.annualNoi)}
            </div>
            <div className="text-sm font-semibold text-muted-foreground mt-1">
              {fmtMoney(result.monthlyNoi)}/month
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Net Operating Income — before mortgage and income tax.
            </p>
          </div>

          <div className="mt-5 pt-5 border-t border-border space-y-1.5 text-xs">
            <Row label="Annual gross rent" value={fmtMoney(result.annualGross)} />
            <Row label="Vacancy" value={`-${fmtMoney(result.annualVacancy)}`} />
            <Row label="Effective rent" value={fmtMoney(result.effectiveRent)} bold />
            <Row label="Annual operating expenses" value={`-${fmtMoney(result.annualOpex)}`} />
            <Row label="Operating expense ratio" value={fmtPct(result.opexRatio)} />
          </div>
        </div>
      </div>

      <Link
        href={handoffHref} target="_top"
        className="mt-6 inline-flex items-center gap-2 text-sm font-bold text-primary hover:underline"
      >
        <Sparkles className="w-4 h-4" />
        Run the full analysis with these numbers — cap rate, cash flow, DSCR — free
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

function FieldPct({ label, value, setValue }: { label: string; value: string; setValue: (v: string) => void }) {
  const id = useId();
  return (
    <div>
      <Label htmlFor={id} className="text-sm font-medium text-foreground mb-1.5 block">{label}</Label>
      <div className="relative">
        <Input
          id={id}
          type="number"
          inputMode="decimal"
          step="0.5"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="pr-8 border-input bg-background text-base"
        />
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">%</span>
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
