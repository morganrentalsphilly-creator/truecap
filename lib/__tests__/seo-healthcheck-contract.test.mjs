import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("rendered SEO healthcheck contract", () => {
  it("fails on linked non-sitemap targets that do not return 200", () => {
    const source = readFileSync(
      join(process.cwd(), "scripts/seo/healthcheck.mjs"),
      "utf8",
    );

    expect(source).toContain("} else if (inboundFrom.has(path)) {");
    expect(source).toContain('"non-canonical internal link"');
    expect(source).toContain(
      "public internal anchors must point directly to a 200 destination",
    );
  });
});
