"use client";

import * as React from "react";
import { Input } from "@/components/ui/input";

const currencyFormatter = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 2,
});

/**
 * Parse display text without ever storing commas or currency symbols in the
 * calculation form.
 *
 * `null` is deliberately reserved for a genuinely empty field. React Hook
 * Form treats `undefined` from a controlled field as "no update", which can
 * leave the previous numeric value in form state while the textbox looks
 * empty. Committing `null` makes the cleared state explicit so Zod can produce
 * the field's required message and a submit can never reuse the old amount.
 *
 * `undefined` means the text is ambiguous/invalid and must not be committed.
 * Inputs such as `1e6`, `12..5`, or `-$500` are rejected rather than silently
 * being reinterpreted as 16, 12.5, or 500.
 */
export function parseCurrencyInput(value: string): number | null | undefined {
  const trimmed = value.trim();
  if (trimmed === "") return null;

  // A leading currency symbol and grouping commas are the only non-numeric
  // characters accepted. Commas may be temporarily regrouped while editing a
  // controlled, auto-formatted value (for example `385,0000` while appending a
  // zero), but every other character is rejected instead of stripped.
  const match = trimmed.match(/^\$?\s*([0-9][0-9,]*)(?:\.([0-9]{0,2}))?$/);
  if (!match) return undefined;

  const integer = match[1].replace(/,/g, "");
  const fraction = match[2];
  const canonical = fraction === undefined ? integer : `${integer}.${fraction}`;
  const parsed = Number(canonical);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export function formatCurrencyInput(value: number | null | undefined): string {
  return typeof value === "number" && Number.isFinite(value)
    ? currencyFormatter.format(value)
    : "";
}

export type CurrencyDraftUpdate =
  | { accepted: true; display: string; value: number | null }
  | { accepted: false; display: string };

/**
 * Keep a syntactically valid in-progress string on screen while separately
 * committing its numeric meaning. In particular, `1,234.` must remain visible
 * long enough for the user to type cents; formatting the numeric 1234 after
 * every keystroke would erase the decimal point and turn the next digit into
 * an integer digit.
 */
export function updateCurrencyDraft(
  currentDisplay: string,
  nextDisplay: string,
): CurrencyDraftUpdate {
  const parsed = parseCurrencyInput(nextDisplay);
  if (parsed === undefined) {
    return { accepted: false, display: currentDisplay };
  }
  return { accepted: true, display: nextDisplay, value: parsed };
}

type CurrencyInputProps = Omit<
  React.ComponentProps<typeof Input>,
  "type" | "value" | "defaultValue" | "onChange"
> & {
  value: number | null | undefined;
  onValueChange: (value: number | null) => void;
};

export const CurrencyInput = React.forwardRef<HTMLInputElement, CurrencyInputProps>(
  ({ value, onValueChange, onBlur, onFocus, ...props }, ref) => {
    const [isEditing, setIsEditing] = React.useState(false);
    const [display, setDisplay] = React.useState(() =>
      formatCurrencyInput(value),
    );
    const latestNumericValueRef = React.useRef<number | null | undefined>(
      value,
    );

    React.useEffect(() => {
      // A parent reset/reopen while focused must still win. A prop update that
      // merely acknowledges our own latest keystroke must not erase a trailing
      // decimal or typed zero from the in-progress display.
      if (!isEditing || value !== latestNumericValueRef.current) {
        latestNumericValueRef.current = value;
        setDisplay(formatCurrencyInput(value));
      }
    }, [isEditing, value]);

    return (
      <Input
        {...props}
        ref={ref}
        type="text"
        inputMode="decimal"
        autoComplete="off"
        value={display}
        onFocus={(event) => {
          setIsEditing(true);
          setDisplay(formatCurrencyInput(value));
          onFocus?.(event);
        }}
        onChange={(event) => {
          const update = updateCurrencyDraft(
            display,
            event.currentTarget.value,
          );
          if (!update.accepted) return;
          setDisplay(update.display);
          latestNumericValueRef.current = update.value;
          onValueChange(update.value);
        }}
        onBlur={(event) => {
          setIsEditing(false);
          setDisplay(formatCurrencyInput(latestNumericValueRef.current));
          onBlur?.(event);
        }}
      />
    );
  },
);
CurrencyInput.displayName = "CurrencyInput";
