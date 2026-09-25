/**
 * 2026-09 production-readiness audit — Phase 2.7 independent math check.
 *
 * Every expected value below is derived from the formulas published on
 * /methodology (and lib/underwriting-methodology.ts), implemented here from
 * scratch WITHOUT importing the engine's helpers, then compared with
 * calculateAnalysis / computeDealScore / calculateMaxAllowableOffer to the
 * cent. The one convention the page does not state is that v1 rounds each
 * monthly expense line to a whole dollar before summing; the "documented
 * formula" numbers therefore land within the rounding envelope, and the
 * "exact convention" numbers land to the cent.
 *
 * Deals: the public sample, 100% financing, $0 property tax, negative cash
 * flow, very high rent, all-cash, a 3-unit multi-family, and an
 * owner-occupant with PMI.
 */
import { describe, expect, it } from "vitest";

import { calculateAnalysis } from "../calc-analysis";
import {
  buildDealScoreInputFromAnalysis,
  computeDealScore,
  COMPONENT_MAXES,
  getScoreBreakdownSum,
} from "../deal-score";
import type { InvestmentFormValues } from "../investcalc-schema";
import { calculateMaxAllowableOffer, meetsTarget } from "../max-allowable-offer";
import { SAMPLE_DEAL_MAO_TARGET, SAMPLE_DEAL_VALUES } from "../sample-deal";
import { getDealTier } from "../verdict";

// ── independent implementation of the published formulas ──────────────────

/** P&I = L × [r(1+r)^n] ÷ [(1+r)^n − 1]  (methodology "Mortgage payment") */
function principalAndInterest(loan: number, annualRatePct: number, years: number): number {
  if (loan <= 0) return 0;
  const r = annualRatePct / 100 / 12;
  const n = years * 12;
  if (r === 0) return loan / n;
  const growth = Math.pow(1 + r, n);
  return (loan * (r * growth)) / (growth - 1);
}

type Deal = {
  price: number;
  rent: number; // scheduled monthly rent (sum of units)
  downPct: number;
  ratePct: number;
  termYears: number;
  closingPct: number;
  taxPct: number | null; // null → annual $ mode
  taxAnnual?: number;
  insurancePct: number;
  hoa: number;
  utilities: number;
  maintenancePct: number;
  vacancyPct: number;
  mgmtPct: number;
  capexPct: number;
  pmiAnnualRatePct?: number; // owner-occupant default 0.8 when < 20% down
};

type Expected = {
  monthlyPI: number;
  loan: number;
  downPayment: number;
  closingCosts: number;
  totalCash: number;
  egiAnnual: number;
  opexAnnualExCapex: number;
  noiAnnual: number;
  capexAnnual: number;
  pmiMonthly: number;
  annualDebtService: number;
  annualCashFlow: number;
  monthlyCashFlow: number;
  capRatePct: number;
  cocPct: number;
  dscr: number;
};

/**
 * `rounded = true` reproduces v1's whole-dollar monthly line items (the one
 * undocumented convention); `rounded = false` is the page's formula verbatim.
 */
