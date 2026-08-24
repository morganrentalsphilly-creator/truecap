import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();

describe("sample decision memo metadata", () => {
  it("uses the root title template once and owns its share-card URL", () => {
    const page = readFileSync(join(root, "app/sample-decision-memo/page.tsx"), "utf8");
    const layout = readFileSync(join(root, "app/layout.tsx"), "utf8");

    expect(page).toContain('title: "Sample Rental Decision Memo",');
    expect(page).toContain('url: "/sample-decision-memo",');
    expect(page).toContain('title: "Sample Rental Decision Memo | TrueCap",');
    expect(layout).toContain('type: "image/vnd.microsoft.icon"');
    expect(layout).not.toContain("type: 'image/svg+xml'");
  });
});
