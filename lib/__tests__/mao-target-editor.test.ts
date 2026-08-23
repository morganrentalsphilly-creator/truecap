import { afterEach, describe, expect, it, vi } from "vitest";

import {
  applyMaoTargetInput,
  clearPendingMaoTarget,
  isMaoTargetDirty,
  maoTargetAnalysisFingerprint,
  maoTargetFingerprint,
  normalizeMaoTarget,
  normalizeMaoTargetForFinancing,
  readPendingMaoTarget,
  readPendingMaoTargetBinding,
  reduceMaoTargetState,
  writePendingMaoTarget,
  type MaoTargetState,
} from "../mao-target-editor";
import { normalizeInvestmentFormDraft } from "../investcalc-schema";
import { SAMPLE_DEAL_FIXTURE } from "../sample-deal";

afterEach(() => {
  vi.unstubAllGlobals();
});

function installLocalStorage(initial: Record<string, string> = {}) {
  const values = new Map<string, string>(Object.entries(initial));
  const localStorage = {
    setItem: vi.fn((key: string, value: string) => values.set(key, value)),
    getItem: vi.fn((key: string) => values.get(key) ?? null),
    removeItem: vi.fn((key: string) => values.delete(key)),
  };
  vi.stubGlobal("window", { localStorage });
  return { values, localStorage };
}

describe("applyMaoTargetInput", () => {
  it("updates one valid criterion without dropping the others", () => {
    expect(
      applyMaoTargetInput({ monthlyCashFlow: 750, dscr: 1.25 }, "monthlyCashFlow", "700")
    ).toEqual({ ok: true, target: { monthlyCashFlow: 700, dscr: 1.25 } });
  });

  it("validates and preserves an explicit maximum purchase price", () => {
    expect(
      applyMaoTargetInput(
        { monthlyCashFlow: 750, maxPurchasePrice: 300_000 },
        "maxPurchasePrice",
        "275000"
      )
    ).toEqual({
      ok: true,
      target: { monthlyCashFlow: 750, maxPurchasePrice: 275_000 },
    });
    expect(
      applyMaoTargetInput({ monthlyCashFlow: 750 }, "maxPurchasePrice", "275250").ok
    ).toBe(false);
  });

  it("removes a blank criterion when another valid criterion remains", () => {
    expect(
      applyMaoTargetInput({ monthlyCashFlow: 750, dscr: 1.25 }, "monthlyCashFlow", "")
    ).toEqual({ ok: true, target: { dscr: 1.25 } });
  });

  it("never permits an empty target that would make every deal appear to pass", () => {
    const result = applyMaoTargetInput({ dscr: 1.25 }, "dscr", "");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain("at least one target");
  });

  it("rejects out-of-range and nonnumeric values without returning a changed target", () => {
    expect(applyMaoTargetInput({ dscr: 1.25 }, "dscr", "101").ok).toBe(false);
    expect(applyMaoTargetInput({ capRate: 8 }, "capRate", "not-a-rate").ok).toBe(false);
  });

  it("enforces the field increment instead of relying on browser step UI", () => {
    expect(applyMaoTargetInput({ dscr: 1.25 }, "dscr", "1.234").ok).toBe(false);
    expect(applyMaoTargetInput({ dscr: 1.2 }, "dscr", "1.25")).toEqual({
      ok: true,
      target: { dscr: 1.25 },
    });
  });
});

describe("normalizeMaoTarget", () => {
  it("accepts a bounded non-empty target", () => {
    expect(
      normalizeMaoTarget({ monthlyCashFlow: 750, dscr: 1.25, maxPurchasePrice: 300_000 })
    ).toEqual({
      monthlyCashFlow: 750,
      dscr: 1.25,
      maxPurchasePrice: 300_000,
    });
  });

  it("fails closed for empty, extra-key, nonnumeric, and out-of-range targets", () => {
    expect(normalizeMaoTarget({})).toBeNull();
    expect(normalizeMaoTarget({ dscr: 1.25, recommendation: "buy" })).toBeNull();
    expect(normalizeMaoTarget({ dscr: "1.25" })).toBeNull();
    expect(normalizeMaoTarget({ dscr: 101 })).toBeNull();
  });

  it("fingerprints equivalent targets independently of insertion order", () => {
    expect(maoTargetFingerprint({ dscr: 1.25, monthlyCashFlow: 750 })).toBe(
      maoTargetFingerprint({ monthlyCashFlow: 750, dscr: 1.25 })
    );
    expect(maoTargetFingerprint({ dscr: 1.3 })).not.toBe(
      maoTargetFingerprint({ dscr: 1.25 })
    );
  });

  it("binds pending targets to a deterministic, content-sensitive analysis fingerprint", () => {
    const first = maoTargetAnalysisFingerprint({
      address: "1700 W Erie Ave",
      purchasePrice: 250_000,
      financing: { rate: 7, downPaymentPct: 20 },
    });
    const reordered = maoTargetAnalysisFingerprint({
      financing: { downPaymentPct: 20, rate: 7 },
      purchasePrice: 250_000,
      address: "1700 W Erie Ave",
    });

    expect(first).not.toBeNull();
    expect(reordered).toBe(first);
    expect(
      maoTargetAnalysisFingerprint({
        address: "1700 W Erie Ave",
        purchasePrice: 251_000,
        financing: { rate: 7, downPaymentPct: 20 },
      })
    ).not.toBe(first);
  });

  it("tracks target edits against the persisted baseline and clears when restored", () => {
    const saved = maoTargetFingerprint({ monthlyCashFlow: 750, dscr: 1.25 });
    expect(isMaoTargetDirty({ monthlyCashFlow: 700, dscr: 1.25 }, saved)).toBe(true);
    expect(isMaoTargetDirty({ dscr: 1.25, monthlyCashFlow: 750 }, saved)).toBe(false);
    expect(isMaoTargetDirty(null, null)).toBe(false);
  });
});

