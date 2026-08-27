"use client";

import { useEffect, useId, useMemo, useState } from "react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { MaoTarget } from "@/lib/max-allowable-offer";
import {
  EMPTY_MAO_TARGET_ERROR,
  MAO_TARGET_BOUNDS,
  maoTargetFingerprint,
  type MaoTargetField,
} from "@/lib/mao-target-editor";

const FIELDS = [
  ["capRate", "Target cap rate (%)"],
  ["cocReturn", "Target cash-on-cash (%)"],
  ["monthlyCashFlow", "Min cash flow ($/mo)"],
  ["dscr", "Min DSCR"],
  ["maxPurchasePrice", "Max purchase price ($)"],
] as const satisfies ReadonlyArray<readonly [MaoTargetField, string]>;

type Inputs = Record<MaoTargetField, string>;

function inputsFromTarget(target: MaoTarget): Inputs {
  return {
    capRate: target.capRate == null ? "" : String(target.capRate),
    cocReturn: target.cocReturn == null ? "" : String(target.cocReturn),
    monthlyCashFlow:
      target.monthlyCashFlow == null ? "" : String(target.monthlyCashFlow),
    dscr: target.dscr == null ? "" : String(target.dscr),
    maxPurchasePrice:
      target.maxPurchasePrice == null ? "" : String(target.maxPurchasePrice),
  };
}

function validate(
  inputs: Inputs,
  isCashPurchase: boolean,
): {
  target: MaoTarget | null;
  errors: Partial<Record<MaoTargetField, string>>;
  formError: string | null;
} {
  const target: MaoTarget = {};
  const errors: Partial<Record<MaoTargetField, string>> = {};
  for (const [field] of FIELDS) {
    if (isCashPurchase && field === "dscr") continue;
    const raw = inputs[field].trim();
    if (!raw) continue;
    const value = Number(raw);
    const bounds = MAO_TARGET_BOUNDS[field];
    if (!Number.isFinite(value) || value < bounds.min || value > bounds.max) {
      errors[field] =
        `${bounds.label} must be between ${bounds.min.toLocaleString()} and ${bounds.max.toLocaleString()}.`;
      continue;
    }
    const steps = (value - bounds.min) / bounds.step;
    if (Math.abs(steps - Math.round(steps)) > 1e-8) {
      errors[field] = `${bounds.label} must use increments of ${bounds.step}.`;
      continue;
    }
    target[field] = value;
  }
  if (Object.keys(errors).length > 0) {
    return { target: null, errors, formError: null };
  }
  if (!Object.values(target).some((value) => value !== undefined)) {
    return { target: null, errors, formError: EMPTY_MAO_TARGET_ERROR };
  }
  return { target, errors, formError: null };
}

/** Atomic target editor shown before the first Offer Ceiling calculation. */
export function PreRunCriteriaEditor({
  target,
  isCashPurchase,
  onChange,
}: {
  target: MaoTarget;
  isCashPurchase: boolean;
  /** Reports the exact live draft used by the primary Analyze action. A null
   * target means the draft is currently invalid and the run must stay gated. */
  onChange: (target: MaoTarget | null, dirty: boolean) => void;
}) {
  const uid = useId();
  const targetKey = maoTargetFingerprint(target);
  const [inputs, setInputs] = useState<Inputs>(() => inputsFromTarget(target));
  useEffect(() => {
    setInputs(inputsFromTarget(target));
  }, [targetKey, target]);
  const validation = useMemo(
    () => validate(inputs, isCashPurchase),
    [inputs, isCashPurchase],
  );
  const validationTargetKey = maoTargetFingerprint(validation.target);
  const dirty = validationTargetKey !== targetKey;
  useEffect(() => {
    onChange(validation.target, dirty);
  }, [dirty, onChange, validationTargetKey, validation.target]);

  return (
    <fieldset className="space-y-4">
      <legend className="text-sm font-bold text-foreground">
        Adjust criteria before calculating
      </legend>
      <p className="-mt-3 text-xs leading-relaxed text-muted-foreground">
        Leave a field blank to ignore it. The main Analyze button uses the exact
        values below for this analysis.
      </p>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {FIELDS.map(([field, label]) => {
          const bounds = MAO_TARGET_BOUNDS[field];
          const inputId = `${uid}-${field}`;
          const errorId = `${inputId}-error`;
          const cashDscr = isCashPurchase && field === "dscr";
          return (
            <div key={field}>
              <Label htmlFor={inputId} className="text-xs">
                {label}
              </Label>
              <Input
                id={inputId}
                type="number"
                inputMode={
                  field === "monthlyCashFlow" || field === "maxPurchasePrice"
                    ? "numeric"
                    : "decimal"
                }
                min={bounds.min}
                max={bounds.max}
                step={bounds.step}
                value={cashDscr ? "" : inputs[field]}
                placeholder={cashDscr ? "N/A — cash" : "Any"}
                disabled={cashDscr}
                onChange={(event) => {
                  const nextInputs = {
                    ...inputs,
                    [field]: event.target.value,
                  };
                  setInputs(nextInputs);
                  const nextValidation = validate(nextInputs, isCashPurchase);
                  onChange(
                    nextValidation.target,
                    maoTargetFingerprint(nextValidation.target) !== targetKey,
                  );
                }}
                aria-invalid={Boolean(validation.errors[field])}
                aria-describedby={
                  validation.errors[field] ? errorId : undefined
                }
                className="mt-1 h-11 bg-background"
              />
              {validation.errors[field] ? (
                <p
                  id={errorId}
                  role="alert"
                  className="mt-1 text-xs font-medium text-destructive"
                >
                  {validation.errors[field]}
                </p>
              ) : null}
            </div>
          );
        })}
      </div>
      {validation.formError ? (
        <p role="alert" className="text-xs font-medium text-destructive">
          Choose at least one criterion before calculating an Offer Ceiling.
        </p>
      ) : null}
    </fieldset>
  );
}
