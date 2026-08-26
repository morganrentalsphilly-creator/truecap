import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  DEFAULT_STRATEGY_KEY,
  getEffectiveStrategyKey,
  resolveStrategySelectionIntent,
} from "@/components/investcalc/strategy-chips";

const source = readFileSync(
  join(process.cwd(), "components/investcalc/strategy-chips.tsx"),
  "utf8",
);
const normalizeSource = (value: string) =>
  value.replace(/\s+/g, "").replace(/,([)}\]])/g, "$1");

describe("compact strategy selector", () => {
  it("presents Buy & Hold as the effective default without emitting a selection", () => {
    expect(DEFAULT_STRATEGY_KEY).toBe("buy-hold");
    expect(getEffectiveStrategyKey(null)).toBe("buy-hold");
    expect(resolveStrategySelectionIntent(null, "buy-hold")).toBeUndefined();
    expect(
      resolveStrategySelectionIntent("buy-hold", "buy-hold"),
    ).toBeUndefined();
  });

  it("uses the parent's null revert path when returning from a specialist mode", () => {
    for (const activeKey of [
      "house-hack",
      "brrrr",
      "wholesale-mao",
      "fix-flip",
      "short-term",
    ]) {
      expect(resolveStrategySelectionIntent(activeKey, "buy-hold")).toBeNull();
    }
  });

  it("emits a specialist key once and treats reconfirming it as a no-op", () => {
    expect(resolveStrategySelectionIntent(null, "house-hack")).toBe(
      "house-hack",
    );
    expect(
      resolveStrategySelectionIntent("house-hack", "house-hack"),
    ).toBeUndefined();
    expect(
      resolveStrategySelectionIntent(null, "not-a-strategy"),
    ).toBeUndefined();
  });

  it("keeps the collapsed surface compact and the disclosure accessible", () => {
    expect(source).toContain("Analysis type:");
    expect(source).toContain('{expanded ? "Done" : "Change"}');
    expect(source).toContain("aria-expanded={expanded}");
    expect(source).toContain("aria-controls={expanded ? panelId : undefined}");
    expect(source).not.toContain("aria-controls={panelId}");
    expect(source).toContain(
      'aria-label={`${expanded ? "Close" : "Change"} analysis type. Current: ${activeDisplay.label}`}',
    );
    expect(source).toContain('aria-label="Choose analysis type"');
    expect(source).toContain("min-h-11");
    expect(source).toContain("focus-visible:ring-2");
    expect(source).toContain("collapseAndRestoreFocus");
    expect(source).toContain("flex-wrap items-center");
    expect(source).toContain("basis-[9rem]");
  });

  it("retains taxonomy, limitations, and an explicit starter-assumption warning", () => {
    expect(source).toContain('renderGroup("Core", CORE_INVESTOR_STRATEGIES)');
    expect(source).toContain(
      'renderGroup("Secondary", SECONDARY_INVESTOR_STRATEGIES)',
    );
    expect(source).toContain('"Advanced / Beta strategies"');
    expect(source).toContain("active.limitation");
    expect(source).toContain('role="note"');
    expect(source).toContain('activeKey && active.productStage !== "core"');
    expect(source).toContain("Verify independently:");
    expect(source).toContain(
      'strategy.primaryOutputIsPro ? " · Pro output" : ""',
    );
    expect(normalizeSource(source)).toContain(
      normalizeSource(
        "The free run still shows cash flow, cap rate, and DSCR.",
      ),
    );
    expect(normalizeSource(source)).toContain(
      normalizeSource(
        "Changing analysis type can change your property model and apply starter assumptions.",
      ),
    );
  });

  it("never sends the destructive default key through the callback", () => {
    expect(source).toContain("if (intent !== undefined) onSelect(intent)");
    expect(source).not.toContain('onSelect("buy-hold")');
  });
});
