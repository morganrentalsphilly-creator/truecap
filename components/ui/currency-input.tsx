"use client";

import * as React from "react";
import { Input } from "@/components/ui/input";

const integerFormatter = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 0,
});

/** Parse display text without ever storing commas or currency symbols in the
 * calculation form. Empty text remains undefined so RHF/Zod can show the
 * field's own required message. */
export function parseCurrencyInput(value: string): number | undefined {
  const normalized = value.replace(/[^0-9.]/g, "");
  if (!normalized) return undefined;
  const firstDot = normalized.indexOf(".");
  const canonical =
    firstDot < 0
      ? normalized
      : `${normalized.slice(0, firstDot)}.${normalized.slice(firstDot + 1).replace(/\./g, "")}`;
  const parsed = Number(canonical);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export function formatCurrencyInput(value: number | null | undefined): string {
  return typeof value === "number" && Number.isFinite(value) ? integerFormatter.format(value) : "";
}

type CurrencyInputProps = Omit<
  React.ComponentProps<typeof Input>,
  "type" | "value" | "defaultValue" | "onChange"
> & {
  value: number | null | undefined;
  onValueChange: (value: number | undefined) => void;
};

export const CurrencyInput = React.forwardRef<HTMLInputElement, CurrencyInputProps>(
  ({ value, onValueChange, onBlur, ...props }, ref) => (
    <Input
      {...props}
      ref={ref}
      type="text"
      inputMode="numeric"
      autoComplete="off"
      value={formatCurrencyInput(value)}
      onChange={(event) => onValueChange(parseCurrencyInput(event.currentTarget.value))}
      onBlur={onBlur}
    />
  )
);
CurrencyInput.displayName = "CurrencyInput";
