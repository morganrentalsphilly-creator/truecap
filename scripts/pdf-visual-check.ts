/**
 * Render the investment PDF from a fixed sample deal, under Node.
 *
 *   npm run pdf:check              → .pdf-check/report.pdf
 *   npm run pdf:check -- --out x.pdf
 *   npm run pdf:check -- --branches   also renders every non-happy-path deal
 *                                     shape (cash, all-zero, single-row,
 *                                     all-negative, sparse, long strings) and
 *                                     exits non-zero if any of them throws
 *
 * TWO JOBS:
 *
 *  1. It is the regression gate for server-side rendering. The report used to
 *     require a DOM (chart.js on a <canvas>), which is why its paid gate could
 *     only ever be enforced in the browser. If someone reintroduces a
 *     document/window/Image reference, this script throws instead of the
 *     failure surfacing as a 500 in production.
 *
 *  2. It is the design loop. Rendering a realistic report in one command —
 *     then rasterising it with `pdftoppm -png` — is how you actually look at
 *     typography, spacing and page breaks rather than guessing.
 *
 * The sample deal is deliberately hard: it has a NEGATIVE year-one cash flow
 * that turns positive later, a financed purchase (so DSCR is defined), a
 * multi-unit rent roll, and comps. Those are the branches most likely to be
 * laid out badly.
 */

import { writeFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";
import type { ReportData } from "@/lib/pdf-generator";

/**
 * A REAL long rationale, not filler. lib/deal-score.ts's appreciation-play
 * branch and lib/verdict.ts's buildAutoVerdict fallback both emit strings in
 * this range, and the recommendation card is sized from the wrapped line
 * count — so this is the input that exposes page-overflow bugs.
 */
const LONG_RATIONALE =
  "This deal clears debt service today, but the margin is thinner than the headline cap rate suggests: " +
  "the vacancy assumption sits below what this submarket has actually run over the last three years, the " +
  "property-tax bill is a live reassessment risk given the sale price is well above the current assessed " +
  "value, and the maintenance reserve is a default rather than a figure taken from an inspection. Treat " +
  "the projected cash flow as an upper bound until rents are confirmed by signed leases and the tax " +
  "exposure is checked against the county's most recent assessment cycle.";

function buildSampleReport(): ReportData {
  const purchasePrice = 265_000;
  // Fixed, hand-written figures. This script must NEVER import the calc engine
  // to produce them: its job is to exercise the RENDERER, and a sample that
  // recomputes itself would mask a layout break behind a maths change.
  const projectionRows = Array.from({ length: 10 }, (_, i) => {
    const y = i + 1;
    const rental = Math.round(31_200 * Math.pow(1.03, i));
    const opex = Math.round(11_400 * Math.pow(1.025, i));
    const debt = 17_760;
    const net = rental - opex - debt;
    const tax = Math.round(net * -0.18);
    const after = net + tax;
    const propertyValue = Math.round(purchasePrice * Math.pow(1.035, y));
    const loanBalance = Math.max(0, Math.round(212_000 - y * 3_900));
    const equity = propertyValue - loanBalance;
    return {
      y,
      rental,
      opex,
      debt,
      net,
      tax,
      after,
      cum: 0,
      propertyValue,
      loanBalance,
      equity,
    };
  });
  let running = 0;
  for (const row of projectionRows) {
    running += row.net;
    row.cum = running;
  }

  const taxRows = projectionRows.map((r) => {
    const interest = Math.round(15_900 * Math.pow(0.97, r.y - 1));
    const dep = 7_636;
    const total = r.opex + interest + dep;
    const taxable = r.rental - total;
    const savings = Math.round(Math.max(0, -taxable) * 0.24);
    return {
      y: r.y,
      rental: r.rental,
      opex: r.opex,
      interest,
      dep,
      total,
      taxable,
      savings,
      benefit: savings,
    };
  });

  const exitRows = projectionRows.map((r) => {
    const value = r.propertyValue;
    const loan = r.loanBalance;
    const equity = r.equity;
    const netSale = Math.round(value * 0.94) - loan;
    const profit = netSale - 53_000 + projectionRows[r.y - 1]!.cum;
    return { y: r.y, value, loan, equity, netSale, profit };
  });

  return {
    generatedAt: new Date("2026-08-19T00:00:00Z"),
    methodologyVersion: "1.0",
    property: {
      address: "1700 W Erie Ave, Philadelphia, PA 19140",
      type: "multi-family",
      yearBuilt: 1926,
      purchasePrice,
      template: "Standard",
    },
    financing: {
      downPaymentPct: 20,
      downPayment: 53_000,
      interestRate: 6.875,
      loanTerm: 30,
      closingCostsPct: 3,
      closingCosts: 7_950,
    },
    expenses: {
      propertyTaxPct: 1.4,
      propertyTaxAnnualBill: 3_710,
      insurancePct: 0.5,
      maintenancePct: 5,
      vacancyPct: 6,
      managementPct: 8,
      capexPct: 5,
      hoaMonthly: 0,
      utilitiesMonthly: 120,
      rentGrowth: 3,
      expenseGrowth: 2.5,
      appreciation: 3.5,
      sellingCost: 6,
      taxRate: 24,
    },
    // Hand-written to match the other sample figures; the real builders call
    // buildReportOperatingStatement(result) off the engine.
    operatingStatement: {
      grossScheduledIncome: 43_200,
      vacancyAllowance: 2_592,
      effectiveGrossIncome: 40_608,
      operatingExpenses: [
        { label: "Property tax", amount: 3_710 },
        { label: "Insurance", amount: 1_325 },
        { label: "Maintenance", amount: 2_160 },
        { label: "Management", amount: 3_456 },
        { label: "Utilities", amount: 1_440 },
      ],
      operatingExpensesTotal: 12_091,
      noi: 28_517,
      annualDebtService: 16_704,
      pmiAnnual: 0,
      capexReserve: 2_160,
      netCashFlowAnnual: 2_040,
      loanAmount: 212_000,
      monthlyPayment: 1_392,
      totalCashRequired: 60_950,
      isCashPurchase: false,
    },
    units: [
      { label: "Unit 1", beds: 2, baths: 1, sqft: 900, rent: 1_300 },
      { label: "Unit 2", beds: 2, baths: 1, sqft: 880, rent: 1_275 },
      { label: "Unit 3", beds: 1, baths: 1, sqft: 640, rent: 1_025 },
    ],
    performance: {
      recommendation: "Buy",
      dealScore: 74,
      risk: "Moderate",
      rationale: LONG_RATIONALE,
      monthlyCashFlow: 170,
      cocReturn: 3.4,
      capRate: 7.5,
      dscr: 1.24,
      taxSavings: 1_830,
      afterTaxCF: 2_040,
    },
    inputConfidence: {
      score: 68,
      stageLabel: "Screening",
      sensitivityRisk: "moderate",
      methodVersion: "1.0",
      verifiedAssumptions: ["Purchase price", "Interest rate", "Property tax bill"],
      unverifiedAssumptions: [
        {
          label: "Market rent",
          sourceClass: "estimate",
          sourceLabel: "RentCast estimate",
          reason: "No signed leases provided",
        },
        {
          label: "Maintenance reserve",
          sourceClass: "default",
          sourceLabel: "TrueCap default",
          reason: "Not overridden by the user",
        },
      ],
    },
    maxOffer: {
      maxPrice: 241_000,
      // The ≥ is load-bearing: real basis strings carry it ("DSCR ≥ 1.25"),
      // and jsPDF's WinAnsi Helvetica mojibaked it (`"e`) in shipped
      // reports. The sample keeps the glyph so this harness renders the
      // sanitizer's work, not just ASCII.
      basis: "8% cash-on-cash target · DSCR ≥ 1.25",
      currentPriceGap: -24_000,
      achieved: { monthlyCashFlow: 512, cocReturn: 8.0, capRate: 8.2, dscr: 1.41 },
      requiredMonthlyRent: { value: 3_940, alreadyMet: false, unreachable: false },
      requiredInterestRate: { value: 5.75, alreadyMet: false, unreachable: false },
    },
    downsideScenario: {
      label: "rent -10% · vacancy +5pp · rate +1pp",
      verdict: "Avoid",
      monthlyCashFlow: -418,
      cocReturn: -4.9,
      capRate: 5.8,
      dscr: 0.87,
    },
    projection10y: {
      cumulativeCF: projectionRows[9]!.cum,
      bestAnnualPreTax: Math.max(...projectionRows.map((r) => r.net)),
      year10Equity: projectionRows[9]!.equity,
      rows: projectionRows,
    },
    taxStrategy: {
      year1Taxable: taxRows[0]!.taxable,
      year1Savings: taxRows[0]!.savings,
      totalBenefit10y: taxRows.reduce((sum, r) => sum + r.benefit, 0),
      annualDepreciation: 7_636,
      rows: taxRows,
    },
    exitScenarios: {
      bestYear: 10,
      year5Profit: exitRows[4]!.profit,
      year10Profit: exitRows[9]!.profit,
      totalROI: 118.4,
      rows: exitRows,
    },
    comps: {
      valueEstimate: 258_000,
      valueRange: { low: 236_000, high: 279_000 },
      rentEstimate: 3_640,
      rentRange: { low: 3_380, high: 3_910 },
      saleComps: [
        { address: "1712 W Erie Ave", price: 249_000, bedrooms: 5, bathrooms: 3, squareFootage: 2_380, distanceMiles: 0.05, pricePerSqft: 104.6218 },
        { address: "1633 W Venango St", price: 272_500, bedrooms: 6, bathrooms: 3, squareFootage: 2_540, distanceMiles: 0.22, pricePerSqft: 107.2835 },
        { address: "3401 N 18th St", price: 238_000, bedrooms: 5, bathrooms: 2, squareFootage: 2_210, distanceMiles: 0.31, pricePerSqft: 107.6923 },
      ],
      fetchedAt: "2026-08-12T00:00:00Z",
      rentComps: [
        { address: "1720 W Erie Ave Unit 2", price: 1_295, bedrooms: 2, bathrooms: 1, squareFootage: 890, distanceMiles: 0.06, pricePerSqft: 1.4551 },
        { address: "3350 N 17th St Unit A", price: 1_250, bedrooms: 2, bathrooms: 1, squareFootage: 860, distanceMiles: 0.18, pricePerSqft: 1.4535 },
        { address: "1655 W Venango St Unit 1", price: 1_050, bedrooms: 1, bathrooms: 1, squareFootage: 620, distanceMiles: 0.25, pricePerSqft: 1.6935 },
      ],
    },
  };
}

/**
 * Deal shapes that are NOT the happy path.
 *
 * The report was originally verified against exactly one deal — a financed
 * multi-family — which left the branches most likely to break layout entirely
 * unexercised. Each variant below is a shape that reaches different code:
 * a cash purchase suppresses the debt lines and makes DSCR meaningless;
 * all-zero data drives the chart engine's degenerate axis path; a single row
 * makes every series length 1; negatives flip bar directions and label
 * placement; and a very long address stresses the cover's fixed rhythm.
 *
 * These only assert that the report RENDERS. Rendering is not correctness —
 * but a throw here is always a bug, and it is the cheap half of the check.
 */
function variants(): Record<string, () => ReportData> {
  return {
    baseline: buildSampleReport,
    cashPurchase: () => {
      const d = buildSampleReport();
      d.financing = { ...d.financing, downPaymentPct: 100, downPayment: d.property.purchasePrice, interestRate: 0, loanTerm: 0 };
      d.performance = { ...d.performance, dscr: 0 };
      d.projection10y.rows.forEach((r) => { r.debt = 0; r.net = r.rental - r.opex; r.after = r.net + (r.tax ?? 0); });
      if (d.operatingStatement) {
        d.operatingStatement = { ...d.operatingStatement, isCashPurchase: true, annualDebtService: 0, pmiAnnual: 0, loanAmount: 0, monthlyPayment: 0 };
      }
      return d;
    },
    allZero: () => {
      const d = buildSampleReport();
      d.projection10y.rows.forEach((r) => { r.rental = 0; r.opex = 0; r.debt = 0; r.net = 0; r.tax = 0; r.after = 0; r.cum = 0; r.propertyValue = 0; r.loanBalance = 0; r.equity = 0; });
      d.taxStrategy.rows.forEach((r) => { r.opex = 0; r.interest = 0; r.dep = 0; r.taxable = 0; r.savings = 0; });
      d.exitScenarios.rows.forEach((r) => { r.value = 0; r.loan = 0; r.equity = 0; r.netSale = 0; r.profit = 0; });
      return d;
    },
    singleRow: () => {
      const d = buildSampleReport();
      d.projection10y.rows = d.projection10y.rows.slice(0, 1);
      d.taxStrategy.rows = d.taxStrategy.rows.slice(0, 1);
      d.exitScenarios.rows = d.exitScenarios.rows.slice(0, 1);
      return d;
    },
    allNegative: () => {
      const d = buildSampleReport();
      d.projection10y.rows.forEach((r, i) => { r.net = -5000; r.after = -6000; r.cum = -5000 * (i + 1); });
      d.exitScenarios.rows.forEach((r) => { r.profit = -50000; r.equity = -2000; });
      d.performance = { ...d.performance, monthlyCashFlow: -900, cocReturn: -40, dscr: 0.4, recommendation: "Avoid" };
      return d;
    },
    sparse: () => {
      const d = buildSampleReport();
      // Legacy / cached payloads predate these fields.
      d.comps = null;
      d.inputConfidence = null;
      d.maxOffer = null;
      d.operatingStatement = null;
      return d;
    },
    longStrings: () => {
      const d = buildSampleReport();
      d.property.address = "12345 Extraordinarily Long Boulevard Of Testing Names, Apartment Complex Building 7B, Philadelphia, Pennsylvania 19140-1234";
      return d;
    },
  };
}

async function main() {
  const args = process.argv.slice(2);
  const outIndex = args.indexOf("--out");
  const outPath = outIndex >= 0 ? args[outIndex + 1]! : ".pdf-check/report.pdf";
  const allBranches = args.includes("--branches");

  // Fail loudly if anything reaches for a DOM. Without this the report can
  // regress to browser-only and nobody notices until the server action 500s.
  //
  // `document` and `window` only: Node 20+ defines a real `navigator` global
  // (navigator.userAgent, hardwareConcurrency), so its presence says nothing
  // about a DOM and asserting on it just fails on every modern runtime.
  for (const global of ["document", "window"] as const) {
    if (global in globalThis) {
      throw new Error(
        `${global} exists in this Node process — the DOM-free guarantee cannot be verified here.`
      );
    }
  }

  const { generateInvestmentPDFBlob } = await import("@/lib/pdf-generator");
  const started = Date.now();
  const blob = await generateInvestmentPDFBlob(buildSampleReport(), null, "personal");
  const bytes = Buffer.from(await blob.arrayBuffer());
  const elapsed = Date.now() - started;

  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, bytes);

  console.log(`✓ rendered under Node in ${elapsed}ms`);
  console.log(`  ${outPath} — ${(bytes.length / 1024).toFixed(1)} KB`);
  console.log(`  inspect: pdftoppm -png -r 130 ${outPath} ${outPath.replace(/\.pdf$/, "")}`);

  if (!allBranches) return;

  // Render every non-happy-path shape. A throw here is always a bug.
  let failed = 0;
  for (const [name, make] of Object.entries(variants())) {
    if (name === "baseline") continue;
    try {
      const variantBlob = await generateInvestmentPDFBlob(make(), null, "personal");
      const variantBytes = Buffer.from(await variantBlob.arrayBuffer());
      const size = variantBytes.byteLength;
      // Written next to the baseline so a suspicious shape can be opened and
      // looked at, not just counted.
      writeFileSync(outPath.replace(/\.pdf$/, `-${name}.pdf`), variantBytes);
      console.log(`  \u2713 ${name.padEnd(14)} ${(size / 1024).toFixed(0)} KB`);
    } catch (error) {
      failed += 1;
      console.error(`  \u2717 ${name.padEnd(14)} ${(error as Error).message}`);
    }
  }
  if (failed > 0) {
    console.error(`\n${failed} deal shape(s) failed to render.`);
    process.exit(1);
  }
  console.log("\nAll deal shapes rendered.");
}

void main().catch((error) => {
  console.error("✗ PDF render FAILED under Node:");
  console.error(error);
  process.exit(1);
});
