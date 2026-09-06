import { calculateAnalysis } from "@/lib/calc-analysis";
import {
  buildDealScoreInputFromAnalysis,
  computeDealScore,
} from "@/lib/deal-score";
import {
  buildExitScenarios,
  resolveExitScenarioRates,
  type ExitScenarioYear,
} from "@/lib/exit-scenarios";
import {
  investmentFormSchema,
  type InvestmentFormValues,
} from "@/lib/investcalc-schema";
import { buildReportMaxOffer } from "@/lib/report-max-offer";
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
  isAdoptedOfferCeilingTargetSource,
  type OfferCeilingTargetSource,
} from "@/lib/offer-ceiling-contract";
import { normalizeExternalOfferCeilingTargetSource } from "@/lib/external-offer-ceiling-provenance";
import { describeMaoTarget } from "@/lib/mao-targets";
import {
  normalizeMaoTarget,
  normalizeMaoTargetForFinancing,
} from "@/lib/mao-target-editor";
import { resolveCompatibleAnalyzerStrategyKey } from "@/lib/analyzer-strategy-persistence";
import {
  buildSpecialistAnalysisSnapshot,
  type SpecialistAnalysisSnapshot,
} from "@/lib/specialist-analysis-snapshot";
import { isSpecialistStrategyEnabled } from "@/lib/feature-flags";

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
  /** Current analyzer lens. It chooses whether the server should derive a
   * specialist section, but never supplies calculated specialist outcomes. */
  analyzerStrategyKey?: unknown;
  /** Test-only clock injection. Production callers omit it. */
  generatedAt?: Date;
};

