import type { ExitScenarioYear } from "@/lib/exit-scenarios";

/** Why an IRR result is or is not safe to present as a single headline. */
export type IrrStatus = "unique" | "multiple" | "none";
export type IrrNoResultReason =
  | "insufficient-periods"
  | "same-sign"
  | "no-real-root";

export interface IrrAnalysis {
  status: IrrStatus;
  /** Convenient headline result. For multiple roots this is the root closest
   * to zero; callers must also disclose `status` and `rootsPct`. */
  primaryIrrPct: number | null;
  /** Every economically admissible periodic IRR (rate > -100%), ascending. */
  rootsPct: number[];
  reason: IrrNoResultReason | null;
}

export type CagrStatus =
  | "available"
  | "later-contributions"
  | "no-initial-contribution"
  | "non-positive-distributions"
  | "invalid-horizon";

export interface ReturnSummary {
  /** Initial t0 contribution only. */
  initialCashInvested: number;
  /** Backward-compatible display field; now means ALL contributed capital. */
  cashInvested: number;
  /** Initial cash plus every later negative external cash flow. */
  totalContributions: number;
  /** Every positive external cash flow, including operations, refi and sale. */
  totalDistributions: number;
  hasLaterContributions: boolean;
  /** Distributions minus contributions. */
  totalProfit: number;
  /** (distributions - contributions) / contributions x 100. */
  roiPct: number | null;
  readonly roiDefinition: "net-profit-over-all-contributions";
  /** Positive distributions / all contributions. */
  equityMultiple: number | null;
  /** Only meaningful when all capital was contributed at t0. */
  cagrPct: number | null;
  cagrStatus: CagrStatus;
  /** Money-weighted periodic return. */
  irrPct: number | null;
  irrStatus: IrrStatus;
  irrRootsPct: number[];
  irrReason: IrrNoResultReason | null;
  /** Estimated tax owed at sale (depreciation recapture + capital gains). */
  exitTax: number;
  /** Modeled hold length in periods (annual for exit-scenario summaries). */
  years: number;
}

const ROOT_VALUE_TOLERANCE = 1e-9;
const ROOT_DISTANCE_TOLERANCE = 1e-9;

function trimPolynomial(coefficients: number[]): number[] {
  const trimmed = [...coefficients];
  while (trimmed.length > 1 && Math.abs(trimmed[trimmed.length - 1]!) < 1e-14) {
    trimmed.pop();
  }
  return trimmed;
}

function normalizePolynomial(coefficients: number[]): number[] {
  const scale = Math.max(...coefficients.map(Math.abs));
  return scale > 0 ? coefficients.map((value) => value / scale) : coefficients;
}

/** Evaluate an ascending-order polynomial with Horner's method. */
function evaluatePolynomial(coefficients: number[], x: number): number {
  let value = 0;
  for (let index = coefficients.length - 1; index >= 0; index -= 1) {
    value = value * x + coefficients[index]!;
  }
  return value;
}

function cauchyPositiveRootBound(coefficients: number[]): number {
  const leading = Math.abs(coefficients[coefficients.length - 1]!);
  if (!(leading > 0)) return 1;
  let ratio = 0;
  for (let index = 0; index < coefficients.length - 1; index += 1) {
    ratio = Math.max(ratio, Math.abs(coefficients[index]!) / leading);
  }
  return Math.max(1, 1 + ratio);
}

function bisectPolynomialRoot(
  coefficients: number[],
  initialLeft: number,
  initialRight: number,
): number {
  let left = initialLeft;
  let right = initialRight;
  let leftValue = evaluatePolynomial(coefficients, left);

  for (let iteration = 0; iteration < 240; iteration += 1) {
    const midpoint = left + (right - left) / 2;
    const midpointValue = evaluatePolynomial(coefficients, midpoint);
    if (
      Math.abs(midpointValue) <= ROOT_VALUE_TOLERANCE ||
      right - left <= ROOT_DISTANCE_TOLERANCE * Math.max(1, Math.abs(midpoint))
    ) {
      return midpoint;
    }
    if (Math.sign(leftValue) === Math.sign(midpointValue)) {
      left = midpoint;
      leftValue = midpointValue;
    } else {
      right = midpoint;
    }
  }
  return left + (right - left) / 2;
}

