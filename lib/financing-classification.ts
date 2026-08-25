/**
 * Pre-analysis v1 cash-purchase classification.
 *
 * The calculation engine treats down payment as a percentage of price, so
 * 0% means the full price is financed and 100% means no loan remains. Result
 * surfaces should still prefer the canonical `monthlyPayment <= 0` signal;
 * this helper keeps input UI and pre-calculation analytics on the same rule.
 */
export function isAllCashDownPayment(
  downPaymentPct: number | null | undefined
): boolean {
  return (
    typeof downPaymentPct === "number" &&
    Number.isFinite(downPaymentPct) &&
    downPaymentPct >= 100
  );
}
