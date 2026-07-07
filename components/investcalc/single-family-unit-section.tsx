"use client";

import type { ReactNode } from "react";
import { UseFormReturn } from "react-hook-form";
import { Home, DollarSign, CalendarClock, Percent, Sofa } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { InvestmentFormValues } from "@/lib/investcalc-schema";
import { cn } from "@/lib/utils";
import { FieldError } from "@/components/investcalc/form-field-helpers";
import { GlossaryTip } from "@/components/investcalc/glossary-tip";

/**
 * Which fields to render:
 *  - "all"       → bedrooms, bathrooms, sqft, rent (default; backward compatible)
 *  - "primary"   → bedrooms + monthly rent only (the two the cash-flow run
 *                  actually needs - beds drives HUD rent auto-fill, rent is
 *                  required by the math). Shown on the minimal first screen.
 *  - "secondary" → bathrooms + square feet (optional; live in the advanced
 *                  assumptions region — the "Property extras" panel — so the
 *                  first screen stays minimal).
 */
type SingleFamilyFields = "all" | "primary" | "secondary";

interface SingleFamilyUnitSectionProps {
  form: UseFormReturn<InvestmentFormValues>;
  fields?: SingleFamilyFields;
  /** Hide the bedrooms field (strategy-focus mode - beds is optional). */
  hideBedrooms?: boolean;
  /** Override the "Monthly Rent" label (e.g. "Stabilized rent" for BRRRR). */
  rentLabel?: string;
  /** Short-term-rental income mode: collect nightly rate × occupancy (+ a
   *  one-time furnishing cost) instead of a hand-typed monthly rent. The
   *  monthly revenue is derived for display; calc-analysis recomputes it. */
  strMode?: boolean;
  /**
   * ADDITIVE chrome variant (calculator redesign Phase 4, hero unification):
   * "bare" drops this section's own card wrapper + "Unit Details" header so
   * the primary fields compose inside the hero's single bordered card (the
   * hero renders the "What does it earn?" group header above this mount).
   * Default ("card") keeps today's standalone chrome byte-identical for any
   * other mount (e.g. the fields="secondary" extras panel).
   */
  chrome?: "card" | "bare";
  /**
   * Extra grid cell(s) appended after this section's own fields — used by
   * the fields="secondary" "Property extras" panel to house the relocated
   * Year Built block (Phase 4: year built moved out of the hero). When set
   * on a secondary mount, the card header reads "Property extras" to match
   * the assumptions-strip chip that targets it.
   */
  extraFields?: ReactNode;
}

const currency0 = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

