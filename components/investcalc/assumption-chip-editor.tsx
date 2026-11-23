"use client";

/**
 * The small editor a "Review assumptions" chip opens (2026-11 audit B1).
 *
 * A chip used to expand the whole advanced region (about 45 inputs, the page
 * growing from roughly 1,450px to 6,270px) and scroll some 1,500px away to
 * the one field the visitor asked for. Each chip now opens this popover with
 * only its own fields.
 *
 * SAME FORM STATE, SAME VALIDATION. Nothing here is a second copy of a value:
 * every field reads the form with `watch` and writes it with `setValue`
 * (dirty + touched + validated), exactly what typing in the full section
 * does, and shows the schema's own message from `formState.errors`. The
 * inputs are controlled on purpose. The full section's inputs for the same
 * names are registered with react-hook-form, and registering a second input
 * under one name would steal the first one's ref; a `setValue` write updates
 * the registered input too, so the two stay in step whichever is edited.
 */

import { useId, useState, type ReactNode } from "react";
import type { FieldPath, UseFormReturn } from "react-hook-form";
import { CurrencyInput } from "@/components/ui/currency-input";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FieldError } from "@/components/investcalc/form-field-helpers";
import type { InvestmentFormValues } from "@/lib/investcalc-schema";
import {
  insuranceAnnualFromMonthly,
  insuranceMonthlyFromAnnual,
} from "@/lib/insurance-input";
import { cn } from "@/lib/utils";

type Form = UseFormReturn<InvestmentFormValues>;
type NumericField = Extract<
  FieldPath<InvestmentFormValues>,
  | "downPaymentPct"
  | "interestRate"
  | "loanTermYears"
  | "propertyTaxPct"
  | "insurancePct"
  | "vacancyPct"
  | "maintenancePct"
  | "mgmtPct"
  | "capexPct"
  | "yearBuilt"
  | "bathrooms"
  | "sqft"
>;
type MoneyField = Extract<
  FieldPath<InvestmentFormValues>,
  "propertyTaxAnnual" | "insuranceMonthly" | "hoaMonthly"
>;

/** The chips this editor has fields for. Anything else (the template chip,
 *  the multi-family extras chip) has no small set of fields and keeps its
 *  link to the full section. */
export const EDITABLE_CHIP_IDS = [
  "financing",
  "taxes",
  "insurance",
  "vacancy",
  "maintenance",
  "management",
  "capex",
  "hoa-unit",
  "extras",
] as const;
export type EditableChipId = (typeof EDITABLE_CHIP_IDS)[number];

export function isEditableChipId(id: string): id is EditableChipId {
  return (EDITABLE_CHIP_IDS as readonly string[]).includes(id);
}

const WRITE = {
  shouldDirty: true,
  shouldTouch: true,
  shouldValidate: true,
} as const;

const inputClassName = "min-h-11 border-input bg-background";

function errorMessage(form: Form, name: string): string | undefined {
  const error = (form.formState.errors as Record<string, { message?: unknown }>)[
    name
  ];
  return typeof error?.message === "string" ? error.message : undefined;
}

function Hint({ children }: { children: ReactNode }) {
  return (
    <p className="mt-1.5 text-sm leading-snug text-muted-foreground">
      {children}
    </p>
  );
}

/**
 * A number the visitor types as text. The draft string is kept locally so an
 * in-progress "6." or "0.0" survives (a number round-trip would erase it);
 * the parsed number is written to the form on every change. An empty required
 * field writes NaN, the same value a `valueAsNumber` input reports, so the
 * schema's "Enter …" message appears; an empty optional field writes
 * undefined.
 */
function NumberField({
  form,
  name,
  label,
  unit,
  required = false,
  min,
  max,
  step,
  placeholder,
  hint,
  autoFocus = false,
}: {
  form: Form;
  name: NumericField;
  label: string;
  unit?: string;
  required?: boolean;
  min?: number;
  max?: number;
  step?: number | "any";
  placeholder?: string;
  hint?: ReactNode;
  autoFocus?: boolean;
}) {
  const id = useId();
  const formValue = form.watch(name) as number | undefined | null;
  const asText = (value: number | undefined | null) =>
    typeof value === "number" && Number.isFinite(value) ? String(value) : "";
  // The draft exists only while the input has focus. Outside of that the
  // field shows the form's value, so a write from elsewhere (the full
  // section, a template, a lookup) is reflected at once.
  const [draft, setDraft] = useState<string | null>(null);
  const message = errorMessage(form, name);

  return (
    <div>
      <Label
        htmlFor={id}
        className="mb-1.5 block text-sm font-medium text-foreground"
      >
        {label}
      </Label>
      <div className="relative">
        <Input
          id={id}
          type="number"
          inputMode="decimal"
          min={min}
          max={max}
          step={step ?? "any"}
          placeholder={placeholder}
          autoFocus={autoFocus}
          value={draft ?? asText(formValue)}
          aria-required={required || undefined}
          aria-invalid={Boolean(message)}
          aria-describedby={message ? `${id}-error` : undefined}
          onFocus={() => setDraft(asText(formValue))}
          onBlur={() => setDraft(null)}
          onChange={(event) => {
            const text = event.currentTarget.value;
            setDraft(text);
            const next =
              text.trim() === ""
                ? required
                  ? Number.NaN
                  : undefined
                : Number(text);
            form.setValue(name, next as never, WRITE);
          }}
          className={cn(
            inputClassName,
            unit && "pr-12",
            message && "border-destructive",
          )}
        />
        {unit ? (
          <span
            aria-hidden="true"
            className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground"
          >
            {unit}
          </span>
        ) : null}
      </div>
      {hint ? <Hint>{hint}</Hint> : null}
      <FieldError id={`${id}-error`} message={message} />
    </div>
  );
}

