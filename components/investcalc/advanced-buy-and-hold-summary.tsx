import type { AnalysisResult } from "@/lib/calc-analysis";
import type { InvestmentFormValues } from "@/lib/investcalc-schema";
import {
  SIMPLIFIED_RENOVATION_DOWNTIME_LABEL,
  STEADY_STATE_RENOVATION_LABEL,
} from "@/lib/financial-presentation";

type AdvancedResult = Pick<
  AnalysisResult,
  | "loanAmount"
  | "operatingScenario"
  | "scenarioRentMonthly"
  | "recurringOtherIncomeMonthly"
  | "currentPropertyValue"
  | "stabilizedPropertyValue"
  | "interestOnlyMonths"
  | "initialMonthlyLoanPayment"
  | "amortizingMonthlyLoanPayment"
  | "loanMaturityTermYears"
  | "balloonMonth"
  | "balloonPayment"
  | "renovationIncomeLossAnnual"
  | "renovationStartMonth"
  | "renovationDurationMonths"
  | "renovationRentLossPct"
>;

const money = (value: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);

export function hasDetailedRenovationDowntime(
  values: Pick<
    InvestmentFormValues,
    | "renovationStartMonth"
    | "renovationDurationMonths"
    | "renovationRentLossPct"
  >,
): boolean {
  return (
    typeof values.renovationStartMonth === "number" &&
    typeof values.renovationDurationMonths === "number" &&
    typeof values.renovationRentLossPct === "number"
  );
}

export function RenovationModelDisclosure({
  values,
}: {
  values: Pick<
    InvestmentFormValues,
    | "rehabBudget"
    | "renovationStartMonth"
    | "renovationDurationMonths"
    | "renovationRentLossPct"
  >;
}) {
  const hasRehab = Number(values.rehabBudget ?? 0) > 0;
  const hasTiming = hasDetailedRenovationDowntime(values);
  if (!hasRehab && !hasTiming) return null;

  return (
    <p className="rounded-xl border border-amber-300/60 bg-amber-50 px-3 py-2 text-xs leading-relaxed text-amber-950 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-100">
      {hasTiming
        ? SIMPLIFIED_RENOVATION_DOWNTIME_LABEL
        : STEADY_STATE_RENOVATION_LABEL}
    </p>
  );
}