function resolveReportSpecialistAnalysis(args: {
  input: CanonicalReportBuildInput;
  values: InvestmentFormValues;
  result: ReturnType<typeof calculateAnalysis>;
}): SpecialistAnalysisSnapshot | null {
  const strategyKey = resolveCompatibleAnalyzerStrategyKey(
    args.input.analyzerStrategyKey,
    args.values,
  );
  if (!isSpecialistStrategyEnabled(strategyKey)) return null;
  return buildSpecialistAnalysisSnapshot(args.values, args.result, strategyKey);
}

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
  const currentResult = calculateAnalysis(values);
  const currentScore = computeDealScore(
    buildDealScoreInputFromAnalysis(values, currentResult),
  );
  const result = currentResult;
  const score = currentScore;
  const specialistAnalysis = resolveReportSpecialistAnalysis({
    input,
    values,
    result,
  });
  const projectionYears = result.tenYearProjection;
  const taxYears = result.taxStrategyYears;

  const exitYears: ExitScenarioYear[] = buildExitScenarios({
    purchasePrice: values.purchasePrice,
    ...resolveExitScenarioRates(values),
    loanAmount: result.loanAmount,
    interestRate: values.interestRate,
    loanTermYears: values.loanTermYears,
    amortizationTermYears: values.amortizationTermYears ?? values.loanTermYears,
    interestOnlyMonths: values.interestOnlyMonths ?? 0,
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

  const projectionRows = projectionYears.map((row, index) => ({
    y: row.year,
    rental: row.rentalIncomeAnnual,
    opex: row.operatingExpensesAnnual,
    debt: row.debtServiceAnnual,
    net: row.netCashFlowAnnual,
    cum: row.cumulativeCashFlowAnnual,
    propertyValue: exitYears[index]?.propertyValue ?? values.purchasePrice,
    loanBalance: exitYears[index]?.remainingLoanBalance ?? 0,
    equity: exitYears[index]?.equity ?? values.purchasePrice,
    renovationIncomeLoss: row.renovationIncomeLossAnnual,
    balloon: row.balloonPaymentAnnual,
    financingOutflow: row.financingOutflowAnnual,
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
  const downsideResult = calculateAnalysis(
    applyWhatIfAdjustments(
      values,
      WORST_CASE_PRESET.rentPct,
      0,
      downsideRatePp,
      WORST_CASE_PRESET.vacancyPp,
    ),
  );

  const units = buildReportUnits(values, result.monthlyRentalIncome);
  const methodologyVersion = result.methodologyVersion;
  const tenYearProjectionVersion =
    typeof result.tenYearProjectionVersion === "number" &&
    Number.isInteger(result.tenYearProjectionVersion) &&
    result.tenYearProjectionVersion > 0
      ? result.tenYearProjectionVersion
      : null;
  const normalizedTarget = normalizeMaoTarget(input.maxOfferTarget);
  const targetSource: OfferCeilingTargetSource =
    normalizeExternalOfferCeilingTargetSource(input.maxOfferTargetSource, {
      target: normalizedTarget,
      values,
    }) ?? (normalizedTarget ? "selected-targets" : "screening-defaults");
  const targetAdopted = Boolean(
    normalizedTarget && isAdoptedOfferCeilingTargetSource(targetSource),
  );
  const resolvedTarget = targetAdopted
    ? normalizeMaoTargetForFinancing(normalizedTarget, {
        isCashPurchase: result.monthlyPayment <= 0,
      })
    : null;
  const targetBasis = resolvedTarget
    ? describeMaoTarget(resolvedTarget)
    : "No acquisition targets adopted";
  const clearsSelectedTargets = resolvedTarget
    ? meetsTarget(result, resolvedTarget, values)
    : false;
  const decisionSourceLabel =
    targetSource === "buy-box"
      ? "the captured Buy Box financial targets"
      : targetSource === "starter-criteria"
        ? "the adopted TrueCap starter criteria"
        : targetSource === "selected-targets"
          ? "the selected targets"
          : "the visible screening defaults";

  return {
    generatedAt: input.generatedAt ?? new Date(),
    methodologyVersion,
    methodologyLabel: `${TRUECAP_UNDERWRITING_STANDARD_NAME} v${methodologyVersion}`,
    tenYearProjectionVersion,
    property: {
      address: values.address,
      type: values.propertyType,
      yearBuilt: values.yearBuilt ?? null,
      purchasePrice: values.purchasePrice,
      currentValue: values.currentPropertyValue ?? null,
      stabilizedValue: values.stabilizedPropertyValue ?? null,
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
      loanPointsPct: result.loanPointsPct ?? 0,
      loanPointsAmount: result.loanPointsAmount ?? 0,
      originationFee: result.originationFee ?? 0,
      loanFees: result.loanFees ?? 0,
      initialReserve: result.initialReserve ?? 0,
      lenderEscrowDeposit: result.lenderEscrowDeposit ?? 0,
      lenderReserveDeposit: result.lenderReserveDeposit ?? 0,
      acquisitionCredits: result.acquisitionCredits ?? 0,
      interestOnlyMonths: result.interestOnlyMonths ?? 0,
      amortizationTermYears:
        result.amortizationTermYears ?? values.loanTermYears,
      maturityTermYears: result.loanMaturityTermYears ?? values.loanTermYears,
      initialMonthlyPayment:
        result.initialMonthlyLoanPayment ?? result.monthlyPayment,
      amortizingMonthlyPayment:
        result.amortizingMonthlyLoanPayment ?? result.monthlyPayment,
      balloonPayment: result.balloonPayment ?? 0,
      balloonMonth: result.balloonMonth ?? values.loanTermYears * 12,
      rehabBudget: Number(values.rehabBudget ?? 0),
    },
    expenses: {
      propertyTaxPct:
        Math.round(Number(result.propertyTaxPctEffective ?? 0) * 100) / 100,
      propertyTaxAnnualBill:
        values.propertyTaxInputMode === "annual" &&
        values.propertyTaxAnnual != null
          ? Number(values.propertyTaxAnnual)
          : null,
      insuranceMonthlyBill:
        result.insuranceInputMode === "monthly"
          ? Number(result.insuranceMonthly)
          : null,
      insurancePct: Number(result.insurancePctEffective ?? 0),
      maintenancePct: Number(result.maintenancePctEffective ?? 0),
      vacancyPct: Number(values.vacancyPct),
      managementPct: Number(values.mgmtPct),
      capexPct: Number(result.capexPctEffective ?? 0),
      hoaMonthly: Number(result.hoaMonthly),
      utilitiesMonthly: Number(result.utilities),
      recurringOtherIncomeMonthly: Number(
        result.recurringOtherIncomeMonthly ?? 0,
      ),
      recurringOtherExpenseMonthly: Number(
        result.recurringOtherExpenseMonthly ?? 0,
      ),
      turnoverReserveMonthly: Number(result.turnoverReserveMonthly ?? 0),
      leasingReserveMonthly: Number(result.leasingReserveMonthly ?? 0),
      landscapingMonthly: Number(result.landscapingMonthly ?? 0),
      pestControlMonthly: Number(result.pestControlMonthly ?? 0),
      administrativeMonthly: Number(result.administrativeMonthly ?? 0),
      ...(result.renovationStartMonth != null
        ? { renovationStartMonth: result.renovationStartMonth }
        : {}),
      ...(result.renovationDurationMonths != null
        ? { renovationDurationMonths: result.renovationDurationMonths }
        : {}),
      ...(result.renovationRentLossPct != null
        ? { renovationRentLossPct: result.renovationRentLossPct }
        : {}),
      ...(result.renovationIncomeLossAnnual != null
        ? { renovationIncomeLossAnnual: result.renovationIncomeLossAnnual }
        : {}),
      rentGrowth: Number(values.rentGrowthPct),
      expenseGrowth: Number(values.expenseGrowthPct),
      appreciation: Number(values.appreciationRatePct ?? 3),
      sellingCost: Number(values.sellingCostPct ?? 6),
      taxRate: Number(values.taxRatePct ?? result.effectiveTaxRate * 100),
    },
    units,
    operatingStatement: buildReportOperatingStatement(result),
    specialistAnalysis,
    performance: {
      recommendation: score.recommendation,
      dealScore: score.score,
      risk: score.riskLevel,
      rationale: score.explanation,
      monthlyCashFlow: result.netCashFlow,
      cocReturn: result.cocReturn,
      cocApplicable: result.totalCashRequired > 0,
      capRate: result.capRate,
      dscr: result.dscr,
      taxSavings: result.taxSavingsMonthly,
      afterTaxCF: result.afterTaxCF,
    },
    decision: {
      label: !targetAdopted
        ? "Preliminary underwriting"
        : clearsSelectedTargets
          ? targetSource === "starter-criteria"
            ? "Meets TrueCap starter criteria at asking"
            : "Meets your targets at asking"
          : targetSource === "starter-criteria"
            ? "Does not meet TrueCap starter criteria at asking"
            : "Doesn't meet your targets at asking",
      readiness: "Screening only",
      clearsSelectedTargets,
      targetSource,
      targetBasis,
      rationale: !targetAdopted
        ? "No acquisition targets were adopted for this underwrite. Review the operating results, verify material assumptions, and set at least one target before calculating an Offer Ceiling."
        : clearsSelectedTargets
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
      targetSourceInput: targetSource,
    }),
    downsideScenario: downsideResult
      ? {
          label: `Rent ${WORST_CASE_PRESET.rentPct}% · vacancy +${WORST_CASE_PRESET.vacancyPp}pp${
            downsideRatePp > 0 ? ` · rate +${downsideRatePp}pp` : ""
          }`,
          verdict: getDealTier(downsideResult),
          monthlyCashFlow: downsideResult.netCashFlow,
          cocReturn: downsideResult.cocReturn,
          cocApplicable: downsideResult.totalCashRequired > 0,
          capRate: downsideResult.capRate,
          dscr: downsideResult.dscr,
        }
      : undefined,
    projection10y: {
      cumulativeCF: projectionRows[projectionRows.length - 1]?.cum ?? 0,
      bestAnnualPreTax: projectionRows.length
        ? Math.max(...projectionRows.map((row) => row.net))
        : 0,
      year10Equity: projectionRows[projectionRows.length - 1]?.equity ?? 0,
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
        stabilizedRent: values.stabilizedMonthlyRent,
      },
    ];
  }

  return (values.units ?? []).map((unit, index) => ({
    label: `Unit ${index + 1}`,
    beds: Number(unit.bedrooms ?? 0),
    baths: Number(unit.bathrooms ?? 0),
    sqft: Number(unit.sqft ?? 0),
    rent: Number(unit.monthlyRent ?? 0),
    stabilizedRent: unit.stabilizedMonthlyRent,
    isOwnerOccupied:
      values.propertyType === "owner-occupant" && Boolean(unit.isOwnerOccupied),
  }));
}
