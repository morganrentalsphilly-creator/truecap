export function FieldError({ message, id }: { message?: string; id?: string }) {
  if (!message) return null;
  return (
    <p id={id} role="alert" className="mt-1 text-sm text-destructive-text">
      {message}
    </p>
  );
}

/**
 * The one "Required" marker (2026-11 audit B5). Address showed it; purchase
 * price and rent are just as required and showed nothing. It sits BESIDE the
 * label, not inside it, and is hidden from assistive tech: the input's own
 * `aria-required` says it there, and the label's accessible name stays the
 * label.
 */
export function RequiredMark() {
  return (
    <span
      aria-hidden="true"
      className="text-xs font-semibold text-muted-foreground"
    >
      Required
    </span>
  );
}

/** The one "(optional)" marker: lower case, 12px, inside the label. */
export function OptionalMark() {
  return (
    <span className="text-xs font-normal text-muted-foreground">(optional)</span>
  );
}

export function optionalNumberSetValueAs(value: unknown) {
  if (value === "" || value == null) return undefined;
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

/**
 * Should a field's "too small" message wait?
 *
 * The analyzer validates on change. For the price field that put "Purchase
 * price must be at least $10,000" in red, as an alert, under the field from
 * the first digit until the fifth: a visitor typing 135000 saw an error for
 * four of six keystrokes. A minimum cannot be judged while the number is
 * still being typed, so that one message waits until the visitor leaves the
 * field or tries to run the analysis. Once the field has been left, typing
 * updates the message on every change as before, and every other message
 * (required, too large) is never held. The schema and what a run accepts
 * are unchanged: this only decides when the message is shown.
 *
 * Only a value the visitor is typing is held (`fieldDirty`). When the page
 * validates a value it loaded itself, the message shows at once: restoring
 * a deal saved in an older format resets the form, says "Fix the
 * highlighted field" and validates, and a reset leaves the field clean.
 */
export function isMinimumErrorHeldWhileTyping(input: {
  errorType: string | undefined;
  fieldDirty: boolean;
  fieldTouched: boolean;
  submitCount: number;
}): boolean {
  return (
    input.errorType === "too_small" &&
    input.fieldDirty &&
    !input.fieldTouched &&
    input.submitCount === 0
  );
}
