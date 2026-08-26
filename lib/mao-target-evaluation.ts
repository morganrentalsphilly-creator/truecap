import type { AnalysisResult } from "@/lib/calc-analysis";
import type { MaoTarget } from "@/lib/max-allowable-offer";

type MaoTargetResult = Pick<
  AnalysisResult,
  | "capRate"
  | "totalCashRequired"
  | "cocReturn"
  | "netCashFlow"
  | "monthlyPayment"
  | "dscr"
  | "loanAmount"
  | "downPayment"
>;

/**
 * Forward target check shared by decision labels and the server-only inverse
 * solver. It contains no price-search logic, so client decision surfaces do
 * not pull the paid Offer Ceiling engine into the browser bundle.
 */
export function meetsMaoTarget(
  result: MaoTargetResult,
  target: MaoTarget
): boolean {
  if (target.capRate !== undefined && result.capRate < target.capRate) return false;
  // A zero-cash denominator makes cash-on-cash mathematically undefined. The
  // engine retains its historical numeric sentinel for snapshot compatibility,
  // but that sentinel must never satisfy or fail a real CoC threshold as 0%.
  // Fail closed until the deal models positive initial cash.
  if (
    target.cocReturn !== undefined &&
    (result.totalCashRequired <= 0 || result.cocReturn < target.cocReturn)
  ) {
    return false;
  }
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
