import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Battle-tested live on 2026-08-31: the debt-service panel rendered
 * "Loan Payment (P&I) $1,199.101" — THREE decimals — because
 * `toLocaleString()` with no options prints up to 3 fraction digits, and
 * calc-analysis deliberately returns unrounded floats (payment 1199.1006,
 * insurance 104.1667, closingCosts price*pct...). Every money interpolation
 * in these files that skipped Math.round could produce the same
 * three-decimal artifact; a price of $265,432 at 1.5% closing renders
 * "$3,981.48" one day and "$3,981.481" is one odd input away.
 *
 * Convention pinned here: dashboard money is WHOLE dollars
 * (Math.round(...).toLocaleString()), matching the pre-existing Loan Amount
 * render. This scan fails on any NEW bare `${<money>.toLocaleString()}`
 * interpolation immediately after a dollar sign in the audited files.
 */

const FILES = [
  "components/investcalc/analysis-dashboard.tsx",
  "components/investcalc/investcalc-page.tsx",
];

/**
 * A dollar-sign literal directly followed by an interpolated bare
 * `.toLocaleString()` call whose expression does not round. Matches
 * `$${expr.toLocaleString()}` and `${"$"}...` JSX shapes like
 * `${'$'}{value.toLocaleString()}` are not used in this codebase.
 */
const BARE_MONEY =
  /\$\$?\{\s*(?!Math\.(round|abs|floor|ceil|trunc)\b)[A-Za-z_$][\w.$?!\[\]]*\.toLocaleString\(\)\s*\}/g;

/** JSX text shape: `$` then `{value.toLocaleString()}` on the same/next line. */
const JSX_MONEY =
  /\$\s*\n?\s*\{\s*(?!Math\.(round|abs|floor|ceil|trunc)\b)[A-Za-z_$][\w.$?!\[\]]*\.toLocaleString\(\)\s*\}/g;

describe("dashboard money renders whole dollars", () => {
  for (const file of FILES) {
    it(`${file} has no unrounded money interpolation`, () => {
      const source = readFileSync(join(process.cwd(), file), "utf8");
      const hits = [
        ...(source.match(BARE_MONEY) ?? []),
        ...(source.match(JSX_MONEY) ?? []),
      ]
        // Non-money uses of toLocaleString on a Date are fine and do not
        // follow a dollar sign, so they never reach here; keep the filter
        // anyway so a future `$ {date.toLocaleString()}` label reads as the
        // bug it would be.
        .map((h) => h.replace(/\s+/g, " "));
      expect(hits, `unrounded money renders:\n  ${hits.join("\n  ")}`).toEqual([]);
    });
  }

  it("the scan itself catches the shipped bug shape", () => {
    // Guard the guard: the exact string that produced $1,199.101.
    const bad = "${result.monthlyPayment.toLocaleString()}";
    expect(("$" + bad).match(BARE_MONEY), "regex no longer matches the original defect").not.toBeNull();
    const good = "${Math.round(result.monthlyPayment).toLocaleString()}";
    expect(("$" + good).match(BARE_MONEY)).toBeNull();
  });
});
