import { describe, expect, it } from "vitest";

import { parseAdvocacyInternalEmails } from "@/lib/advocacy-rollout";

describe("advocacy internal cohort", () => {
  it("fails closed when the private allowlist is absent", () => {
    expect(parseAdvocacyInternalEmails(undefined).size).toBe(0);
    expect(parseAdvocacyInternalEmails("").size).toBe(0);
  });

  it("normalizes, deduplicates, and rejects malformed entries", () => {
    expect(
      [...parseAdvocacyInternalEmails(" Owner@Example.com,owner@example.com, no-email, a b@example.com ")]
    ).toEqual(["owner@example.com"]);
  });

  it("rejects partial domains and caps the private cohort", () => {
    const valid = Array.from(
      { length: 120 },
      (_, index) => `owner-${index}@example.com`
    );
    const parsed = parseAdvocacyInternalEmails(
      ["owner@example", "owner@", "@example.com", ...valid].join(",")
    );

    expect(parsed.size).toBe(100);
    expect(parsed.has("owner@example")).toBe(false);
    expect(parsed.has("owner-99@example.com")).toBe(true);
    expect(parsed.has("owner-100@example.com")).toBe(false);
  });

  it("keeps the allowlist out of client components and requires both gates", async () => {
    const { readFile } = await import("node:fs/promises");
    const dashboard = await readFile(
      new URL("../../components/investcalc/analysis-dashboard.tsx", import.meta.url),
      "utf8"
    );
    // The anonymous analyzer props live in ONE object shared by /analyze and
    // the stale-cookie mirror (the homepage no longer mounts the analyzer).
    const anonymousPage = await readFile(
      new URL("../../components/marketing/analyze-page-content.tsx", import.meta.url),
      "utf8"
    );

    expect(dashboard).toContain(
      'advocacyContractEligible && isFeatureEnabled("advocacy_decision_contract")'
    );
    expect(dashboard).not.toContain("TRUECAP_ADVOCACY_INTERNAL_EMAILS");
    expect(anonymousPage).toContain("advocacyContractEligible: false");
  });
});
