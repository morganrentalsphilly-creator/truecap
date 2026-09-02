"use client";

import { useEffect } from "react";
import { Controller, UseFormReturn } from "react-hook-form";
import { DollarSign, Percent } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { InvestmentFormValues } from "@/lib/investcalc-schema";
import { cn } from "@/lib/utils";
import { isAllCashDownPayment } from "@/lib/financing-classification";
import {
  FieldError,
  optionalNumberSetValueAs,
} from "@/components/investcalc/form-field-helpers";
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

  // A 100% down payment switches the v1 underwrite to all-cash: no mortgage,
  // so DSCR drops out and cash-on-cash is computed differently. A 0% down
  // payment is the opposite — fully financed — and must never enter this path.
  const downPaymentPct = form.watch("downPaymentPct");
  const propertyType = form.watch("propertyType");
  const closingCostsInputMode =
    form.watch("closingCostsInputMode") === "fixed" ? "fixed" : "percent";
  const usesOwnerOccupantPmiDefault = propertyType === "owner-occupant";
  const isAllCash = isAllCashDownPayment(downPaymentPct);
  // PMI / MIP only applies to a financed loan with < 20% down — show the lever
  // exactly when it's relevant, so it never clutters the standard 20%-down path.
  const pmiApplies =
    typeof downPaymentPct === "number" &&
    downPaymentPct >= 0 &&
    downPaymentPct < 20;

  // Do not let an invalid PMI value become an invisible schema blocker when
  // the user raises down payment to 20%+ and the conditional field unmounts.
  // Valid historical values remain available if they later lower the down
  // payment again; only an already-invalid hidden value is cleared.
  useEffect(() => {
    if (pmiApplies) return;
    const hiddenRate = Number(form.getValues("pmiAnnualRatePct"));
    if (!Number.isFinite(hiddenRate) || hiddenRate < 0 || hiddenRate > 5) {
      form.setValue("pmiAnnualRatePct", undefined, {
        shouldDirty: true,
        shouldTouch: false,
        shouldValidate: true,
      });
    }
  }, [form, pmiApplies]);

  return (
    // Card chrome unified with the other input sections (PropertyType /
    // PropertyDetails / SingleFamily - all `bg-card` + neutral border).
    // Previously the green tint made the form read as three glued-together
    // products. Green stays on the icon and labels to preserve the "this is
    // the financing section" cue; controls use the shared AA boundary/focus
    // tokens so their edges remain visible at zoom and in both color modes.
    // @container: every grid in this section sizes off the CARD's width, not
    // the viewport. The form renders in a ~670px pane beside the live
    // preview on desktop, so viewport breakpoints lied — xl:grid-cols-4
    // fired at 1440px viewport and packed four ~140px columns into the
    // half-width pane, crushing the Closing Costs header into
    // letter-by-letter wrapping.
    <div className="@container bg-card rounded-2xl border border-border shadow-sm p-4 sm:p-6">
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

      {/* One container-width step: 2-up once the CARD clears 36rem. Never
        4-up — four columns needed ~14rem each before the uppercase headers
        stopped wrapping mid-word, and the form pane rarely affords it. A
        2×2 grid reads cleanly at every card width the product renders. */}
      <div className="grid grid-cols-1 @xl:grid-cols-2 gap-4">
        <div>
          <div className="mb-1.5 flex min-w-0 flex-wrap items-center gap-1.5">
            <Label
              htmlFor="downPaymentPct"
              className="min-w-0 flex-1 text-xs font-semibold uppercase tracking-wide text-[var(--brand-green)] [overflow-wrap:anywhere]"
            >
              Down Payment %
            </Label>
            <GlossaryTip term="downPayment" className="shrink-0 no-underline">
              <span className="sr-only">Down payment guidance</span>
            </GlossaryTip>
          </div>
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
              aria-describedby={
                errors.downPaymentPct ? "downPaymentPct-error" : undefined
              }
              className={cn(
                "border-input bg-background pr-8 focus-visible:border-ring focus-visible:ring-ring",
                errors.downPaymentPct && "border-destructive",
              )}
            />
            <Percent className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          </div>
          <FieldError
            id="downPaymentPct-error"
            message={errors.downPaymentPct?.message}
          />
          {isAllCash && (
            <p className="mt-1 text-[11px] leading-snug text-[var(--brand-green)] [overflow-wrap:anywhere]">
              Modeling this as an all-cash purchase — no mortgage, so
              there&apos;s no debt-coverage ratio (DSCR). You&apos;ll still get
              cash-on-cash and monthly cash flow.
            </p>
          )}
        </div>

        <div>
          <div className="mb-1.5 flex min-w-0 flex-wrap items-center gap-1.5">
            <Label
              htmlFor="interestRate"
              className="min-w-0 flex-1 text-xs font-semibold uppercase tracking-wide text-[var(--brand-green)] [overflow-wrap:anywhere]"
            >
              Interest Rate %
            </Label>
            <GlossaryTip term="interestRate" className="shrink-0 no-underline">
              <span className="sr-only">Interest rate guidance</span>
            </GlossaryTip>
          </div>
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
              aria-describedby={
                errors.interestRate ? "interestRate-error" : undefined
              }
              className={cn(
                "border-input bg-background pr-8 focus-visible:border-ring focus-visible:ring-ring",
                errors.interestRate && "border-destructive",
              )}
            />
            <Percent className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          </div>
          <FieldError
            id="interestRate-error"
            message={errors.interestRate?.message}
          />
        </div>

        <div>
          <div className="mb-1.5 flex min-w-0 flex-wrap items-center gap-1.5">
            <Label
              htmlFor="loanTermYears"
              className="min-w-0 flex-1 text-xs font-semibold uppercase tracking-wide text-[var(--brand-green)] [overflow-wrap:anywhere]"
            >
              Loan Term (Years)
            </Label>
            <GlossaryTip term="loanTerm" className="shrink-0 no-underline">
              <span className="sr-only">Loan term guidance</span>
            </GlossaryTip>
          </div>
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
            aria-describedby={
              errors.loanTermYears ? "loanTermYears-error" : undefined
            }
            className={cn(
              "border-input bg-background focus-visible:border-ring focus-visible:ring-ring",
              errors.loanTermYears && "border-destructive",
            )}
          />
          <FieldError
            id="loanTermYears-error"
            message={errors.loanTermYears?.message}
          />
        </div>

        <div>
          <div className="mb-1.5 flex min-w-0 flex-wrap items-center gap-1.5">
            <Label
              htmlFor="closingCostsPct"
              className="min-w-0 flex-1 text-xs font-semibold uppercase tracking-wide text-[var(--brand-green)] [overflow-wrap:anywhere]"
            >
              {closingCostsInputMode === "fixed"
                ? "Closing Costs $"
                : "Closing Costs %"}{" "}
              <span className="text-[10px] text-muted-foreground sm:text-xs">
                (Optional)
              </span>
            </Label>
            <GlossaryTip term="closingCosts" className="shrink-0 no-underline">
              <span className="sr-only">Closing costs guidance</span>
            </GlossaryTip>
          </div>
          <div
            role="group"
            aria-label="Closing costs input mode"
            className="mb-2 grid grid-cols-2 gap-1 rounded-lg border border-input bg-background p-1"
          >
            {([
              { value: "percent", label: "% of price" },
              { value: "fixed", label: "Fixed $" },
            ] as const).map((option) => (
              <button
                key={option.value}
                type="button"
                aria-pressed={closingCostsInputMode === option.value}
                onClick={() =>
                  form.setValue("closingCostsInputMode", option.value, {
                    shouldDirty: true,
                    shouldValidate: true,
                  })
                }
                className={cn(
                  "min-h-11 rounded-md px-2 text-xs font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  closingCostsInputMode === option.value
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {option.label}
              </button>
            ))}
          </div>
          <div className="relative">
            {closingCostsInputMode === "fixed" ? (
              <>
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Controller
                  name="closingCostsFixed"
                  control={control}
                  render={({ field }) => (
                    <CurrencyInput
                      id="closingCostsPct"
                      name={field.name}
                      ref={field.ref}
                      value={field.value}
                      onValueChange={field.onChange}
                      onBlur={field.onBlur}
                      min={0}
                      max={100_000_000}
                      step={100}
                      placeholder="9,000"
                      aria-invalid={!!errors.closingCostsFixed}
                      aria-describedby={
                        errors.closingCostsFixed
                          ? "closingCostsPct-error"
                          : undefined
                      }
                      className={cn(
                        "border-input bg-background pl-8 focus-visible:border-ring focus-visible:ring-ring",
                        errors.closingCostsFixed && "border-destructive",
                      )}
                    />
                  )}
                />
              </>
            ) : (
              <>
                <Input
                  {...register("closingCostsPct", {
                    setValueAs: optionalNumberSetValueAs,
                  })}
                  id="closingCostsPct"
                  type="number"
                  inputMode="decimal"
                  step="0.01"
                  min={0}
                  max={100}
                  placeholder="3"
                  aria-invalid={!!errors.closingCostsPct}
                  aria-describedby={
                    errors.closingCostsPct
                      ? "closingCostsPct-error"
                      : undefined
                  }
                  className={cn(
                    "border-input bg-background pr-8 focus-visible:border-ring focus-visible:ring-ring",
                    errors.closingCostsPct && "border-destructive",
                  )}
                />
                <Percent className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              </>
            )}
          </div>
          <p className="mt-1 text-[11px] text-muted-foreground [overflow-wrap:anywhere]">
            {closingCostsInputMode === "fixed"
              ? "Exact modeled cash closing costs."
              : "Defaults to 3% of purchase price if left blank."}
          </p>
          <FieldError
            id="closingCostsPct-error"
            message={
              closingCostsInputMode === "fixed"
                ? errors.closingCostsFixed?.message
                : errors.closingCostsPct?.message
            }
          />
        </div>

        <div>
          <Label
            htmlFor="rehabBudget"
            className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-[var(--brand-green)] [overflow-wrap:anywhere]"
          >
            Rehab / Initial Repairs{" "}
            <span className="text-[10px] sm:text-xs text-muted-foreground">
              (Optional)
            </span>
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
                  aria-describedby={
                    errors.rehabBudget ? "rehabBudget-error" : undefined
                  }
                  className={cn(
                    "border-input bg-background pl-8 focus-visible:border-ring focus-visible:ring-ring",
                    errors.rehabBudget && "border-destructive",
                  )}
                />
              )}
            />
          </div>
          <p className="mt-1 text-[11px] text-muted-foreground [overflow-wrap:anywhere]">
            Up-front repairs — added to cash invested (lowers cash-on-cash).
          </p>
          <FieldError
            id="rehabBudget-error"
            message={errors.rehabBudget?.message}
          />
        </div>
      </div>

      {pmiApplies ? (
        <div className="mt-4 rounded-xl border border-border bg-[var(--brand-green)]/[0.04] p-4">
          {/* Two EQUAL columns, never [1fr_auto]: the amber rental-MI note
            in the second slot has a ~700px max-content width, and a grid
            `auto` track sizes to max-content — at pane widths below that,
            the note seized the whole row and crushed the label/input
            column to ~14px, wrapping "PMI / MIP RATE %" one letter per
            line. minmax(0,1fr) on both makes the note wrap instead. */}
          <div className="grid grid-cols-1 @xl:grid-cols-2 gap-4 @xl:items-start">
            <div>
              <Label
                htmlFor="pmiAnnualRatePct"
                className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-[var(--brand-green)] [overflow-wrap:anywhere]"
              >
                PMI / MIP rate %
                <span className="ml-1 normal-case font-normal text-muted-foreground">
                  (under 20% down)
                </span>
              </Label>
              <div className="relative max-w-[180px]">
                <Input
                  {...register("pmiAnnualRatePct", {
                    setValueAs: optionalNumberSetValueAs,
                  })}
                  id="pmiAnnualRatePct"
                  type="number"
                  inputMode="decimal"
                  step="0.05"
                  min={0}
                  max={5}
                  placeholder={usesOwnerOccupantPmiDefault ? "0.8" : "0"}
                  aria-invalid={!!errors.pmiAnnualRatePct}
                  aria-describedby={
                    errors.pmiAnnualRatePct
                      ? "pmiAnnualRatePct-error"
                      : undefined
                  }
                  className={cn(
                    "border-input bg-background pr-8 focus-visible:border-ring focus-visible:ring-ring",
                    errors.pmiAnnualRatePct && "border-destructive",
                  )}
                />
                <Percent className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              </div>
              <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground [overflow-wrap:anywhere]">
                {usesOwnerOccupantPmiDefault
                  ? "Annual mortgage insurance, % of loan. Owner-occupant screening default: 0.8%; replace it with the lender's premium or enter 0 if none."
                  : "Annual mortgage insurance, % of loan. No premium is assumed for an investment property when this is blank; enter the lender's rate if one applies."}
              </p>
              <FieldError
                id="pmiAnnualRatePct-error"
                message={errors.pmiAnnualRatePct?.message}
              />
            </div>

            {usesOwnerOccupantPmiDefault ? (
              <label
                htmlFor="pmiNoCancel"
                className="flex min-h-11 min-w-0 cursor-pointer select-none items-center gap-2.5 @xl:mt-7"
              >
                <input
                  {...register("pmiNoCancel")}
                  id="pmiNoCancel"
                  type="checkbox"
                  className="size-5 shrink-0 rounded border-input accent-[var(--brand-green)]"
                />
                <span className="min-w-0 text-xs leading-snug text-foreground [overflow-wrap:anywhere]">
                  Runs for the life of the loan
                  <span className="block text-[11px] text-muted-foreground">
                    Select for loan-life MIP; conventional PMI otherwise uses scheduled 78% termination.
                  </span>
                </span>
              </label>
            ) : (
              <p className="rounded-lg border border-amber-300/60 bg-amber-50 px-3 py-2 text-[11px] leading-relaxed text-amber-950 @xl:mt-7 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-100">
                Rental-loan mortgage insurance is conservatively modeled through payoff. Confirm any earlier cancellation in the written loan terms.
              </p>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
