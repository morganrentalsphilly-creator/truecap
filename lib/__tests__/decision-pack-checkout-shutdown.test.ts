import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { decisionPackCheckoutEnabled } from "@/lib/decision-pack-checkout-gate";

const ROOT = process.cwd();
const read = (path: string) => readFileSync(join(ROOT, path), "utf8");

describe("Deal Decision Pack temporary shutdown", () => {
  it("fails closed unless both independent switches are explicitly enabled", () => {
    expect(
      decisionPackCheckoutEnabled({
        publicReleaseFlag: null,
        serverCheckoutFlag: null,
      })
    ).toBe(false);
    expect(
      decisionPackCheckoutEnabled({
        publicReleaseFlag: "1",
        serverCheckoutFlag: undefined,
      })
    ).toBe(false);
    expect(
      decisionPackCheckoutEnabled({
        publicReleaseFlag: undefined,
        serverCheckoutFlag: "1",
      })
    ).toBe(false);
    expect(
      decisionPackCheckoutEnabled({
        publicReleaseFlag: "true",
        serverCheckoutFlag: "enabled",
      })
    ).toBe(true);
  });

  it("guards the Server Action before validation, Stripe, or database work", () => {
    const action = read("app/actions/one-time-pdf.ts");
    const actionStart = action.indexOf("export async function createOneTimePdfCheckoutAction");
    const gate = action.indexOf("if (!decisionPackCheckoutEnabled())", actionStart);
    const validation = action.indexOf("createCheckoutSchema.safeParse", actionStart);
    const stripe = action.indexOf("const stripe = getStripe()", actionStart);

    expect(actionStart).toBeGreaterThanOrEqual(0);
    expect(gate).toBeGreaterThan(actionStart);
    expect(gate).toBeLessThan(validation);
    expect(gate).toBeLessThan(stripe);
    expect(action.slice(gate, validation)).toContain('code: "FEATURE_DISABLED"');
  });

  it("does not expose a one-time purchase control in the report dialog or pricing page", () => {
    const dialog = read("components/investcalc/pdf-purchase-dialog.tsx");
    const pricing = read("app/pricing/page.tsx");

    expect(dialog).not.toContain("onBuyOneTime");
    expect(dialog).not.toContain("Buy the Deal Decision Pack");
    expect(dialog).not.toContain("singleDeal.priceLabel");
    expect(pricing).not.toContain("TrueCap Deal Decision Pack");
    expect(pricing).not.toContain("Not ready for a subscription?");
  });
});