export function AdvancedBuyAndHoldSummary({
  result,
  values,
}: {
  result: AdvancedResult;
  values?: Pick<InvestmentFormValues, "propertyType" | "units">;
}) {
  const hasAdvancedLoanContract =
    result.loanAmount > 0 &&
    typeof result.loanMaturityTermYears === "number" &&
    typeof result.amortizingMonthlyLoanPayment === "number";
  const hasOperatingScenario =
    result.operatingScenario === "current" ||
    result.operatingScenario === "stabilized";
  const hasRenovationTiming =
    typeof result.renovationStartMonth === "number" &&
    typeof result.renovationDurationMonths === "number" &&
    typeof result.renovationRentLossPct === "number";

  if (
    !hasAdvancedLoanContract &&
    !hasOperatingScenario &&
    !hasRenovationTiming
  ) {
    return null;
  }

  const maturityMonth =
    result.balloonMonth ??
    (typeof result.loanMaturityTermYears === "number"
      ? result.loanMaturityTermYears * 12
      : undefined);

  return (
    <section
      aria-label="Modeled buy-and-hold contract"
      className="rounded-xl border border-border bg-muted/20 p-3 sm:p-4"
    >
      <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
        Modeled contract and operating case
      </h3>
      <dl className="mt-3 grid grid-cols-1 gap-3 text-sm sm:grid-cols-2 xl:grid-cols-4">
        {hasOperatingScenario ? (
          <div>
            <dt className="text-xs text-muted-foreground">Operating case</dt>
            <dd className="mt-0.5 font-semibold capitalize text-foreground">
              {result.operatingScenario}
              {typeof result.scenarioRentMonthly === "number"
                ? ` · ${money(result.scenarioRentMonthly)}/mo rent`
                : ""}
              {(result.recurringOtherIncomeMonthly ?? 0) > 0
                ? ` + ${money(result.recurringOtherIncomeMonthly ?? 0)}/mo other income`
                : ""}
            </dd>
          </div>
        ) : null}
        {result.currentPropertyValue != null ||
        result.stabilizedPropertyValue != null ? (
          <div>
            <dt className="text-xs text-muted-foreground">
              Current / stabilized value
            </dt>
            <dd className="mt-0.5 font-semibold text-foreground">
              {result.currentPropertyValue != null
                ? money(result.currentPropertyValue)
                : "—"}{" "}
              /{" "}
              {result.stabilizedPropertyValue != null
                ? money(result.stabilizedPropertyValue)
                : "—"}
            </dd>
          </div>
        ) : null}
        {hasAdvancedLoanContract ? (
          <>
            <div>
              <dt className="text-xs text-muted-foreground">Initial payment</dt>
              <dd className="mt-0.5 font-semibold text-foreground">
                {money(result.initialMonthlyLoanPayment ?? 0)}/mo
                {(result.interestOnlyMonths ?? 0) > 0
                  ? ` interest-only for ${result.interestOnlyMonths} months`
                  : " P&I from month 1"}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">
                Amortizing payment
              </dt>
              <dd className="mt-0.5 font-semibold text-foreground">
                {money(result.amortizingMonthlyLoanPayment ?? 0)}/mo
                {(result.interestOnlyMonths ?? 0) > 0 ? " thereafter" : ""}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">
                Maturity and balloon
              </dt>
              <dd className="mt-0.5 font-semibold text-foreground">
                Month {maturityMonth ?? "—"} ·{" "}
                {money(result.balloonPayment ?? 0)} balloon
              </dd>
            </div>
          </>
        ) : null}
        {hasRenovationTiming ? (
          <div>
            <dt className="text-xs text-muted-foreground">
              Simplified downtime
            </dt>
            <dd className="mt-0.5 font-semibold text-foreground">
              Month {result.renovationStartMonth},{" "}
              {result.renovationDurationMonths} months at{" "}
              {result.renovationRentLossPct}% rent reduction
              {typeof result.renovationIncomeLossAnnual === "number"
                ? ` · ${money(result.renovationIncomeLossAnnual)} year-1 rent loss`
                : ""}
            </dd>
          </div>
        ) : null}
      </dl>
      {values?.propertyType !== "single-family" &&
      (values?.units?.length ?? 0) > 0 ? (
        <div className="mt-4 overflow-x-auto rounded-lg border border-border bg-background">
          <table className="w-full min-w-[420px] text-left text-xs">
            <caption className="sr-only">
              Shared current and stabilized unit rent roll
            </caption>
            <thead className="bg-muted/40 text-muted-foreground">
              <tr>
                <th scope="col" className="px-3 py-2">
                  Unit
                </th>
                <th scope="col" className="px-3 py-2 text-right">
                  Current rent
                </th>
                <th scope="col" className="px-3 py-2 text-right">
                  Stabilized rent
                </th>
              </tr>
            </thead>
            <tbody>
              {(values?.units ?? []).map((unit, index) => (
                <tr key={index} className="border-t border-border">
                  <th
                    scope="row"
                    className="px-3 py-2 font-medium text-foreground"
                  >
                    Unit {index + 1}
                    {unit?.isOwnerOccupied ? " (owner)" : ""}
                  </th>
                  <td className="px-3 py-2 text-right text-foreground">
                    {money(unit?.monthlyRent ?? 0)}/mo
                  </td>
                  <td className="px-3 py-2 text-right text-foreground">
                    {unit?.stabilizedMonthlyRent != null
                      ? `${money(unit.stabilizedMonthlyRent)}/mo`
                      : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
      {(result.balloonPayment ?? 0) > 0 ? (
        <p className="mt-3 text-xs leading-relaxed text-amber-800 dark:text-amber-200">
          Headline and Year-1 operating cash flow are recurring figures and
          exclude the maturity balloon. The 10-year projection shows the balloon
          as a separate financing outflow and includes it in net and cumulative
          cash flow when due.
        </p>
      ) : null}
    </section>
  );
}
