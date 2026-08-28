import { describe, expect, it } from "vitest";

import {
  AUTOMATIC_PMI_TERMINATION_LTV_RATIO,
  BORROWER_REQUESTED_PMI_CANCELLATION_LTV_RATIO,
  buildLoanAmortizationSchedule,
  calculateMonthlyLoanPayment,
  countMortgageInsurancePayments,
  loanBalanceAfterPayments,
  summarizeLoanByYear,
} from "../loan-amortization";

describe("canonical loan amortization", () => {
  it("matches a standard fixed-rate payment without internal rounding", () => {
    expect(
      calculateMonthlyLoanPayment({
        principal: 100_000,
        annualRatePct: 6,
        termYears: 30,
      }),
    ).toBeCloseTo(599.5505251528, 9);
  });

  it("handles a zero-rate loan as exact linear principal paydown", () => {
    const schedule = buildLoanAmortizationSchedule({
      principal: 1_200,
      annualRatePct: 0,
      termYears: 1,
    });

    expect(schedule.scheduledMonthlyPayment).toBe(100);
    expect(schedule.payments).toHaveLength(12);
    expect(schedule.payments.every((row) => row.interest === 0)).toBe(true);
    expect(schedule.payments.at(-1)?.endingBalance).toBe(0);
  });

  it.each([
    { principal: 25, annualRatePct: 0.0001, termYears: 50 },
    { principal: 1, annualRatePct: 30, termYears: 50 },
    { principal: 2_500_000, annualRatePct: 18, termYears: 1 },
    { principal: 300_000, annualRatePct: 6.75, termYears: 30 },
    { principal: 123_456.78, annualRatePct: 0, termYears: 40 },
  ])(
    "stays finite, monotonic, and reconciled for $principal at $annualRatePct% over $termYears years",
    (terms) => {
      const schedule = buildLoanAmortizationSchedule(terms);
      expect(schedule.payments).toHaveLength(terms.termYears * 12);
      expect(Number.isFinite(schedule.scheduledMonthlyPayment)).toBe(true);

      for (const row of schedule.payments) {
        expect(Number.isFinite(row.interest)).toBe(true);
        expect(Number.isFinite(row.principal)).toBe(true);
        expect(Number.isFinite(row.endingBalance)).toBe(true);
        expect(row.interest).toBeGreaterThanOrEqual(0);
        expect(row.principal).toBeGreaterThanOrEqual(0);
        expect(row.endingBalance).toBeLessThanOrEqual(row.openingBalance);
      }

      const principalPaid = schedule.payments.reduce(
        (sum, row) => sum + row.principal,
        0,
      );
      expect(principalPaid).toBeCloseTo(terms.principal, 8);
      expect(schedule.payments.at(-1)?.endingBalance).toBe(0);
    },
  );

  it("clears a short-term loan and reports zero after payoff", () => {
    const schedule = buildLoanAmortizationSchedule({
      principal: 48_000,
      annualRatePct: 4.5,
      termYears: 2,
    });

    expect(loanBalanceAfterPayments(schedule, 0)).toBe(48_000);
    expect(loanBalanceAfterPayments(schedule, 12)).toBeGreaterThan(0);
    expect(loanBalanceAfterPayments(schedule, 24)).toBe(0);
    expect(loanBalanceAfterPayments(schedule, 120)).toBe(0);
  });

  it("keeps annual interest, principal, payments, and payoff in parity", () => {
    const schedule = buildLoanAmortizationSchedule({
      principal: 215_750,
      annualRatePct: 7.125,
      termYears: 15,
    });
    const years = summarizeLoanByYear(schedule);

    expect(years).toHaveLength(15);
    for (const year of years) {
      expect(year.payment).toBeCloseTo(year.principal + year.interest, 8);
      expect(year.endingBalance).toBeCloseTo(
        loanBalanceAfterPayments(schedule, year.year * 12),
        8,
      );
    }
    expect(years.at(-1)?.endingBalance).toBe(0);
  });

  it("separates an interest-only phase from the amortizing payment", () => {
    const schedule = buildLoanAmortizationSchedule({
      principal: 240_000,
      annualRatePct: 6,
      termYears: 30,
      amortizationTermYears: 30,
      maturityTermYears: 30,
      interestOnlyMonths: 12,
    });

    expect(schedule.initialMonthlyPayment).toBeCloseTo(1_200, 10);
    expect(schedule.scheduledMonthlyPayment).toBeCloseTo(
      1_438.9212603666058,
      10,
    );
    expect(
      schedule.payments
        .slice(0, 12)
        .every((row) => row.phase === "interest-only" && row.principal === 0),
    ).toBe(true);
    expect(schedule.payments[12]).toMatchObject({
      phase: "amortizing",
      openingBalance: 240_000,
    });
  });

  it("keeps maturity principal separate from recurring debt service", () => {
    const schedule = buildLoanAmortizationSchedule({
      principal: 240_000,
      annualRatePct: 6,
      termYears: 5,
      maturityTermYears: 5,
      amortizationTermYears: 30,
      interestOnlyMonths: 12,
    });
    const years = summarizeLoanByYear(schedule);
    const maturity = years[4];

    expect(schedule.maturityTermMonths).toBe(60);
    expect(schedule.balloonPayment).toBeGreaterThan(200_000);
    expect(schedule.payments.at(-1)?.phase).toBe("balloon");
    expect(maturity.balloonPrincipal).toBeCloseTo(schedule.balloonPayment, 10);
    expect(maturity.payment).toBeCloseTo(
      maturity.scheduledPayment + maturity.balloonPrincipal,
      10,
    );
    expect(maturity.endingBalance).toBe(0);
  });
});

describe("mortgage-insurance termination policies", () => {
  const schedule = buildLoanAmortizationSchedule({
    principal: 82_000,
    annualRatePct: 0,
    termYears: 82 / 12,
  });

  it("uses scheduled 78% of original value for automatic termination", () => {
    expect(AUTOMATIC_PMI_TERMINATION_LTV_RATIO).toBe(0.78);
    expect(
      countMortgageInsurancePayments(schedule, 100_000, "automatic-78"),
    ).toBe(4);
  });

  it("represents borrower-requested 80% cancellation separately", () => {
    expect(BORROWER_REQUESTED_PMI_CANCELLATION_LTV_RATIO).toBe(0.8);
    expect(
      countMortgageInsurancePayments(
        schedule,
        100_000,
        "borrower-requested-80",
      ),
    ).toBe(2);
  });

  it("keeps loan-life coverage through the final scheduled payment", () => {
    expect(countMortgageInsurancePayments(schedule, 100_000, "loan-life")).toBe(
      82,
    );
    expect(
      countMortgageInsurancePayments(schedule, 100_000, "loan-life", 1, 12),
    ).toBe(12);
  });
});