export function SingleFamilyUnitSection({
  form,
  fields = "all",
  hideBedrooms = false,
  rentLabel,
  strMode = false,
  chrome = "card",
  extraFields,
}: SingleFamilyUnitSectionProps) {
  const bare = chrome === "bare";
  const {
    register,
    formState: { errors },
  } = form;

  const showBeds = fields !== "secondary" && !hideBedrooms;
  // In STR mode the monthly-rent field is replaced by the nightly-rate +
  // occupancy inputs. Both blocks stay MOUNTED on the primary screen and are
  // CSS-toggled by strMode (STR-RENT-RESURRECTION): react-hook-form re-seeds
  // a REMOUNTED registered input from _defaultValues — stale after a draft /
  // saved-deal form.reset — so unmounting on a strategy switch silently
  // resurrected the old rent (or ADR) the strategy handler had just cleared,
  // and the live recompute repainted the verdict on hybrid math. display:none
  // keeps registration + the cleared values intact (the advanced block's
  // proven mounted-but-hidden pattern).
  const incomeMounted = fields !== "secondary";
  const showRent = incomeMounted && !strMode;
  const showBaths = fields !== "primary";
  const showSqft = fields !== "primary";

  // Live "≈ $X/mo" readout for the STR inputs (matches calc-analysis exactly:
  // ADR × 365 × occupancy / 12). Only shown on the primary screen, not the
  // secondary property-extras pass.
  const showStr = strMode && incomeMounted;
  const adrWatch = form.watch("avgDailyRate");
  const occWatch = form.watch("occupancyPct");
  const strMonthlyRevenue =
    typeof adrWatch === "number" &&
    adrWatch > 0 &&
    typeof occWatch === "number" &&
    occWatch > 0
      ? (adrWatch * 365 * (occWatch / 100)) / 12
      : null;

  // Rent is the one required number a first-timer often doesn't know, and
  // HUD auto-fill (keyed on bedroom count) silently misses on many
  // addresses. So the nudge shows whenever RENT is empty — not only when
  // beds are also empty — and adapts: no beds yet → "add beds to
  // auto-estimate"; beds present but still no rent (HUD missed or is
  // pending) → a concrete recovery path so the user is never stuck staring
  // at an empty required field with no next step (finding rent-1).
  const beds = form.watch("bedrooms");
  const rentVal = form.watch("monthlyRent");
  const rentEmpty = rentVal == null || Number.isNaN(rentVal);
  const bedsEmpty = beds == null || Number.isNaN(beds);
  const showRentNudge = showBeds && showRent && rentEmpty;
  const isSecondary = fields === "secondary";
  const visibleCount = [showBeds, showRent, showBaths, showSqft].filter(Boolean).length;
  const gridCols =
    visibleCount >= 3
      ? "grid-cols-2 sm:grid-cols-2 xl:grid-cols-4"
      : visibleCount === 2
        ? "grid-cols-2"
        : "grid-cols-1";

  return (
    <div className={bare ? undefined : "bg-card rounded-2xl border border-border shadow-sm p-6"}>
      {!bare ? (
        <div className="flex items-center gap-2 mb-5">
          <Home className="w-4 h-4 text-primary" />
          <span className="font-semibold text-sm text-foreground">
            {isSecondary ? (extraFields ? "Property extras" : "Bathrooms & size") : "Unit Details"}
          </span>
          {isSecondary ? (
            <span className="text-[11px] font-normal text-muted-foreground">(optional)</span>
          ) : null}
        </div>
      ) : null}

      <div className={cn("grid gap-4", gridCols)}>
        {showBeds ? (
          <div>
            <Label htmlFor="bedrooms" className="text-xs font-semibold text-primary mb-1.5 block uppercase tracking-wide">
              Bedrooms
            </Label>
            <Input
              {...register("bedrooms", { valueAsNumber: true })}
              id="bedrooms"
              type="number"
              inputMode="numeric"
              placeholder="3"
              aria-invalid={!!errors.bedrooms}
              aria-describedby={errors.bedrooms ? "bedrooms-error" : undefined}
              className={cn(
                "border-input bg-background",
                errors.bedrooms && "border-destructive"
              )}
            />
            <FieldError id="bedrooms-error" message={errors.bedrooms?.message} />
          </div>
        ) : null}

        {incomeMounted ? (
          <div className={cn(!showRent && "hidden")}>
            <Label htmlFor="monthlyRent" className="text-xs font-semibold text-primary mb-1.5 block uppercase tracking-wide">
              <GlossaryTip term="onePercentRule" showIcon={false}>{rentLabel ?? "Monthly Rent"}</GlossaryTip>
            </Label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                {...register("monthlyRent", { valueAsNumber: true })}
                id="monthlyRent"
                type="number"
                inputMode="decimal"
                step="0.01"
                placeholder="2800"
                aria-required="true"
                aria-invalid={!!errors.monthlyRent}
                aria-describedby={errors.monthlyRent ? "monthlyRent-error" : undefined}
                className={cn(
                  "pl-8 border-input bg-background",
                  errors.monthlyRent && "border-destructive"
                )}
              />
            </div>
            <FieldError id="monthlyRent-error" message={errors.monthlyRent?.message} />
            {showRentNudge ? (
              <p className="mt-1 text-[11px] text-muted-foreground">
                {bedsEmpty
                  ? "Add bedrooms to auto-estimate rent (HUD area data)."
                  : "No rent estimate for this address? Type your expected monthly rent — Zillow/Rentometer's estimate for the ZIP is a good start."}
              </p>
            ) : null}
          </div>
        ) : null}

        {showBaths ? (
          <div>
            <Label htmlFor="bathrooms" className="text-xs font-semibold text-primary mb-1.5 block uppercase tracking-wide">
              Bathrooms
            </Label>
            <Input
              {...register("bathrooms", { valueAsNumber: true })}
              id="bathrooms"
              type="number"
              inputMode="decimal"
              placeholder="2"
              aria-invalid={!!errors.bathrooms}
              aria-describedby={errors.bathrooms ? "bathrooms-error" : undefined}
              className={cn(
                "border-input bg-background",
                errors.bathrooms && "border-destructive"
              )}
            />
            <FieldError id="bathrooms-error" message={errors.bathrooms?.message} />
          </div>
        ) : null}

        {showSqft ? (
          <div>
            <Label htmlFor="sqft" className="text-xs font-semibold text-primary mb-1.5 block uppercase tracking-wide">
              Square Feet
            </Label>
            <Input
              {...register("sqft", { valueAsNumber: true })}
              id="sqft"
              type="number"
              inputMode="numeric"
              placeholder="1850"
              aria-invalid={!!errors.sqft}
              aria-describedby={errors.sqft ? "sqft-error" : undefined}
              className={cn(
                "border-input bg-background",
                errors.sqft && "border-destructive"
              )}
            />
            <FieldError id="sqft-error" message={errors.sqft?.message} />
          </div>
        ) : null}

        {/* Relocated Year Built block (Phase 4) — appended as the panel's
            last grid cell so "Property extras" is one card, not two. */}
        {extraFields}
      </div>

      {incomeMounted ? (
        <div className={cn("mt-4 rounded-xl border border-border bg-muted/30 p-4", !showStr && "hidden")}>
          <div className="flex items-center gap-2 mb-3">
            <CalendarClock className="w-4 h-4 text-primary" />
            <span className="text-xs font-semibold text-foreground uppercase tracking-wide">
              Short-term rental income
            </span>
          </div>
          <div className="grid gap-4 grid-cols-2 sm:grid-cols-3">
            <div>
              <Label htmlFor="avgDailyRate" className="text-xs font-semibold text-primary mb-1.5 block uppercase tracking-wide">
                Nightly rate
              </Label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  {...register("avgDailyRate", { valueAsNumber: true })}
                  id="avgDailyRate"
                  type="number"
                  inputMode="decimal"
                  step="0.01"
                  placeholder="220"
                  aria-required="true"
                  aria-invalid={!!errors.avgDailyRate}
                  aria-describedby={errors.avgDailyRate ? "avgDailyRate-error" : undefined}
                  className={cn("pl-8 border-input bg-background", errors.avgDailyRate && "border-destructive")}
                />
              </div>
              <FieldError id="avgDailyRate-error" message={errors.avgDailyRate?.message} />
            </div>

            <div>
              <Label htmlFor="occupancyPct" className="text-xs font-semibold text-primary mb-1.5 block uppercase tracking-wide">
                Occupancy
              </Label>
              <div className="relative">
                <Percent className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  {...register("occupancyPct", { valueAsNumber: true })}
                  id="occupancyPct"
                  type="number"
                  inputMode="decimal"
                  step="1"
                  placeholder="65"
                  aria-required="true"
                  aria-invalid={!!errors.occupancyPct}
                  aria-describedby={errors.occupancyPct ? "occupancyPct-error" : undefined}
                  className={cn("pl-8 border-input bg-background", errors.occupancyPct && "border-destructive")}
                />
              </div>
              <FieldError id="occupancyPct-error" message={errors.occupancyPct?.message} />
            </div>

            <div>
              <Label htmlFor="strFurnishingCost" className="text-xs font-semibold text-primary mb-1.5 block uppercase tracking-wide">
                Furnishing
                <span className="ml-1 normal-case font-normal text-muted-foreground">(one-time)</span>
              </Label>
              <div className="relative">
                <Sofa className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  {...register("strFurnishingCost", { valueAsNumber: true })}
                  id="strFurnishingCost"
                  type="number"
                  inputMode="decimal"
                  step="100"
                  placeholder="15000"
                  aria-invalid={!!errors.strFurnishingCost}
                  aria-describedby={errors.strFurnishingCost ? "strFurnishingCost-error" : undefined}
                  className={cn("pl-8 border-input bg-background", errors.strFurnishingCost && "border-destructive")}
                />
              </div>
              <FieldError id="strFurnishingCost-error" message={errors.strFurnishingCost?.message} />
            </div>
          </div>
          <p className="mt-3 text-[11px] text-muted-foreground" aria-live="polite">
            {strMonthlyRevenue != null ? (
              <>
                ≈ <span className="font-semibold text-foreground">{currency0.format(strMonthlyRevenue)}/mo</span> revenue
                {" "}(nightly × occupancy × 365 ÷ 12). Furnishing is added to cash invested.
              </>
            ) : (
              <>Enter a nightly rate and occupancy — we&apos;ll model the monthly revenue (ADR × occupancy).</>
            )}
          </p>
        </div>
      ) : null}
    </div>
  );
}
