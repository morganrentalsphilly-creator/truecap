import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

function source(relative: string): string {
  return readFileSync(
    fileURLToPath(new URL(relative, import.meta.url)),
    "utf8",
  );
}

describe("public share entitlement guards", () => {
  it("derives Pro visibility from verified owner attribution on both routes", () => {
    const opaque = source("../../app/s/[token]/page.tsx");
    const resolver = source("../public-share.ts");
    const legacy = source("../../app/d/[encoded]/page.tsx");
    expect(opaque).toContain("canShowSharedProAnalysis(ownerId)");
    expect(opaque).toContain("const ownerId = resolved.ownerId");
    expect(opaque).toContain("const dealId = resolved.dealId");
    expect(opaque).not.toContain("resolved.snapshot.meta.ownerId");
    expect(opaque).not.toContain("resolved.snapshot.meta.dealId");
    expect(opaque).toContain("hashShareValues(displayValues)");
    expect(opaque).not.toContain("hashShareValues(parsed.data)");
    expect(resolver).toContain("owner_id, deal_id, snapshot");
    expect(resolver).toContain("ownerId: row.owner_id");
    expect(resolver).toContain("dealId: row.deal_id");
    expect(legacy).toContain("canShowSharedProAnalysis(verifiedOwnerId)");
  });

  it("restricts owner updates to non-capability columns", () => {
    const migration = source(
      "../../supabase/migrations/20260823170000_harden_public_share_mutability.sql",
    );
    expect(migration).toContain(
      "revoke update on table public.public_shares from authenticated",
    );
    expect(migration).toContain(
      "grant update (label, expires_at, revoked_at, updated_at)",
    );
    expect(migration).toContain("with check (auth.uid() = owner_id)");
    expect(migration).not.toMatch(
      /grant update \([^)]*(?:snapshot|owner_id|deal_id|token_hash|calc_version)/,
    );
  });

  it("keeps new share creation behind the authenticated server action", () => {
    const migration = source(
      "../../supabase/migrations/20260825220000_public_shares_service_role_inserts.sql",
    );
    const action = source("../../app/actions/public-shares.ts");
    const shareStore = source("../public-share.ts");

    expect(migration).toContain(
      'drop policy if exists "public_shares_owner_insert"',
    );
    expect(migration).toContain(
      "revoke insert on table public.public_shares from public, anon, authenticated",
    );
    expect(migration).toContain(
      "grant insert on table public.public_shares to service_role",
    );
    expect(action).toContain('code: "SIGN_IN_REQUIRED"');
    expect(action).toContain("ownerId: user.id");
    expect(shareStore).toContain("if (!input.ownerId) return null");
  });

  it("fails closed and gates every subscription-only public component", () => {
    const access = source("../public-share-access.ts");
    const boundary = source("../public-share-analysis-result.ts");
    const view = source(
      "../../components/investcalc/read-only-analysis-view.tsx",
    );
    const opaque = source("../../app/s/[token]/page.tsx");
    const legacy = source("../../app/d/[encoded]/page.tsx");
    expect(access).toContain("if (!ownerId) return false");
    expect(access).toContain("return false");
    expect(boundary).toContain("PUBLIC_SHARE_CORE_RESULT_FIELDS");
    expect(boundary).toContain(
      "for (const field of PUBLIC_SHARE_CORE_RESULT_FIELDS)",
    );
    expect(boundary).not.toContain("const core = { ...result }");
    expect(boundary).not.toContain("delete core[field]");
    expect(opaque).toContain(
      "analysis={buildPublicShareAnalysisPayload(result, showProAnalysis)}",
    );
    expect(legacy).toContain(
      "analysis={buildPublicShareAnalysisPayload(result, showProAnalysis)}",
    );
    expect(opaque).not.toContain("result={result}");
    expect(legacy).not.toContain("result={result}");
    expect(view).toContain("proResult && !recordedResult");
    expect(view).toContain(
      "Scenario tools are separate from this recorded result",
    );
    expect(view).toContain('offerCeilingAccess?.access === "exact"');
    expect(view).not.toContain("calculateMaxAllowableOffer");
    expect(opaque).toContain("resolveOfferCeilingForAccess");
    expect(opaque).toContain("resolved.snapshot.maoTargetSource");
    expect(opaque).toContain('?? "selected-targets"');
    expect(view).toContain("<SensitivityGrid values={values}");
    expect(view).toContain("<StrategiesPanel values={values}");
  });
});
