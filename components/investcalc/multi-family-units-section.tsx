"use client";

import { useEffect, useMemo, useRef } from "react";
import {
  Controller,
  UseFormReturn,
  useFieldArray,
  useFormState,
} from "react-hook-form";
import { Building2, Plus, Trash2, DollarSign } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { InvestmentFormValues } from "@/lib/investcalc-schema";
import {
  checkUnitRentsAgainstFmr,
  unitRentHint,
} from "@/lib/multi-family-rent-check";
import { cn } from "@/lib/utils";
import { FieldError } from "@/components/investcalc/form-field-helpers";
import { CurrencyInput } from "@/components/ui/currency-input";
import {
  applyHouseHackOwnerUnitSelection,
  type HouseHackOwnerRentStash,
} from "@/lib/house-hack-owner-unit";

interface MultiFamilyUnitsSectionProps {
  form: UseFormReturn<InvestmentFormValues>;
  isHouseHack?: boolean;
  /**
   * HUD FMR keyed by bedroom count for the entered address (fetched by the
   * page's enrichment flow). Powers the passive rent reality-check below —
   * a nudge mirroring the single-family whisper, never a validation error.
   * null/absent = no address yet or lookup failed → renders nothing.
   */
  fmrByBedrooms?: Record<number, number> | null;
  /**
   * ADDITIVE chrome variant (redesign Phase 4, hero unification — same
   * contract as PropertyDetailsSection/SingleFamilyUnitSection): "bare"
   * drops this section's own card wrapper so the unit rows compose inside
   * the hero's single bordered card (the hero's "What does it earn?"
   * header replaces the card header; the units count + validation badge +
   * Add Unit row stay). Default ("card") is byte-identical to before.
   */
  chrome?: "card" | "bare";
}