describe("normalizeMaoTargetForFinancing", () => {
  it("removes DSCR for cash while preserving every meaningful return target", () => {
    expect(
      normalizeMaoTargetForFinancing(
        { capRate: 8, monthlyCashFlow: 500, dscr: 1.25 },
        { isCashPurchase: true }
      )
    ).toEqual({ capRate: 8, monthlyCashFlow: 500 });
  });

  it("turns a DSCR-only cash target into a real break-even criterion", () => {
    expect(
      normalizeMaoTargetForFinancing({ dscr: 1.25 }, { isCashPurchase: true })
    ).toEqual({ monthlyCashFlow: 0 });
  });

  it("preserves a financed target and a missing target exactly", () => {
    expect(
      normalizeMaoTargetForFinancing({ dscr: 1.25 }, { isCashPurchase: false })
    ).toEqual({ dscr: 1.25 });
    expect(normalizeMaoTargetForFinancing(null, { isCashPurchase: true })).toBeNull();
  });
});

describe("pending authentication continuity", () => {
  it("preserves the target source through the fingerprinted guest auth handoff", () => {
    installLocalStorage();
    const analysisFingerprint = maoTargetAnalysisFingerprint(
      SAMPLE_DEAL_FIXTURE.values
    );
    expect(analysisFingerprint).not.toBeNull();
    writePendingMaoTarget(SAMPLE_DEAL_FIXTURE.maoTarget, {
      analysisFingerprint: analysisFingerprint!,
      source: "screening-defaults",
      now: 1_000,
    });

    expect(readPendingMaoTargetBinding(analysisFingerprint, 2_000)).toEqual({
      target: SAMPLE_DEAL_FIXTURE.maoTarget,
      source: "screening-defaults",
    });
  });

  const DAY_MS = 24 * 60 * 60 * 1000;
  const analysisFingerprint = maoTargetAnalysisFingerprint({
    address: "1700 W Erie Ave",
    purchasePrice: 250_000,
    monthlyRent: 2_500,
  });

  it("keeps the same scope after the real auth draft JSON/normalization round trip", () => {
    const writtenDraft = JSON.stringify(SAMPLE_DEAL_FIXTURE.values);
    const restoredDraft = normalizeInvestmentFormDraft(JSON.parse(writtenDraft));

    expect(restoredDraft).not.toBeNull();
    expect(maoTargetAnalysisFingerprint(restoredDraft)).toBe(
      maoTargetAnalysisFingerprint(SAMPLE_DEAL_FIXTURE.values)
    );
  });

  it("round-trips a validated target through cross-tab local storage for the same analysis", () => {
    const { values } = installLocalStorage();
    expect(analysisFingerprint).not.toBeNull();
    if (!analysisFingerprint) throw new Error("fixture fingerprint must be valid");

    writePendingMaoTarget(
      { monthlyCashFlow: 750, dscr: 1.25 },
      { analysisFingerprint, now: 1_000 }
    );
    expect(readPendingMaoTarget(analysisFingerprint, 2_000)).toEqual({
      monthlyCashFlow: 750,
      dscr: 1.25,
    });
    clearPendingMaoTarget();
    expect(values.size).toBe(0);
    expect(readPendingMaoTarget(analysisFingerprint, 2_000)).toBeNull();
  });

  it("can rebind the same target after an unsaved fork draft gains property identity", () => {
    installLocalStorage();
    const target = { monthlyCashFlow: 750, dscr: 1.25 };
    const blankFork = normalizeInvestmentFormDraft({
      ...SAMPLE_DEAL_FIXTURE.values,
      address: "",
      purchasePrice: undefined,
      monthlyRent: undefined,
    });
    const evolvedFork = normalizeInvestmentFormDraft({
      ...SAMPLE_DEAL_FIXTURE.values,
      address: "1702 W Erie Ave",
      purchasePrice: 235_000,
      monthlyRent: 2_650,
    });
    const blankFingerprint = maoTargetAnalysisFingerprint(blankFork);
    const evolvedFingerprint = maoTargetAnalysisFingerprint(evolvedFork);
    expect(blankFingerprint).not.toBeNull();
    expect(evolvedFingerprint).not.toBeNull();
    expect(evolvedFingerprint).not.toBe(blankFingerprint);
    if (!blankFingerprint || !evolvedFingerprint) {
      throw new Error("fork fixtures must produce fingerprints");
    }

    writePendingMaoTarget(target, { analysisFingerprint: blankFingerprint, now: 1_000 });
    writePendingMaoTarget(target, { analysisFingerprint: evolvedFingerprint, now: 1_500 });

    expect(readPendingMaoTarget(evolvedFingerprint, 2_000)).toEqual(target);
  });

  it("expires and removes continuity at the 24-hour boundary", () => {
    const { values } = installLocalStorage();
    if (!analysisFingerprint) throw new Error("fixture fingerprint must be valid");
    writePendingMaoTarget({ dscr: 1.25 }, { analysisFingerprint, now: 1_000 });

    expect(readPendingMaoTarget(analysisFingerprint, 1_000 + DAY_MS - 1)).toEqual({
      dscr: 1.25,
    });
    expect(readPendingMaoTarget(analysisFingerprint, 1_000 + DAY_MS)).toBeNull();
    expect(values.size).toBe(0);
  });

  it("removes a target instead of applying it to a different analysis", () => {
    const { values } = installLocalStorage();
    if (!analysisFingerprint) throw new Error("fixture fingerprint must be valid");
    writePendingMaoTarget({ dscr: 1.25 }, { analysisFingerprint, now: 1_000 });

    const otherAnalysis = maoTargetAnalysisFingerprint({
      address: "1702 W Erie Ave",
      purchasePrice: 250_000,
      monthlyRent: 2_500,
    });
    expect(readPendingMaoTarget(otherAnalysis, 2_000)).toBeNull();
    expect(values.size).toBe(0);
  });

  it("rejects future-dated entries and removes them", () => {
    const { values } = installLocalStorage();
    if (!analysisFingerprint) throw new Error("fixture fingerprint must be valid");
    writePendingMaoTarget({ dscr: 1.25 }, { analysisFingerprint, now: 2_000 });

    expect(readPendingMaoTarget(analysisFingerprint, 1_999)).toBeNull();
    expect(values.size).toBe(0);
  });

  it("fails closed and clears corrupt JSON or an invalid persisted target", () => {
    const { values } = installLocalStorage();
    if (!analysisFingerprint) throw new Error("fixture fingerprint must be valid");
    writePendingMaoTarget({ dscr: 1.25 }, { analysisFingerprint, now: 1_000 });
    const [storageKey] = values.keys();
    expect(storageKey).toBeDefined();
    if (!storageKey) throw new Error("pending target storage key was not written");

    values.set(storageKey, "{not valid json");
    expect(readPendingMaoTarget(analysisFingerprint, 2_000)).toBeNull();
    expect(values.has(storageKey)).toBe(false);

    values.set(
      storageKey,
      JSON.stringify({
        target: { dscr: 1.25, recommendation: "buy" },
        savedAt: 1_000,
        analysisFingerprint,
      })
    );
    expect(readPendingMaoTarget(analysisFingerprint, 2_000)).toBeNull();
    expect(values.has(storageKey)).toBe(false);
  });
});

