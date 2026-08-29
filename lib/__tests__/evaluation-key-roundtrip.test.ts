import { describe, expect, it } from "vitest";

import { buildEvaluationDealResourceKey } from "@/lib/evaluation-resource-key";
import {
  DEFAULT_APPRECIATION_RATE,
  DEFAULT_SELLING_COST_PCT,
} from "@/lib/exit-scenarios";
import { normalizeInvestmentFormSnapshot } from "@/lib/investcalc-schema";
import { releasedInvestmentFormSchema } from "@/lib/underwriting-model-release";
import { UNDERWRITING_V1_GOLDEN_CORPUS } from "@/lib/__tests__/fixtures/underwriting-v1-golden-corpus";

/**
 * The metered-evaluation ledger key must survive a save/reopen round trip.
 *
 * Metering hashes JSON.stringify of the parsed form. appreciationRatePct and
 * sellingCostPct are optional and default to `undefined` in the analyzer, and
 * JSON.stringify DROPS undefined-valued keys — so the ledger recorded a digest
 * over a payload where they were simply absent. saveDealAction persists them
 * with DEFAULT_APPRECIATION_RATE / DEFAULT_SELLING_COST_PCT and
 * normalizeInvestmentFormSnapshot re-injects them on read, so every later
 * authorization hashed a payload that CONTAINED them and matched no row.
 *
 * A no-card evaluation user who never opened Advanced options therefore lost
 * their metered Pro access the moment they reopened the deal — across the saved
 * PDF gate, generate-report-pdf, ten-year projections and Buy Box fit — and
 * re-running to restore it burned another of their three runs.
 *
 * Measured before the fix: metered deal:1ceee9b7..., reopened deal:2794a470....
 *
 * This is the same defect family as jsonb dropping undefined keys, which
 * previously made saved deals unreopenable.
 */

type Values = Parameters<typeof buildEvaluationDealResourceKey>[0];

/** A valid deal left on the analyzer's shipped defaults — the affected path. */
function untouchedDefaults(): Values {
  const base = { ...UNDERWRITING_V1_GOLDEN_CORPUS[0]!.values } as Record<string, unknown>;
  base.appreciationRatePct = undefined;
  base.sellingCostPct = undefined;
  return base as unknown as Values;
}

/** What a save-then-reopen actually hands back to the form. */
function afterSaveAndReopen(values: Values): Values {
  const saved = {
    ...(values as Record<string, unknown>),
    appreciationRatePct:
      (values as Record<string, unknown>).appreciationRatePct ?? DEFAULT_APPRECIATION_RATE,
    sellingCostPct:
      (values as Record<string, unknown>).sellingCostPct ?? DEFAULT_SELLING_COST_PCT,
  };
  const reopened = normalizeInvestmentFormSnapshot(saved as never);
  expect(reopened, "the snapshot must round-trip through normalization").not.toBeNull();
  return reopened as unknown as Values;
}

describe("evaluation ledger key survives save and reopen", () => {
  it("confirms the mechanism: the defaults are undefined and stringify drops them", () => {
    const v = untouchedDefaults() as unknown as Record<string, unknown>;
    expect(v.appreciationRatePct).toBeUndefined();
    expect(v.sellingCostPct).toBeUndefined();
    expect(JSON.stringify({ a: undefined, b: 1 })).toBe('{"b":1}');
  });

  it("produces the SAME key live and after reopening", () => {
    const live = untouchedDefaults();
    const metered = buildEvaluationDealResourceKey(live);
    expect(metered, "the fixture must be valid enough to key").toMatch(/^deal:[a-f0-9]{64}$/);
    expect(buildEvaluationDealResourceKey(afterSaveAndReopen(live))).toBe(metered);
  });

  it("still matches when the user typed those values explicitly", () => {
    const typed = {
      ...(untouchedDefaults() as unknown as Record<string, unknown>),
      appreciationRatePct: DEFAULT_APPRECIATION_RATE,
      sellingCostPct: DEFAULT_SELLING_COST_PCT,
    } as unknown as Values;
    const metered = buildEvaluationDealResourceKey(typed);
    expect(buildEvaluationDealResourceKey(afterSaveAndReopen(typed))).toBe(metered);
  });

  it("still distinguishes genuinely different deals", () => {
    // Canonicalizing must not flatten real differences into one key.
    const a = untouchedDefaults() as unknown as Record<string, unknown>;
    const b = { ...a, purchasePrice: Number(a.purchasePrice) + 500 };
    expect(buildEvaluationDealResourceKey(b as unknown as Values))
      .not.toBe(buildEvaluationDealResourceKey(a as unknown as Values));
    // ...and a user who DID choose a non-default rate keys differently.
    const c = { ...a, appreciationRatePct: DEFAULT_APPRECIATION_RATE + 1.5 };
    expect(buildEvaluationDealResourceKey(c as unknown as Values))
      .not.toBe(buildEvaluationDealResourceKey(a as unknown as Values));
  });

  it("catches any NEW field that normalization starts injecting", () => {
    // The fix targets two fields because exactly two differed when measured.
    // If normalization later injects a third, the keys silently diverge again
    // and every symptom returns. Fail here instead.
    const live = untouchedDefaults();
    const parsedLive = releasedInvestmentFormSchema.safeParse(live);
    const parsedReopened = releasedInvestmentFormSchema.safeParse(afterSaveAndReopen(live));
    expect(parsedLive.success && parsedReopened.success).toBe(true);
    if (!parsedLive.success || !parsedReopened.success) return;

    const a = parsedLive.data as Record<string, unknown>;
    const b = parsedReopened.data as Record<string, unknown>;
    const differing = [...new Set([...Object.keys(a), ...Object.keys(b)])]
      .filter((k) => JSON.stringify(a[k]) !== JSON.stringify(b[k]));

    // The RAW payloads still differ in exactly the two fields the key builder
    // canonicalizes internally — that is the bug's mechanism, not a failure.
    // What must never appear is a THIRD field, because the builder would not
    // canonicalize it and every symptom would return silently.
    const CANONICALIZED = ["appreciationRatePct", "sellingCostPct"];
    const unexpected = differing.filter((k) => !CANONICALIZED.includes(k));
    expect(
      unexpected,
      `normalization now changes a field the key builder does not canonicalize: ${unexpected.join(", ")}. Add it to the injection in lib/evaluation-resource-key.ts.`,
    ).toEqual([]);
    // Guard the guard: if normalization ever stops touching these two, this
    // test would pass vacuously while silently protecting nothing.
    expect(differing.sort()).toEqual([...CANONICALIZED].sort());
  });
});
