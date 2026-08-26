/**
 * Cash-on-cash is a ratio whose denominator is modeled initial cash invested.
 * calc-analysis historically emits a numeric 0 sentinel when that denominator
 * is $0; downstream surfaces must not reinterpret the sentinel as a 0% return.
 *
 * A missing denominator is treated as legacy/unknown and preserves a usable
 * numeric CoC value. Only an explicit finite denominator <= $0 makes CoC N/A.
 */
export function isCashOnCashNotApplicable(
  totalCashInvested: number | null | undefined
): boolean {
  return (
    typeof totalCashInvested === "number" &&
    Number.isFinite(totalCashInvested) &&
    totalCashInvested <= 0
  );
}

export function applicableCashOnCashValue(
  cashOnCashReturn: number | null | undefined,
  totalCashInvested: number | null | undefined
): number | null {
  if (isCashOnCashNotApplicable(totalCashInvested)) return null;
  return typeof cashOnCashReturn === "number" && Number.isFinite(cashOnCashReturn)
    ? cashOnCashReturn
    : null;
}