/** A dollar amount, through the shared CurrencyInput (so "3k" works here too). */
function MoneyField({
  form,
  name,
  label,
  value,
  onValueChange,
  placeholder,
  hint,
  autoFocus = false,
}: {
  form: Form;
  /** The form field whose validation message this input shows. */
  name: MoneyField;
  label: string;
  value: number | null | undefined;
  onValueChange: (value: number | null) => void;
  placeholder?: string;
  hint?: ReactNode;
  autoFocus?: boolean;
}) {
  const id = useId();
  const message = errorMessage(form, name);
  return (
    <div>
      <Label
        htmlFor={id}
        className="mb-1.5 block text-sm font-medium text-foreground"
      >
        {label}
      </Label>
      <div className="relative">
        <span
          aria-hidden="true"
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground"
        >
          $
        </span>
        <CurrencyInput
          id={id}
          value={value}
          onValueChange={onValueChange}
          placeholder={placeholder}
          autoFocus={autoFocus}
          aria-invalid={Boolean(message)}
          aria-describedby={message ? `${id}-error` : undefined}
          className={cn(
            inputClassName,
            "pl-7",
            message && "border-destructive",
          )}
        />
      </div>
      {hint ? <Hint>{hint}</Hint> : null}
      <FieldError id={`${id}-error`} message={message} />
    </div>
  );
}