function dedupeSorted(values: number[]): number[] {
  const sorted = values.filter(Number.isFinite).sort((a, b) => a - b);
  const result: number[] = [];
  for (const value of sorted) {
    const previous = result[result.length - 1];
    if (
      previous === undefined ||
      Math.abs(value - previous) >
        ROOT_DISTANCE_TOLERANCE * Math.max(1, Math.abs(value), Math.abs(previous))
    ) {
      result.push(value);
    }
  }
  return result;
}

/**
 * Find every positive real root of an ascending-order polynomial. The roots
 * of the derivative partition the positive axis into monotonic intervals, so
 * this discovers multiple and tangent roots without a fixed IRR search cap.
 */
function positivePolynomialRoots(rawCoefficients: number[]): number[] {
  const coefficients = normalizePolynomial(trimPolynomial(rawCoefficients));
  const degree = coefficients.length - 1;
  if (degree < 1) return [];
  if (degree === 1) {
    const root = -coefficients[0]! / coefficients[1]!;
    return root > 0 && Number.isFinite(root) ? [root] : [];
  }

  const derivative = coefficients.slice(1).map((value, index) => value * (index + 1));
  const criticalPoints = positivePolynomialRoots(derivative);
  const upperBound = cauchyPositiveRootBound(coefficients);
  const interiorCriticalPoints = criticalPoints.filter(
    (point) => point > 0 && point < upperBound,
  );
  const boundaries = [0, ...interiorCriticalPoints, upperBound];
  const roots: number[] = [];

  for (const point of interiorCriticalPoints) {
    if (Math.abs(evaluatePolynomial(coefficients, point)) <= ROOT_VALUE_TOLERANCE) {
      roots.push(point);
    }
  }

  for (let index = 0; index < boundaries.length - 1; index += 1) {
    const left = boundaries[index]!;
    const right = boundaries[index + 1]!;
    const leftValue = evaluatePolynomial(coefficients, left);
    const rightValue = evaluatePolynomial(coefficients, right);
    if (Math.abs(rightValue) <= ROOT_VALUE_TOLERANCE && right > 0) roots.push(right);
    if (!Number.isNaN(leftValue) && !Number.isNaN(rightValue) && Math.sign(leftValue) !== Math.sign(rightValue)) {
      // Horner evaluation can overflow at a loose Cauchy bound, but an
      // infinite endpoint still carries a usable sign for bisection.
      roots.push(bisectPolynomialRoot(coefficients, left, right));
    }
  }
  return dedupeSorted(roots.filter((root) => root > 0));
}

/** Analyze all periodic IRR roots. Cash flow index is the period number. */
export function analyzeIrr(cashflows: number[]): IrrAnalysis {
  if (cashflows.length < 2 || cashflows.some((value) => !Number.isFinite(value))) {
    return {
      status: "none",
      primaryIrrPct: null,
      rootsPct: [],
      reason: "insufficient-periods",
    };
  }
  const hasPositive = cashflows.some((value) => value > 0);
  const hasNegative = cashflows.some((value) => value < 0);
  if (!hasPositive || !hasNegative) {
    return { status: "none", primaryIrrPct: null, rootsPct: [], reason: "same-sign" };
  }

  // Let x = 1 / (1 + r). NPV(r) = sum(CF_t * x^t), so every positive
  // polynomial root maps to one economically admissible r > -100%.
  const rootsPct = dedupeSorted(
    positivePolynomialRoots(cashflows)
      .map((discountFactor) => (1 / discountFactor - 1) * 100)
      .filter((rate) => Number.isFinite(rate) && rate > -100),
  );
  if (rootsPct.length === 0) {
    return {
      status: "none",
      primaryIrrPct: null,
      rootsPct: [],
      reason: "no-real-root",
    };
  }

  const primaryIrrPct = [...rootsPct].sort(
    (left, right) => Math.abs(left) - Math.abs(right) || left - right,
  )[0]!;
  return {
    status: rootsPct.length === 1 ? "unique" : "multiple",
    primaryIrrPct,
    rootsPct,
    reason: null,
  };
}

/** Backward-compatible convenient primary IRR API. */
export function computeIrr(cashflows: number[]): number | null {
  return analyzeIrr(cashflows).primaryIrrPct;
}

type ReturnSummaryOptions = {
  exitTax?: number;
  years?: number;
};

