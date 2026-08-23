import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const profilePage = readFileSync(join(process.cwd(), "app/profile/page.tsx"), "utf8");

describe("profile subscription display wiring", () => {
  it("uses the Price-ID-derived slug when the plan relation is missing", () => {
    expect(profilePage).toContain("planSlug: subscribedPlanSlug ?? null");
    expect(profilePage).toContain("planName: subscribedPlanSlug");
    expect(profilePage).not.toContain("planSlug: currentPlan?.slug ?? null");
  });

  it("uses the resolved subscribed slug for conversion price lookup", () => {
    expect(profilePage).toContain("? (subscribedPlanSlug ?? undefined)");
  });
});
