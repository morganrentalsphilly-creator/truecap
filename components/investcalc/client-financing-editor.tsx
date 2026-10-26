"use client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { ClientFinancing } from "@/lib/client-underwriting-preferences";

export function ClientFinancingEditor({ value, onChange }: { value: ClientFinancing | null; onChange: (value: ClientFinancing) => void }) {
  return <fieldset className="space-y-3 border-t border-border pt-4">
    <legend className="text-sm font-semibold">Client financing assumptions</legend>
    <Label htmlFor="client-financing-kind">How should this client be screened?</Label>
    <select id="client-financing-kind" className="min-h-11 w-full rounded-md border border-input bg-background px-3 text-sm" value={value?.kind ?? ""}
      onChange={event => {
        const kind = event.target.value;
        onChange(kind === "amortizing" ? { kind, downPaymentPct: 25, interestRate: 7, loanTermYears: 30, pmiAnnualRatePct: 0 } : { kind: kind === "cash" ? "cash" : "deal" });
      }}>
      {!value ? <option value="" disabled>Review invalid financing preferences</option> : null}
      <option value="deal">Use each saved deal&apos;s financing</option>
      <option value="cash">Cash purchase</option>
      <option value="amortizing">Client&apos;s amortizing loan assumptions</option>
    </select>
    {value?.kind === "amortizing" ? <div className="grid gap-3 sm:grid-cols-2">
      {([
        ["downPaymentPct", "Down payment (%)", 0, 99.99, 0.01],
        ["interestRate", "Interest rate (%)", 0, 30, 0.01],
        ["loanTermYears", "Loan term (years)", 1, 50, 1],
        ["pmiAnnualRatePct", "Annual mortgage insurance (%)", 0, 5, 0.01],
      ] as const).map(([key, label, min, max, step]) => <div key={key} className="space-y-1">
        <Label htmlFor={`client-${key}`}>{label}</Label>
        <Input id={`client-${key}`} type="number" min={min} max={max} step={step} className="min-h-11" value={Number.isFinite(value[key]) ? value[key] : ""} onChange={event => onChange({ ...value, [key]: event.target.value === "" ? NaN : Number(event.target.value) })} />
      </div>)}
    </div> : null}
    <p className="text-sm text-muted-foreground">Starting loan values are editable screening assumptions, not a lender quote. Property income, expenses, closing costs and other cash costs come from the saved deal. Review them before preparing an offer. Existing saved matches keep their original assumptions.</p>
  </fieldset>;
}
