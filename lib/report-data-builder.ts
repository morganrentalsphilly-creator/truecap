import { calculateAnalysis } from "@/lib/calc-analysis";
import {
  buildDealScoreInputFromAnalysis,
  computeDealScore,
} from "@/lib/deal-score";
import {
  buildExitScenarios,
  resolveExitScenarioRates,
} from "@/lib/exit-scenarios";
import {
  investmentFormSchema,
  type InvestmentFormValues,
} from "@/lib/investcalc-schema";
import { buildReportMaxOffer } from "@/lib/report-max-offer";
import { resolveReportMaoTarget } from "@/lib/report-max-offer";
import { buildReportOperatingStatement } from "@/lib/report-operating-statement";
import { TRUECAP_UNDERWRITING_STANDARD_NAME } from "@/lib/underwriting-methodology";
import { getDealTier } from "@/lib/verdict";
import {
  applyWhatIfAdjustments,
  WORST_CASE_PRESET,
} from "@/lib/what-if-adjustments";
import type { ReportData } from "@/lib/pdf-generator";
import { meetsTarget } from "@/lib/max-allowable-offer";
import {
  normalizeOfferCeilingTargetSource,
  type OfferCeilingTargetSource,
} from "@/lib/offer-ceiling";
import { describeMaoTarget } from "@/lib/mao-targets";

export type CanonicalReportBuildInput = {
  /** Raw browser payload. It is parsed again here even when the action schema
   * already succeeded, so this function remains a self-contained trust
   * boundary and is safe for future server callers. */
  values: unknown;
  /** Presentation data resolved by the server from an owner-scoped saved
   * analysis. Never populate this from a browser request. */
  trustedPresentation?: {
    templateLabel?: string | null;
    comps?: ReportData["comps"];
  };
  /** User-selected acquisition criteria. The strict target normalizer inside
   * buildReportMaxOffer rejects invalid values and supplies canonical defaults. */
  maxOfferTarget?: unknown;
  /** Captured target provenance. Invalid/missing values never become a Buy
   * Box claim; they fall back to selected targets or screening defaults. */
  maxOfferTargetSource?: unknown;
  /** Test-only clock injection. Production callers omit it. */
  generatedAt?: Date;
};

/**
 * Rebuild a complete investment report from accepted form inputs.
 *
 * This is the PDF provenance boundary: the browser may choose inputs and a
 * target, but it may not supply calculated results. Performance, score,
 * methodology, financing outputs, projections, tax rows, exit rows, the
 * operating statement, downside scenario, and Offer Ceiling are all produced
 * here through the same canonical engines used by the product.
 */
