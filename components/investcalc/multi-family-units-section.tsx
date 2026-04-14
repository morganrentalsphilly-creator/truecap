"use client";

import { UseFormReturn, useFieldArray } from "react-hook-form";
import { Building2, Plus, Trash2, DollarSign } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
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
  const {
    register,
    control,
    formState: { errors },
  } = form;

  const { fields, append, remove } = useFieldArray({
    control,
    name: "units",
  });

  const handleAddUnit = () => {
    append({ bedrooms: 1, bathrooms: 1, sqft: 650, monthlyRent: 1200 });
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
        {fields.map((field, index) => {
          const isOwner = isHouseHack && index === 0;
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
    </div>
  );
}