function expected(d: Deal, rounded: boolean): Expected {
  const R = (x: number) => (rounded ? Math.round(x) : x);
  const annualRent = d.rent * 12;
  const propertyTax = d.taxPct === null ? R((d.taxAnnual ?? 0) / 12) : R((d.price * (d.taxPct / 100)) / 12);
  const insurance = R((d.price * (d.insurancePct / 100)) / 12);
  const hoa = R(d.hoa);
  const utilities = R(d.utilities);
  const maintenance = R((annualRent * (d.maintenancePct / 100)) / 12);
  const vacancy = R((annualRent * (d.vacancyPct / 100)) / 12);
  const management = R((annualRent * (d.mgmtPct / 100)) / 12);
  const capex = R((annualRent * (d.capexPct / 100)) / 12);

  // Effective gross = gross rent × (1 − vacancy %)
  const egiAnnual = annualRent - vacancy * 12;
  // Operating expenses exclude the CapEx reserve (below NOI) and vacancy
  // (shown above NOI as an income allowance).
  const opexAnnualExCapex = (propertyTax + insurance + hoa + utilities + maintenance + management) * 12;
  const noiAnnual = egiAnnual - opexAnnualExCapex;

  const downPayment = d.price * (d.downPct / 100);
  const loan = d.price - downPayment;
  const monthlyPI = principalAndInterest(loan, d.ratePct, d.termYears);
  const annualDebtService = monthlyPI * 12;
  const pmiMonthly =
    d.pmiAnnualRatePct && d.pmiAnnualRatePct > 0 && loan > 0 && d.downPct < 20
      ? (loan * (d.pmiAnnualRatePct / 100)) / 12
      : 0;
  const capexAnnual = capex * 12;
  // Cash flow = NOI − CapEx reserve − annual mortgage P&I − PMI
  const annualCashFlow = noiAnnual - capexAnnual - annualDebtService - pmiMonthly * 12;
  const closingCosts = rounded ? Math.round(d.price * (d.closingPct / 100)) : d.price * (d.closingPct / 100);
  const totalCash = downPayment + closingCosts;
  return {
    monthlyPI,
    loan,
    downPayment,
    closingCosts,
    totalCash,
    egiAnnual,
    opexAnnualExCapex,
    noiAnnual,
    capexAnnual,
    pmiMonthly,
    annualDebtService,
    annualCashFlow,
    monthlyCashFlow: annualCashFlow / 12,
    capRatePct: (noiAnnual / d.price) * 100,
    cocPct: totalCash > 0 ? (annualCashFlow / totalCash) * 100 : 0,
    dscr: annualDebtService > 0 ? noiAnnual / annualDebtService : 0,
  };
}

function formValues(d: Deal, overrides: Partial<InvestmentFormValues> = {}): InvestmentFormValues {
  return {
    propertyType: "single-family",
    address: "Audit fixture, Columbus, OH 43215, USA",
    analysisDate: "2026-09-24",
    purchasePrice: d.price,
    yearBuilt: 1995,
    bedrooms: 3,
    bathrooms: 2,
    sqft: 1500,
    monthlyRent: d.rent,
    units: [],
    downPaymentPct: d.downPct,
    interestRate: d.ratePct,
    loanTermYears: d.termYears,
    closingCostsPct: d.closingPct,
    propertyTaxInputMode: d.taxPct === null ? "annual" : "percent",
    propertyTaxPct: d.taxPct ?? undefined,
    propertyTaxAnnual: d.taxPct === null ? d.taxAnnual : undefined,
    insuranceInputMode: "percent",
    insurancePct: d.insurancePct,
    hoaMonthly: d.hoa,
    utilitiesMonthly: d.utilities,
    maintenancePct: d.maintenancePct,
    vacancyPct: d.vacancyPct,
    mgmtPct: d.mgmtPct,
    capexPct: d.capexPct,
    pmiAnnualRatePct: d.pmiAnnualRatePct,
    buildingValuePct: 85,
    depreciationYears: 27.5,
    includeInterestDeduction: true,
    taxRatePct: 24,
    expenseGrowthPct: 2.5,
    rentGrowthPct: 2.5,
    appreciationRatePct: 3,
    sellingCostPct: 6,
    ...overrides,
  } as InvestmentFormValues;
}

