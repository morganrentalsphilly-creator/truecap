"use client";

import { Controller, UseFormReturn } from "react-hook-form";
import { DollarSign, Percent } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { InvestmentFormValues } from "@/lib/investcalc-schema";
import { cn } from "@/lib/utils";
import { FieldError, optionalNumberSetValueAs } from "@/components/investcalc/form-field-helpers";
import { GlossaryTip } from "@/components/investcalc/glossary-tip";
import { FinancingProfileSelector } from "@/components/investcalc/financing-profile-selector";
import { isFeatureEnabled } from "@/lib/feature-flags";
import type { FinancingProfileSnapshot } from "@/lib/financing-profiles";
import { CurrencyInput } from "@/components/ui/currency-input";

interface FinancingSectionProps {
  form: UseFormReturn<InvestmentFormValues>;
  appliedProfile?: FinancingProfileSnapshot | null;
  onAppliedProfileChange?: (profile: FinancingProfileSnapshot | null) => void;
}

export function FinancingSection({
  form,
  appliedProfile = null,
  onAppliedProfileChange,
}: FinancingSectionProps) {
  const {
    register,
    control,
    formState: { errors },
  } = form;

  // A 0% (or 100%) down payment silently switches the underwrite to all-cash:
  // no mortgage, so DSCR drops out and cash-on-cash is computed differently.
  // Surface that so a user who zeroes it (or fat-fingers it) understands the
  // verdict changed on purpose, not that something broke. Invisible at the
  // default 20%, so it never adds chrome to the normal financed path.
  const downPaymentPct = form.watch("downPaymentPct");
  const isAllCash =
    downPaymentPct === 0 || (typeof downPaymentPct === "number" && downPaymentPct >= 100);
  // PMI / MIP only applies to a financed loan with < 20% down — show the lever
  // exactly when it's relevant, so it never clutters the standard 20%-down path.
  const pmiApplies =
    typeof downPaymentPct === "number" && downPaymentPct > 0 && downPaymentPct < 20;

  return (
    // Card chrome unified with the other input sections (PropertyType /
    // PropertyDetails / SingleFamily - all `bg-card` + neutral border).
    // Previously the green tint made the form read as three glued-together
    // products. Green stays on the icon and the per-field accent borders
    // to preserve the "this is the financing section" cue.
    <div className="bg-card rounded-2xl border border-border shadow-sm p-4 sm:p-6">
      <div className="flex items-center gap-2 mb-5">
        <DollarSign className="w-4 h-4 text-[var(--brand-green)]" />
        <span className="font-semibold text-sm text-foreground">Financing</span>
      </div>

      {isFeatureEnabled("financing_profiles") && onAppliedProfileChange ? (
        <FinancingProfileSelector
          form={form}
          appliedProfile={appliedProfile}
          onAppliedProfileChange={onAppliedProfileChange}
        />
      ) : null}

      <div className="grid grid-cols-2 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <div>
          <Label htmlFor="downPaymentPct" className="text-xs font-semibold text-[var(--brand-green)] mb-1.5 block uppercase tracking-wide">
            <GlossaryTip term="downPayment" showIcon={false}>Down Payment %</GlossaryTip>
          </Label>
          <div className="relative">
            <Input
              {...register("downPaymentPct", { valueAsNumber: true })}
              id="downPaymentPct"
              type="number"
              inputMode="decimal"
              step="0.01"
              min={0}
              max={100}
              placeholder="20"
              aria-invalid={!!errors.downPaymentPct}
              aria-describedby={errors.downPaymentPct ? "downPaymentPct-error" : undefined}
              className={cn(
                "pr-8 border-[var(--brand-green)]/30 bg-background focus-visible:ring-[var(--brand-green)]/30",
                errors.downPaymentPct && "border-destructive"
              )}
            />
            <Percent className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          </div>
          <FieldError id="downPaymentPct-error" message={errors.downPaymentPct?.message} />
          {isAllCash && (
            <p className="mt-1 text-[11px] leading-snug text-[var(--brand-green)]">
              Modeling this as an all-cash purchase — no mortgage, so there&apos;s no debt-coverage ratio (DSCR). You&apos;ll still get cash-on-cash and monthly cash flow.
            </p>
          )}
        </div>

        <div>
          <Label htmlFor="interestRate" className="text-xs font-semibold text-[var(--brand-green)] mb-1.5 block uppercase tracking-wide">
            <GlossaryTip term="interestRate" showIcon={false}>Interest Rate %</GlossaryTip>
          </Label>
          <div className="relative">
            <Input
              {...register("interestRate", { valueAsNumber: true })}
              id="interestRate"
              type="number"
              inputMode="decimal"
              step="0.01"
              min={0}
              max={30}
              placeholder="6.75"
              aria-invalid={!!errors.interestRate}
              aria-describedby={errors.interestRate ? "interestRate-error" : undefined}
              className={cn(
                "pr-8 border-[var(--brand-green)]/30 bg-background focus-visible:ring-[var(--brand-green)]/30",
                errors.interestRate && "border-destructive"
              )}
            />
            <Percent className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          </div>
          <FieldError id="interestRate-error" message={errors.interestRate?.message} />
        </div>

        <div>
          <Label htmlFor="loanTermYears" className="text-xs font-semibold text-[var(--brand-green)] mb-1.5 block uppercase tracking-wide">
            <GlossaryTip term="loanTerm" showIcon={false}>Loan Term (Years)</GlossaryTip>
          </Label>
          <Input
            {...register("loanTermYears", { valueAsNumber: true })}
            id="loanTermYears"
            type="number"
            inputMode="numeric"
            step={1}
            min={1}
            max={50}
            placeholder="30"
            aria-invalid={!!errors.loanTermYears}
            aria-describedby={errors.loanTermYears ? "loanTermYears-error" : undefined}
            className={cn(
              "border-[var(--brand-green)]/30 bg-background focus-visible:ring-[var(--brand-green)]/30",
              errors.loanTermYears && "border-destructive"
            )}
          />
          <FieldError id="loanTermYears-error" message={errors.loanTermYears?.message} />
        </div>

        <div>
          <Label htmlFor="closingCostsPct" className="text-xs font-semibold text-[var(--brand-green)] mb-1.5 block uppercase tracking-wide">
            <GlossaryTip term="closingCosts" showIcon={false}>Closing Costs %</GlossaryTip>
            {" "}<span className="text-[10px] sm:text-xs text-muted-foreground">(Optional)</span>
          </Label>
          <div className="relative">
            <Input
              {...register("closingCostsPct", { setValueAs: optionalNumberSetValueAs })}
              id="closingCostsPct"
              type="number"
              inputMode="decimal"
              step="0.01"
              min={0}
              max={100}
              placeholder="3"
              aria-invalid={!!errors.closingCostsPct}
              aria-describedby={errors.closingCostsPct ? "closingCostsPct-error" : undefined}
              className={cn(
                "pr-8 border-[var(--brand-green)]/30 bg-background focus-visible:ring-[var(--brand-green)]/30",
                errors.closingCostsPct && "border-destructive"
              )}
            />
            <Percent className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          </div>
          <p className="text-[11px] text-muted-foreground mt-1">
            Defaults to 3% of purchase price if left blank.
          </p>
          <FieldError id="closingCostsPct-error" message={errors.closingCostsPct?.message} />
        </div>

        <div>
          <Label htmlFor="rehabBudget" className="text-xs font-semibold text-[var(--brand-green)] mb-1.5 block uppercase tracking-wide">
            Rehab / Initial Repairs
            {" "}<span className="text-[10px] sm:text-xs text-muted-foreground">(Optional)</span>
          </Label>
          <div className="relative">
            <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Controller
              name="rehabBudget"
              control={control}
              render={({ field }) => (
                <CurrencyInput
                  id="rehabBudget"
                  name={field.name}
                  ref={field.ref}
                  value={field.value}
                  onValueChange={field.onChange}
                  onBlur={field.onBlur}
                  step={100}
                  min={0}
                  max={1_000_000}
                  placeholder="0"
                  aria-invalid={!!errors.rehabBudget}
                  aria-describedby={errors.rehabBudget ? "rehabBudget-error" : undefined}
                  className={cn(
                    "pl-8 border-[var(--brand-green)]/30 bg-background focus-visible:ring-[var(--brand-green)]/30",
                    errors.rehabBudget && "border-destructive"
                  )}
                />
              )}
            />
          </div>
          <p className="text-[11px] text-muted-foreground mt-1">
            Up-front repairs — added to cash invested (lowers cash-on-cash).
          </p>
          <FieldError id="rehabBudget-error" message={errors.rehabBudget?.message} />
        </div>
      </div>

      {pmiApplies ? (
        <div className="mt-4 rounded-xl border border-[var(--brand-green)]/20 bg-[var(--brand-green)]/[0.04] p-4">
          <div className="grid grid-cols-1 sm:grid-cols-[minmax(0,1fr)_auto] gap-4 sm:items-start">
            <div>
              <Label htmlFor="pmiAnnualRatePct" className="text-xs font-semibold text-[var(--brand-green)] mb-1.5 block uppercase tracking-wide">
                PMI / MIP rate %
                <span className="ml-1 normal-case font-normal text-muted-foreground">(under 20% down)</span>
              </Label>
              <div className="relative max-w-[180px]">
                <Input
                  {...register("pmiAnnualRatePct", { setValueAs: optionalNumberSetValueAs })}
                  id="pmiAnnualRatePct"
                  type="number"
                  inputMode="decimal"
                  step="0.05"
                  min={0}
                  max={5}
                  placeholder="0.8"
                  aria-invalid={!!errors.pmiAnnualRatePct}
                  aria-describedby={errors.pmiAnnualRatePct ? "pmiAnnualRatePct-error" : undefined}
                  className={cn(
                    "pr-8 border-[var(--brand-green)]/30 bg-background focus-visible:ring-[var(--brand-green)]/30",
                    errors.pmiAnnualRatePct && "border-destructive"
                  )}
                />
                <Percent className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              </div>
              <p className="text-[11px] text-muted-foreground mt-1">
                Annual mortgage insurance, % of loan. Defaults to 0.8%; set 0 if none.
              </p>
              <FieldError id="pmiAnnualRatePct-error" message={errors.pmiAnnualRatePct?.message} />
            </div>

            <label htmlFor="pmiNoCancel" className="flex items-start gap-2.5 sm:pt-7 cursor-pointer select-none">
              <input
                {...register("pmiNoCancel")}
                id="pmiNoCancel"
                type="checkbox"
                className="mt-0.5 size-4 rounded border-input accent-[var(--brand-green)]"
              />
              <span className="text-xs leading-snug text-foreground">
                Runs for the life of the loan
                <span className="block text-[11px] text-muted-foreground">FHA MIP — doesn&apos;t cancel at 20% equity.</span>
              </span>
            </label>
          </div>
        </div>
      ) : null}
    </div>
  );
}
