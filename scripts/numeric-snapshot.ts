/**
 * Numeric snapshot harness — the safety net for presentation-layer refactors.
 *
 * WHY: the Aug-2026 UX rebuild moves, renames, and consolidates the surfaces
 * that DISPLAY numbers. It must never change what those numbers ARE. This
 * script runs the pure calculation engine over three deals chosen to cover
 * the load-bearing branches (financed single-family, multi-family, cash
 * purchase where monthlyPayment <= 0 and DSCR is undefined — see CLAUDE.md
 * §3.4/§5.3) and dumps every computed output as stable JSON.
 *
 * USAGE:
 *   npm run snapshot -- <output-path>      # write a snapshot
 *   diff <before.json> <after.json>        # must be EMPTY after a refactor
 *
 * Any diff is a defect, including rounding and formatting-driven drift.
 * This imports ONLY pure lib functions — no DB, no network, no env.
 */

import { writeFileSync } from "node:fs";

import { calculateAnalysis } from "../lib/calc-analysis";
import { getDealTier, buildAutoVerdict } from "../lib/verdict";
import {
  buildDealScoreInputFromAnalysis,
  computeDealScore,
  type DealStrategy,
} from "../lib/deal-score";
import { calculateMaxAllowableOffer, type MaoTarget } from "../lib/max-allowable-offer";
import type { InvestmentFormValues } from "../lib/investcalc-schema";

function baseDeal(overrides: Partial<InvestmentFormValues> = {}): InvestmentFormValues {
  return {
    propertyType: "single-family",
    address: "1205 N 5th St, Philadelphia, PA 19122, USA",
    purchasePrice: 245_000,
    yearBuilt: 2010,
    bedrooms: 3,
    bathrooms: 2,
    sqft: 1500,
    monthlyRent: 2_100,
    units: [],
    downPaymentPct: 20,
    interestRate: 7,
    loanTermYears: 30,
    closingCostsPct: 3,
    propertyTaxPct: 1.1,
    insuranceInputMode: "percent",
    insurancePct: 0.5,
    insuranceMonthly: undefined,
    hoaMonthly: 0,
    utilitiesMonthly: 0,
    maintenancePct: 5,
    vacancyPct: 5,
    mgmtPct: 0,
    capexPct: 5,
    buildingValuePct: 80,
    depreciationYears: 27.5,
    includeInterestDeduction: true,
    taxRatePct: 24,
    expenseGrowthPct: 2,
    rentGrowthPct: 3,
    appreciationRatePct: 3,
    sellingCostPct: 6,
    ...overrides,
  } as InvestmentFormValues;
}

/** The three branches that must never drift. */
const DEALS: Array<{ name: string; values: InvestmentFormValues }> = [
  { name: "single-family-financed", values: baseDeal() },
  {
    name: "multi-family-3unit",
    values: baseDeal({
      propertyType: "multi-family",
      purchasePrice: 415_000,
      monthlyRent: 0,
      units: [
        { bedrooms: 2, bathrooms: 1, sqft: 850, monthlyRent: 1250, isOwnerOccupied: false },
        { bedrooms: 2, bathrooms: 1, sqft: 850, monthlyRent: 1300, isOwnerOccupied: false },
        { bedrooms: 3, bathrooms: 1, sqft: 1100, monthlyRent: 1450, isOwnerOccupied: false },
      ],
      mgmtPct: 8,
    } as Partial<InvestmentFormValues>),
  },
  {
    // Cash purchase: monthlyPayment <= 0 → DSCR undefined. Explicitly
    // covered because verdict + score + MAO all branch on it.
    name: "cash-purchase",
    values: baseDeal({ downPaymentPct: 100, interestRate: 0 }),
  },
];

/** Default targets the Max Offer solver runs with (break-even CF, DSCR 1.25). */
const DEFAULT_TARGETS: MaoTarget = { monthlyCashFlow: 0, dscr: 1.25 };
const STRATEGIES: DealStrategy[] = ["cash-flow", "balanced", "appreciation"];

/** Deterministic key ordering so a diff shows real changes, not key churn. */
function sortDeep(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortDeep);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.keys(value as Record<string, unknown>)
        .sort()
        .map((k) => [k, sortDeep((value as Record<string, unknown>)[k])])
    );
  }
  return value;
}

function snapshotDeal(values: InvestmentFormValues) {
  const result = calculateAnalysis(values);
  const scoreInput = buildDealScoreInputFromAnalysis(values, result);
  const mao = calculateMaxAllowableOffer(values, DEFAULT_TARGETS);

  return {
    analysis: result,
    dealTier: getDealTier(result),
    autoVerdict: buildAutoVerdict({
      result,
      address: values.address,
      purchasePrice: values.purchasePrice,
    }),
    dealScoreInput: scoreInput,
    dealScoreByStrategy: Object.fromEntries(
      STRATEGIES.map((s) => [s, computeDealScore(scoreInput, s)])
    ),
    maxAllowableOffer: mao
      ? { target: mao.target, maxPrice: mao.maxPrice, achieved: mao.achieved }
      : null,
  };
}

function main() {
  const outPath = process.argv[2];
  if (!outPath) {
    console.error("usage: tsx scripts/numeric-snapshot.ts <output-path>");
    process.exit(1);
  }

  const snapshot = Object.fromEntries(
    DEALS.map(({ name, values }) => [name, snapshotDeal(values)])
  );

  writeFileSync(outPath, `${JSON.stringify(sortDeep(snapshot), null, 2)}\n`, "utf8");
  console.log(`numeric snapshot written: ${outPath}`);
  for (const { name, values } of DEALS) {
    const r = calculateAnalysis(values);
    console.log(
      `  ${name}: cashFlow=${r.netCashFlow} capRate=${r.capRate} coc=${r.cocReturn} dscr=${r.dscr}`
    );
  }
}

main();