const DEALS: Record<string, Deal> = {
  "public sample ($265k / $3,050, 20% down @ 6.6%)": {
    price: 265_000, rent: 3_050, downPct: 20, ratePct: 6.6, termYears: 30, closingPct: 3,
    taxPct: 1.49, insurancePct: 0.5, hoa: 0, utilities: 0, maintenancePct: 5, vacancyPct: 5, mgmtPct: 8, capexPct: 5,
  },
  "100% financing ($180k / $1,900, 0% down @ 7.25%)": {
    price: 180_000, rent: 1_900, downPct: 0, ratePct: 7.25, termYears: 30, closingPct: 3,
    taxPct: 1.1, insurancePct: 0.5, hoa: 0, utilities: 0, maintenancePct: 10, vacancyPct: 5, mgmtPct: 8, capexPct: 5,
  },
  "$0 property tax ($210k / $2,000, annual bill 0)": {
    price: 210_000, rent: 2_000, downPct: 25, ratePct: 6.9, termYears: 30, closingPct: 2.5,
    taxPct: null, taxAnnual: 0, insurancePct: 0.5, hoa: 0, utilities: 0, maintenancePct: 10, vacancyPct: 5, mgmtPct: 8, capexPct: 5,
  },
  "negative cash flow ($420k / $1,800, 20% down @ 7.5%)": {
    price: 420_000, rent: 1_800, downPct: 20, ratePct: 7.5, termYears: 30, closingPct: 3,
    taxPct: 1.3, insurancePct: 0.6, hoa: 150, utilities: 0, maintenancePct: 10, vacancyPct: 5, mgmtPct: 8, capexPct: 5,
  },
  "very high rent ($150k / $4,200, 20% down @ 6.75%)": {
    price: 150_000, rent: 4_200, downPct: 20, ratePct: 6.75, termYears: 30, closingPct: 3,
    taxPct: 1.1, insurancePct: 0.5, hoa: 0, utilities: 100, maintenancePct: 10, vacancyPct: 8, mgmtPct: 10, capexPct: 5,
  },
  "all-cash ($240k / $2,300, 100% down)": {
    price: 240_000, rent: 2_300, downPct: 100, ratePct: 6.75, termYears: 30, closingPct: 3,
    taxPct: 1.2, insurancePct: 0.5, hoa: 0, utilities: 0, maintenancePct: 10, vacancyPct: 5, mgmtPct: 8, capexPct: 5,
  },
  "owner-occupant 10% down with PMI ($300k / $1,600 rented unit)": {
    price: 300_000, rent: 1_600, downPct: 10, ratePct: 6.5, termYears: 30, closingPct: 3,
    taxPct: 1.1, insurancePct: 0.5, hoa: 0, utilities: 0, maintenancePct: 10, vacancyPct: 5, mgmtPct: 0, capexPct: 5,
    pmiAnnualRatePct: 0.8,
  },
};

function runEngine(name: string, d: Deal) {
  if (name.startsWith("owner-occupant")) {
    return calculateAnalysis(
      formValues(d, {
        propertyType: "owner-occupant",
        monthlyRent: undefined,
        units: [
          { bedrooms: 2, bathrooms: 1, sqft: 900, monthlyRent: 0, isOwnerOccupied: true },
          { bedrooms: 2, bathrooms: 1, sqft: 900, monthlyRent: d.rent, isOwnerOccupied: false },
        ],
      }),
    );
  }
  return calculateAnalysis(formValues(d));
}

