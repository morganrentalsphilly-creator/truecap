import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = join(import.meta.dirname, "../..");

describe("analytics privacy guards", () => {
  it("does not use broad DOM autocapture or page-leave URL capture", () => {
    const source = readFileSync(join(root, "lib/analytics.ts"), "utf8");
    expect(source).toContain("autocapture: false");
    expect(source).toContain("capture_pageleave: false");
  });

  it("tracks route-only pageviews and never identifies with email", () => {
    const source = readFileSync(
      join(root, "components/analytics/posthog-provider.tsx"),
      "utf8"
    );
    expect(source).toContain("trackPageview(`${window.location.origin}${pathname}`)");
    expect(source).not.toContain("email: data.user.email");
    expect(source).not.toContain("email: session.user.email");
    expect(source).not.toContain("searchParams?.toString()");
  });

  it("never uses a newsletter email as a product-analytics identity", () => {
    const source = readFileSync(join(root, "app/actions/newsletter.ts"), "utf8");
    expect(source).toContain('distinctId: "$newsletter"');
    expect(source).not.toContain("distinctId: parsed.data.email");
  });
});
