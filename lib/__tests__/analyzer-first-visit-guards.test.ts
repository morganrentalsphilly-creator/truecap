import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Guards for the first-visit analyzer defects found by the 2026-09-30
 * go-to-market audit. Each block names the report row it keeps closed.
 */

const root = process.cwd();
const read = (path: string) => readFileSync(join(root, path), "utf8");

describe("inline error text uses the text-safe red (P1-72, P1-46)", () => {
  // --destructive is the fill red: 4.37:1 at 12px on the form card (#f6f5f2),
  // under the 4.5:1 AA minimum. --destructive-text is 5.85:1 on the card.
  const bareDestructive = /text-destructive(?![-\w/])/;

  it("FieldError, the analyzer's one field-error primitive, uses it", () => {
    const helpers = read("components/investcalc/form-field-helpers.tsx");
    expect(helpers).toContain(
      'role="alert" className="mt-1 text-xs text-destructive-text"',
    );
    expect(helpers).not.toMatch(bareDestructive);
  });

  it("the shared form primitive uses it for the label and the message", () => {
    const form = read("components/ui/form.tsx");
    expect(form).toContain("'data-[error=true]:text-destructive-text'");
    expect(form).toContain("cn('text-destructive-text text-sm', className)");
    expect(form).not.toMatch(bareDestructive);
  });

  it("no 12px validation message in the analyzer goes back to the fill red", () => {
    const dir = join(root, "components/investcalc");
    const offenders: string[] = [];
    for (const name of readdirSync(dir)) {
      if (!name.endsWith(".tsx")) continue;
      const lines = readFileSync(join(dir, name), "utf8").split("\n");
      lines.forEach((line, index) => {
        // Small error copy only: a class list that sets text-xs and the red
        // on the same element, with no tinted error surface behind it.
        if (
          /text-xs(?: font-medium)? text-destructive(?![-\w/])/.test(line) &&
          !line.includes("bg-destructive/")
        ) {
          offenders.push(`${name}:${index + 1}`);
        }
      });
    }
    expect(offenders).toEqual([]);
  });
});
