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

/**
 * Recover a number from text pasted out of a listing.
 *
 * parseCurrencyInput is deliberately strict: it rejects rather than strips, so
 * a stray character cannot silently change the number a user is underwriting.
 * That is right for TYPING. It is wrong for PASTING, because updateCurrencyDraft
 * answers a rejected edit by re-showing the previous display — so pasting
 * "$450K" or "450,000 USD" off Zillow did nothing at all, with no cursor
 * movement, no error, and no clue why. The field looked broken.
 *
 * This only handles shapes with ONE unambiguous reading. A K/M suffix, a
 * currency code, surrounding whitespace (including the non-breaking space that
 * rides along with most web copy), and trailing noise like "/mo" or "*" all
 * resolve to exactly one number. Anything with two numbers in it ("$450,000 -
 * $475,000") stays rejected, because guessing which one the user meant is how
 * you underwrite the wrong price.
 */
export function parsePastedCurrency(raw: string): number | null {
  let text = raw.replace(/\u00a0/g, " ").trim();
  if (text === "") return null;

  // Drop a leading currency symbol/code and trailing period-noise.
  text = text
    .replace(/^(?:us\s*)?\$\s*/i, "")
    .replace(/\s*(?:usd|dollars?)\b/gi, "")
    .replace(/\s*(?:\/\s*(?:mo|month|yr|year))\b.*$/i, "")
    .replace(/[*\u2020\u2021]+\s*$/, "")
    .trim();

  // A magnitude suffix is only meaningful directly after the digits.
  const suffix = /^([0-9][0-9,]*(?:\.[0-9]+)?)\s*([km])$/i.exec(text);
  if (suffix) {
    const base = Number(suffix[1].replace(/,/g, ""));
    if (!Number.isFinite(base)) return null;
    return suffix[2].toLowerCase() === "k" ? base * 1_000 : base * 1_000_000;
  }

  // Reject anything containing a second number — a range, or price + sqft.
  const bare = text.replace(/,/g, "");
  if (!/^[0-9]+(?:\.[0-9]+)?$/.test(bare)) return null;

  const parsed = Number(bare);
  if (!Number.isFinite(parsed) || parsed < 0) return null;
  // Currency inputs carry at most two decimals; more means this was not a price.
  return Math.round(parsed * 100) / 100;
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
        onPaste={(event) => {
          // Let the strict typing path handle a paste it would already accept;
          // only step in when it would otherwise be swallowed silently.
          const pasted = event.clipboardData.getData("text");
          if (updateCurrencyDraft(display, pasted).accepted) return;
          const recovered = parsePastedCurrency(pasted);
          if (recovered == null) return;
          event.preventDefault();
          const next = formatCurrencyInput(recovered);
          setDisplay(next);
          latestNumericValueRef.current = recovered;
          onValueChange(recovered);
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
