import { beforeEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import {
  bindPropertyCompsPayload,
  propertyCompsUnderwritingFingerprint,
} from "@/lib/property-comps-query";
import type { PropertyEnrichment } from "@/lib/property-enrichment/rentcast";

const mocks = vi.hoisted(() => ({ adminClient: null as unknown }));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/admin", () => ({
  createAdminSupabaseClient: vi.fn(() => mocks.adminClient),
}));

import { getPublicDealComps } from "@/lib/public-deal-comps";

const OWNER_ID = "11111111-1111-4111-8111-111111111111";
const DEAL_ID = "22222222-2222-4222-8222-222222222222";
const shareA = {
  address: "123 Main St, Philadelphia, PA",
  propertyType: "single-family" as const,
  bedrooms: 3,
  bathrooms: 2,
  squareFootage: 1_500,
};
const editedB = { ...shareA, bedrooms: 4 };
const enrichment: PropertyEnrichment = {
  facts: null,
  valueEstimate: 300_000,
  valueRange: null,
  saleComps: [],
  rentEstimate: 2_500,
  rentRange: null,
  rentComps: [],
  fetchedAt: "2026-08-30T12:00:00.000Z",
};

function createHarness(initialPayload: unknown) {
  const state = { payload: initialPayload };
  const tables: string[] = [];
  return {
    state,
    tables,
    client: {
      from: vi.fn((table: string) => {
        tables.push(table);
        const builder: Record<string, unknown> = {};
        builder.select = vi.fn(() => builder);
        builder.eq = vi.fn(() => builder);
        builder.maybeSingle = vi.fn(async () => ({
          data:
            table === "deal_comps"
              ? { user_id: OWNER_ID, payload: state.payload }
              : null,
          error: null,
        }));
        return builder;
      }),
    },
  };
}

describe("immutable public-share comps binding", () => {
  beforeEach(() => vi.clearAllMocks());

  it("never shows deal-B comps beside an already-resolved A snapshot after an edit and pull", async () => {
    const fingerprintA = propertyCompsUnderwritingFingerprint(shareA);
    const fingerprintB = propertyCompsUnderwritingFingerprint(editedB);
    const harness = createHarness(
      bindPropertyCompsPayload(enrichment, fingerprintA),
    );
    mocks.adminClient = harness.client;

    await expect(
      getPublicDealComps(DEAL_ID, OWNER_ID, fingerprintA),
    ).resolves.toMatchObject({ valueEstimate: 300_000 });

    // The owner edits the saved deal to B and refreshes comps. One row per deal
    // means B correctly replaces A in the mutable workspace.
    harness.state.payload = bindPropertyCompsPayload(enrichment, fingerprintB);

    // Reopening immutable share A must now omit comps, never pair B evidence
    // with A's frozen financial snapshot.
    await expect(
      getPublicDealComps(DEAL_ID, OWNER_ID, fingerprintA),
    ).resolves.toBeNull();
    expect(harness.tables).toEqual(["deal_comps", "deal_comps"]);
  });

  it("derives the expected comps identity from each frozen share snapshot", () => {
    for (const relativePath of [
      "../../app/s/[token]/page.tsx",
      "../../app/d/[encoded]/page.tsx",
      "../../app/portal/[token]/d/[dealId]/page.tsx",
    ]) {
      const source = readFileSync(
        fileURLToPath(new URL(relativePath, import.meta.url)),
        "utf8",
      );
      expect(source).toContain(
        "const compsFingerprint = propertyCompsUnderwritingFingerprint({",
      );
      expect(source).toMatch(
        /getPublicDealComps\([^)]*compsFingerprint\)/,
      );
    }

    const helper = readFileSync(
      fileURLToPath(new URL("../public-deal-comps.ts", import.meta.url)),
      "utf8",
    );
    expect(helper).toContain("expectedUnderwritingFingerprint: string");
    expect(helper).not.toContain('.from("saved_analyses")');
  });
});