export function MultiFamilyUnitsSection({
  form,
  isHouseHack = false,
  fmrByBedrooms = null,
  chrome = "card",
}: MultiFamilyUnitsSectionProps) {
  const { register, control, watch, setValue } = form;

  // Subscribe to form errors explicitly so nested `units[i].field` updates re-render
  // this list (reading `form.formState.errors` from a passed `UseFormReturn` alone
  // can miss deep array field error updates in some cases).
  const { errors } = useFormState({ control });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "units",
  });
  const ownerRentStashRef = useRef<HouseHackOwnerRentStash>({});
  const watchedUnits = watch("units");
  const units = useMemo(() => watchedUnits ?? [], [watchedUnits]);

  // Historical house-hack snapshots may contain a nominal rent on the owner
  // row even though calc-analysis has always excluded that row. Normalize the
  // form state to the visible $0 contract so saves, reports, and the editor do
  // not carry a contradictory hidden value forward.
  useEffect(() => {
    if (!isHouseHack) return;
    const currentUnits = form.getValues("units") ?? [];
    if (
      !currentUnits.some(
        (unit) => unit?.isOwnerOccupied && unit.monthlyRent !== 0,
      )
    ) {
      return;
    }
    form.setValue(
      "units",
      currentUnits.map((unit) =>
        unit?.isOwnerOccupied ? { ...unit, monthlyRent: 0 } : unit,
      ),
      { shouldDirty: false, shouldValidate: true },
    );
  }, [form, isHouseHack, units]);

  // `errors.units` is an array of per-index FieldErrors (see lib/investcalc-schema.ts).
  const unitsErrorsArray = Array.isArray(errors.units)
    ? errors.units
    : undefined;
  const hasAnyUnitFieldError =
    unitsErrorsArray?.some((entry) => entry && Object.keys(entry).length > 0) ??
    false;
  const unitsArrayErrorMessage = hasAnyUnitFieldError
    ? isHouseHack
      ? "Fix the highlighted unit value. Only rental-unit rent is required; the owner unit is fixed at $0 income."
      : "Fix the highlighted unit value. Only monthly rent is required; property facts stay optional."
    : undefined;

  // HUD rent reality-check (multi-family mirror of the single-family
  // whisper). Pure comparison over the watched units + the per-bedroom FMR
  // benchmarks; produces per-unit verdicts (inline hint only when a unit is
  // FAR off market) and a one-line rollup. Passive text, matching the
  // single-family precedent — never dismissible chrome, never a blocker.
  const rentCheck = checkUnitRentsAgainstFmr(units, fmrByBedrooms);

  const handleAddUnit = () => {
    append({
      bedrooms: undefined,
      bathrooms: undefined,
      sqft: undefined,
      monthlyRent: undefined,
      isOwnerOccupied: false,
    });
  };

  const setOwnerOccupiedUnit = (index: number, checked: boolean) => {
    const selection = applyHouseHackOwnerUnitSelection({
      units: watch("units") ?? [],
      unitKeys: fields.map((field) => field.id),
      selectedIndex: index,
      checked,
      stashedRents: ownerRentStashRef.current,
    });
    ownerRentStashRef.current = selection.stashedRents;
    setValue("units", selection.units, {
      shouldDirty: true,
      shouldValidate: true,
    });
  };

  // Inline validation derived from current form state - surfaces issues
  // BEFORE the user hits Calculate. Two checks: (a) at least one unit
  // exists at all (otherwise the calc has nothing to score), (b) for
  // house-hack property type, exactly one unit must be flagged
  // owner-occupied. Previously these failures only surfaced on submit
  // via a toast, which felt punishing - the user had filled in
  // everything else and only then learned the form was incomplete.
  const ownerOccupiedCount = units.filter((u) => u?.isOwnerOccupied).length;
  const validationMessage = (() => {
    if (fields.length === 0) return "Add at least one unit to score this deal.";
    if (isHouseHack && ownerOccupiedCount === 0) {
      return "Pick exactly one unit you'll live in.";
    }
    if (isHouseHack && ownerOccupiedCount > 1) {
      return "Only one unit can be marked owner-occupied.";
    }
    return null;
  })();

  return (
    // "bare" (hero mount): no own card — the hero's border/padding wrap it.
    <div
      className={
        chrome === "bare"
          ? undefined
          : "bg-card rounded-2xl border border-border shadow-sm p-4 sm:p-6"
      }
    >
      <div className="mb-5 flex flex-col gap-3 min-[280px]:flex-row min-[280px]:items-start min-[280px]:justify-between">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          {chrome === "bare" ? null : (
            <Building2 className="w-4 h-4 text-primary" />
          )}
          <span
            className={
              chrome === "bare"
                ? "text-xs font-semibold text-muted-foreground"
                : "font-semibold text-sm text-foreground"
            }
          >
            Units ({fields.length} total)
          </span>
          {/* Inline validation badge. Shows ONLY when there's an
              actionable issue - once the user resolves it, the badge
              quietly disappears. Color tracks severity: amber for
              "needs attention" (not red, since the form isn't yet
              submitted). */}
          {validationMessage ? (
            <span
              role="status"
              aria-live="polite"
              className="inline-flex min-w-0 max-w-full items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700 [overflow-wrap:anywhere]"
            >
              <span aria-hidden="true">●</span>
              {validationMessage}
            </span>
          ) : null}
        </div>
        <Button
          type="button"
          size="sm"
          onClick={handleAddUnit}
          className="h-auto min-h-11 w-full whitespace-normal rounded-lg bg-primary py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90 min-[280px]:w-auto"
        >
          <Plus className="w-3.5 h-3.5 mr-1" />
          Add Unit
        </Button>
      </div>

      <div className="space-y-4">
        {isHouseHack && (
          <p className="text-xs text-muted-foreground">
            Choose exactly one unit to live in. Its rent is fixed at $0 and is
            not counted as rental income; enter rent only for the units you will
            lease.
          </p>
        )}
        {fields.map((field, index) => {
          const isOwner = isHouseHack && Boolean(units[index]?.isOwnerOccupied);
          const unitErrors = errors.units?.[index];
          // Inline reality-check hint - only when this unit's rent is FAR
          // off the HUD benchmark for its bedroom count (mild gaps are
          // covered by the rollup line under the section).
          const unitVerdict = rentCheck.verdicts.find(
            (v) => v.unitIndex === index,
          );
          const rentHint = unitVerdict ? unitRentHint(unitVerdict) : null;

          return (
            <fieldset
              key={field.id}
              className="min-w-0 rounded-xl border border-border bg-card p-4"
            >
              <legend className="sr-only">
                Unit {index + 1}
                {isOwner
                  ? ", owner occupied"
                  : isHouseHack
                    ? ", rental unit"
                    : ""}
              </legend>
              <div className="mb-3 flex min-w-0 items-start justify-between gap-2">
                <span
                  aria-hidden="true"
                  className="min-w-0 flex-1 text-sm font-semibold text-foreground [overflow-wrap:anywhere]"
                >
                  Unit {index + 1}
                  {isOwner && (
                    <span className="ml-2 text-xs text-[var(--brand-orange)] font-medium">
                      (Owner Occupied)
                    </span>
                  )}
                </span>
                {fields.length > 1 && (
                  <button
                    type="button"
                    onClick={() => remove(index)}
                    className="-mr-2 flex size-11 shrink-0 items-center justify-center rounded-lg text-destructive transition-colors hover:text-destructive/80"
                    aria-label={`Remove unit ${index + 1}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>

              {isHouseHack && (
                <div className="mb-4 flex flex-col gap-2 rounded-lg border border-border bg-muted/30 px-3 py-2.5 min-[320px]:flex-row min-[320px]:items-center min-[320px]:justify-between">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground">
                      Owner occupied unit
                    </p>
                    <p className="text-[11px] text-muted-foreground [overflow-wrap:anywhere]">
                      Turn this on for the unit you live in.
                    </p>
                  </div>
                  <Switch
                    checked={isOwner}
                    onCheckedChange={(checked: boolean) =>
                      setOwnerOccupiedUnit(index, checked)
                    }
                    aria-label={`Mark unit ${index + 1} as owner occupied`}
                    className="self-end min-[320px]:self-auto"
                  />
                </div>
              )}
              {isHouseHack && unitErrors?.isOwnerOccupied?.message ? (
                <FieldError message={unitErrors.isOwnerOccupied.message} />
              ) : null}

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <div>
                  <Label
                    htmlFor={`unit-${index}-bedrooms`}
                    className="text-xs font-semibold text-primary mb-1 block uppercase tracking-wide"
                  >
                    Bedrooms{" "}
                    <span className="font-normal normal-case tracking-normal text-muted-foreground">
                      · optional
                    </span>
                  </Label>
                  <Input
                    {...register(`units.${index}.bedrooms`, {
                      valueAsNumber: true,
                    })}
                    id={`unit-${index}-bedrooms`}
                    type="number"
                    inputMode="numeric"
                    min={0}
                    max={20}
                    step={1}
                    placeholder="2"
                    aria-invalid={!!unitErrors?.bedrooms}
                    aria-describedby={
                      unitErrors?.bedrooms
                        ? `unit-${index}-bedrooms-error`
                        : undefined
                    }
                    className={cn(
                      "h-11 border-input bg-background text-base md:text-sm",
                      unitErrors?.bedrooms && "border-destructive",
                    )}
                  />
                  <FieldError
                    id={`unit-${index}-bedrooms-error`}
                    message={unitErrors?.bedrooms?.message}
                  />
                </div>

                <div>
                  <Label
                    htmlFor={`unit-${index}-bathrooms`}
                    className="text-xs font-semibold text-primary mb-1 block uppercase tracking-wide"
                  >
                    Bathrooms{" "}
                    <span className="font-normal normal-case tracking-normal text-muted-foreground">
                      · optional
                    </span>
                  </Label>
                  <Input
                    {...register(`units.${index}.bathrooms`, {
                      valueAsNumber: true,
                    })}
                    id={`unit-${index}-bathrooms`}
                    type="number"
                    inputMode="decimal"
                    min={0}
                    max={20}
                    step={0.5}
                    placeholder="1"
                    aria-invalid={!!unitErrors?.bathrooms}
                    aria-describedby={
                      unitErrors?.bathrooms
                        ? `unit-${index}-bathrooms-error`
                        : undefined
                    }
                    className={cn(
                      "h-11 border-input bg-background text-base md:text-sm",
                      unitErrors?.bathrooms && "border-destructive",
                    )}
                  />
                  <FieldError
                    id={`unit-${index}-bathrooms-error`}
                    message={unitErrors?.bathrooms?.message}
                  />
                </div>

                <div>
                  <Label
                    htmlFor={`unit-${index}-sqft`}
                    className="text-xs font-semibold text-primary mb-1 block uppercase tracking-wide"
                  >
                    Sq Ft{" "}
                    <span className="font-normal normal-case tracking-normal text-muted-foreground">
                      · optional
                    </span>
                  </Label>
                  <Input
                    {...register(`units.${index}.sqft`, {
                      valueAsNumber: true,
                    })}
                    id={`unit-${index}-sqft`}
                    type="number"
                    inputMode="decimal"
                    min={50}
                    max={100_000}
                    step={1}
                    placeholder="850"
                    aria-invalid={!!unitErrors?.sqft}
                    aria-describedby={
                      unitErrors?.sqft ? `unit-${index}-sqft-error` : undefined
                    }
                    className={cn(
                      "h-11 border-input bg-background text-base md:text-sm",
                      unitErrors?.sqft && "border-destructive",
                    )}
                  />
                  <FieldError
                    id={`unit-${index}-sqft-error`}
                    message={unitErrors?.sqft?.message}
                  />
                </div>

                <div>
                  <Label
                    htmlFor={`unit-${index}-monthlyRent`}
                    className="text-xs font-semibold text-primary mb-1 block uppercase tracking-wide"
                  >
                    {isOwner ? "Owner unit rent" : "Monthly Rent"}
                  </Label>
                  <div className="relative">
                    <DollarSign className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                    {isOwner ? (
                      <Input
                        id={`unit-${index}-monthlyRent`}
                        value="0"
                        readOnly
                        aria-readonly="true"
                        aria-describedby={`unit-${index}-owner-rent-help`}
                        className="h-11 cursor-not-allowed border-input bg-muted/50 pl-7 text-base text-muted-foreground md:text-sm"
                      />
                    ) : (
                      <Controller
                        control={control}
                        name={`units.${index}.monthlyRent`}
                        render={({ field }) => (
                          <CurrencyInput
                            ref={field.ref}
                            name={field.name}
                            value={field.value}
                            onBlur={field.onBlur}
                            onValueChange={field.onChange}
                            id={`unit-${index}-monthlyRent`}
                            min={0}
                            max={1_000_000}
                            step={50}
                            placeholder="1,800"
                            aria-invalid={!!unitErrors?.monthlyRent}
                            aria-describedby={
                              unitErrors?.monthlyRent
                                ? `unit-${index}-monthlyRent-error`
                                : undefined
                            }
                            className={cn(
                              "h-11 border-input bg-background pl-7 text-base md:text-sm",
                              unitErrors?.monthlyRent && "border-destructive",
                            )}
                          />
                        )}
                      />
                    )}
                  </div>
                  {isOwner ? (
                    <p
                      id={`unit-${index}-owner-rent-help`}
                      className="mt-1 text-[11px] leading-relaxed text-muted-foreground"
                    >
                      Fixed at $0 and not counted as rental income.
                    </p>
                  ) : null}
                  <FieldError
                    id={`unit-${index}-monthlyRent-error`}
                    message={unitErrors?.monthlyRent?.message}
                  />
                </div>
              </div>

              {rentHint ? (
                <p
                  className={cn(
                    "mt-2 text-[11px] leading-relaxed",
                    unitVerdict?.verdict === "above"
                      ? "text-amber-700"
                      : "text-muted-foreground",
                  )}
                >
                  {rentHint}
                </p>
              ) : null}
            </fieldset>
          );
        })}
      </div>
      {/* Rollup line for the HUD rent reality-check. Passive (matches the
          single-family whisper) - it reads as information, not an error,
          so it must not share styling with the validation message below. */}
      {rentCheck.rollup ? (
        <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
          {rentCheck.rollup}
        </p>
      ) : null}
      {typeof unitsArrayErrorMessage === "string" && (
        <p className="mt-3 text-xs text-destructive">
          {unitsArrayErrorMessage}
        </p>
      )}
    </div>
  );
}
