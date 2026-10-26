import { describe, expect, it } from "vitest";
import { calculateAnalysis } from "@/lib/calc-analysis";
import { releasedInvestmentFormSchema } from "@/lib/underwriting-model-release";
import { UNDERWRITING_V1_GOLDEN_CORPUS } from "./fixtures/underwriting-v1-golden-corpus";
import { EMPTY_BUY_BOX, evaluateBuyBox } from "@/lib/buy-box";
import { solveBuyBoxClearingPrice } from "@/lib/mao-targets";
import type { InvestmentFormValues } from "@/lib/investcalc-schema";
const base: InvestmentFormValues = { ...UNDERWRITING_V1_GOLDEN_CORPUS[0].values, purchasePrice: 200000, monthlyRent: 2000, downPaymentPct: 25, interestRate: 6, loanTermYears: 30, propertyTaxInputMode: "annual", propertyTaxAnnual: 2400, insuranceInputMode: "monthly", insuranceMonthly: 100, maintenancePct: 5, mgmtPct: 8, vacancyPct: 5, capexPct: 5, pmiAnnualRatePct: 0, closingCostsPct: 3 };
// Independent textbook annuity and operating worksheet. Do not import any
// application mortgage, NOI, return or target evaluator into this reference.
function reference(price: number, rent: number, tax: number, insurance: number) {
  const r = .06/12; const n = 30*12;
  const payment = (price * .75) * r / (1-Math.pow(1+r,-n));
  const vacancy = Math.round(rent*.05), maintenance = Math.round(rent*.05), management = Math.round(rent*.08), reserve = Math.round(rent*.05);
  const noi = (rent-vacancy-maintenance-management-Math.round(tax/12)-Math.round(insurance))*12;
  const cash = price*.25+Math.round(price*.03);
  const cashFlow = noi/12-reserve-payment;
  return { payment, noi, cashFlow, cash, cap: noi/price*100, coc: cashFlow*12/cash*100, dscr: noi/(payment*12) };
}
const cases: [string, InvestmentFormValues, number, number, number][] = [
  ["single-family", base, 2000, 2400, 100],
  ["duplex", { ...base, propertyType: "multi-family", monthlyRent: undefined, units: [{ bedrooms: 1, bathrooms: 1, monthlyRent: 1000 }, { bedrooms: 1, bathrooms: 1, monthlyRent: 1000 }] }, 2000, 2400, 100],
  ["small multifamily", { ...base, propertyType: "multi-family", purchasePrice: 400000, monthlyRent: undefined, propertyTaxAnnual: 4800, insuranceMonthly: 200, units: Array.from({ length: 4 }, () => ({ bedrooms: 1, bathrooms: 1, monthlyRent: 1000 })) }, 4000, 4800, 200],
  ["low cash flow", { ...base, monthlyRent: 1650 }, 1650, 2400, 100],
  ["negative cash flow", { ...base, monthlyRent: 1200 }, 1200, 2400, 100],
  ["unusually high taxes", { ...base, propertyTaxAnnual: 12000 }, 2000, 12000, 100],
];
describe("readiness independent financial references", () => {
  it.each(cases)("reconciles %s", (_name, values, rent, tax, insurance) => {
    const actual = calculateAnalysis(releasedInvestmentFormSchema.parse(values));
    const expected = reference(values.purchasePrice, rent, tax, insurance);
    expect(actual.noiAnnual).toBe(expected.noi);
    expect(actual.totalCashRequired).toBe(expected.cash);
    expect(actual.monthlyPayment).toBeCloseTo(expected.payment, 2);
    expect(actual.netCashFlow).toBeCloseTo(expected.cashFlow, 2);
    expect(actual.capRate).toBeCloseTo(expected.cap, 8);
    expect(actual.cocReturn).toBeCloseTo(expected.coc, 4);
    expect(actual.dscr).toBeCloseTo(expected.dscr, 4);
  });
  it("requires rent and explicit blank expenses, retaining conservative legacy defaults", () => {
    expect(releasedInvestmentFormSchema.safeParse({ ...base, monthlyRent: undefined }).success).toBe(false);
    expect(releasedInvestmentFormSchema.safeParse({ ...base, maintenancePct: "" }).success).toBe(false);
    expect(releasedInvestmentFormSchema.parse({ ...base, maintenancePct: undefined }).maintenancePct).toBe(10);
    expect(evaluateBuyBox({ ...EMPTY_BUY_BOX, minCapRatePct: 6, minCocPct: 8 }, { capRatePct: null, cocPct: 10, dscr: 1.5, cashFlowMonthly: 300, purchasePrice: 200000, propertyType: "single-family", state: "PA", isCashPurchase: false }).passes).toBe(false);
  });
  it("solves the tightest of conflicting financial targets and rechecks every independent constraint", () => {
    const criteria = { ...EMPTY_BUY_BOX, minCapRatePct: 8, minCocPct: 12, minDscr: 1.4, minCashFlowMonthly: 400 };
    const ceiling = solveBuyBoxClearingPrice(base, criteria, { isCashPurchase: false });
    expect(ceiling).not.toBeNull();
    const expected = reference(ceiling!, 2000, 2400, 100);
    expect(expected.cap).toBeGreaterThanOrEqual(8);
    expect(expected.coc).toBeGreaterThanOrEqual(12-.001);
    expect(expected.dscr).toBeGreaterThanOrEqual(1.4);
    expect(expected.cashFlow).toBeGreaterThanOrEqual(400);
    // Displayed ceilings round down to $500; the next display increment
    // must fail at least one independent target.
    const above = reference(ceiling!+500, 2000, 2400, 100);
    expect(above.cap < 8 || above.coc < 12 || above.dscr < 1.4 || above.cashFlow < 400).toBe(true);
  });
});
