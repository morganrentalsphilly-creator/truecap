import { describe, expect, it } from "vitest";
import { truncateMetaDescription } from "@/lib/utils";

describe("truncateMetaDescription — SERP snippets never cut mid-word", () => {
  it("passes short descriptions through untouched (no ellipsis)", () => {
    const s = "Cap rate lets you compare properties apples-to-apples.";
    expect(truncateMetaDescription(s)).toBe(s);
  });

  it("truncates at a word boundary, not mid-word", () => {
    const s = `${"Typical cap rates run 5–6% in Tier-1 coastal markets, 6–8% across the Midwest".repeat(3)} and Sun Belt cash-flow metros.`;
    const out = truncateMetaDescription(s);
    expect(out.length).toBeLessThanOrEqual(158);
    expect(out.endsWith("…")).toBe(true);
    // The char right before the ellipsis is part of a complete word.
    const body = out.slice(0, -1);
    expect(s.startsWith(body)).toBe(true);
    expect(s[body.length]).toMatch(/[\s,;:/·—-]/);
  });

  it("never ends on a dangling separator like 'Midwest /'", () => {
    const s = `${"a".repeat(150)} 6–8% Midwest / Sun Belt cash-flow markets, 8–10% elsewhere`;
    const out = truncateMetaDescription(s);
    expect(out).not.toMatch(/[\s,;:/·—-]…$/);
  });

  it("falls back to a hard cut when the text has no usable space (no infinite backup)", () => {
    const s = "x".repeat(400);
    const out = truncateMetaDescription(s);
    expect(out.length).toBeLessThanOrEqual(158);
    expect(out.endsWith("…")).toBe(true);
  });

  it("trims surrounding whitespace before measuring", () => {
    const s = `   ${"exactly at the limit ".repeat(6)}`.slice(0, 160);
    const out = truncateMetaDescription(s);
    expect(out.startsWith(" ")).toBe(false);
  });
});
