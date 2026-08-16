import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const actionSource = readFileSync(
  join(process.cwd(), "app/actions/financing-profiles.ts"),
  "utf8"
);
const savedDealsSource = readFileSync(
  join(process.cwd(), "app/actions/saved-analyses.ts"),
  "utf8"
);

describe("financing profile security guards", () => {
  it("fails every CRUD path closed behind the financing_profiles flag", () => {
    expect(actionSource).toContain('isFeatureEnabled("financing_profiles")');
    expect(actionSource.match(/const disabled = featureDisabled\(\)/g)?.length).toBeGreaterThanOrEqual(5);
  });

  it("uses the cookie-authenticated server client and explicit owner filters", () => {
    expect(actionSource).toContain("createServerSupabaseClient");
    expect(actionSource).toContain("supabase.auth.getUser()");
    expect(actionSource.match(/\.eq\("user_id", (?:userId|auth\.userId)\)/g)?.length).toBeGreaterThanOrEqual(8);
    expect(actionSource).not.toContain("createAdminSupabaseClient");
  });

  it("rechecks profile ownership and modeled-term equality before saving provenance", () => {
    expect(savedDealsSource).toContain("resolveAppliedFinancingProfile");
    expect(savedDealsSource).toContain("financingProfileMatchesAnalysis(parsed.data, values)");
    expect(savedDealsSource).toContain('.eq("user_id", userId)');
    expect(savedDealsSource).toContain("financing_profile_snapshot:");
  });

  it("never trusts a browser-supplied stale revision as historical provenance", () => {
    expect(savedDealsSource).toContain(
      "parsed.data.termsVersion !== current.termsVersion"
    );
    expect(savedDealsSource).not.toContain(
      "snapshot: { ...parsed.data, appliedAt }"
    );
    expect(savedDealsSource).toContain("parseStoredFinancingProfileSnapshot");
    expect(savedDealsSource).toContain("sameFinancingProfileSnapshot(submitted.data, stored)");
    expect(savedDealsSource).toContain(
      "financingProfileMatchesAnalysis(stored, sanitizedValues)"
    );
  });
});
