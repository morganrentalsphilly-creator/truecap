import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { resolveExplicitRehabBudget } from "../specialist-input-readiness";

describe("specialist input readiness", () => {
  it("distinguishes a blank rehab budget from an explicit zero", () => {
    expect(resolveExplicitRehabBudget(undefined)).toBeNull();
    expect(resolveExplicitRehabBudget(null)).toBeNull();
    expect(resolveExplicitRehabBudget("")).toBeNull();
    expect(resolveExplicitRehabBudget(Number.NaN)).toBeNull();
    expect(resolveExplicitRehabBudget(-1)).toBeNull();
    expect(resolveExplicitRehabBudget(0)).toBe(0);
    expect(resolveExplicitRehabBudget(25_000)).toBe(25_000);
  });

  it.each(["brrrr-card.tsx", "fix-flip-card.tsx"])(
    "%s refuses to calculate until rehab is explicit",
    (filename) => {
      const source = readFileSync(
        join(process.cwd(), "components/investcalc", filename),
        "utf8",
      );
      expect(source).toContain(
        "resolveExplicitRehabBudget(inputs.rehabBudget)",
      );
      expect(source).toContain("if (effectiveRehab === null) return null;");
    },
  );
});
