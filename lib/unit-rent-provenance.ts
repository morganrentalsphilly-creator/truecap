import type { InvestmentFormValues } from "@/lib/investcalc-schema";
import { inputVerificationFingerprint } from "@/lib/input-confidence";

/**
 * Exact value binding for an automated multi-family / house-hack rent roll.
 * The shared Input Confidence fingerprint covers the property model plus each
 * unit's bedrooms, rent, and owner-occupied flag, so provenance survives
 * save/reopen only for the same HUD lookup basis and modeled rent roll.
 */
export function unitRentRollFingerprint(values: InvestmentFormValues): string {
  return inputVerificationFingerprint(values, "rent");
}

export function unitRentRollWasOverridden(input: {
  capturedFingerprint?: string;
  invalidated?: boolean;
  values: InvestmentFormValues;
}): boolean {
  if (input.invalidated === true) return true;
  if (!input.capturedFingerprint) return true;
  return input.capturedFingerprint !== unitRentRollFingerprint(input.values);
}
