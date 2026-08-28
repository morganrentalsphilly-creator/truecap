import { describe, expect, it } from "vitest";
import {
  computeOwnedEquity,
  monthsOwnedBetween,
  remainingLoanBalance,
  type OwnedEquityInput,
} from "../owned-equity";
import {
  buildLoanAmortizationSchedule,
  loanBalanceAfterPayments,
} from "../loan-amortization";

describe("remainingLoanBalance", () => {
  it("equals the full principal at month 0", () => {
    expect(remainingLoanBalance(300_000, 6.75, 30, 0)).toBeCloseTo(300_000, 2);
  });

  it("is 0 once fully amortized", () => {
    expect(remainingLoanBalance(300_000, 6.75, 30, 360)).toBe(0);
    expect(remainingLoanBalance(300_000, 6.75, 30, 500)).toBe(0);
  });

  it("pays down only slightly in early years (interest-heavy)", () => {
    // After 12 payments on a 30yr 6.75% loan, balance is still ~98.7% of principal.
    const bal = remainingLoanBalance(300_000, 6.75, 30, 12);
    expect(bal).toBeLessThan(300_000);
    expect(bal).toBeGreaterThan(296_000);
    expect(bal).toBeLessThan(297_500);
  });

  it("amortizes linearly at 0% interest", () => {
    expect(remainingLoanBalance(360_000, 0, 30, 180)).toBeCloseTo(180_000, 2);
  });

  it("returns 0 for a cash purchase (no loan)", () => {
    expect(remainingLoanBalance(0, 6.75, 30, 60)).toBe(0);
  });

  it("matches the canonical schedule for interest-only and balloon terms", () => {
    const schedule = buildLoanAmortizationSchedule({
      principal: 300_000,
      annualRatePct: 7,
      termYears: 10,
      maturityTermYears: 10,
      amortizationTermYears: 30,
      interestOnlyMonths: 24,
    });

    for (const month of [0, 12, 24, 25, 60, 119, 120]) {
      expect(
        remainingLoanBalance(300_000, 7, 10, month, {
          amortizationTermYears: 30,
          interestOnlyMonths: 24,
        }),
      ).toBeCloseTo(loanBalanceAfterPayments(schedule, month), 8);
    }
  });
});

describe("monthsOwnedBetween", () => {
  it("counts whole months and floors partial months", () => {
    expect(monthsOwnedBetween(new Date("2023-01-15"), new Date("2024-01-15"))).toBe(12);
    expect(monthsOwnedBetween(new Date("2023-01-15"), new Date("2024-01-14"))).toBe(11);
    expect(monthsOwnedBetween(new Date("2023-06-01"), new Date("2023-06-20"))).toBe(0);
  });

  it("never goes negative for a future close date", () => {
    expect(monthsOwnedBetween(new Date("2026-01-01"), new Date("2025-01-01"))).toBe(0);
  });
});

const base: OwnedEquityInput = {
  purchasePrice: 300_000,
  loanAmount: 240_000, // 20% down
  annualRatePct: 6.75,
  termYears: 30,
  appreciationRatePct: 3,
};

describe("computeOwnedEquity", () => {
  it("at month 0, equity equals the down payment (no appreciation, no paydown)", () => {
    const s = computeOwnedEquity(base, 0)!;
    expect(s.currentValue).toBeCloseTo(300_000, 2);
    expect(s.loanBalance).toBeCloseTo(240_000, 2);
    expect(s.equity).toBeCloseTo(60_000, 2);
    expect(s.downPayment).toBeCloseTo(60_000, 2);
    expect(s.totalEquityGain).toBeCloseTo(0, 2);
    expect(s.appreciationGain).toBeCloseTo(0, 2);
    expect(s.principalPaid).toBeCloseTo(0, 2);
  });

  it("after 5 years, equity = appreciation + principal paid + down payment", () => {
    const s = computeOwnedEquity(base, 60)!;
    // 300k × 1.03^5 ≈ 347,782
    expect(s.currentValue).toBeCloseTo(300_000 * Math.pow(1.03, 5), 0);
    expect(s.appreciationGain).toBeGreaterThan(45_000);
    expect(s.principalPaid).toBeGreaterThan(0);
    // Identity: equity == downPayment + appreciationGain + principalPaid.
    expect(s.equity).toBeCloseTo(s.downPayment + s.appreciationGain + s.principalPaid, 2);
    expect(s.totalEquityGain).toBeCloseTo(s.appreciationGain + s.principalPaid, 2);
  });

  it("handles a cash purchase: equity is just the (appreciated) value", () => {
    const cash = computeOwnedEquity({ ...base, loanAmount: 0 }, 60)!;
    expect(cash.loanBalance).toBe(0);
    expect(cash.downPayment).toBeCloseTo(300_000, 2);
    expect(cash.equity).toBeCloseTo(cash.currentValue, 2);
    expect(cash.principalPaid).toBe(0);
  });

  it("returns null without a usable purchase price", () => {
    expect(computeOwnedEquity({ ...base, purchasePrice: 0 }, 60)).toBeNull();
  });

  it("the equity identity holds at an arbitrary month", () => {
    const s = computeOwnedEquity(base, 87)!;
    expect(s.equity).toBeCloseTo(s.downPayment + s.appreciationGain + s.principalPaid, 2);
  });

  it("does not invent principal paydown during an interest-only period", () => {
    const interestOnly = computeOwnedEquity(
      {
        ...base,
        termYears: 10,
        amortizationTermYears: 30,
        interestOnlyMonths: 24,
      },
      18,
    )!;
    expect(interestOnly.loanBalance).toBeCloseTo(base.loanAmount, 8);
    expect(interestOnly.principalPaid).toBeCloseTo(0, 8);
  });
});
