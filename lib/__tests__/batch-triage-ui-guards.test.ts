import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const source = readFileSync(
  fileURLToPath(new URL("../../components/investcalc/batch-triage-client.tsx", import.meta.url)),
  "utf8"
);

describe("batch triage review accessibility guards", () => {
  it("labels editable preview fields and connects inline validation", () => {
    const editor = source.slice(source.indexOf("function PreviewInput"), source.indexOf("function PreviewRowContext"));
    expect(editor).toContain("<label htmlFor={inputId}");
    expect(editor).toContain("aria-invalid=");
    expect(editor).toContain("aria-describedby={issueId}");
    expect(editor).toContain("h-11");
    expect(editor).toContain("focus-visible:ring-2");
  });

  it("keeps primary, filtering, and sorting controls at least 44px high", () => {
    expect(source).toMatch(/Review listings[\s\S]*?min-h-11|className="inline-flex min-h-11[^"]*"[\s\S]*?Review listings/);
    expect(source).toContain("inline-flex min-h-11 items-center gap-1.5");
    expect(source).toContain("min-h-11 rounded-md px-3");
  });

  it("uses cards through tablet widths and tables only at desktop", () => {
    expect(source).toContain('className="mt-4 space-y-3 lg:hidden"');
    expect(source).toContain('className="mt-4 hidden lg:block"');
    expect(source).toContain('className="mt-4 hidden overflow-hidden rounded-2xl border border-border lg:block"');
  });
});
