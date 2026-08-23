import type { AnalysisResult } from "@/lib/calc-analysis";
import type { MaoTarget } from "@/lib/max-allowable-offer";

/**
 * Forward target check shared by decision labels and the server-only inverse
 * solver. It contains no price-search logic, so client decision surfaces do
 * not pull the paid Offer Ceiling engine into the browser bundle.
 */
export function meetsMaoTarget(
  result: AnalysisResult,
  target: MaoTarget
): boolean {
  if (target.capRate !== undefined && result.capRate < target.capRate) return false;
  if (target.cocReturn !== undefined && result.cocReturn < target.cocReturn) return false;
  if (
    target.monthlyCashFlow !== undefined &&
    result.netCashFlow < target.monthlyCashFlow
  ) {
    return false;
  }
  // DSCR has no economic meaning without debt service.
  if (
    target.dscr !== undefined &&
    result.monthlyPayment > 0 &&
    result.dscr < target.dscr
  ) {
    return false;
  }
  if (
    target.maxPurchasePrice !== undefined &&
    result.loanAmount + result.downPayment > target.maxPurchasePrice
  ) {
    return false;
  }
  return true;
}
