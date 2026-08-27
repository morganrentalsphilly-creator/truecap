import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();

describe("first-run analyzer guidance", () => {
  it("does not mount a floating onboarding tour over calculator controls", () => {
    const home = readFileSync(join(root, "app/home-authed/page.tsx"), "utf8");

    expect(home).not.toContain('from "@/components/marketing/onboarding-tour"');
    expect(home).not.toContain("<OnboardingTour");
    expect(home).toContain(
      "Do not place a first-run tour over its controls",
    );
  });
});
