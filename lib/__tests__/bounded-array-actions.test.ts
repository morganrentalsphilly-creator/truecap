import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { UNDERWRITING_V1_GOLDEN_CORPUS } from "./fixtures/underwriting-v1-golden-corpus";
import { MAX_UNITS } from "@/lib/investcalc-schema";

const mocks = vi.hoisted(() => ({ database: vi.fn(), fetch: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createServerSupabaseClient: mocks.database }));
vi.mock("@sentry/nextjs", () => ({ captureException: vi.fn(), captureMessage: vi.fn() }));

import { upsertBuyBoxAction } from "@/app/actions/user-buy-boxes";
import { consumeProductEvaluationUsageAction } from "@/app/actions/product-evaluation";
import { claimAnonymousDecisionAction } from "@/app/actions/anonymous-decision";
import { enrichPropertyAction } from "@/app/actions/enrich-property";

function unreadableArray(length: number): never[] {
  const values = new Array<never>(length);
  Object.defineProperty(values, 0, {
    get() { throw new Error("Oversized array elements must not be read"); },
  });
  return values;
}

beforeEach(() => {
  mocks.database.mockReset().mockRejectedValue(new Error("Unexpected database access"));
  mocks.fetch.mockReset().mockResolvedValue(Response.json({ observations: [] }));
  vi.stubGlobal("fetch", mocks.fetch);
  vi.stubEnv("FRED_API_KEY", "");
  vi.stubEnv("HUD_API_KEY", "");
});
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });

describe("bounded arrays at action boundaries", () => {
  it.each([["propertyTypes", 3], ["targetStates", 60]] as const)(
    "rejects oversized Buy Box %s before element reads or database access", async (key, maximum) => {
      await expect(upsertBuyBoxAction({ [key]: unreadableArray(maximum + 1) }))
        .resolves.toMatchObject({ ok: false, code: "VALIDATION_ERROR", message: `Array must contain at most ${maximum} element(s)` });
      expect(mocks.database).not.toHaveBeenCalled();
    },
  );

  it("rejects oversized comparison IDs with the existing action error", async () => {
    await expect(consumeProductEvaluationUsageAction({ kind: "comparison", dealIds: unreadableArray(5) }))
      .resolves.toEqual({ ok: false, code: "SERVER_ERROR", message: "Could not verify this free-trial run." });
    expect(mocks.database).not.toHaveBeenCalled();
  });

  it("rejects oversized anonymous underwriting units before cookie or rate-limit work", async () => {
    await expect(claimAnonymousDecisionAction({
      ...UNDERWRITING_V1_GOLDEN_CORPUS[0].values,
      units: unreadableArray(MAX_UNITS + 1),
    })).resolves.toMatchObject({ ok: false, code: "INVALID_INPUT" });
  });

  it("retains best-effort enrichment when oversized bedroom input is discarded", async () => {
    const regular = await enrichPropertyAction({});
    await expect(enrichPropertyAction({ unitBedrooms: unreadableArray(25) })).resolves.toEqual(regular);
    expect(mocks.fetch).not.toHaveBeenCalled();
  });
});
