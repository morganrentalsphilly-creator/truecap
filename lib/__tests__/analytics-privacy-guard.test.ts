import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const calculator = readFileSync(
  join(process.cwd(), "components/investcalc/investcalc-page.tsx"),
  "utf8",
);

function eventCall(name: string): string {
  const start = calculator.indexOf(`trackEvent("${name}"`);
  expect(start, `${name} call should exist`).toBeGreaterThanOrEqual(0);
  return calculator.slice(start, calculator.indexOf("});", start) + 3);
}

describe("calculator analytics privacy", () => {
  it("keeps analysis funnel events free of addresses and financial values", () => {
    const forbidden =
      /address\s*:|purchase_price|cap_rate|coc_return|monthly_cash_flow|\bdscr\s*:/;
    expect(eventCall("analysis_started")).not.toMatch(forbidden);
    expect(eventCall("analysis_completed")).not.toMatch(forbidden);
    expect(eventCall("deal_saved")).not.toMatch(forbidden);
    expect(eventCall("pdf_exported")).not.toMatch(forbidden);
  });
});