describe("audit: first-year metrics match the published methodology", () => {
  for (const [name, deal] of Object.entries(DEALS)) {
    it(`${name} — exact to the cent under v1's whole-dollar line convention`, () => {
      const r = runEngine(name, deal);
      const e = expected(deal, true);
      expect(r.monthlyPayment).toBeCloseTo(e.monthlyPI, 6);
      expect(r.loanAmount).toBeCloseTo(e.loan, 6);
      expect(r.downPayment).toBeCloseTo(e.downPayment, 6);
      expect(r.closingCosts).toBeCloseTo(e.closingCosts, 6);
      expect(r.totalCashRequired).toBeCloseTo(e.totalCash, 6);
      expect(r.effectiveGrossIncomeAnnual).toBeCloseTo(e.egiAnnual, 6);
      expect(r.operatingExpensesAnnual).toBeCloseTo(e.opexAnnualExCapex, 6);
      expect(r.noiAnnual).toBeCloseTo(e.noiAnnual, 6);
      expect(r.pmiMonthly).toBeCloseTo(e.pmiMonthly, 6);
      expect(r.annualDebtService).toBeCloseTo(e.annualDebtService, 6);
      expect(r.annualCashFlow).toBeCloseTo(e.annualCashFlow, 2); // to the cent
      expect(r.netCashFlow).toBeCloseTo(e.monthlyCashFlow, 2);
      expect(r.capRate).toBeCloseTo(e.capRatePct, 6);
      expect(r.cocReturn).toBeCloseTo(e.cocPct, 6);
      expect(r.dscr).toBeCloseTo(e.dscr, 6);
    });

    it(`${name} — within the rounding envelope of the page's literal formula`, () => {
      const r = runEngine(name, deal);
      const e = expected(deal, false);
      // Up to 8 monthly lines each rounded by ≤ $0.50 → ≤ $4/mo, ≤ $48/yr.
      expect(Math.abs(r.netCashFlow - e.monthlyCashFlow)).toBeLessThanOrEqual(4);
      expect(Math.abs(r.noiAnnual - e.noiAnnual)).toBeLessThanOrEqual(48);
      expect(Math.abs(r.capRate - e.capRatePct)).toBeLessThanOrEqual(0.05);
      expect(Math.abs(r.dscr - e.dscr)).toBeLessThanOrEqual(0.01);
    });
  }

  it("all-cash: DSCR reads as not applicable (0) and the verdict never uses it", () => {
    const r = runEngine("all-cash", DEALS["all-cash ($240k / $2,300, 100% down)"]);
    expect(r.monthlyPayment).toBe(0);
    expect(r.dscr).toBe(0);
    expect(["Strong", "Solid", "Mixed", "Marginal", "Negative"]).toContain(getDealTier(r));
  });

  it("100% financing: total cash is closing costs only and CoC is defined on it", () => {
    const d = DEALS["100% financing ($180k / $1,900, 0% down @ 7.25%)"];
    const r = runEngine("100", d);
    expect(r.downPayment).toBe(0);
    expect(r.loanAmount).toBe(d.price);
    expect(r.totalCashRequired).toBe(Math.round(d.price * 0.03));
    expect(r.pmiMonthly).toBe(0); // investment loan: PMI is never inferred
    expect(Number.isFinite(r.cocReturn)).toBe(true);
  });

  it("negative cash flow: sign is carried through cash flow, CoC and the verdict", () => {
    const r = runEngine("neg", DEALS["negative cash flow ($420k / $1,800, 20% down @ 7.5%)"]);
    expect(r.netCashFlow).toBeLessThan(0);
    expect(r.cocReturn).toBeLessThan(0);
    expect(r.dscr).toBeLessThan(1);
    expect(["Marginal", "Negative"]).toContain(getDealTier(r));
  });

  it("verdict tiers follow lib/verdict.ts thresholds for every fixture", () => {
    for (const [name, deal] of Object.entries(DEALS)) {
      const r = runEngine(name, deal);
      const cf = r.netCashFlow, dscr = r.dscr, coc = r.cocReturn, cap = r.capRate;
      const cash = r.monthlyPayment <= 0;
      let tier: string;
      if (cash) {
        tier = cf < 0 ? (cf < -200 ? "Negative" : "Marginal") : cf >= 400 && cap >= 7 && coc >= 8 ? "Strong" : cf >= 100 && cap >= 5 && coc >= 5 ? "Solid" : "Mixed";
      } else if (cf < 0 || dscr < 1) {
        tier = cf < -200 || dscr < 0.9 ? "Negative" : "Marginal";
      } else if (cf >= 400 && dscr >= 1.25 && coc >= 10) tier = "Strong";
      else if (cf >= 100 && dscr >= 1.15 && coc >= 6) tier = "Solid";
      else tier = "Mixed";
      expect(getDealTier(r), name).toBe(tier);
    }
  });
});

