"use client";

import { UseFormReturn, useFieldArray, useFormState } from "react-hook-form";
import { Building2, Plus, Trash2, DollarSign } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { InvestmentFormValues } from "@/lib/investcalc-schema";
import { cn } from "@/lib/utils";

interface MultiFamilyUnitsSectionProps {
  form: UseFormReturn<InvestmentFormValues>;
  isHouseHack?: boolean;
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="text-xs text-destructive mt-1">{message}</p>;
}

export function MultiFamilyUnitsSection({
  form,
  isHouseHack = false,
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
  const units = watch("units") ?? [];

  // `errors.units` is an array of per-index FieldErrors (see lib/investcalc-schema.ts).
  const unitsErrorsArray = Array.isArray(errors.units) ? errors.units : undefined;
  const hasAnyUnitFieldError = unitsErrorsArray?.some((entry) => entry && Object.keys(entry).length > 0) ?? false;
  const unitsArrayErrorMessage = hasAnyUnitFieldError
    ? isHouseHack
      ? "Each unit row must be complete. The owner row and every rental row need bedrooms, bathrooms, sq ft, and monthly rent (0 is ok for the owner unit)."
      : "Each unit row must be complete: bedrooms, bathrooms, sq ft, and monthly rent."
    : undefined;

  const handleAddUnit = () => {
    append({ bedrooms: undefined, bathrooms: undefined, sqft: undefined, monthlyRent: undefined, isOwnerOccupied: false });
  };

  const setOwnerOccupiedUnit = (index: number, checked: boolean) => {
    const nextUnits = (watch("units") ?? []).map((unit, unitIndex) => ({
      ...unit,
      isOwnerOccupied: checked ? unitIndex === index : unitIndex === index ? false : Boolean(unit?.isOwnerOccupied),
    }));
    setValue("units", nextUnits, { shouldDirty: true, shouldValidate: true });
  };

  return (
    <div className="bg-[var(--brand-blue-light)] rounded-2xl border border-primary/15 shadow-sm p-4 sm:p-6">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <Building2 className="w-4 h-4 text-primary" />
          <span className="font-semibold text-sm text-foreground">
            Units ({fields.length} total)
          </span>
        </div>
        <Button
          type="button"
          size="sm"
          onClick={handleAddUnit}
          className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg text-xs font-semibold"
        >
          <Plus className="w-3.5 h-3.5 mr-1" />
          Add Unit
        </Button>
      </div>

      <div className="space-y-4">
        {isHouseHack && (
          <p className="text-xs text-muted-foreground">
            Choose exactly one unit as the owner-occupied unit. All other completed units are treated as rentals.
          </p>
        )}
        {fields.map((field, index) => {
          const isOwner = isHouseHack && Boolean(units[index]?.isOwnerOccupied);
          const unitErrors = errors.units?.[index];

          return (
            <div
              key={field.id}
              className="bg-card rounded-xl border border-border p-4"
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-semibold text-foreground">
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
                    className="text-destructive hover:text-destructive/80 transition-colors p-1"
                    aria-label={`Remove unit ${index + 1}`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>

              {isHouseHack && (
                <div className="mb-4 flex items-center justify-between rounded-lg border border-border bg-muted/30 px-3 py-2.5">
                  <div>
                    <p className="text-sm font-medium text-foreground">Owner occupied unit</p>
                    <p className="text-[11px] text-muted-foreground">
                      Turn this on for the unit you live in.
                    </p>
                  </div>
                  <Switch
                    checked={isOwner}
                    onCheckedChange={(checked: boolean) => setOwnerOccupiedUnit(index, checked)}
                    aria-label={`Mark unit ${index + 1} as owner occupied`}
                  />
                </div>
              )}
              {isHouseHack && unitErrors?.isOwnerOccupied?.message ? (
                <FieldError message={unitErrors.isOwnerOccupied.message} />
              ) : null}

              <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <div>
                  <Label className="text-xs font-semibold text-primary mb-1 block uppercase tracking-wide">
                    Bedrooms
                  </Label>
                  <Input
                    {...register(`units.${index}.bedrooms`, { valueAsNumber: true })}
                    type="number"
                    placeholder="2"
                    className={cn(
                      "border-input bg-background text-sm h-9",
                      unitErrors?.bedrooms && "border-destructive"
                    )}
                  />
                  <FieldError message={unitErrors?.bedrooms?.message} />
                </div>

                <div>
                  <Label className="text-xs font-semibold text-primary mb-1 block uppercase tracking-wide">
                    Bathrooms
                  </Label>
                  <Input
                    {...register(`units.${index}.bathrooms`, { valueAsNumber: true })}
                    type="number"
                    placeholder="1"
                    className={cn(
                      "border-input bg-background text-sm h-9",
                      unitErrors?.bathrooms && "border-destructive"
                    )}
                  />
                  <FieldError message={unitErrors?.bathrooms?.message} />
                </div>

                <div>
                  <Label className="text-xs font-semibold text-primary mb-1 block uppercase tracking-wide">
                    Sq Ft
                  </Label>
                  <Input
                    {...register(`units.${index}.sqft`, { valueAsNumber: true })}
                    type="number"
                    placeholder="850"
                    className={cn(
                      "border-input bg-background text-sm h-9",
                      unitErrors?.sqft && "border-destructive"
                    )}
                  />
                  <FieldError message={unitErrors?.sqft?.message} />
                </div>

                <div>
                  <Label className="text-xs font-semibold text-primary mb-1 block uppercase tracking-wide">
                    {isOwner ? "Rent (Owner)" : "Monthly Rent"}
                  </Label>
                  <div className="relative">
                    <DollarSign className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                    <Input
                      {...register(`units.${index}.monthlyRent`, { valueAsNumber: true })}
                      type="number"
                      placeholder="1800"
                      className={cn(
                        "pl-7 border-input bg-background text-sm h-9",
                        unitErrors?.monthlyRent && "border-destructive"
                      )}
                    />
                  </div>
                  <FieldError message={unitErrors?.monthlyRent?.message} />
                </div>
              </div>
            </div>
          );
        })}
      </div>
      {typeof unitsArrayErrorMessage === "string" && (
        <p className="mt-3 text-xs text-destructive">{unitsArrayErrorMessage}</p>
      )}
    </div>
  );
}
