"use client";

import type { ReactNode } from "react";
import type { FieldPath, UseFormReturn } from "react-hook-form";
import { Controller } from "react-hook-form";
import { Banknote, Building2, CalendarClock, DollarSign } from "lucide-react";

import { CurrencyInput } from "@/components/ui/currency-input";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  FieldError,
  optionalNumberSetValueAs,
} from "@/components/investcalc/form-field-helpers";
import type { InvestmentFormValues } from "@/lib/investcalc-schema";
import { cn } from "@/lib/utils";

type MoneyFieldName =
  | "stabilizedMonthlyRent"
  | "currentPropertyValue"
  | "stabilizedPropertyValue"
  | "recurringOtherIncomeMonthly"
  | "recurringOtherExpenseMonthly"
  | "turnoverReserveMonthly"
  | "leasingReserveMonthly"
  | "landscapingMonthly"
  | "pestControlMonthly"
  | "administrativeMonthly"
  | "loanFees"
  | "originationFee"
  | "initialReserve"
  | "lenderEscrowDeposit"
  | "lenderReserveDeposit"
  | "acquisitionCredits";

function MoneyField({
  form,
  name,
  label,
  hint,
  placeholder = "0",
}: {
  form: UseFormReturn<InvestmentFormValues>;
  name: MoneyFieldName;
  label: string;
  hint?: string;
  placeholder?: string;
}) {
  const error = form.formState.errors[name];
  const errorId = `${name}-error`;
  const hintId = hint ? `${name}-hint` : undefined;
  return (
    <div className="min-w-0">
      <Label
        htmlFor={name}
        className="mb-1.5 block text-xs font-semibold text-foreground"
      >
        {label}
      </Label>
      <div className="relative">
        <DollarSign
          aria-hidden="true"
          className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
        />
        <Controller
          name={name}
          control={form.control}
          render={({ field }) => (
            <CurrencyInput
              id={name}
              name={field.name}
              ref={field.ref}
              value={field.value}
              onValueChange={field.onChange}
              onBlur={field.onBlur}
              min={0}
              max={100_000_000}
              step={25}
              placeholder={placeholder}
              aria-invalid={Boolean(error)}
              aria-describedby={
                [hintId, error ? errorId : null].filter(Boolean).join(" ") ||
                undefined
              }
              className={cn(
                "min-h-11 border-input bg-background pl-8",
                error && "border-destructive",
              )}
            />
          )}
        />
      </div>
      {hint ? (
        <p
          id={hintId}
          className="mt-1 text-[11px] leading-relaxed text-muted-foreground"
        >
          {hint}
        </p>
      ) : null}
      <FieldError id={errorId} message={error?.message as string | undefined} />
    </div>
  );
}

function NumberField({
  form,
  name,
  label,
  suffix,
  min,
  max,
  step = 1,
  hint,
  placeholder,
}: {
  form: UseFormReturn<InvestmentFormValues>;
  name: FieldPath<InvestmentFormValues>;
  label: string;
  suffix?: string;
  min: number;
  max: number;
  step?: number;
  hint?: string;
  placeholder?: string;
}) {
  const error = form.getFieldState(name, form.formState).error;
  const errorId = `${name}-error`;
  const hintId = hint ? `${name}-hint` : undefined;
  return (
    <div className="min-w-0">
      <Label
        htmlFor={name}
        className="mb-1.5 block text-xs font-semibold text-foreground"
      >
        {label}
      </Label>
      <div className="relative">
        <Input
          {...form.register(name, { setValueAs: optionalNumberSetValueAs })}
          id={name}
          type="number"
          inputMode="decimal"
          min={min}
          max={max}
          step={step}
          placeholder={placeholder}
          aria-invalid={Boolean(error)}
          aria-describedby={
            [hintId, error ? errorId : null].filter(Boolean).join(" ") ||
            undefined
          }
          className={cn(
            "min-h-11 border-input bg-background",
            suffix && "pr-12",
            error && "border-destructive",
          )}
        />
        {suffix ? (
          <span
            aria-hidden="true"
            className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground"
          >
            {suffix}
          </span>
        ) : null}
      </div>
      {hint ? (
        <p
          id={hintId}
          className="mt-1 text-[11px] leading-relaxed text-muted-foreground"
        >
          {hint}
        </p>
      ) : null}
      <FieldError id={errorId} message={error?.message} />
    </div>
  );
}

function AssumptionGroup({
  title,
  description,
  icon,
  children,
}: {
  title: string;
  description: string;
  icon: ReactNode;
  children: ReactNode;
}) {
  return (
    <fieldset className="min-w-0 rounded-xl border border-border bg-background/60 p-4">
      <legend className="px-1">
        <span className="inline-flex items-center gap-2 text-sm font-semibold text-foreground">
          {icon}
          {title}
        </span>
      </legend>
      <p className="mb-4 text-xs leading-relaxed text-muted-foreground">
        {description}
      </p>
      {children}
    </fieldset>
  );
}

