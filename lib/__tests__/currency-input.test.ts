import { createFormControl } from "react-hook-form";
import { describe, expect, it, vi } from "vitest";
import {
  formatCurrencyInput,
  parseCurrencyInput,
  updateCurrencyDraft,
} from "@/components/ui/currency-input";

describe("currency input formatting", () => {
  it("keeps separators out of numeric form state", () => {
    expect(parseCurrencyInput("$385,000")).toBe(385000);
    expect(parseCurrencyInput("2,800")).toBe(2800);
  });

  it("formats finite numeric state for display", () => {
    expect(formatCurrencyInput(385000)).toBe("385,000");
    expect(formatCurrencyInput(385000.25)).toBe("385,000.25");
    expect(formatCurrencyInput(undefined)).toBe("");
    expect(formatCurrencyInput(null)).toBe("");
  });

  it("commits an explicit empty value for schema validation", () => {
    expect(parseCurrencyInput("")).toBeNull();
    expect(parseCurrencyInput("   ")).toBeNull();
  });

  it("rejects ambiguous text instead of silently reinterpreting it", () => {
    expect(parseCurrencyInput("1e6")).toBeUndefined();
    expect(parseCurrencyInput("12..5")).toBeUndefined();
    expect(parseCurrencyInput("-$500")).toBeUndefined();
    expect(parseCurrencyInput("1.234")).toBeUndefined();
    expect(parseCurrencyInput("$,")).toBeUndefined();
  });

  it("preserves cents consistently between parsed form state and display", () => {
    const parsed = parseCurrencyInput("$1,234.56");
    expect(parsed).toBe(1234.56);
    expect(formatCurrencyInput(parsed)).toBe("1,234.56");
  });

  it("preserves a trailing decimal across sequential controlled edits", () => {
    let display = "1,234";
    const committed: Array<number | null> = [];

    for (const next of ["1,234.", "1,234.5", "1,234.56"]) {
      const update = updateCurrencyDraft(display, next);
      expect(update.accepted).toBe(true);
      if (!update.accepted) continue;
      display = update.display;
      committed.push(update.value);
    }

    expect(display).toBe("1,234.56");
    expect(committed).toEqual([1234, 1234.5, 1234.56]);
    expect(formatCurrencyInput(committed.at(-1))).toBe("1,234.56");
  });

  it("keeps the last valid draft when a sequential edit becomes ambiguous", () => {
    expect(updateCurrencyDraft("1,234.", "1,234..")).toEqual({
      accepted: false,
      display: "1,234.",
    });
  });

  it("value → clear → submit cannot reuse the previous RHF number", async () => {
    const form = createFormControl<{ purchasePrice: number | null }>({
      defaultValues: { purchasePrice: 385000 },
    });
    const field = form.register("purchasePrice", {
      required: "Enter purchase price",
    });

    const update = updateCurrencyDraft("385,000", "");
    expect(update.accepted).toBe(true);
    if (!update.accepted) throw new Error("Expected clear to be accepted");
    void field.onChange({
      target: { name: "purchasePrice", value: update.value },
      type: "change",
    });

    // RHF's change handler is synchronous for built-in validation rules, but
    // yield once so this remains robust if the library schedules it later.
    await Promise.resolve();

    const onValid = vi.fn();
    const onInvalid = vi.fn();
    await form.handleSubmit(onValid, onInvalid)();

    expect(form.getValues("purchasePrice")).toBeNull();
    expect(onValid).not.toHaveBeenCalled();
    expect(onInvalid).toHaveBeenCalledWith(
      expect.objectContaining({
        purchasePrice: expect.objectContaining({
          message: "Enter purchase price",
          type: "required",
        }),
      }),
      undefined,
    );
  });

  it("the controlled component rejects ambiguous text without changing RHF state", async () => {
    const form = createFormControl<{ monthlyRent: number | null }>({
      defaultValues: { monthlyRent: 2800 },
    });
    const field = form.register("monthlyRent");
    const onValueChange = vi.fn((value: number | null) => {
      void field.onChange({
        target: { name: "monthlyRent", value },
        type: "change",
      });
    });

    const update = updateCurrencyDraft("2,800", "1e6");
    if (update.accepted) onValueChange(update.value);
    await Promise.resolve();

    expect(onValueChange).not.toHaveBeenCalled();
    expect(form.getValues("monthlyRent")).toBe(2800);
  });

  it("clearing an optional RHF money field submits null, not its old value", async () => {
    const form = createFormControl<{ rehabBudget: number | null }>({
      defaultValues: { rehabBudget: 25000 },
    });
    const field = form.register("rehabBudget");

    await field.onChange({
      target: { name: "rehabBudget", value: parseCurrencyInput("") },
      type: "change",
    });

    const onValid = vi.fn();
    await form.handleSubmit(onValid)();

    expect(onValid).toHaveBeenCalledWith({ rehabBudget: null }, undefined);
    expect(onValid).not.toHaveBeenCalledWith({ rehabBudget: 25000 }, undefined);
  });
});
