import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const source = readFileSync(
  fileURLToPath(
    new URL("../../components/investcalc/saved-analyses-page-v2.tsx", import.meta.url)
  ),
  "utf8"
);

describe("saved analyses hydration determinism", () => {
  it("renders every saved-at calendar label in a canonical time zone", () => {
    const savedAtFormatters = [
      ...source.matchAll(
        /new Date\(item\.createdAt\)\.toLocaleDateString\("en-US", \{([\s\S]*?)\}\)/g
      ),
    ];

    expect(savedAtFormatters).toHaveLength(2);
    for (const formatter of savedAtFormatters) {
      expect(formatter[1]).toContain('timeZone: "UTC"');
    }
  });
});