function ModeToggle<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: ReadonlyArray<{ value: T; label: string }>;
  onChange: (value: T) => void;
}) {
  return (
    <div
      role="group"
      aria-label={label}
      className="mb-3 grid grid-cols-2 gap-1 rounded-lg border border-input bg-background p-1"
    >
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          aria-pressed={value === option.value}
          className={cn(
            "min-h-11 w-full rounded-md px-2 text-sm font-semibold transition-colors duration-[var(--duration-fast)] focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-inset focus-visible:ring-ring/50",
            value === option.value
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

/**
 * Switching between a rate and a dollar amount: drop an out-of-range value
 * left in the mode being switched away from, and its error, so a value the
 * visitor can no longer see cannot block the run. Mirrors the full section.
 */
function clearInvalidAlternate(
  form: Form,
  field: "propertyTaxPct" | "propertyTaxAnnual" | "insurancePct" | "insuranceMonthly",
  max: number,
) {
  const current = Number(form.getValues(field));
  if (Number.isFinite(current) && (current < 0 || current > max)) {
    form.setValue(field, undefined, {
      shouldDirty: true,
      shouldTouch: true,
      shouldValidate: false,
    });
  }
  form.clearErrors(field);
}

function PercentOfRent({
  form,
  name,
  label,
  placeholder,
  hint,
}: {
  form: Form;
  name: "vacancyPct" | "maintenancePct" | "mgmtPct" | "capexPct";
  label: string;
  placeholder: string;
  hint: string;
}) {
  return (
    <NumberField
      form={form}
      name={name}
      label={label}
      unit="%"
      required
      min={0}
      max={50}
      step={0.01}
      placeholder={placeholder}
      hint={hint}
      autoFocus
    />
  );
}

export function AssumptionChipEditor({
  chipId,
  form,
  showYearBuilt = true,
}: {
  chipId: EditableChipId;
  form: Form;
  /** False where the year-built input is hidden in the full section too
   *  (single-family while a strategy is active). */
  showYearBuilt?: boolean;
}) {
  switch (chipId) {
    case "financing":
      return (
        <div className="space-y-3">
          <NumberField
            form={form}
            name="downPaymentPct"
            label="Down payment"
            unit="%"
            required
            min={0}
            max={100}
            step={0.01}
            placeholder="e.g. 20"
            autoFocus
          />
          <NumberField
            form={form}
            name="interestRate"
            label="Interest rate"
            unit="%"
            required
            min={0}
            max={30}
            step={0.001}
            placeholder="e.g. 6.75"
          />
          <NumberField
            form={form}
            name="loanTermYears"
            label="Loan term"
            unit="years"
            required
            min={1}
            max={50}
            step={1}
            placeholder="e.g. 30"
          />
        </div>
      );

    case "taxes": {
      const mode = form.watch("propertyTaxInputMode") ?? "percent";
      return (
        <div>
          <ModeToggle
            label="Property tax input mode"
            value={mode}
            options={[
              { value: "percent", label: "Annual %" },
              { value: "annual", label: "Annual $" },
            ]}
            onChange={(next) => {
              clearInvalidAlternate(
                form,
                next === "annual" ? "propertyTaxPct" : "propertyTaxAnnual",
                next === "annual" ? 100 : 1_000_000,
              );
              form.setValue("propertyTaxInputMode", next, WRITE);
            }}
          />
          {mode === "annual" ? (
            <MoneyField
              form={form}
              name="propertyTaxAnnual"
              label="Property tax per year"
              value={form.watch("propertyTaxAnnual")}
              onValueChange={(value) =>
                form.setValue("propertyTaxAnnual", value as never, WRITE)
              }
              placeholder="e.g. 3,000"
              hint="The local annual bill. Blank uses an entered rate, or else the generic 1.1% preliminary assumption."
              autoFocus
            />
          ) : (
            <NumberField
              form={form}
              name="propertyTaxPct"
              label="Property tax rate"
              unit="%"
              min={0}
              max={100}
              step={0.01}
              placeholder="e.g. 1.35"
              hint="A reviewed local annual rate on the purchase price. Blank uses the generic 1.1% preliminary assumption."
              autoFocus
            />
          )}
        </div>
      );
    }

    case "insurance": {
      const mode = form.watch("insuranceInputMode") ?? "percent";
      return (
        <div>
          <ModeToggle
            label="Insurance input mode"
            value={mode}
            options={[
              { value: "percent", label: "Annual %" },
              { value: "monthly", label: "Annual $" },
            ]}
            onChange={(next) => {
              clearInvalidAlternate(
                form,
                next === "monthly" ? "insurancePct" : "insuranceMonthly",
                next === "monthly" ? 100 : 1_000_000,
              );
              form.setValue("insuranceInputMode", next, WRITE);
            }}
          />
          {mode === "monthly" ? (
            <MoneyField
              form={form}
              name="insuranceMonthly"
              label="Insurance per year"
              value={insuranceAnnualFromMonthly(form.watch("insuranceMonthly"))}
              onValueChange={(annual) =>
                form.setValue(
                  "insuranceMonthly",
                  insuranceMonthlyFromAnnual(annual) as never,
                  WRITE,
                )
              }
              placeholder="e.g. 1,900"
              hint="The annual premium from a quote. Blank uses the rate, or else the default 0.5% of the purchase price."
              autoFocus
            />
          ) : (
            <NumberField
              form={form}
              name="insurancePct"
              label="Insurance rate"
              unit="%"
              min={0}
              max={100}
              step={0.01}
              placeholder="e.g. 0.50"
              hint="An annual rate on the purchase price. Blank uses the default 0.5%."
              autoFocus
            />
          )}
        </div>
      );
    }

    case "vacancy":
      return (
        <PercentOfRent
          form={form}
          name="vacancyPct"
          label="Vacancy"
          placeholder="e.g. 5"
          hint="Share of gross rent lost to empty months. Type 0 to model none."
        />
      );
    case "maintenance":
      return (
        <PercentOfRent
          form={form}
          name="maintenancePct"
          label="Maintenance"
          placeholder="e.g. 10"
          hint="Share of gross rent set aside for routine repairs. Type 0 to model none."
        />
      );
    case "management":
      return (
        <PercentOfRent
          form={form}
          name="mgmtPct"
          label="Management"
          placeholder="e.g. 8"
          hint="Share of gross rent paid to a property manager. Type 0 if you self-manage."
        />
      );
    case "capex":
      return (
        <PercentOfRent
          form={form}
          name="capexPct"
          label="CapEx"
          placeholder="e.g. 5"
          hint="Share of gross rent reserved for big replacements (roof, HVAC). Type 0 to model none."
        />
      );

    case "hoa-unit":
      return (
        <MoneyField
          form={form}
          name="hoaMonthly"
          label="HOA dues per month"
          value={form.watch("hoaMonthly")}
          onValueChange={(value) =>
            form.setValue("hoaMonthly", value as never, WRITE)
          }
          placeholder="e.g. 250"
          hint="Condo or HOA dues, if the building charges them."
          autoFocus
        />
      );

    case "extras":
      return (
        <div className="space-y-3">
          {showYearBuilt ? (
            <NumberField
              form={form}
              name="yearBuilt"
              label="Year built"
              min={1800}
              max={new Date().getFullYear() + 5}
              step={1}
              placeholder="e.g. 2015"
              hint="Used in the Deal score age-risk check only."
              autoFocus
            />
          ) : null}
          <NumberField
            form={form}
            name="bathrooms"
            label="Bathrooms"
            min={0}
            max={20}
            step={0.5}
            placeholder="e.g. 2"
            autoFocus={!showYearBuilt}
          />
          <NumberField
            form={form}
            name="sqft"
            label="Square feet"
            min={50}
            max={100_000}
            step={1}
            placeholder="e.g. 1850"
          />
        </div>
      );
  }
}
