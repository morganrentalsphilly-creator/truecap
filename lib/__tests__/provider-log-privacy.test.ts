import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const source = readFileSync(
  join(process.cwd(), "app/actions/enrich-property.ts"),
  "utf8"
);

describe("provider logging privacy", () => {
  it("never writes request URLs, query strings, response bodies, or provider payloads to logs", () => {
    expect(source).not.toContain("${input}");
    expect(source).not.toContain("URL=${url}");
    expect(source).not.toContain("Body=");
    expect(source).not.toMatch(/console\.(?:warn|log|error)\([^\n]*,\s*(?:err|json|body)\s*\)/);
    expect(source).not.toContain("ZIP ${input.zip}");
    expect(source).not.toContain('county="${input.county}"');
  });

  it("logs only controlled provider and error classifications", () => {
    expect(source).toContain('provider: "fred"');
    expect(source).toContain('provider: "hud"');
    expect(source).toContain('errorClass: "timeout"');
    expect(source).toContain("status: res.status");
  });
});
