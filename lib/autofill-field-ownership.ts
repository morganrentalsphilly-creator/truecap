/**
 * Pure ownership decision for address-autofill fields.
 *
 * A populated value belongs to the current analysis regardless of how React
 * Hook Form classifies it. In particular, `form.reset(...)` intentionally
 * marks restored drafts and saved deals as non-dirty; that must never make
 * their values safe to overwrite without review.
 */

export type AutofillFieldWriteDecision =
  | {
      action: "write";
      reason:
        | "empty-current"
        | "same-value"
        | "replaceable-default"
        | "approved-overwrite";
    }
  | {
      action: "conflict";
      reason: "different-value";
    }
  | {
      action: "skip";
      reason: "invalid-proposed-value";
    };

export interface AutofillFieldWriteInput {
  currentValue: unknown;
  proposedValue: number;
  /** True only when the caller has proved the current value is the untouched
   * product starting benchmark for a brand-new analysis. Restored deals,
   * drafts, templates, strategies and user defaults must never set this. */
  replaceableDefault?: boolean;
  explicitlyApproved?: boolean;
}

export interface AutofillPropertyAddress {
  formattedAddress?: string | null;
  zip?: string | null;
}

export interface AutofillPropertyIdentity {
  normalizedAddress: string | null;
  zip: string | null;
}

/**
 * Canonical address key for provenance ownership.
 *
 * Google may add punctuation or a trailing country when a typed address is
 * re-selected. Those presentation-only changes must not detach source labels
 * or confirmations from the same property. The normalization is deliberately
 * conservative: it does not rewrite street names or suffixes, so two distinct
 * properties cannot become equal merely because they share a street number
 * and ZIP code.
 */
export function normalizeAutofillPropertyAddress(
  formattedAddress: unknown,
): string | null {
  if (typeof formattedAddress !== "string") return null;

  const normalized = formattedAddress
    .trim()
    .replace(/\b(\d{5})-\d{4}\b/g, "$1")
    .replace(
      /(?:,\s*)?(?:united states of america|united states|u\.?s\.?a\.?)\s*$/i,
      "",
    )
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

  return normalized.length > 0 ? normalized : null;
}

/** Build the exact property identity used to bind enrichment provenance. */
export function autofillPropertyIdentity(
  address: AutofillPropertyAddress,
): AutofillPropertyIdentity {
  const explicitZip =
    typeof address.zip === "string"
      ? address.zip.match(/\b\d{5}\b/)?.[0]
      : undefined;
  const addressZip =
    typeof address.formattedAddress === "string"
      ? address.formattedAddress.match(/\b\d{5}(?:-\d{4})?\b/)?.[0]?.slice(0, 5)
      : undefined;

  return {
    normalizedAddress: normalizeAutofillPropertyAddress(
      address.formattedAddress,
    ),
    zip: explicitZip ?? addressZip ?? null,
  };
}

/**
 * True only for the same normalized full address and ZIP. This is stricter
 * than street-number + ZIP, which can collide across streets in one ZIP and
 * would falsely carry property-specific provenance to a different deal.
 */
export function isSameAutofillProperty(
  previous: AutofillPropertyIdentity | null,
  current: AutofillPropertyAddress,
): boolean {
  if (!previous?.normalizedAddress || !previous.zip) return false;
  const next = autofillPropertyIdentity(current);
  return (
    next.normalizedAddress !== null &&
    next.zip !== null &&
    next.normalizedAddress === previous.normalizedAddress &&
    next.zip === previous.zip
  );
}

/**
 * Decide whether an autofill proposal may be written immediately, needs user
 * review, or should be ignored because the proposal itself is invalid.
 *
 * Deliberately accepts no dirty/touched/provenance metadata: restored and
 * manually entered finite values receive the same overwrite protection.
 */
export function decideAutofillFieldWrite({
  currentValue,
  proposedValue,
  replaceableDefault = false,
  explicitlyApproved = false,
}: AutofillFieldWriteInput): AutofillFieldWriteDecision {
  if (!Number.isFinite(proposedValue)) {
    return { action: "skip", reason: "invalid-proposed-value" };
  }

  const currentNumber = toFiniteNumber(currentValue);
  if (currentNumber === null) {
    return { action: "write", reason: "empty-current" };
  }

  if (currentNumber === proposedValue) {
    return { action: "write", reason: "same-value" };
  }

  if (replaceableDefault) {
    return { action: "write", reason: "replaceable-default" };
  }

  if (explicitlyApproved) {
    return { action: "write", reason: "approved-overwrite" };
  }

  return { action: "conflict", reason: "different-value" };
}

function toFiniteNumber(value: unknown): number | null {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }

  // React Hook Form can transiently surface a numeric input as a string.
  // Blank strings are empty; non-blank numeric strings retain ownership.
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}
