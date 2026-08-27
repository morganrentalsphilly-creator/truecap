import { describe, expect, it } from "vitest";

import {
  validateTargetDraft,
  type TargetInputs,
} from "@/components/investcalc/focused-decision-summary";

const baseDraft = (): TargetInputs => ({
  capRate: "7",
  cocReturn: "",
  monthlyCashFlow: "0",
  dscr: "1.25",
  maxPurchasePrice: "",
});

describe("focused Offer Ceiling target draft", () => {
  it("validates the complete draft atomically without mutating a committed target", () => {
    const draft = baseDraft();
    draft.capRate = "8";
    draft.monthlyCashFlow = "500";

    expect(validateTargetDraft(draft, { isCashPurchase: false })).toEqual({
      target: { capRate: 8, monthlyCashFlow: 500, dscr: 1.25 },
      errors: {},
      formError: null,
    });
  });

  it("rejects an out-of-range or off-step field and returns no partial target", () => {
    const outOfRange = baseDraft();
    outOfRange.dscr = "101";
    const invalidRange = validateTargetDraft(outOfRange, {
      isCashPurchase: false,
    });
    expect(invalidRange.target).toBeNull();
    expect(invalidRange.errors.dscr).toContain("between 0 and 100");

    const offStep = baseDraft();
    offStep.monthlyCashFlow = "12";
    const invalidStep = validateTargetDraft(offStep, {
      isCashPurchase: false,
    });
    expect(invalidStep.target).toBeNull();
    expect(invalidStep.errors.monthlyCashFlow).toContain("increments of 25");
  });

  it("requires one criterion and removes DSCR from an all-cash draft", () => {
    const onlyDscr: TargetInputs = {
      capRate: "",
      cocReturn: "",
      monthlyCashFlow: "",
      dscr: "1.25",
      maxPurchasePrice: "",
    };
    const cash = validateTargetDraft(onlyDscr, { isCashPurchase: true });
    expect(cash.target).toBeNull();
    expect(cash.formError).toContain("Keep at least one target");

    const cashWithCap = { ...onlyDscr, capRate: "7" };
    expect(
      validateTargetDraft(cashWithCap, { isCashPurchase: true }).target,
    ).toEqual({ capRate: 7 });
  });
});
