import type { InvestmentFormValues } from "@/lib/investcalc-schema";

/**
 * Human-reviewed representative inputs for the frozen v1 underwriting corpus.
 *
 * Keep these inputs explicit and independent of `defaultValues`: changing a UI
 * default must not silently rewrite the historical baseline. Expected outputs
 * are recorded beside each case below after running the public v1 engines at
 * the fixed corpus clock (2026-08-24T12:00:00Z).
 */
const BASE_V1_INPUT: InvestmentFormValues = {
  propertyType: "single-family",
  address: "100 Baseline Ave, Philadelphia, PA 19140",
  purchasePrice: 250_000,
  yearBuilt: 2005,
  bedrooms: 3,
  bathrooms: 2,
  sqft: 1_500,
  monthlyRent: 2_600,
  units: [],
  downPaymentPct: 20,
  interestRate: 6.75,
  loanTermYears: 30,
  closingCostsPct: 3,
  pmiAnnualRatePct: 0.8,
  pmiNoCancel: false,
  maintenancePct: 5,
  vacancyPct: 5,
  mgmtPct: 8,
  capexPct: 5,
  buildingValuePct: 85,
  depreciationYears: 27.5,
  includeInterestDeduction: true,
  taxRatePct: 24,
  expenseGrowthPct: 2.5,
  rentGrowthPct: 2.5,
  appreciationRatePct: 3,
  sellingCostPct: 6,
  propertyTaxPct: 1.1,
  propertyTaxInputMode: "percent",
  insuranceInputMode: "percent",
  insurancePct: 0.5,
  hoaMonthly: 0,
  utilitiesMonthly: 0,
};

export type UnderwritingV1GoldenExpected = {
  methodologyVersion: "1.3";
  monthlyRentalIncome: number;
  propertyTax: number;
  insurance: number;
  totalOperatingExpenses: number;
  noiAnnual: number;
  loanAmount: number;
  monthlyPayment: number;
  pmiMonthly: number;
  netCashFlow: number;
  cocReturn: number;
  capRate: number;
  dscr: number;
  totalCashRequired: number;
  taxSavingsMonthly: number;
  afterTaxCF: number;
  year10CumulativeCashFlow: number;
  year10CumulativeTaxBenefit: number;
  dealScore: number;
  dscrScore: number;
};

export type UnderwritingV1GoldenCase = {
  id: string;
  rationale: string;
  values: InvestmentFormValues;
  expected: UnderwritingV1GoldenExpected;
};