export function BuyAndHoldAssumptionsSection({
  form,
}: {
  form: UseFormReturn<InvestmentFormValues>;
}) {
  const propertyType = form.watch("propertyType");
  const operatingScenario = form.watch("operatingScenario") ?? "current";
  const units = form.watch("units") ?? [];
  const hasLoan = Number(form.watch("downPaymentPct")) < 100;

  return (
    <section
      id="buy-and-hold-assumptions"
      aria-labelledby="buy-and-hold-assumptions-title"
      className="rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-6"
    >
      <div className="mb-5">
        <h3
          id="buy-and-hold-assumptions-title"
          className="text-sm font-bold text-foreground"
        >
          Detailed buy-and-hold assumptions
        </h3>
        <p className="mt-1 max-w-3xl text-xs leading-relaxed text-muted-foreground">
          Optional deal-specific detail. These values are included in the saved
          underwrite, shared decision and report. Leave a field blank only when
          it does not apply; a typed 0 means you intentionally modeled none.
        </p>
      </div>

      <div className="space-y-5">
        <AssumptionGroup
          title="Income, rent roll and values"
          description="Keep current operations separate from the stabilized case. The selected case drives the headline underwrite."
          icon={
            <Building2 aria-hidden="true" className="size-4 text-primary" />
          }
        >
          <div
            role="group"
            aria-label="Operating scenario"
            className="mb-4 grid max-w-md grid-cols-2 gap-1 rounded-lg border border-input bg-background p-1"
          >
            {(["current", "stabilized"] as const).map((scenario) => (
              <button
                key={scenario}
                type="button"
                aria-pressed={operatingScenario === scenario}
                onClick={() =>
                  form.setValue("operatingScenario", scenario, {
                    shouldDirty: true,
                    shouldValidate: true,
                  })
                }
                className={cn(
                  "min-h-11 rounded-md px-3 text-xs font-semibold capitalize focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  operatingScenario === scenario
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {scenario}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {propertyType === "single-family" ? (
              <MoneyField
                form={form}
                name="stabilizedMonthlyRent"
                label="Stabilized monthly rent"
                hint="Required only when the stabilized scenario is selected. Current rent remains in the main rent field."
              />
            ) : null}
            <MoneyField
              form={form}
              name="recurringOtherIncomeMonthly"
              label="Other recurring income / month"
              hint="Parking, laundry, pet or utility income that repeats."
            />
            <MoneyField
              form={form}
              name="currentPropertyValue"
              label="Current property value"
              hint="Optional reference value; purchase price still anchors acquisition cap rate."
            />
            <MoneyField
              form={form}
              name="stabilizedPropertyValue"
              label="Stabilized property value"
              hint="Optional supported value assumption, kept distinct from asking price and ARV."
            />
          </div>

          {propertyType !== "single-family" && units.length > 0 ? (
            <div className="mt-5 overflow-x-auto rounded-lg border border-border">
              <table className="w-full min-w-[520px] text-left text-sm">
                <caption className="sr-only">
                  Current and stabilized unit rent roll
                </caption>
                <thead className="bg-muted/50 text-xs text-muted-foreground">
                  <tr>
                    <th scope="col" className="px-3 py-2">
                      Unit
                    </th>
                    <th scope="col" className="px-3 py-2">
                      Current rent
                    </th>
                    <th scope="col" className="px-3 py-2">
                      Stabilized rent
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {units.map((unit, index) => {
                    const name =
                      `units.${index}.stabilizedMonthlyRent` as const;
                    const error = form.getFieldState(
                      name,
                      form.formState,
                    ).error;
                    return (
                      <tr key={index} className="border-t border-border">
                        <th
                          scope="row"
                          className="px-3 py-3 font-medium text-foreground"
                        >
                          Unit {index + 1}
                          {unit?.isOwnerOccupied ? " (owner)" : ""}
                        </th>
                        <td className="px-3 py-3 text-muted-foreground">
                          ${(unit?.monthlyRent ?? 0).toLocaleString("en-US")}/mo
                        </td>
                        <td className="px-3 py-3">
                          <Controller
                            name={name}
                            control={form.control}
                            render={({ field }) => (
                              <CurrencyInput
                                aria-label={`Unit ${index + 1} stabilized monthly rent`}
                                ref={field.ref}
                                name={field.name}
                                value={field.value}
                                onValueChange={field.onChange}
                                onBlur={field.onBlur}
                                min={0}
                                max={1_000_000}
                                step={25}
                                placeholder={
                                  unit?.isOwnerOccupied ? "0" : "Optional"
                                }
                                aria-invalid={Boolean(error)}
                                className={cn(
                                  "min-h-11 min-w-[170px] border-input bg-background",
                                  error && "border-destructive",
                                )}
                              />
                            )}
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : null}
        </AssumptionGroup>

        <AssumptionGroup
          title="Fixed and recurring operating costs"
          description="Monthly dollar assumptions grow with the expense-growth rate in the projection; percentage reserves remain linked to rent."
          icon={
            <Banknote
              aria-hidden="true"
              className="size-4 text-[var(--brand-orange)]"
            />
          }
        >
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <MoneyField
              form={form}
              name="recurringOtherExpenseMonthly"
              label="Other fixed expense / month"
            />
            <MoneyField
              form={form}
              name="turnoverReserveMonthly"
              label="Turnover reserve / month"
            />
            <MoneyField
              form={form}
              name="leasingReserveMonthly"
              label="Leasing reserve / month"
            />
            <MoneyField
              form={form}
              name="landscapingMonthly"
              label="Landscaping / month"
            />
            <MoneyField
              form={form}
              name="pestControlMonthly"
              label="Pest control / month"
            />
            <MoneyField
              form={form}
              name="administrativeMonthly"
              label="Administrative / month"
            />
          </div>
        </AssumptionGroup>

        <AssumptionGroup
          title="Loan and cash to close"
          description="Advanced note terms and settlement cash. Interest-only and balloon assumptions use the same full-precision schedule as reports and projections."
          icon={
            <DollarSign
              aria-hidden="true"
              className="size-4 text-[var(--brand-green)]"
            />
          }
        >
          {hasLoan ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <NumberField
                form={form}
                name="loanPointsPct"
                label="Loan points"
                suffix="%"
                min={0}
                max={100}
                step={0.01}
              />
              <MoneyField
                form={form}
                name="originationFee"
                label="Origination fee"
              />
              <MoneyField
                form={form}
                name="loanFees"
                label="Other lender fees"
              />
              <NumberField
                form={form}
                name="interestOnlyMonths"
                label="Interest-only period"
                suffix="months"
                min={0}
                max={600}
                hint="0 or blank means fully amortizing from month 1."
              />
              <NumberField
                form={form}
                name="amortizationTermYears"
                label="Amortization term"
                suffix="years"
                min={1}
                max={50}
                hint="Defaults to the loan term. A longer amortization than maturity creates a balloon."
              />
              <MoneyField
                form={form}
                name="lenderEscrowDeposit"
                label="Lender escrow deposit"
              />
              <MoneyField
                form={form}
                name="lenderReserveDeposit"
                label="Lender reserve deposit"
              />
              <MoneyField
                form={form}
                name="initialReserve"
                label="Investor opening reserve"
              />
            </div>
          ) : (
            <p className="rounded-lg border border-border bg-muted/30 p-3 text-xs text-muted-foreground">
              This is an all-cash acquisition, so loan-specific fields are not
              applied.
            </p>
          )}
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <MoneyField
              form={form}
              name="acquisitionCredits"
              label="Acquisition credits"
              hint="Seller/lender credits reduce cash required but cannot exceed modeled cash uses."
            />
          </div>
        </AssumptionGroup>

        <AssumptionGroup
          title="Renovation timing and hold assumptions"
          description="Optional simplified downtime only: the entered rent reduction affects projected rent while the existing rehab budget remains a day-zero cash amount. Leave all three timing fields blank to use the labeled steady-state analysis. Specialist BRRRR and flip models stay disabled."
          icon={
            <CalendarClock aria-hidden="true" className="size-4 text-primary" />
          }
        >
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <NumberField
              form={form}
              name="renovationStartMonth"
              label="Renovation start"
              suffix="month"
              min={1}
              max={120}
            />
            <NumberField
              form={form}
              name="renovationDurationMonths"
              label="Renovation duration"
              suffix="months"
              min={0}
              max={120}
            />
            <NumberField
              form={form}
              name="renovationRentLossPct"
              label="Rent reduction during work"
              suffix="%"
              min={0}
              max={100}
              step={0.01}
            />
            <NumberField
              form={form}
              name="sellingCostPct"
              label="Modeled selling costs"
              suffix="%"
              min={0}
              max={100}
              step={0.01}
              hint="Used only in pre-tax hold-return math; no exit or tax strategy is implied."
            />
          </div>
          <p className="mt-4 rounded-lg border border-amber-300/60 bg-amber-50 px-3 py-2 text-[11px] leading-relaxed text-amber-950 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-100">
            This is not a renovation lifecycle model. Draw/funding timing,
            placed-in-service and lease-up timing, repair-versus-capital
            classification, basis and tax treatment, and financed improvements
            are excluded.
          </p>
        </AssumptionGroup>
      </div>
    </section>
  );
}