export function buildCanonicalReportData(
  input: CanonicalReportBuildInput,
): ReportData {
  const values = investmentFormSchema.parse(input.values);
  const result = calculateAnalysis(values);
  const score = computeDealScore(
    buildDealScoreInputFromAnalysis(values, result),
  );
  const projectionYears = result.tenYearProjection;
  const taxYears = result.taxStrategyYears;

  const exitYears = buildExitScenarios({
    purchasePrice: values.purchasePrice,
    ...resolveExitScenarioRates(values),
    loanAmount: result.loanAmount,
    interestRate: values.interestRate,
    loanTermYears: values.loanTermYears,
    monthlyPayment: result.monthlyPayment,
    downPayment: result.downPayment,
    closingCosts: result.closingCosts,
    initialCashInvested: result.totalCashRequired,
    cumulativeCashFlowByYear: projectionYears.map(
      (year) => year.cumulativeCashFlowAnnual,
    ),
    cumulativeTaxBenefitByYear: taxYears.map(
      (year) => year.cumulativeTaxBenefitAnnual,
    ),
    annualDepreciation: taxYears[0]?.depreciationDeductionAnnual ?? 0,
  });

  const projectionRows = projectionYears.map((row) => ({
    y: row.year,
    rental: row.rentalIncomeAnnual,
    opex: row.operatingExpensesAnnual,
    debt: row.debtServiceAnnual,
    net: row.netCashFlowAnnual,
    tax: row.taxSavingsAnnual,
    after: row.afterTaxCashFlowAnnual,
    cum: row.cumulativeCashFlowAnnual,
  }));
  const taxRows = taxYears.map((row) => ({
    y: row.year,
    rental: row.rentalIncomeAnnual,
    opex: row.operatingExpensesAnnual,
    interest: row.mortgageInterestDeductionAnnual,
    dep: row.depreciationDeductionAnnual,
    total: row.totalDeductionsAnnual,
    taxable: row.taxableRentalIncomeAnnual,
    savings: row.taxSavingsAnnual,
    benefit: row.netTaxBenefitAnnual,
  }));
  const year1Tax = taxYears.find((row) => row.year === 1);
  const bestExit = exitYears.reduce<(typeof exitYears)[number] | null>(
    (best, row) =>
      best === null || row.totalProfit > best.totalProfit ? row : best,
    null,
  );
  const year5Exit = exitYears.find((row) => row.year === 5);
  const year10Exit =
    exitYears.find((row) => row.year === 10) ?? exitYears[exitYears.length - 1];

  const downsideRatePp =
    result.monthlyPayment > 0 ? WORST_CASE_PRESET.ratePp : 0;
  const downsideValues = applyWhatIfAdjustments(
    values,
    WORST_CASE_PRESET.rentPct,
    0,
    downsideRatePp,
    WORST_CASE_PRESET.vacancyPp,
  );
  const downsideResult = calculateAnalysis(downsideValues);

  const units = buildReportUnits(values, result.monthlyRentalIncome);
  const methodologyVersion = result.methodologyVersion;
  const resolvedTarget = resolveReportMaoTarget(input.maxOfferTarget, {
    isCashPurchase: result.monthlyPayment <= 0,
  });
  const targetSource: OfferCeilingTargetSource =
    normalizeOfferCeilingTargetSource(input.maxOfferTargetSource) ??
    (input.maxOfferTarget ? "selected-targets" : "screening-defaults");
  const targetBasis = describeMaoTarget(resolvedTarget);
  const clearsSelectedTargets = meetsTarget(result, resolvedTarget);
  const decisionSourceLabel =
    targetSource === "buy-box"
      ? "the captured Buy Box financial targets"
      : targetSource === "selected-targets"
        ? "the selected targets"
        : "the visible screening defaults";

  return {
    generatedAt: input.generatedAt ?? new Date(),
    methodologyVersion,
    methodologyLabel: `${TRUECAP_UNDERWRITING_STANDARD_NAME} v${methodologyVersion}`,
    property: {
      address: values.address,
      type: values.propertyType,
      yearBuilt: values.yearBuilt ?? null,
      purchasePrice: values.purchasePrice,
      template:
        input.trustedPresentation?.templateLabel ??
        (values.templateId ? "Template Applied" : "Custom"),
    },
    financing: {
      downPaymentPct: values.downPaymentPct,
      downPayment: result.downPayment,
      interestRate: values.interestRate,
      loanTerm: values.loanTermYears,
      closingCostsPct: result.closingCostsPct,
      closingCosts: result.closingCosts,
    },
    expenses: {
      propertyTaxPct:
        Math.round(Number(result.propertyTaxPctEffective ?? 0) * 100) / 100,
      propertyTaxAnnualBill:
        values.propertyTaxInputMode === "annual" &&
        values.propertyTaxAnnual != null
          ? Number(values.propertyTaxAnnual)
          : null,
      insurancePct: Number(result.insurancePctEffective ?? 0),
      maintenancePct: Number(result.maintenancePctEffective ?? 0),
      vacancyPct: Number(values.vacancyPct),
      managementPct: Number(values.mgmtPct),
      capexPct: Number(result.capexPctEffective ?? 0),
      hoaMonthly: Number(result.hoaMonthly),
      utilitiesMonthly: Number(result.utilities),
      rentGrowth: Number(values.rentGrowthPct),
      expenseGrowth: Number(values.expenseGrowthPct),
      appreciation: Number(values.appreciationRatePct ?? 3),
      sellingCost: Number(values.sellingCostPct ?? 6),
      taxRate: Number(values.taxRatePct ?? result.effectiveTaxRate * 100),
    },
    units,
    operatingStatement: buildReportOperatingStatement(result),
    performance: {
      recommendation: score.recommendation,
      dealScore: score.score,
      risk: score.riskLevel,
      rationale: score.explanation,
      monthlyCashFlow: result.netCashFlow,
      cocReturn: result.cocReturn,
      capRate: result.capRate,
      dscr: result.dscr,
      taxSavings: result.taxSavingsMonthly,
      afterTaxCF: result.afterTaxCF,
    },
    decision: {
      label: clearsSelectedTargets
        ? "Meets selected rules at asking"
        : "Does not meet selected rules at asking",
      readiness: "Screening only",
      clearsSelectedTargets,
      targetSource,
      targetBasis,
      rationale: clearsSelectedTargets
        ? `The asking price clears ${decisionSourceLabel}, but material inputs remain screening assumptions and must be verified before a user-recorded decision.`
        : `The asking price does not clear ${decisionSourceLabel}: ${targetBasis}.`,
    },
    // Input-verification evidence submitted by the browser is not authoritative
    // enough for a lender-facing artifact. Omit it until the server can rebuild
    // it from persisted verification records.
    inputConfidence: null,
    // Saved-deal comps are included only when the server resolved them through
    // an owner-scoped read. Anonymous/browser-supplied comps are discarded.
    comps: input.trustedPresentation?.comps ?? null,
    maxOffer: buildReportMaxOffer({
      values,
      result,
      targetInput: input.maxOfferTarget,
      targetSourceInput: input.maxOfferTargetSource,
    }),
    downsideScenario: {
      label: `Rent ${WORST_CASE_PRESET.rentPct}% · vacancy +${WORST_CASE_PRESET.vacancyPp}pp${
        downsideRatePp > 0 ? ` · rate +${downsideRatePp}pp` : ""
      }`,
      verdict: getDealTier(downsideResult),
      monthlyCashFlow: downsideResult.netCashFlow,
      cocReturn: downsideResult.cocReturn,
      capRate: downsideResult.capRate,
      dscr: downsideResult.dscr,
    },
    projection10y: {
      cumulativeCF: projectionRows[projectionRows.length - 1]?.cum ?? 0,
      bestAnnualAfterTax: projectionRows.length
        ? Math.max(...projectionRows.map((row) => row.after))
        : 0,
      totalAfterTax: projectionRows.reduce(
        (total, row) => total + row.after,
        0,
      ),
      rows: projectionRows,
    },
    taxStrategy: {
      year1Taxable: year1Tax?.taxableRentalIncomeAnnual ?? 0,
      year1Savings: year1Tax?.taxSavingsAnnual ?? 0,
      totalBenefit10y: taxYears.reduce(
        (total, row) => total + row.netTaxBenefitAnnual,
        0,
      ),
      annualDepreciation: result.annualDepreciation,
      rows: taxRows,
    },
    exitScenarios: {
      bestYear: bestExit?.year ?? 1,
      year5Profit: year5Exit?.totalProfit ?? 0,
      year10Profit: year10Exit?.totalProfit ?? 0,
      totalROI:
        result.totalCashRequired > 0 && year10Exit
          ? (year10Exit.totalProfit / result.totalCashRequired) * 100
          : 0,
      rows: exitYears.map((row) => ({
        y: row.year,
        value: row.propertyValue,
        loan: row.remainingLoanBalance,
        equity: row.equity,
        netSale: row.netSaleProceeds,
        profit: row.totalProfit,
      })),
    },
  };
}

function buildReportUnits(
  values: InvestmentFormValues,
  monthlyRentalIncome: number,
): ReportData["units"] {
  if (values.propertyType === "single-family") {
    return [
      {
        label: "Unit 1",
        beds: Number(values.bedrooms ?? 0),
        baths: Number(values.bathrooms ?? 0),
        sqft: Number(values.sqft ?? 0),
        // STR revenue comes from ADR × occupancy; monthlyRent is then a stale
        // fallback field that must not appear as the report's rent roll.
        rent:
          typeof values.avgDailyRate === "number" && values.avgDailyRate > 0
            ? monthlyRentalIncome
            : Number(values.monthlyRent ?? monthlyRentalIncome),
      },
    ];
  }

  return (values.units ?? []).map((unit, index) => ({
    label: `Unit ${index + 1}`,
    beds: Number(unit.bedrooms ?? 0),
    baths: Number(unit.bathrooms ?? 0),
    sqft: Number(unit.sqft ?? 0),
    rent: Number(unit.monthlyRent ?? 0),
    isOwnerOccupied:
      values.propertyType === "owner-occupant" && Boolean(unit.isOwnerOccupied),
  }));
}