// Expected values are intentionally literal. Never regenerate or accept these
// automatically: a change requires an explicit methodology review.
// Projection v10's reviewed Year-10 cumulative-cash-flow corrections are:
// financed 68718.45682362831 -> 68738.45682362831; cash 239306 -> 239260;
// zero-rate 64070 -> 64083; permanent-PMI 39781.358626307505 ->
// 39793.358626307505; multifamily 80947.89908408822 -> 81093.89908408822;
// owner-occupant -110501.54338047245 -> -110502.54338047245; STR
// -14572.510547569109 -> -14684.510547569109; negative-carry
// -474875.2811355402 -> -474891.2811355402; rehab 86430.53674047743 ->
// 86396.53674047743. Fixed dollars alone now use expense growth; each
// percentage-of-rent line follows that year's scheduled rent.
export const UNDERWRITING_V1_GOLDEN_CORPUS: UnderwritingV1GoldenCase[] = [
  {
    id: "financed_sfr_standard",
    rationale: "Conventional 20%-down single-family baseline.",
    values: { ...BASE_V1_INPUT },
    expected: {
      methodologyVersion: "1.3",
      monthlyRentalIncome: 2_600,
      propertyTax: 229,
      insurance: 104,
      totalOperatingExpenses: 931,
      noiAnnual: 21_588,
      loanAmount: 200_000,
      monthlyPayment: 1297.1961931364306,
      pmiMonthly: 0,
      netCashFlow: 371.80380686356943,
      cocReturn: 7.759383795413623,
      capRate: 8.6352,
      dscr: 1.3868372490750849,
      totalCashRequired: 57_500,
      taxSavingsMonthly: -8,
      afterTaxCF: 363.80380686356943,
      // Projection v10 correction: rent-linked percentage expenses now move
      // with projected rent while fixed-dollar costs alone use expense growth.
      // Reviewed baseline delta: 68718.45682362831 -> 68738.45682362831.
      year10CumulativeCashFlow: 68738.45682362831,
      year10CumulativeTaxBenefit: -9_197,
      dealScore: 80,
      dscrScore: 17,
    },
  },
  {
    id: "cash_annual_tax_monthly_insurance",
    rationale:
      "Cash purchase with exact-dollar tax and insurance inputs; DSCR is N/A.",
    values: {
      ...BASE_V1_INPUT,
      address: "200 Cash Ave, Camden, NJ 08103",
      purchasePrice: 300_000,
      yearBuilt: 1990,
      monthlyRent: 3_000,
      downPaymentPct: 100,
      interestRate: 0,
      propertyTaxInputMode: "annual",
      propertyTaxAnnual: 4_200,
      propertyTaxPct: undefined,
      insuranceInputMode: "monthly",
      insuranceMonthly: 180,
      insurancePct: undefined,
    },
    expected: {
      methodologyVersion: "1.3",
      monthlyRentalIncome: 3_000,
      propertyTax: 350,
      insurance: 180,
      totalOperatingExpenses: 1_220,
      noiAnnual: 23_160,
      loanAmount: 0,
      monthlyPayment: 0,
      pmiMonthly: 0,
      netCashFlow: 1_780,
      cocReturn: 6.912621359223301,
      capRate: 7.720000000000001,
      dscr: 0,
      totalCashRequired: 309_000,
      taxSavingsMonthly: -278,
      afterTaxCF: 1_502,
      year10CumulativeCashFlow: 239_260,
      year10CumulativeTaxBenefit: -40_018,
      dealScore: 63,
      dscrScore: 17,
    },
  },
  {
    id: "zero_rate_financed",
    rationale:
      "Zero-interest financed branch uses principal divided by payment count.",
    values: {
      ...BASE_V1_INPUT,
      address: "300 Zero Rate Rd, Reading, PA 19601",
      purchasePrice: 180_000,
      monthlyRent: 1_800,
      downPaymentPct: 25,
      interestRate: 0,
      loanTermYears: 15,
    },
    expected: {
      methodologyVersion: "1.3",
      monthlyRentalIncome: 1_800,
      propertyTax: 165,
      insurance: 75,
      totalOperatingExpenses: 654,
      noiAnnual: 14_832,
      loanAmount: 135_000,
      monthlyPayment: 750,
      pmiMonthly: 0,
      netCashFlow: 396,
      cocReturn: 9.428571428571429,
      capRate: 8.24,
      dscr: 1.648,
      totalCashRequired: 50_400,
      taxSavingsMonthly: -185,
      afterTaxCF: 211,
      year10CumulativeCashFlow: 64_083,
      year10CumulativeTaxBenefit: -26_527,
      dealScore: 85,
      dscrScore: 17,
    },
  },
  {
    id: "low_down_permanent_pmi",
    rationale:
      "Low-down financed acquisition with explicit non-canceling mortgage insurance.",
    values: {
      ...BASE_V1_INPUT,
      address: "400 Low Down Ln, Wilmington, DE 19801",
      purchasePrice: 350_000,
      yearBuilt: 2018,
      monthlyRent: 3_700,
      downPaymentPct: 5,
      interestRate: 6.5,
      pmiAnnualRatePct: 0.85,
      pmiNoCancel: true,
    },
    expected: {
      methodologyVersion: "1.3",
      monthlyRentalIncome: 3_700,
      propertyTax: 321,
      insurance: 146,
      totalOperatingExpenses: 1_318,
      noiAnnual: 30_804,
      loanAmount: 332_500,
      monthlyPayment: 2101.6261781141047,
      pmiMonthly: 235.52083333333334,
      netCashFlow: 44.852988552561925,
      cocReturn: 1.9222709379669398,
      capRate: 8.801142857142857,
      dscr: 1.2214351090275715,
      totalCashRequired: 28_000,
      taxSavingsMonthly: 30,
      afterTaxCF: 74.85298855256192,
      year10CumulativeCashFlow: 39793.358626307505,
      year10CumulativeTaxBenefit: -8_485,
      dealScore: 63,
      dscrScore: 13,
    },
  },
  {
    id: "three_unit_multifamily",
    rationale:
      "Multi-unit income sums every valid rental unit and ignores the SFR rent field.",
    values: {
      ...BASE_V1_INPUT,
      propertyType: "multi-family",
      address: "500 Three Unit St, Philadelphia, PA 19133",
      purchasePrice: 525_000,
      yearBuilt: 1925,
      monthlyRent: undefined,
      units: [
        { bedrooms: 2, bathrooms: 1, sqft: 900, monthlyRent: 1_800 },
        { bedrooms: 2, bathrooms: 1, sqft: 850, monthlyRent: 1_700 },
        { bedrooms: 1, bathrooms: 1, sqft: 700, monthlyRent: 1_650 },
      ],
      downPaymentPct: 25,
      interestRate: 7.1,
      propertyTaxInputMode: "annual",
      propertyTaxAnnual: 7_800,
      propertyTaxPct: undefined,
      insuranceInputMode: "monthly",
      insuranceMonthly: 350,
      insurancePct: undefined,
    },
    expected: {
      methodologyVersion: "1.3",
      monthlyRentalIncome: 5_150,
      propertyTax: 650,
      insurance: 350,
      totalOperatingExpenses: 2_186,
      noiAnnual: 38_664,
      loanAmount: 393_750,
      monthlyPayment: 2646.1258409659317,
      pmiMonthly: 0,
      netCashFlow: 317.87415903406827,
      cocReturn: 2.5948910941556593,
      capRate: 7.364571428571429,
      dscr: 1.2176291656725793,
      totalCashRequired: 147_000,
      taxSavingsMonthly: 108,
      afterTaxCF: 425.87415903406827,
      year10CumulativeCashFlow: 81093.89908408822,
      year10CumulativeTaxBenefit: -2_026,
      dealScore: 47,
      dscrScore: 13,
    },
  },
  {
    id: "owner_occupant_duplex",
    rationale:
      "Owner unit is excluded from rental income while the rental unit remains included.",
    values: {
      ...BASE_V1_INPUT,
      propertyType: "owner-occupant",
      address: "600 House Hack Way, Philadelphia, PA 19121",
      purchasePrice: 325_000,
      yearBuilt: 1915,
      monthlyRent: undefined,
      units: [
        {
          bedrooms: 2,
          bathrooms: 1,
          sqft: 900,
          monthlyRent: 0,
          isOwnerOccupied: true,
        },
        {
          bedrooms: 2,
          bathrooms: 1,
          sqft: 900,
          monthlyRent: 1_900,
          isOwnerOccupied: false,
        },
      ],
      downPaymentPct: 3.5,
      interestRate: 6.25,
      pmiAnnualRatePct: 0.55,
      pmiNoCancel: true,
    },
    expected: {
      methodologyVersion: "1.3",
      monthlyRentalIncome: 1_900,
      propertyTax: 298,
      insurance: 135,
      totalOperatingExpenses: 870,
      noiAnnual: 13_500,
      loanAmount: 313_625,
      monthlyPayment: 1931.0430698372704,
      pmiMonthly: 143.74479166666669,
      netCashFlow: -1044.7878615039372,
      cocReturn: -59.34889627477986,
      capRate: 4.153846153846154,
      dscr: 0.5825866950211546,
      totalCashRequired: 21_125,
      taxSavingsMonthly: 321,
      afterTaxCF: -723.7878615039372,
      year10CumulativeCashFlow: -110502.54338047245,
      year10CumulativeTaxBenefit: 31_558,
      dealScore: 0,
      dscrScore: 0,
    },
  },
  {
    id: "short_term_rental",
    rationale:
      "STR income uses ADR times occupancy and includes furnishing cash at acquisition.",
    values: {
      ...BASE_V1_INPUT,
      address: "700 Nightly Stay Dr, Pocono Lake, PA 18347",
      purchasePrice: 450_000,
      yearBuilt: 2012,
      monthlyRent: undefined,
      avgDailyRate: 220,
      occupancyPct: 62,
      strFurnishingCost: 35_000,
      downPaymentPct: 25,
      interestRate: 7,
      vacancyPct: 8,
      mgmtPct: 18,
      propertyTaxInputMode: "annual",
      propertyTaxAnnual: 6_000,
      propertyTaxPct: undefined,
      insuranceInputMode: "monthly",
      insuranceMonthly: 260,
      insurancePct: undefined,
    },
    expected: {
      methodologyVersion: "1.3",
      monthlyRentalIncome: 4_148.833333333333,
      propertyTax: 500,
      insurance: 260,
      totalOperatingExpenses: 2_253,
      noiAnnual: 25_234,
      loanAmount: 337_500,
      monthlyPayment: 2245.395921229743,
      pmiMonthly: 0,
      netCashFlow: -349.56258789641015,
      cocReturn: -2.6054354377372184,
      capRate: 5.607555555555555,
      dscr: 0.936508930764276,
      totalCashRequired: 161_000,
      taxSavingsMonthly: 244,
      afterTaxCF: -105.56258789641015,
      year10CumulativeCashFlow: -14684.510547569109,
      year10CumulativeTaxBenefit: 18_708,
      dealScore: 0,
      dscrScore: 0,
    },
  },
  {
    id: "negative_cash_flow_high_expense",
    rationale:
      "Negative-cash-flow deal locks loss signs, tax effect, and low Deal Score.",
    values: {
      ...BASE_V1_INPUT,
      address: "800 Expense Heavy Ct, Newark, NJ 07102",
      purchasePrice: 500_000,
      yearBuilt: 1970,
      monthlyRent: 1_900,
      downPaymentPct: 10,
      interestRate: 8.5,
      pmiAnnualRatePct: 0.8,
      maintenancePct: 10,
      vacancyPct: 10,
      mgmtPct: 10,
      capexPct: 10,
      hoaMonthly: 400,
      utilitiesMonthly: 250,
    },
    expected: {
      methodologyVersion: "1.3",
      monthlyRentalIncome: 1_900,
      propertyTax: 458,
      insurance: 208,
      totalOperatingExpenses: 2_076,
      noiAnnual: 168,
      loanAmount: 450_000,
      monthlyPayment: 3460.1106761295014,
      pmiMonthly: 300,
      netCashFlow: -3936.1106761295014,
      cocReturn: -72.66665863623695,
      capRate: 0.0336,
      dscr: 0.004046113350241292,
      totalCashRequired: 65_000,
      taxSavingsMonthly: 1_068,
      afterTaxCF: -2868.1106761295014,
      // Projection snapshot v7 uses the canonical full-precision schedule and
      // statutory scheduled 78% automatic PMI termination.
      year10CumulativeCashFlow: -474891.2811355402,
      year10CumulativeTaxBenefit: 123_981,
      dealScore: 0,
      dscrScore: 0,
    },
  },
  {
    id: "rehab_cash_requirement",
    rationale:
      "Up-front rehab is part of cash required and CoC without changing purchase basis.",
    values: {
      ...BASE_V1_INPUT,
      address: "900 Rehab Blvd, Chester, PA 19013",
      purchasePrice: 160_000,
      yearBuilt: 1940,
      monthlyRent: 2_100,
      downPaymentPct: 20,
      interestRate: 7,
      rehabBudget: 65_000,
    },
    expected: {
      methodologyVersion: "1.3",
      monthlyRentalIncome: 2_100,
      propertyTax: 147,
      insurance: 67,
      totalOperatingExpenses: 697,
      noiAnnual: 18_096,
      loanAmount: 128_000,
      monthlyPayment: 851.5871938293545,
      pmiMonthly: 0,
      netCashFlow: 551.4128061706455,
      cocReturn: 6.499954493170673,
      capRate: 11.31,
      dscr: 1.7708110348852673,
      totalCashRequired: 101_800,
      taxSavingsMonthly: -85,
      afterTaxCF: 466.41280617064547,
      year10CumulativeCashFlow: 86396.53674047743,
      year10CumulativeTaxBenefit: -16_622,
      // Reviewed v1.3 change: the Screening Index now uses the pre-tax,
      // contribution-aware money-weighted return instead of the former
      // initial-cash CAGR-like proxy.
      dealScore: 66,
      dscrScore: 17,
    },
  },
];