function summarizePeriodicCashFlows(
  periodComponents: number[][],
  options: ReturnSummaryOptions = {},
): ReturnSummary | null {
  if (
    periodComponents.length < 2 ||
    periodComponents.some(
      (components) =>
        components.length === 0 || components.some((value) => !Number.isFinite(value)),
    )
  ) {
    return null;
  }

  const initialCashInvested = periodComponents[0]!
    .filter((value) => value < 0)
    .reduce((total, value) => total - value, 0);
  const laterComponents = periodComponents.slice(1).flat();
  const hasLaterContributions = laterComponents.some((value) => value < 0);
  const allComponents = periodComponents.flat();
  const totalContributions = allComponents
    .filter((value) => value < 0)
    .reduce((total, value) => total - value, 0);
  const totalDistributions = allComponents
    .filter((value) => value > 0)
    .reduce((total, value) => total + value, 0);
  const totalProfit = totalDistributions - totalContributions;
  const roiPct =
    totalContributions > 0 ? (totalProfit / totalContributions) * 100 : null;
  const equityMultiple =
    totalContributions > 0 ? totalDistributions / totalContributions : null;
  const years = options.years ?? periodComponents.length - 1;

  let cagrStatus: CagrStatus;
  let cagrPct: number | null = null;
  if (!(years > 0)) {
    cagrStatus = "invalid-horizon";
  } else if (!(initialCashInvested > 0)) {
    cagrStatus = "no-initial-contribution";
  } else if (hasLaterContributions) {
    cagrStatus = "later-contributions";
  } else if (!(equityMultiple != null && equityMultiple > 0)) {
    cagrStatus = "non-positive-distributions";
  } else {
    cagrStatus = "available";
    cagrPct = (Math.pow(equityMultiple, 1 / years) - 1) * 100;
  }

  const periodicCashFlows = periodComponents.map((components) =>
    components.reduce((total, value) => total + value, 0),
  );
  const irr = analyzeIrr(periodicCashFlows);

  return {
    initialCashInvested,
    cashInvested: totalContributions,
    totalContributions,
    totalDistributions,
    hasLaterContributions,
    totalProfit,
    roiPct,
    roiDefinition: "net-profit-over-all-contributions",
    equityMultiple,
    cagrPct,
    cagrStatus,
    irrPct: irr.primaryIrrPct,
    irrStatus: irr.status,
    irrRootsPct: irr.rootsPct,
    irrReason: irr.reason,
    exitTax: options.exitTax ?? 0,
    years,
  };
}

/**
 * Build contribution-aware returns from a periodic signed cash-flow timeline.
 * Negative values are external contributions; positive values are
 * distributions (including refinance proceeds and sale proceeds).
 */
export function computeReturnSummaryFromCashFlows(
  cashflows: number[],
  options: ReturnSummaryOptions = {},
): ReturnSummary | null {
  return summarizePeriodicCashFlows(
    cashflows.map((cashflow) => [cashflow]),
    options,
  );
}

/** Build a return summary using the last exit year as the modeled sale. */
export function computeReturnSummaryFromExitYears(
  years: ExitScenarioYear[],
): ReturnSummary | null {
  if (!years || years.length === 0) return null;
  const sorted = [...years].sort((left, right) => left.year - right.year);
  const final = sorted[sorted.length - 1]!;
  const exitTax = final.exitTax ?? 0;

  // Recover only the t0 contribution from the exit engine's accounting
  // identity. Later negative operating years are classified below as new
  // contributed capital instead of being hidden inside cumulative profit.
  const initialCashInvested =
    final.netSaleProceeds +
    final.cumulativeCashFlow +
    final.cumulativeTaxBenefit -
    exitTax -
    final.totalProfit;

  const periodComponents: number[][] = [[-Math.max(0, initialCashInvested)]];
  let previousCashFlow = 0;
  let previousTaxBenefit = 0;
  for (const year of sorted) {
    const operatingCashFlow =
      year.cumulativeCashFlow -
      previousCashFlow +
      (year.cumulativeTaxBenefit - previousTaxBenefit);
    previousCashFlow = year.cumulativeCashFlow;
    previousTaxBenefit = year.cumulativeTaxBenefit;
    periodComponents.push(
      year.year === final.year
        ? [operatingCashFlow, final.netSaleProceeds - exitTax]
        : [operatingCashFlow],
    );
  }

  return summarizePeriodicCashFlows(periodComponents, {
    exitTax,
    years: final.year,
  });
}