describe("audit: Deal score arithmetic matches /methodology", () => {
  for (const [name, deal] of Object.entries(DEALS)) {
    it(`${name} — score = round(clamp(components + risk penalty, 0, 100)), bands honoured`, () => {
      const values = formValues(deal, name.startsWith("owner-occupant") ? { propertyType: "owner-occupant" } : {});
      const r = runEngine(name, deal);
      const input = buildDealScoreInputFromAnalysis(values, r);
      const s = computeDealScore(input);
      const b = s.breakdown;
      expect(b.cashFlowScore).toBeLessThanOrEqual(input.propertyType === "owner-occupant" ? 30 : COMPONENT_MAXES.cashFlow);
      expect(b.cocScore).toBeLessThanOrEqual(COMPONENT_MAXES.coc);
      expect(b.capRateScore).toBeLessThanOrEqual(COMPONENT_MAXES.capRate);
      expect(b.dscrScore).toBeLessThanOrEqual(COMPONENT_MAXES.dscr);
      expect(b.totalReturnScore).toBeLessThanOrEqual(COMPONENT_MAXES.totalReturn);
      expect(b.riskPenalty).toBeGreaterThanOrEqual(-30);
      expect(b.riskPenalty).toBeLessThanOrEqual(0);
      const summed = Math.max(0, Math.min(100, Math.round(getScoreBreakdownSum(b))));
      // The appreciation floor (40) is the only path above the arithmetic.
      expect(s.score === summed || s.score === 40).toBe(true);
      const band = s.score >= 75 ? "Strong Buy" : s.score >= 55 ? "Buy" : s.score >= 35 ? "Neutral" : s.score >= 18 ? "Risky" : "Avoid";
      if (input.propertyType !== "owner-occupant") expect(s.recommendation).toBe(band);
      if (input.isCashPurchase) expect(b.dscrScore).toBe(COMPONENT_MAXES.dscr);
    });
  }
});

describe("audit: Offer Ceiling is the highest $500 step that still clears every target", () => {
  it("public sample targets ($750/mo cash flow, DSCR 1.25)", () => {
    const values = { ...SAMPLE_DEAL_VALUES } as InvestmentFormValues;
    const mao = calculateMaxAllowableOffer(values, SAMPLE_DEAL_MAO_TARGET);
    expect(mao).not.toBeNull();
    const ceiling = mao!.maxPrice;
    expect(ceiling % 500).toBe(0);
    expect(ceiling).toBeLessThan(values.purchasePrice); // asking $265k sits above the ceiling by design
    // Independent bisection with the engine held as a black box.
    const passes = (price: number) => meetsTarget(calculateAnalysis({ ...values, purchasePrice: price }), SAMPLE_DEAL_MAO_TARGET);
    expect(passes(ceiling)).toBe(true);
    expect(passes(ceiling + 500)).toBe(false);
    // And with an independent cash-flow model (documented formula, rounded convention):
    const d = DEALS["public sample ($265k / $3,050, 20% down @ 6.6%)"];
    const cfAt = (price: number) => expected({ ...d, price }, true);
    const ok = (price: number) => cfAt(price).monthlyCashFlow >= 750 && cfAt(price).dscr >= 1.25;
    expect(ok(ceiling)).toBe(true);
    expect(ok(ceiling + 500)).toBe(false);
    // The "at this price" readout describes the displayed ceiling itself.
    expect(mao!.achieved.netCashFlow).toBeCloseTo(cfAt(ceiling).monthlyCashFlow, 2);
  });

  it("a cap-rate-only target on the $0-tax deal", () => {
    const d = DEALS["$0 property tax ($210k / $2,000, annual bill 0)"];
    const values = formValues(d);
    const target = { capRate: 7 };
    const mao = calculateMaxAllowableOffer(values, target);
    expect(mao).not.toBeNull();
    const c = mao!.maxPrice;
    expect(c % 500).toBe(0);
    expect(calculateAnalysis({ ...values, purchasePrice: c }).capRate).toBeGreaterThanOrEqual(7);
    expect(calculateAnalysis({ ...values, purchasePrice: c + 500 }).capRate).toBeLessThan(7);
  });
});