describe("reduceMaoTargetState", () => {
  const initial: MaoTargetState = {
    target: { monthlyCashFlow: 0, dscr: 1.25 },
    analysisKey: "deal-a",
    touched: false,
  };

  it("accepts a late seed until the user edits", () => {
    expect(
      reduceMaoTargetState(initial, {
        type: "seed",
        target: { monthlyCashFlow: 500, dscr: 1.3 },
        analysisKey: "deal-a",
      }).target
    ).toEqual({ monthlyCashFlow: 500, dscr: 1.3 });
  });

  it("does not overwrite an explicit user edit with a late seed", () => {
    const edited = reduceMaoTargetState(initial, {
      type: "edit",
      target: { monthlyCashFlow: 750, dscr: 1.25 },
    });
    const afterLateSeed = reduceMaoTargetState(edited, {
      type: "seed",
      target: { monthlyCashFlow: 500, dscr: 1.3 },
      analysisKey: "deal-a",
    });
    expect(afterLateSeed).toBe(edited);
    expect(afterLateSeed.target).toEqual({ monthlyCashFlow: 750, dscr: 1.25 });
  });

  it("resets the touched guard and applies the seed for a new analysis", () => {
    const edited = reduceMaoTargetState(initial, {
      type: "edit",
      target: { monthlyCashFlow: 750, dscr: 1.25 },
    });
    expect(
      reduceMaoTargetState(edited, {
        type: "seed",
        target: { monthlyCashFlow: 0, dscr: 1.2 },
        analysisKey: "deal-b",
      })
    ).toEqual({
      target: { monthlyCashFlow: 0, dscr: 1.2 },
      analysisKey: "deal-b",
      touched: false,
    });
  });
});
