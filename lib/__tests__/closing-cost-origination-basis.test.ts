import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Loan origination is charged on the LOAN, not the purchase price.
 *
 * The closing-cost widget multiplied the origination percentage by the purchase
 * price and had no loan or down-payment input at all, so nothing on the page
 * disclosed the basis. At 20% down that overstates the fee by 25%
 * (1 / (1 - 0.20)), and the page contradicted TrueCap's own article, which
 * states "Usually 0.5-1% of the loan amount" and works the example:
 *
 *     $250,000 duplex, 25% down -> loan $187,500 -> origination (1%) = $1,875
 *
 * A free calculator printing a number a reader can disprove against the site's
 * own blog is a credibility problem on an organic-entry page, not just an
 * arithmetic one.
 */

const root = process.cwd();
const source = readFileSync(
  join(root, "components/tools/closing-cost-calculator-widget.tsx"),
  "utf8",
);

/** The arithmetic the widget performs, mirrored so the basis is pinned. */
function closingCosts(input: {
  price: number;
  downPct: number;
  originationPct: number;
  titlePct: number;
  transferPct: number;
}) {
  const loanAmount = input.price * (1 - input.downPct / 100);
  return {
    loanAmount,
    origination: (loanAmount * input.originationPct) / 100,
    title: (input.price * input.titlePct) / 100,
    transfer: (input.price * input.transferPct) / 100,
  };
}

describe("closing-cost origination basis", () => {
  it("matches the worked example in our own closing-costs article", () => {
    const r = closingCosts({
      price: 250_000,
      downPct: 25,
      originationPct: 1,
      titlePct: 0,
      transferPct: 0,
    });
    expect(r.loanAmount).toBe(187_500);
    expect(Math.round(r.origination)).toBe(1_875);
  });

  it("charges origination on the loan and title/transfer on the price", () => {
    const r = closingCosts({
      price: 300_000,
      downPct: 20,
      originationPct: 1,
      titlePct: 0.5,
      transferPct: 0.5,
    });
    expect(r.loanAmount).toBe(240_000);
    expect(r.origination).toBe(2_400); // NOT 3,000 — that was the price-based bug
    expect(r.title).toBe(1_500); // price-based, correctly
    expect(r.transfer).toBe(1_500); // price-based, correctly
  });

  it("the widget computes a loan and uses it for origination only", () => {
    expect(source).toContain("const loanAmount = price * (1 - validated.downPaymentPct.value / 100)");
    expect(source).toContain("const origination = (loanAmount * validated.originationPct.value) / 100");
    // The regression: origination must NOT be derived from price.
    expect(source).not.toContain("const origination = (price *");
    // Title and transfer stay on the price — they are not lender charges.
    expect(source).toContain("const title = (price * validated.titlePct.value) / 100");
    expect(source).toContain("const transfer = (price * validated.transferTaxPct.value) / 100");
  });

  it("discloses the basis in the UI rather than leaving it implicit", () => {
    expect(source).toContain('label="Down payment"');
    expect(source).toContain('label="Origination (% of loan)"');
    expect(source).toContain("Loan amount");
  });
});
